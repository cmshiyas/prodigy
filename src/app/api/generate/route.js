import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { getTokenLimits } from '@/lib/tokenLimits'

export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const payload = await verifyGoogleToken(authHeader.split(' ')[1])
    const { sub: google_id } = payload
    const supabase = getSupabase()

    const { data: user, error: userErr } = await supabase
      .from('users').select('*').eq('google_id', google_id).single()

    if (userErr || !user) return NextResponse.json({ error: 'User not found' }, { status: 401 })
    if (user.status === 'pending')  return NextResponse.json({ error: 'PENDING',  message: 'Your account is awaiting admin approval.' }, { status: 403 })
    if (user.status === 'rejected') return NextResponse.json({ error: 'REJECTED', message: 'Your access request was declined.' }, { status: 403 })
    if (user.status !== 'approved') return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const today = new Date().toISOString().split('T')[0]
    const { data: usage } = await supabase
      .from('token_usage').select('tokens_used').eq('user_id', user.id).eq('date', today).single()

    const tokensUsedToday = usage?.tokens_used || 0
    const TOKEN_LIMITS = await getTokenLimits()
    const limit = TOKEN_LIMITS[user.tier] || TOKEN_LIMITS.silver

    if (tokensUsedToday >= limit) {
      return NextResponse.json({
        error: 'TOKEN_LIMIT',
        message: `Daily limit reached for ${user.tier} tier (${limit.toLocaleString()} tokens/day). Resets at midnight.`,
        tokensUsed: tokensUsedToday, limit,
      }, { status: 429 })
    }

    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY')

    const body = await request.json()
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
    })

    const data = await anthropicRes.json()
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) || 500
    const newTotal = tokensUsedToday + tokensUsed

    if (usage) {
      await supabase.from('token_usage').update({ tokens_used: newTotal, updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('date', today)
    } else {
      await supabase.from('token_usage').insert({ user_id: user.id, date: today, tokens_used: tokensUsed })
    }

    return NextResponse.json({
      ...data,
      _usage: { tokensUsedToday: newTotal, limit, tier: user.tier, remaining: Math.max(0, limit - newTotal) }
    }, { status: anthropicRes.status })

  } catch (err) {
    console.error('Generate error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
