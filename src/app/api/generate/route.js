import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { getTokenLimits } from '@/lib/tokenLimits'
import { EXAM_TOPICS, EXAM_TYPES } from '@/lib/constants'

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

    const body = await request.json()
    const { topicId, examType, subtopic } = body
    const validExamIds = EXAM_TYPES.map(item => item.id)
    const exam = validExamIds.includes(examType) ? examType : 'OC'

    if (!topicId) {
      return NextResponse.json({ error: 'topicId is required' }, { status: 400 })
    }

    const topicDef = EXAM_TOPICS[exam]?.find(t => t.id === topicId)
    const resolvedSubtopic = subtopic || topicDef?.subtopics?.[0] || null

    // First, get question IDs this user has already attempted in this topic
    const { data: attemptedResponses, error: attemptedError } = await supabase
      .from('question_responses')
      .select('question_id')
      .eq('user_id', user.id)

    if (attemptedError) {
      console.error('Failed to fetch attempted responses:', attemptedError)
      return NextResponse.json({ error: 'Failed to fetch attempted questions' }, { status: 500 })
    }

    const attemptedIds = attemptedResponses?.map(r => r.question_id) || []

    let questionQuery = supabase
      .from('questions')
      .select('*')
      .eq('topic_id', topicId)
      .eq('exam_type', exam)
      .limit(1)

    if (resolvedSubtopic) {
      questionQuery = questionQuery.eq('subtopic', resolvedSubtopic)
    }

    if (attemptedIds.length > 0) {
      const quotedIds = attemptedIds.map(id => `'${id}'`).join(',')
      questionQuery = questionQuery.not('id', 'in', `(${quotedIds})`)
    }

    const { data: existingQuestion, error: questionError } = await questionQuery.single()

    if (existingQuestion && !questionError) {
      // Return existing question
      return NextResponse.json({
        id: existingQuestion.id,
        question: existingQuestion.question,
        visual: existingQuestion.visual,
        options: existingQuestion.options,
        correct: existingQuestion.correct,
        explanation: existingQuestion.explanation,
        difficulty: existingQuestion.difficulty,
        topicId: existingQuestion.topic_id,
        subtopic: existingQuestion.subtopic || null,
        _usage: { tokensUsedToday: 0, limit: 1000, tier: user.tier, remaining: 1000 } // No tokens used for existing questions
      })
    }

    // No existing question found, generate a new one
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

    // Remove topicId from body before sending to Claude
    const { topicId: _, examType: __, ...claudeBody } = body

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(claudeBody),
    })

    const data = await anthropicRes.json()

    if (!anthropicRes.ok) {
      throw new Error(data.error?.message || 'Claude API error')
    }

    // Parse the generated question
    const text = data.content.map(b => b.text || '').join('').trim()
    const q = JSON.parse(text.replace(/```json|```/g, '').trim())

    // Store the new question in the database
    const { data: storedQuestion, error: storeError } = await supabase
      .from('questions')
      .insert({
        topic_id: topicId,
        exam_type: exam,
        subtopic: resolvedSubtopic,
        created_by: user.id,
        question: q.question,
        visual: q.visual || null,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
        difficulty: q.difficulty
      })
      .select()
      .single()

    if (storeError) {
      console.error('Failed to store question:', storeError)
      // Continue anyway, just return the question without storing
    }

    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) || 500
    const newTotal = tokensUsedToday + tokensUsed

    if (usage) {
      await supabase.from('token_usage').update({ tokens_used: newTotal, updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('date', today)
    } else {
      await supabase.from('token_usage').insert({ user_id: user.id, date: today, tokens_used: tokensUsed })
    }

    return NextResponse.json({
      id: storedQuestion?.id,
      question: q.question,
      visual: q.visual,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation,
      difficulty: q.difficulty,
      topicId: topicId,
      subtopic: resolvedSubtopic,
      _usage: { tokensUsedToday: newTotal, limit, tier: user.tier, remaining: Math.max(0, limit - newTotal) }
    }, { status: anthropicRes.status })

  } catch (err) {
    console.error('Generate error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
