import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { resolveActiveUser } from '@/lib/resolveUser'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const payload = await verifyGoogleToken(authHeader.split(' ')[1])
    const { sub: google_id } = payload
    const supabase = getSupabase()

    const resolved = await resolveActiveUser(supabase, google_id, request)
    if (resolved.error) return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    const { user } = resolved

    const examType = new URL(request.url).searchParams.get('examType') || 'OC'
    const attemptsQuery = supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('exam_type', examType)
      .order('created_at', { ascending: false })

    const { data: attempts, error } = await attemptsQuery

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

    return NextResponse.json(history, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
  } catch (err) {
    console.error('History API error:', err.message)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}