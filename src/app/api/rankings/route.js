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

    // Get all quiz attempts for this user
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to fetch quiz attempts:', error)
      return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 })
    }

    // Aggregate data by topic
    const topicStats = {}

    attempts.forEach(attempt => {
      attempt.topics.forEach(topic => {
        if (!topicStats[topic]) {
          topicStats[topic] = {
            id: topic,
            name: topic,
            totalQuestions: 0,
            correctAnswers: 0,
            totalAttempts: 0
          }
        }
        topicStats[topic].totalQuestions += attempt.total_questions
        topicStats[topic].correctAnswers += attempt.correct_answers
        topicStats[topic].totalAttempts += 1
      })
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