import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { EXAM_TYPES, QUESTION_LIMITS } from '@/lib/constants'

// Users only receive questions that are already in the database.
// AI generation is an admin-only operation (see /api/admin?action=generateQuestions).

export const dynamic = 'force-dynamic'

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

    // Enforce daily question limit — read from DB config, fall back to constants
    const { data: configRows } = await supabase.from('config').select('key, value')
      .eq('key', `question_limit_${user.tier}`)
      .single()
    const dbLimit = configRows ? parseInt(configRows.value) : NaN
    const limit = !isNaN(dbLimit) ? dbLimit : (QUESTION_LIMITS[user.tier] ?? QUESTION_LIMITS.silver)
    if (limit < 999999) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { count: usedToday } = await supabase
        .from('question_responses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', todayStart.toISOString())
      if ((usedToday || 0) >= limit) {
        return NextResponse.json({
          error: 'QUESTION_LIMIT',
          message: `You've reached your ${limit} question limit for today on the ${user.tier} plan.`,
          limit,
          tier: user.tier,
        }, { status: 429 })
      }
    }

    const body = await request.json()
    const { topicId, examType, subtopic, yearLevel } = body
    const validExamIds = EXAM_TYPES.map(item => item.id)
    const exam = validExamIds.includes(examType) ? examType : 'OC'

    if (!topicId) {
      return NextResponse.json({ error: 'topicId is required' }, { status: 400 })
    }

    // Use the exact subtopic when specified; null means all subtopics for the topic
    const resolvedSubtopic = subtopic || null

    // Fetch question IDs the user has already answered for this specific topic + exam
    const { data: attemptedResponses, error: attemptedError } = await supabase
      .from('question_responses')
      .select('question_id, questions!inner(topic_id, exam_type)')
      .eq('user_id', user.id)
      .eq('questions.topic_id', topicId)
      .eq('questions.exam_type', exam)

    if (attemptedError) {
      console.error('Failed to fetch attempted responses:', attemptedError)
    }

    const attemptedIds = [...new Set(
      (attemptedResponses || []).map(r => r.question_id).filter(Boolean)
    )]

    // Query unanswered questions from the bank
    let questionQuery = supabase
      .from('questions')
      .select('*')
      .eq('topic_id', topicId)
      .eq('exam_type', exam)
      .limit(100)

    if (resolvedSubtopic) {
      questionQuery = questionQuery.eq('subtopic', resolvedSubtopic)
    }

    // Only filter by year_level for multi-year-level exams (NAPLAN, Selective)
    // OC only has Year 4 and existing questions may have year_level = null
    if (yearLevel && exam !== 'OC') {
      questionQuery = questionQuery.eq('year_level', yearLevel)
    }

    if (attemptedIds.length > 0) {
      questionQuery = questionQuery.not('id', 'in', `(${attemptedIds.join(',')})`)
    }

    const { data: unansweredQuestions, error: questionError } = await questionQuery

    if (questionError) {
      console.error('Failed to fetch questions:', questionError)
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    if (!unansweredQuestions || unansweredQuestions.length === 0) {
      // Check if ANY questions exist for this topic (answered or not) to give the right message
      const { count } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('topic_id', topicId)
        .eq('exam_type', exam)

      if ((count || 0) === 0) {
        return NextResponse.json({
          error: 'NO_QUESTIONS',
          message: 'No questions available for this topic yet. The admin is working on adding more — check back soon!',
        }, { status: 404 })
      }

      // Questions exist but this user has answered them all
      return NextResponse.json({
        error: 'NO_QUESTIONS',
        message: "You've answered all available questions for this topic! More are being added regularly — check back soon.",
      }, { status: 404 })
    }

    // Pick a random unanswered question
    const question = unansweredQuestions[Math.floor(Math.random() * unansweredQuestions.length)]

    return NextResponse.json({
      id: question.id,
      question: question.question,
      visual: question.visual,
      options: question.options,
      correct: question.correct,
      explanation: question.explanation,
      difficulty: question.difficulty,
      topicId: question.topic_id,
      subtopic: question.subtopic || null,
      year_level: question.year_level || null,
      image_url: question.image_url || null,
      image_urls: question.image_urls?.length ? question.image_urls : (question.image_url ? [question.image_url] : []),
      _usage: { tier: user.tier },
    })

  } catch (err) {
    console.error('Generate error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
