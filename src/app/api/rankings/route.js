import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { TOPICS } from '@/lib/constants'

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

    // Get topic performance based on question responses
    const { data: responses, error } = await supabase
      .from('question_responses')
      .select(`
        is_correct,
        questions!inner(topic_id)
      `)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to fetch question responses:', error)
      return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 })
    }

    // Aggregate data by topic
    const topicStats = {}

    responses.forEach(response => {
      const topicId = response.questions.topic_id
      const topic = TOPICS.find(t => t.id === topicId)
      if (!topicStats[topicId]) {
        topicStats[topicId] = {
          id: topicId,
          name: topic ? topic.name : topicId,
          totalQuestions: 0,
          correctAnswers: 0
        }
      }
      topicStats[topicId].totalQuestions += 1
      if (response.is_correct) {
        topicStats[topicId].correctAnswers += 1
      }
    })

    // Calculate accuracy and sort by accuracy descending
    const rankings = Object.values(topicStats)
      .map(topic => ({
        ...topic,
        accuracy: topic.correctAnswers / topic.totalQuestions
      }))
      .sort((a, b) => b.accuracy - a.accuracy)

    return NextResponse.json(rankings)
  } catch (err) {
    console.error('Rankings API error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}