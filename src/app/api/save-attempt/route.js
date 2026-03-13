import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'

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
    if (user.status !== 'approved') return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const body = await request.json()
    const { score, totalQuestions, correctAnswers, durationSeconds, topics } = body

    const { error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        score,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        duration_seconds: durationSeconds,
        topics
      })

    if (error) {
      console.error('Failed to save quiz attempt:', error)
      return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Save attempt API error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}