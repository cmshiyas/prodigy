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
    // Fetch question stats per topic and per creator
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, topic_id, created_by')

    if (questionsError) return NextResponse.json({ error: questionsError.message }, { status: 500 })

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')

    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

    const topicCounts = {}
    const userCounts = {}

    questions.forEach(q => {
      topicCounts[q.topic_id] = (topicCounts[q.topic_id] || 0) + 1
      if (q.created_by) {
        userCounts[q.created_by] = (userCounts[q.created_by] || 0) + 1
      }
    })

    const topics = Object.entries(topicCounts).map(([topicId, count]) => ({ topicId, count }))
    const userMap = Object.fromEntries(users.map(u => [u.id, u]))

    const userRanking = Object.entries(userCounts)
      .map(([userId, count]) => ({
        userId,
        count,
        name: userMap[userId]?.name || 'Unknown',
        email: userMap[userId]?.email || ''
      }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ topics, users: userRanking })
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
      const { PDFParse } = require('pdf-parse')
      const parser = new PDFParse({ data: new Uint8Array(fileBuffer) })
      await parser.load()
      const pages = await parser.getText()
      text = Array.isArray(pages) ? pages.map(p => p.text || p).join('\n') : String(pages)
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

    const prompt = `You are an AI assistant that extracts exam questions from PDF text for ${examType}.

Extract all questions from the text below. For each question identify the topic, subtopic, options, correct answer index (0-based), explanation, and difficulty (easy/medium/hard).

IMPORTANT: You MUST respond with ONLY a valid JSON object. No explanations, no markdown, no prose. If no questions are found, return empty arrays.

Required format:
{"topics":[{"id":"string","name":"string","subtopics":["string"]}],"extractedQuestions":[{"topicId":"string","subtopic":"string","question":"string","options":["string"],"correct":0,"explanation":"string","difficulty":"easy"}]}

PDF text:
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
    const insertedQuestions = []
    const questionErrors = []

    for (const [idx, q] of questions.entries()) {
      if (!q || !q.topicId || !q.question || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correct !== 'number') {
        questionErrors.push({ idx, error: 'Invalid question format', q })
        continue
      }
      const insert = {
        topic_id: q.topicId,
        exam_type: examType,
        subtopic: q.subtopic || null,
        created_by: null,
        question: q.question,
        visual: q.visual || null,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation || '',
        difficulty: q.difficulty && ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      }
      const { error: insertError } = await supabase.from('questions').insert(insert)
      if (insertError) {
        questionErrors.push({ idx, error: insertError.message })
      } else {
        insertedQuestions.push(q)
      }
    }

    return NextResponse.json({
      topics: parsedResponse.topics || [],
      inserted: insertedQuestions.length,
      errors: questionErrors,
      raw: null,
    })
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
