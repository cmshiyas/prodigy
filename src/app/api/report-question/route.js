import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const VALID_REASONS = ['missing_image', 'wrong_answer', 'ambiguous_question']

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { questionId, reason } = await request.json()

    if (!questionId) return NextResponse.json({ error: 'questionId is required' }, { status: 400 })
    if (!VALID_REASONS.includes(reason)) return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })

    const payload = await verifyGoogleToken(token)
    const { sub: google_id } = payload
    const supabase = getSupabase()

    const { data: user } = await supabase
      .from('users').select('id').eq('google_id', google_id).single()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })

    await supabase.from('question_reports').upsert(
      { user_id: user.id, question_id: questionId, reason },
      { onConflict: 'user_id,question_id' }
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Report question error:', err.message)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
