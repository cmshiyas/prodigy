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
      .select('is_correct, subtopic, questions!inner(topic_id, exam_type)')
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
    const topicStats = {}

    ;(responses || []).forEach(r => {
      if (!r.questions) return
      const topic = r.questions.topic_id
      const subtopic = r.subtopic
      if (!topic) return

      // Always count in topicStats (even if no subtopic)
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 }
      topicStats[topic].total += 1
      if (r.is_correct) topicStats[topic].correct += 1

      // Only count in subtopicStats when subtopic exists
      if (subtopic) {
        if (!subtopicStats[topic]) subtopicStats[topic] = {}
        if (!subtopicStats[topic][subtopic]) subtopicStats[topic][subtopic] = { correct: 0, total: 0 }
        subtopicStats[topic][subtopic].total += 1
        if (r.is_correct) subtopicStats[topic][subtopic].correct += 1
      }
    })

    return NextResponse.json({ subtopicStats, topicStats })
  } catch (err) {
    console.error('Subtopic performance API error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
