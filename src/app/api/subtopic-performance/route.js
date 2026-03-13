import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { EXAM_TYPES } from '@/lib/constants'

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

    const url = new URL(request.url)
    const examType = url.searchParams.get('examType')

    let query = supabase
      .from('question_responses')
      .select('is_correct, questions!inner(topic_id, subtopic, exam_type)')
      .eq('user_id', user.id)

    const examIds = EXAM_TYPES.map(item => item.id)
    if (examType && examIds.includes(examType)) {
      query = query.eq('questions.exam_type', examType)
    }

    const { data: responses, error } = await query

    if (error) {
      console.error('Failed to fetch subtopic responses:', error)
      return NextResponse.json({ error: 'Failed to fetch subtopic performance' }, { status: 500 })
    }

    const subtopicStats = {}

    responses.forEach(r => {
      const topic = r.questions.topic_id || 'unknown'
      const subtopic = r.questions.subtopic || 'General'
      if (!subtopicStats[topic]) subtopicStats[topic] = {}
      if (!subtopicStats[topic][subtopic]) subtopicStats[topic][subtopic] = { correct: 0, total: 0 }

      subtopicStats[topic][subtopic].total += 1
      if (r.is_correct) subtopicStats[topic][subtopic].correct += 1
    })

    return NextResponse.json({ subtopicStats })
  } catch (err) {
    console.error('Subtopic performance API error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
