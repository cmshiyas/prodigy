import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { ADMIN_EMAIL, EXAM_TOPICS, EXAM_TYPES } from '@/lib/constants'

async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Not authenticated')
  const payload = await verifyGoogleToken(authHeader.split(' ')[1])
  if (payload.email !== ADMIN_EMAIL) throw new Error('Not authorised')
}

export async function GET(request) {
  try { await verifyAdmin(request) }
  catch (err) { return NextResponse.json({ error: err.message }, { status: 403 }) }

  const action = new URL(request.url).searchParams.get('action')
  const supabase = getSupabase()

  if (action === 'users') {
    const today = new Date().toISOString().split('T')[0]
    const { data: users, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data: usageData } = await supabase.from('token_usage').select('user_id, tokens_used').eq('date', today)
    const usageMap = {}
    ;(usageData || []).forEach(u => { usageMap[u.user_id] = u.tokens_used })
    return NextResponse.json({ users: users.map(u => ({ ...u, tokensToday: usageMap[u.id] || 0 })) })
  }

  if (action === 'config') {
    const { data, error } = await supabase.from('config').select('key, value')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ config: data })
  }

  if (action === 'quizBank') {
    // Fetch question stats per topic, exam type, and creator
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, topic_id, exam_type, created_by')

    if (questionsError) return NextResponse.json({ error: questionsError.message }, { status: 500 })

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')

    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

    const topicExamCounts = {}
    const examCounts = {}
    const userCounts = {}

    questions.forEach(q => {
      const exam = q.exam_type || 'Unknown'
      if (!topicExamCounts[q.topic_id]) topicExamCounts[q.topic_id] = {}
      topicExamCounts[q.topic_id][exam] = (topicExamCounts[q.topic_id][exam] || 0) + 1
      examCounts[exam] = (examCounts[exam] || 0) + 1
      if (q.created_by) {
        userCounts[q.created_by] = (userCounts[q.created_by] || 0) + 1
      }
    })

    const topics = Object.entries(topicExamCounts).map(([topicId, byExam]) => ({
      topicId,
      count: Object.values(byExam).reduce((s, n) => s + n, 0),
      byExam,
    }))
    const examBreakdown = Object.entries(examCounts)
      .map(([examType, count]) => ({ examType, count }))
      .sort((a, b) => b.count - a.count)
    const userMap = Object.fromEntries(users.map(u => [u.id, u]))

    const userRanking = Object.entries(userCounts)
      .map(([userId, count]) => ({
        userId,
        count,
        name: userMap[userId]?.name || 'Unknown',
        email: userMap[userId]?.email || ''
      }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ topics, examBreakdown, users: userRanking, total: questions.length })
  }

  if (action === 'analytics') {
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const since7  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { data: allUsers },
      { data: allQuestions },
      { data: responses30 },
      { data: newUsers30 },
      { data: tokenRows },
    ] = await Promise.all([
      supabase.from('users').select('id, name, email, status, tier, created_at'),
      supabase.from('questions').select('id, exam_type, created_at'),
      supabase.from('question_responses').select('user_id, is_correct, created_at').gte('created_at', since30),
      supabase.from('users').select('id, created_at').gte('created_at', since30),
      supabase.from('token_usage').select('user_id, date, tokens_used').gte('date', since7.split('T')[0]),
    ])

    // Daily activity for last 30 days
    const dailyMap = {}
    ;(responses30 || []).forEach(r => {
      const day = r.created_at.split('T')[0]
      if (!dailyMap[day]) dailyMap[day] = { date: day, responses: 0, correct: 0, activeUsers: new Set() }
      dailyMap[day].responses++
      if (r.is_correct) dailyMap[day].correct++
      dailyMap[day].activeUsers.add(r.user_id)
    })
    const dailyActivity = Object.values(dailyMap)
      .map(d => ({ date: d.date, responses: d.responses, correct: d.correct, activeUsers: d.activeUsers.size }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Per-user response counts (last 30 days)
    const userResponseMap = {}
    ;(responses30 || []).forEach(r => {
      if (!userResponseMap[r.user_id]) userResponseMap[r.user_id] = { total: 0, correct: 0 }
      userResponseMap[r.user_id].total++
      if (r.is_correct) userResponseMap[r.user_id].correct++
    })
    const userMap = Object.fromEntries((allUsers || []).map(u => [u.id, u]))
    const activeUsers = Object.entries(userResponseMap)
      .map(([uid, s]) => ({ ...userMap[uid], responses: s.total, correct: s.correct }))
      .sort((a, b) => b.responses - a.responses)
      .slice(0, 20)

    // Token usage last 7 days per user
    const tokenMap = {}
    ;(tokenRows || []).forEach(r => {
      if (!tokenMap[r.user_id]) tokenMap[r.user_id] = 0
      tokenMap[r.user_id] += r.tokens_used
    })
    const topTokenUsers = Object.entries(tokenMap)
      .map(([uid, tokens]) => ({ ...userMap[uid], tokens }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10)

    // Overview totals
    const totalResponses = (responses30 || []).length
    const totalCorrect = (responses30 || []).filter(r => r.is_correct).length
    const activeUserCount7 = new Set((responses30 || []).filter(r => r.created_at >= since7).map(r => r.user_id)).size

    return NextResponse.json({
      overview: {
        totalUsers: (allUsers || []).length,
        approvedUsers: (allUsers || []).filter(u => u.status === 'approved').length,
        totalQuestions: (allQuestions || []).length,
        responses30d: totalResponses,
        correctRate30d: totalResponses > 0 ? Math.round((totalCorrect / totalResponses) * 100) : 0,
        activeUsers7d: activeUserCount7,
        newUsers30d: (newUsers30 || []).length,
      },
      dailyActivity,
      activeUsers,
      topTokenUsers,
    })
  }

  if (action === 'userResponses') {
    const userId = new URL(request.url).searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    const { data: responses, error } = await supabase
      .from('question_responses')
      .select('selected_option, is_correct, created_at, questions!inner(id, question, options, correct, explanation, difficulty, topic_id, subtopic, exam_type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const result = (responses || []).map(r => ({
      answeredAt: r.created_at,
      isCorrect: r.is_correct,
      selectedOption: r.selected_option,
      question: r.questions.question,
      options: r.questions.options,
      correct: r.questions.correct,
      explanation: r.questions.explanation,
      difficulty: r.questions.difficulty,
      topicId: r.questions.topic_id,
      subtopic: r.questions.subtopic,
      examType: r.questions.exam_type,
    }))

    return NextResponse.json({ responses: result })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 404 })
}

export async function POST(request) {
  try { await verifyAdmin(request) }
  catch (err) { return NextResponse.json({ error: err.message }, { status: 403 }) }

  const action = new URL(request.url).searchParams.get('action')
  const supabase = getSupabase()

  if (action === 'update') {
    const { userId, status, tier } = await request.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    const updates = { updated_at: new Date().toISOString() }
    if (status) updates.status = status
    if (tier)   updates.tier   = tier
    const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ user: data })
  }

  if (action === 'config') {
    const { key, value } = await request.json()
    if (!key || value === undefined) return NextResponse.json({ error: 'Missing key or value' }, { status: 400 })
    const { error } = await supabase.from('config')
      .upsert({ key, value: String(value), updated_at: new Date().toISOString() })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'uploadPdf') {
    const formData = await request.formData()
    const examType = formData.get('examType')?.toString() || ''
    const topicId = formData.get('topicId')?.toString() || ''
    const file = formData.get('file')
    const validExamIds = EXAM_TYPES.map(item => item.id)

    if (!validExamIds.includes(examType)) {
      return NextResponse.json({ error: 'Invalid exam type' }, { status: 400 })
    }
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    let text
    try {
      const pdfParse = require('pdf-parse')
      const result = await pdfParse(fileBuffer)
      text = result.text || ''
    } catch (err) {
      return NextResponse.json({ error: 'Failed to parse PDF: ' + err.message }, { status: 500 })
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'PDF contains no text' }, { status: 400 })
    }

    // Limit size for LLM prompt
    const trimmed = text.length > 16000 ? text.slice(0, 16000) : text
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
    }

    const topicInstruction = topicId
      ? `All questions belong to topicId "${topicId}". Set topicId to "${topicId}" for every question.`
      : `Determine the appropriate topicId for each question based on its content.`

    const prompt = `You are an expert ${examType} exam marker and question bank builder.

Below is the text of an exam paper. Extract every multiple choice question and do the following for each:
1. Copy the question text exactly
2. Copy all options (A-E) as an array in order
3. SOLVE the question and set "correct" to the 0-based index of the correct answer (A=0, B=1, C=2, D=3, E=4)
4. Write a brief step-by-step explanation of why that answer is correct
5. Assign a subtopic (e.g. "Algebraic thinking", "Fractions", "Measurement", "Number operations", "Geometry", "Spatial reasoning", "Number patterns", "Problem solving", "Data & graphs")
6. Set difficulty: easy / medium / hard
7. ${topicInstruction}

IMPORTANT: Respond with ONLY valid JSON, no markdown, no prose.

Required format:
{"topics":[{"id":"string","name":"string","subtopics":["string"]}],"extractedQuestions":[{"topicId":"string","subtopic":"string","question":"string","options":["string"],"correct":2,"explanation":"string","difficulty":"easy"}]}

Exam paper text:
${trimmed}`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      return NextResponse.json({ error: 'Claude API failed: ' + err }, { status: 500 })
    }

    const anthropicData = await anthropicRes.json()
    const textOutput = anthropicData.content?.map(b => b.text || '').join('') || ''
    let parsedResponse
    try {
      parsedResponse = JSON.parse(textOutput.replace(/```json|```/g, '').trim())
    } catch (err) {
      return NextResponse.json({ error: 'Failed to parse generate output: ' + err.message, raw: textOutput }, { status: 500 })
    }

    // Store extracted topics
    const topics = Array.isArray(parsedResponse.topics) ? parsedResponse.topics : []
    for (const t of topics) {
      if (!t.id || !t.name) continue
      await supabase.from('topics').upsert({ id: t.id, exam_type: examType, name: t.name }, { onConflict: 'id,exam_type' })
    }

    const questions = Array.isArray(parsedResponse.extractedQuestions) ? parsedResponse.extractedQuestions : []

    // Fetch existing questions for deduplication
    const { data: existingQs } = await supabase
      .from('questions')
      .select('question, topic_id')
      .eq('exam_type', examType)
    const existingSet = new Set((existingQs || []).map(q => `${q.topic_id}::${q.question.trim().toLowerCase()}`))

    // Collect unique subtopics to upsert
    const subtopicSet = new Set()
    for (const q of questions) {
      if (q.subtopic && (topicId || q.topicId)) {
        subtopicSet.add(JSON.stringify({ topic_id: topicId || q.topicId, name: q.subtopic }))
      }
    }
    for (const entry of subtopicSet) {
      const { topic_id, name } = JSON.parse(entry)
      await supabase.from('subtopics').upsert({ topic_id, exam_type: examType, name }, { onConflict: 'topic_id,exam_type,name' })
    }

    const insertedQuestions = []
    const skippedQuestions = []
    const questionErrors = []

    for (const [idx, q] of questions.entries()) {
      if (!q || !q.topicId || !q.question || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correct !== 'number') {
        questionErrors.push({ idx, error: 'Invalid question format', q })
        continue
      }

      const resolvedTopicId = topicId || q.topicId
      const key = `${resolvedTopicId}::${q.question.trim().toLowerCase()}`
      if (existingSet.has(key)) {
        skippedQuestions.push(idx)
        continue
      }

      // Server-side shuffle so correct answer is not always index 0
      const correctContent = q.options[q.correct]
      const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5)
      const shuffledCorrect = shuffledOptions.indexOf(correctContent)

      const insert = {
        topic_id: resolvedTopicId,
        exam_type: examType,
        subtopic: q.subtopic || null,
        created_by: null,
        question: q.question,
        visual: q.visual || null,
        options: shuffledOptions,
        correct: shuffledCorrect,
        explanation: q.explanation || '',
        difficulty: q.difficulty && ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      }
      const { error: insertError } = await supabase.from('questions').insert(insert)
      if (insertError) {
        questionErrors.push({ idx, error: insertError.message })
      } else {
        insertedQuestions.push(q)
        existingSet.add(key)
      }
    }

    return NextResponse.json({
      topics: parsedResponse.topics || [],
      inserted: insertedQuestions.length,
      skipped: skippedQuestions.length,
      errors: questionErrors,
      raw: null,
    })
  }

  if (action === 'generateQuestions') {
    const { examType, topicId, subtopic, count = 10 } = await request.json()
    const validExamIds = EXAM_TYPES.map(item => item.id)
    if (!validExamIds.includes(examType)) {
      return NextResponse.json({ error: 'Invalid exam type' }, { status: 400 })
    }
    const topicDef = (EXAM_TOPICS[examType] || []).find(t => t.id === topicId)
    if (!topicDef) {
      return NextResponse.json({ error: 'Invalid topicId for this exam type' }, { status: 400 })
    }
    const n = Math.min(50, Math.max(1, parseInt(count) || 10))

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
    }

    // Fetch existing questions for deduplication
    const { data: existingQs } = await supabase
      .from('questions')
      .select('question')
      .eq('topic_id', topicId)
      .eq('exam_type', examType)
    const existingTexts = new Set((existingQs || []).map(q => q.question.trim().toLowerCase()))

    const subtopicLine = subtopic
      ? `Subtopic: ${subtopic} — every question must specifically test this subtopic.`
      : `Cover a variety of subtopics within the topic: ${topicDef.subtopics?.join(', ') || topicDef.name}.`

    const prompt = `You are an expert ${examType} exam question writer for Australian Year 4-6 students.

Topic: ${topicDef.name}
${subtopicLine}

Generate exactly ${n} unique, high-quality multiple-choice questions. Vary difficulty: 40% easy, 40% medium, 20% hard. Ensure every question is distinct — no duplicates or near-duplicates.

IMPORTANT: For each question, solve it yourself first, then place the correct answer at a RANDOM index (0–4). Do NOT always use index 0.

Respond with ONLY valid JSON (no markdown, no prose):
{"questions":[{"question":"...","visual":"optional text table or empty string","options":["A","B","C","D","E"],"correct":<0-based index>,"explanation":"step-by-step solution","difficulty":"easy|medium|hard","subtopic":"subtopic name"}]}`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      return NextResponse.json({ error: 'Claude API failed: ' + err }, { status: 500 })
    }

    const anthropicData = await anthropicRes.json()
    const textOutput = anthropicData.content?.map(b => b.text || '').join('') || ''

    let parsed
    try {
      parsed = JSON.parse(textOutput.replace(/```json|```/g, '').trim())
    } catch (err) {
      return NextResponse.json({ error: 'Failed to parse AI output: ' + err.message }, { status: 500 })
    }

    const questions = Array.isArray(parsed.questions) ? parsed.questions : []
    const inserted = []
    const errors = []

    for (const [idx, q] of questions.entries()) {
      if (!q.question || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correct !== 'number') {
        errors.push({ idx, error: 'Invalid question format' }); continue
      }
      if (existingTexts.has(q.question.trim().toLowerCase())) {
        errors.push({ idx, error: 'Duplicate question skipped' }); continue
      }

      // Server-side shuffle to avoid LLM position bias
      const correctContent = q.options[q.correct]
      const shuffled = [...q.options].sort(() => Math.random() - 0.5)
      const newCorrect = shuffled.indexOf(correctContent)

      const { error: insertError } = await supabase.from('questions').insert({
        topic_id: topicId,
        exam_type: examType,
        subtopic: subtopic || q.subtopic || null,
        created_by: null,
        question: q.question.trim(),
        visual: q.visual || null,
        options: shuffled,
        correct: newCorrect,
        explanation: q.explanation || '',
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      })

      if (insertError) {
        errors.push({ idx, error: insertError.message })
      } else {
        inserted.push(idx)
        existingTexts.add(q.question.trim().toLowerCase())
      }
    }

    return NextResponse.json({ generated: inserted.length, errors })
  }

  if (action === 'uploadQuestions') {
    const { examType, questions } = await request.json()
    const validExamIds = EXAM_TYPES.map(item => item.id)
    if (!validExamIds.includes(examType)) {
      return NextResponse.json({ error: 'Invalid exam type' }, { status: 400 })
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'questions must be a non-empty array' }, { status: 400 })
    }

    const validTopicIds = (EXAM_TOPICS[examType] || []).map(t => t.id)
    const inserted = []
    const errors = []

    for (let index = 0; index < questions.length; index++) {
      const q = questions[index]
      if (!q || typeof q !== 'object') {
        errors.push({ index, error: 'Question must be an object' })
        continue
      }
      const topicId = q.topicId || q.topic_id
      const questionText = q.question
      const options = q.options
      const correct = q.correct
      const explanation = q.explanation
      const difficulty = q.difficulty || 'medium'
      const visual = q.visual || null

      if (!topicId || !validTopicIds.includes(topicId)) {
        errors.push({ index, error: 'Invalid or missing topicId for exam type', topicId })
        continue
      }
      if (!questionText || typeof questionText !== 'string' || questionText.trim().length < 10) {
        errors.push({ index, error: 'Invalid or missing question text' })
        continue
      }
      if (!Array.isArray(options) || options.length < 2) {
        errors.push({ index, error: 'options must be an array with at least 2 items' })
        continue
      }
      if (typeof correct !== 'number' || correct < 0 || correct >= options.length) {
        errors.push({ index, error: 'correct must be a 0-based valid index in options array' })
        continue
      }
      if (!explanation || typeof explanation !== 'string' || explanation.trim().length < 5) {
        errors.push({ index, error: 'Invalid or missing explanation' })
        continue
      }
      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        errors.push({ index, error: 'difficulty must be easy, medium, or hard' })
        continue
      }

      const { error: insertError } = await supabase.from('questions').insert({
        topic_id: topicId,
        exam_type: examType,
        created_by: null,
        question: questionText.trim(),
        visual,
        options,
        correct,
        explanation: explanation.trim(),
        difficulty,
      })

      if (insertError) {
        // Allow duplicate question skip
        errors.push({ index, error: insertError.message })
      } else {
        inserted.push(index)
      }
    }

    return NextResponse.json({ inserted: inserted.length, errors })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 404 })
}
