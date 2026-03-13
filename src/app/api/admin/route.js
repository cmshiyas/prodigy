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
  const supabase = getSupabase()

  if (action === 'users') {
    const today = new Date().toISOString().split('T')[0]
    const { data: users, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data: usageData } = await supabase.from('token_usage').select('user_id, tokens_used').eq('date', today)
    const usageMap = {}
    ;(usageData || []).forEach(u => { usageMap[u.user_id] = u.tokens_used })
    return NextResponse.json({ users: users.map(u => ({ ...u, tokensToday: usageMap[u.id] || 0 })) })
  }

  if (action === 'config') {
    const { data, error } = await supabase.from('config').select('key, value')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ config: data })
  }

  if (action === 'quizBank') {
    // Fetch question stats per topic and per creator
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, topic_id, created_by')

    if (questionsError) return NextResponse.json({ error: questionsError.message }, { status: 500 })

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')

    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

    const topicCounts = {}
    const userCounts = {}

    questions.forEach(q => {
      topicCounts[q.topic_id] = (topicCounts[q.topic_id] || 0) + 1
      if (q.created_by) {
        userCounts[q.created_by] = (userCounts[q.created_by] || 0) + 1
      }
    })

    const topics = Object.entries(topicCounts).map(([topicId, count]) => ({ topicId, count }))
    const userMap = Object.fromEntries(users.map(u => [u.id, u]))

    const userRanking = Object.entries(userCounts)
      .map(([userId, count]) => ({
        userId,
        count,
        name: userMap[userId]?.name || 'Unknown',
        email: userMap[userId]?.email || ''
      }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ topics, users: userRanking })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 404 })
}

export async function POST(request) {
  try { await verifyAdmin(request) }
  catch (err) { return NextResponse.json({ error: err.message }, { status: 403 }) }

  const action = new URL(request.url).searchParams.get('action')
  const supabase = getSupabase()

  if (action === 'update') {
    const { userId, status, tier } = await request.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    const updates = { updated_at: new Date().toISOString() }
    if (status) updates.status = status
    if (tier)   updates.tier   = tier
    const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ user: data })
  }

  if (action === 'config') {
    const { key, value } = await request.json()
    if (!key || value === undefined) return NextResponse.json({ error: 'Missing key or value' }, { status: 400 })
    const { error } = await supabase.from('config')
      .upsert({ key, value: String(value), updated_at: new Date().toISOString() })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 404 })
}
