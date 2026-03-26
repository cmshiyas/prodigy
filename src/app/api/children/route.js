import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getParent(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const payload = await verifyGoogleToken(authHeader.split(' ')[1])
    const supabase = getSupabase()
    const { data: parent } = await supabase
      .from('users').select('*').eq('google_id', payload.sub).single()
    return parent ? { parent, supabase } : null
  } catch {
    return null
  }
}

// GET: list children of authenticated parent
export async function GET(request) {
  const ctx = await getParent(request)
  if (!ctx) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { parent, supabase } = ctx

  const { data: children } = await supabase
    .from('users')
    .select('id, child_name, allowed_exam_types, created_at')
    .eq('parent_id', parent.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ children: children || [] })
}

// POST: create a child profile
export async function POST(request) {
  const ctx = await getParent(request)
  if (!ctx) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { parent, supabase } = ctx

  const { childName, allowedExamTypes } = await request.json()
  if (!childName?.trim()) return NextResponse.json({ error: 'Child name is required' }, { status: 400 })

  const uniqueSuffix = `${parent.id}_${Date.now()}`
  const { data: child, error } = await supabase.from('users').insert({
    account_type: 'child',
    parent_id: parent.id,
    child_name: childName.trim(),
    name: childName.trim(),
    allowed_exam_types: allowedExamTypes || [],
    tier: parent.tier,
    status: parent.status,
    // Placeholder values for NOT NULL columns — child accounts never sign in directly
    google_id: `child_${uniqueSuffix}`,
    email: `child_${uniqueSuffix}@internal.selfpaced`,
  }).select('id, child_name, allowed_exam_types').single()

  if (error) return NextResponse.json({ error: 'Failed to create child: ' + error.message }, { status: 500 })
  return NextResponse.json({ child }, { status: 201 })
}

// PUT: update a child profile
export async function PUT(request) {
  const ctx = await getParent(request)
  if (!ctx) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { parent, supabase } = ctx

  const { childId, childName, allowedExamTypes } = await request.json()
  if (!childId) return NextResponse.json({ error: 'childId is required' }, { status: 400 })

  const updates = {}
  if (childName !== undefined) { updates.child_name = childName.trim(); updates.name = childName.trim() }
  if (allowedExamTypes !== undefined) updates.allowed_exam_types = allowedExamTypes

  const { data: child, error } = await supabase
    .from('users').update(updates)
    .eq('id', childId).eq('parent_id', parent.id)
    .select('id, child_name, allowed_exam_types').single()

  if (error || !child) return NextResponse.json({ error: 'Child not found or update failed' }, { status: 404 })
  return NextResponse.json({ child })
}

// DELETE: remove a child profile
export async function DELETE(request) {
  const ctx = await getParent(request)
  if (!ctx) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { parent, supabase } = ctx

  const { childId } = await request.json()
  if (!childId) return NextResponse.json({ error: 'childId is required' }, { status: 400 })

  const { error } = await supabase.from('users')
    .delete().eq('id', childId).eq('parent_id', parent.id)

  if (error) return NextResponse.json({ error: 'Failed to delete child' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
