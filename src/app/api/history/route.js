import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'

export async function GET(request) {
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

    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch quiz attempts:', error)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    // Transform the data for the frontend
    const history = attempts.map(attempt => ({
      date: attempt.created_at,
      score: attempt.score,
      totalQuestions: attempt.total_questions,
      correct: attempt.correct_answers,
      duration: attempt.duration_seconds,
      topics: attempt.topics
    }))

    return NextResponse.json(history)
  } catch (err) {
    console.error('History API error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}