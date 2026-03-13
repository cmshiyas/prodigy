import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { ADMIN_EMAIL } from '@/lib/constants'

async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Not authenticated')
  const payload = await verifyGoogleToken(authHeader.split(' ')[1])
  if (payload.email !== ADMIN_EMAIL) throw new Error('Not authorised')
}

export async function GET(request) {
  try { await verifyAdmin(request) }
  catch (err) { return NextResponse.json({ error: err.message }, { status: 403 }) }

  const action = new URL(request.url).searchParams.get('action')
  if (action !== 'users') return NextResponse.json({ error: 'Unknown action' }, { status: 404 })

  const supabase = getSupabase()
  const today = new Date().toISOString().split('T')[0]

  const { data: users, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: usageData } = await supabase.from('token_usage').select('user_id, tokens_used').eq('date', today)
  const usageMap = {}
  ;(usageData || []).forEach(u => { usageMap[u.user_id] = u.tokens_used })

  return NextResponse.json({ users: users.map(u => ({ ...u, tokensToday: usageMap[u.id] || 0 })) })
}

export async function POST(request) {
  try { await verifyAdmin(request) }
  catch (err) { return NextResponse.json({ error: err.message }, { status: 403 }) }

  const action = new URL(request.url).searchParams.get('action')
  if (action !== 'update') return NextResponse.json({ error: 'Unknown action' }, { status: 404 })

  const { userId, status, tier } = await request.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const updates = { updated_at: new Date().toISOString() }
  if (status) updates.status = status
  if (tier)   updates.tier   = tier

  const supabase = getSupabase()
  const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data })
}
