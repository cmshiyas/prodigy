import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { getTokenLimits } from '@/lib/tokenLimits'
import { EXAM_TYPES } from '@/lib/constants'

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

    // Bug fix #1: Never fall back to the first subtopic when none is selected.
    // Doing so collapsed the entire topic's question pool to a single subtopic,
    // causing heavy repetition. Use null so we query across all subtopics.
    const resolvedSubtopic = subtopic || null

    // Bug fix #2: Scope attempted IDs to this specific topic + exam only.
    // Previously we fetched ALL attempted question IDs (every topic, every exam)
    // making the exclusion list huge, hitting URL limits, and silently breaking.
    const { data: attemptedResponses, error: attemptedError } = await supabase
      .from('question_responses')
      .select('question_id, questions!inner(topic_id, exam_type)')
      .eq('user_id', user.id)
      .eq('questions.topic_id', topicId)
      .eq('questions.exam_type', exam)

    if (attemptedError) {
      console.error('Failed to fetch attempted responses:', attemptedError)
      // Non-fatal: proceed without exclusion rather than blocking the user
    }

    // Deduplicate — upsert means one row per (user, question) but be safe
    const attemptedIds = [...new Set(
      (attemptedResponses || []).map(r => r.question_id).filter(Boolean)
    )]

    // Build the candidate pool query
    let questionQuery = supabase
      .from('questions')
      .select('*')
      .eq('topic_id', topicId)
      .eq('exam_type', exam)
      .limit(100)

    if (resolvedSubtopic) {
      questionQuery = questionQuery.eq('subtopic', resolvedSubtopic)
    }

    // Bug fix #3: PostgREST NOT IN requires bare UUIDs — no quotes.
    // Quoted UUIDs ('uuid') cause the filter to silently no-op on many Postgres versions.
    if (attemptedIds.length > 0) {
      questionQuery = questionQuery.not('id', 'in', `(${attemptedIds.join(',')})`)
    }

    const { data: unansweredQuestions, error: questionError } = await questionQuery

    if (questionError) {
      console.error('Failed to fetch questions:', questionError)
    }

    // Pick a random unanswered question from the pool
    const existingQuestion = unansweredQuestions?.length > 0
      ? unansweredQuestions[Math.floor(Math.random() * unansweredQuestions.length)]
      : null

    if (existingQuestion) {
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
        _usage: { tokensUsedToday: 0, limit: 1000, tier: user.tier, remaining: 1000 }
      })
    }

    // All available questions for this topic have been answered — generate a new one
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

    // Remove topicId/examType/subtopic from body before sending to Claude
    const { topicId: _, examType: __, subtopic: ___, ...claudeBody } = body

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

    // Server-side shuffle: track correct answer by content, shuffle, re-find index
    const correctContent = q.options[q.correct]
    const shuffled = [...q.options].sort(() => Math.random() - 0.5)
    const newCorrect = shuffled.indexOf(correctContent)
    q.options = shuffled
    q.correct = newCorrect

    // Store the new question
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
    }

    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) || 500
    const newTotal = tokensUsedToday + tokensUsed

    if (usage) {
      await supabase.from('token_usage').update({ tokens_used: newTotal, updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('date', today)
    } else {
      await supabase.from('token_usage').insert({ user_id: user.id, date: today, tokens_used: tokensUsed })
    }

    // Bug fix #4: Only return an id if the question was actually stored.
    // Without an id the client can't record the response, meaning the question
    // is never marked as answered and will appear again next session.
    return NextResponse.json({
      id: storedQuestion?.id ?? null,
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
