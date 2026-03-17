import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { ADMIN_EMAIL, EXAM_TOPICS, EXAM_TYPES, EXAM_YEAR_LEVELS } from '@/lib/constants'

async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Not authenticated')
  const payload = await verifyGoogleToken(authHeader.split(' ')[1])
  if (payload.email !== ADMIN_EMAIL) throw new Error('Not authorised')
}

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request) {
  try { await verifyAdmin(request) }
  catch (err) { return NextResponse.json({ error: err.message }, { status: 403 }) }

  const action = new URL(request.url).searchParams.get('action')
  const supabase = getSupabase()

  if (action === 'users') {
    const { data: users, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users })
  }

  if (action === 'config') {
    const { data, error } = await supabase.from('config').select('key, value').limit(1000)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ config: data })
  }

  if (action === 'quizBank') {
    // Fetch question stats per topic, exam type, and creator
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, topic_id, exam_type, created_by, year_level')

    if (questionsError) return NextResponse.json({ error: questionsError.message }, { status: 500 })

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')

    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

    const topicExamCounts = {}
    const examCounts = {}
    const userCounts = {}
    const yearBreakdown = {}

    questions.forEach(q => {
      const exam = q.exam_type || 'Unknown'
      if (!topicExamCounts[q.topic_id]) topicExamCounts[q.topic_id] = {}
      topicExamCounts[q.topic_id][exam] = (topicExamCounts[q.topic_id][exam] || 0) + 1
      examCounts[exam] = (examCounts[exam] || 0) + 1
      if (q.created_by) {
        userCounts[q.created_by] = (userCounts[q.created_by] || 0) + 1
      }
      const key = `${q.exam_type}::${q.year_level || 'unset'}`
      yearBreakdown[key] = (yearBreakdown[key] || 0) + 1
    })

    const yearBreakdownArr = Object.entries(yearBreakdown).map(([key, count]) => {
      const [examType, yearLevel] = key.split('::')
      return { examType, yearLevel, count }
    }).sort((a, b) => a.examType.localeCompare(b.examType) || a.yearLevel.localeCompare(b.yearLevel))

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

    return NextResponse.json({ topics, examBreakdown, yearBreakdown: yearBreakdownArr, users: userRanking, total: questions.length })
  }

  if (action === 'analytics') {
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const since7  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { data: allUsers },
      { data: allQuestions },
      { data: responses30 },
      { data: newUsers30 },
    ] = await Promise.all([
      supabase.from('users').select('id, name, email, status, tier, created_at'),
      supabase.from('questions').select('id, exam_type, created_at'),
      supabase.from('question_responses').select('user_id, is_correct, created_at').gte('created_at', since30),
      supabase.from('users').select('id, created_at').gte('created_at', since30),
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
    })
  }

  if (action === 'promos') {
    const { data: promos, error } = await supabase
      .from('promo_codes')
      .select('id, code, tier, duration_days, max_uses, uses_count, expires_at, is_active, created_at')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ promos })
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

  if (action === 'referrals') {
    const search   = new URL(request.url).searchParams.get('search') || ''
    const page     = Math.max(1, parseInt(new URL(request.url).searchParams.get('page') || '1') || 1)
    const pageSize = 50
    const offset   = (page - 1) * pageSize

    // Fetch all users with a referrer, joining referrer details
    let query = supabase
      .from('users')
      .select('id, name, email, tier, created_at, referral_code, referred_by, referrer:referred_by(id, name, email)', { count: 'exact' })
      .not('referred_by', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Top referrers summary
    const { data: allReferred } = await supabase
      .from('users')
      .select('referred_by, referrer:referred_by(id, name, email)')
      .not('referred_by', 'is', null)

    const referrerMap = {}
    ;(allReferred || []).forEach(u => {
      if (!u.referrer) return
      const key = u.referred_by
      if (!referrerMap[key]) referrerMap[key] = { ...u.referrer, count: 0 }
      referrerMap[key].count++
    })
    const topReferrers = Object.values(referrerMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return NextResponse.json({ referrals: data, total: count || 0, page, pageSize, topReferrers })
  }

  if (action === 'examDates') {
    const { data, error } = await supabase
      .from('exam_dates')
      .select('id, exam, label, date, end_date, tag, note, created_at')
      .order('date', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ dates: data || [] })
  }

  if (action === 'feedbacks') {
    const page     = Math.max(1, parseInt(new URL(request.url).searchParams.get('page') || '1') || 1)
    const pageSize = 30
    const offset   = (page - 1) * pageSize
    const { data, error, count } = await supabase
      .from('feedback')
      .select('id, user_name, user_email, message, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ feedbacks: data, total: count || 0, page, pageSize })
  }

  if (action === 'duplicates') {
    // Fetch all questions (lean select) and find duplicates by normalised text
    const { data: allQs, error } = await supabase
      .from('questions')
      .select('id, question, exam_type, topic_id, subtopic, year_level, difficulty, created_at')
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const groups = {}
    for (const q of allQs || []) {
      const key = q.question.trim().toLowerCase().replace(/\s+/g, ' ')
      if (!groups[key]) groups[key] = []
      groups[key].push(q)
    }
    const duplicateGroups = Object.values(groups)
      .filter(g => g.length > 1)
      .sort((a, b) => b.length - a.length)

    return NextResponse.json({ groups: duplicateGroups, totalDuplicateGroups: duplicateGroups.length, totalExtraRows: duplicateGroups.reduce((s, g) => s + g.length - 1, 0) })
  }

  if (action === 'questions') {
    const url = new URL(request.url)
    const examType     = url.searchParams.get('examType')     || ''
    const topicId      = url.searchParams.get('topicId')      || ''
    const search       = url.searchParams.get('search')       || ''
    const uploadSource = url.searchParams.get('uploadSource') || ''
    const paperYear    = url.searchParams.get('paperYear')    || ''
    const page         = Math.max(1, parseInt(url.searchParams.get('page') || '1') || 1)
    const pageSize = 20
    const offset   = (page - 1) * pageSize

    let query = supabase
      .from('questions')
      .select('id, topic_id, exam_type, subtopic, year_level, difficulty, question, options, correct, explanation, visual, image_url, image_urls, question_source, paper_year, created_at, upload_source', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (examType)     query = query.eq('exam_type', examType)
    if (topicId)      query = query.eq('topic_id', topicId)
    if (search)       query = query.ilike('question', `%${search}%`)
    if (uploadSource === 'none') query = query.is('upload_source', null)
    else if (uploadSource) query = query.eq('upload_source', uploadSource)
    if (paperYear)    query = query.eq('paper_year', paperYear)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ questions: data, total: count || 0, page, pageSize })
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

  if (action === 'createPromo') {
    const { code, tier, duration_days, max_uses, expires_at } = await request.json()
    if (!code || !tier) return NextResponse.json({ error: 'code and tier are required' }, { status: 400 })
    const { data, error } = await supabase.from('promo_codes').insert({
      code: code.toUpperCase().trim(),
      tier,
      duration_days: duration_days || null,
      max_uses: max_uses || null,
      expires_at: expires_at || null,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ promo: data })
  }

  if (action === 'togglePromo') {
    const { promoId, isActive } = await request.json()
    if (!promoId) return NextResponse.json({ error: 'promoId required' }, { status: 400 })
    const { data, error } = await supabase.from('promo_codes').update({ is_active: isActive }).eq('id', promoId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ promo: data })
  }

  if (action === 'updatePromo') {
    const { promoId, code, tier, duration_days, max_uses, expires_at, is_active } = await request.json()
    if (!promoId) return NextResponse.json({ error: 'promoId required' }, { status: 400 })
    if (!code || !tier) return NextResponse.json({ error: 'code and tier are required' }, { status: 400 })
    const { data, error } = await supabase.from('promo_codes').update({
      code: code.toUpperCase().trim(),
      tier,
      duration_days: duration_days || null,
      max_uses: max_uses || null,
      expires_at: expires_at || null,
      is_active: is_active ?? true,
    }).eq('id', promoId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ promo: data })
  }

  if (action === 'deletePromo') {
    const { promoId } = await request.json()
    if (!promoId) return NextResponse.json({ error: 'promoId required' }, { status: 400 })
    const { error } = await supabase.from('promo_codes').delete().eq('id', promoId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'deleteUser') {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    // Prevent deleting the admin account
    const { data: target } = await supabase.from('users').select('email').eq('id', userId).single()
    if (target?.email === ADMIN_EMAIL) return NextResponse.json({ error: 'Cannot delete admin account' }, { status: 403 })
    const { error } = await supabase.from('users').delete().eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'updateQuestion') {
    const { questionId, question, options, correct, explanation, difficulty, subtopic, year_level, image_urls, question_source, paper_year } = await request.json()
    if (!questionId) return NextResponse.json({ error: 'questionId required' }, { status: 400 })
    const urls = Array.isArray(image_urls) ? image_urls.filter(Boolean) : []
    const source = question_source === 'past_paper' ? 'past_paper' : 'sample'
    const { data, error } = await supabase.from('questions').update({
      question,
      options,
      correct: parseInt(correct),
      explanation,
      difficulty,
      subtopic: subtopic || null,
      year_level: year_level || null,
      image_url: urls[0] || null,
      image_urls: urls.length > 0 ? urls : null,
      question_source: source,
      paper_year: paper_year || null,
    }).eq('id', questionId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ question: data })
  }

  if (action === 'createExamDate') {
    const { exam, label, date, end_date, tag, note } = await request.json()
    if (!exam || !label || !date || !tag) return NextResponse.json({ error: 'exam, label, date and tag are required' }, { status: 400 })
    const { data, error } = await supabase.from('exam_dates')
      .insert({ exam, label, date, end_date: end_date || null, tag, note: note || null })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ date: data })
  }

  if (action === 'updateExamDate') {
    const { id, exam, label, date, end_date, tag, note } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    if (!exam || !label || !date || !tag) return NextResponse.json({ error: 'exam, label, date and tag are required' }, { status: 400 })
    const { data, error } = await supabase.from('exam_dates')
      .update({ exam, label, date, end_date: end_date || null, tag, note: note || null })
      .eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ date: data })
  }

  if (action === 'deleteExamDate') {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await supabase.from('exam_dates').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'deleteQuestion') {
    const { questionId } = await request.json()
    if (!questionId) return NextResponse.json({ error: 'questionId required' }, { status: 400 })
    const { error } = await supabase.from('questions').delete().eq('id', questionId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'deleteQuestions') {
    const { questionIds } = await request.json()
    if (!Array.isArray(questionIds) || !questionIds.length) return NextResponse.json({ error: 'questionIds required' }, { status: 400 })
    const { error } = await supabase.from('questions').delete().in('id', questionIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'uploadImage') {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof Blob)) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

    const ext = (file.name || 'image').split('.').pop().toLowerCase()
    const fileName = `questions/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, buffer, { contentType: file.type, upsert: false })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName)
    return NextResponse.json({ url: publicUrl })
  }

  if (action === 'uploadPdf') {
    const formData = await request.formData()
    const examType = formData.get('examType')?.toString() || ''
    const topicId = formData.get('topicId')?.toString() || ''
    const yearLevel = formData.get('yearLevel')?.toString() || ''
    const questionSource = formData.get('questionSource')?.toString() === 'past_paper' ? 'past_paper' : 'sample'
    const paperYear = formData.get('paperYear')?.toString() || ''
    const file = formData.get('file')
    const format = formData.get('format')?.toString() === 'reading' ? 'reading' : 'standard'
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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
    }

    // Extract text via pdf-parse (fast)
    let text = ''
    try {
      const pdfParse = require('pdf-parse')
      const result = await pdfParse(fileBuffer)
      text = result.text || ''
    } catch (err) {
      return NextResponse.json({ error: 'Failed to parse PDF: ' + err.message }, { status: 500 })
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'PDF contains no extractable text' }, { status: 400 })
    }

    // Extract images from PDF pages with images and upload to Supabase (parallel, capped at 10 pages)
    const pageImageUrls = {}
    try {
      const { createCanvas } = require('@napi-rs/canvas')
      const pdfjs = require('pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js')

      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(fileBuffer) })
      const pdfDoc = await loadingTask.promise

      const imagePageNums = []
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum)
        const ops = await page.getOperatorList()
        const hasImage = ops.fnArray.some(fn =>
          fn === pdfjs.OPS.paintJpegXObject ||
          fn === pdfjs.OPS.paintImageXObject ||
          fn === pdfjs.OPS.paintInlineImageXObject
        )
        if (hasImage) imagePageNums.push(pageNum)
        if (imagePageNums.length >= 10) break
      }

      await Promise.all(imagePageNums.map(async (pageNum) => {
        const page = await pdfDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height))
        const ctx = canvas.getContext('2d')
        await page.render({ canvasContext: ctx, viewport }).promise
        const pngBuffer = canvas.toBuffer('image/png')
        const fileName = `questions/pdf-${Date.now()}-p${pageNum}.png`
        const { error: uploadErr } = await supabase.storage
          .from('images')
          .upload(fileName, pngBuffer, { contentType: 'image/png', upsert: false })
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName)
          pageImageUrls[pageNum] = publicUrl
        }
      }))
    } catch (imgErr) {
      console.error('PDF image extraction error:', imgErr.message)
      // Non-fatal: continue without images
    }

    const topicInstruction = topicId
      ? `All questions belong to topicId "${topicId}". Set topicId to "${topicId}" for every question.`
      : `Determine the appropriate topicId for each question based on its content.`

    const pageImageEntries = Object.entries(pageImageUrls)
    const imageContext = pageImageEntries.length > 0
      ? `\n\nThe following PDF pages contain images and have been uploaded:\n${pageImageEntries.map(([p, url]) => `Page ${p}: ${url}`).join('\n')}\nFor each question that references or relies on an image on one of these pages, include "image_urls": ["<url>"] using the matching page URL. Leave image_urls as [] if the question has no associated image.`
      : ''

    const trimmed = text.length > 16000 ? text.slice(0, 16000) : text

    const prompt = format === 'reading'
      ? `You are an expert ${examType} exam marker and question bank builder.

Below is the text of a READING exam paper. It contains one or more reading passages (stories, poems, articles, or sets of extracts) each followed by multiple choice questions.

For each passage block:
1. Capture the FULL passage text exactly as written (including the passage title if present). For multi-extract questions (e.g. "Extract A … Extract B …"), include all extracts together as the passage.
2. For every multiple choice question that follows the passage:
   a. Copy the question text exactly
   b. Copy all options (A–E) as an array in order
   c. SOLVE the question and set "correct" to the 0-based index (A=0, B=1, …)
   d. Write a confident, final explanation — no self-corrections, no "wait", no "let me recalculate"
   e. Set difficulty: easy / medium / hard
   f. Assign a subtopic (e.g. "Inference", "Vocabulary in context", "Main idea", "Author's purpose", "Text structure", "Figurative language")
   g. Set "passage" to the full passage text for that question group
   h. ${topicInstruction}${imageContext}

IMPORTANT: Respond with ONLY valid JSON, no markdown, no prose.

Required format:
{"topics":[{"id":"string","name":"string","subtopics":["string"]}],"extractedQuestions":[{"topicId":"string","subtopic":"string","passage":"full passage text","question":"string","options":["string"],"correct":2,"explanation":"string","difficulty":"easy","image_urls":[]}]}

Exam paper text:
${trimmed}`
      : `You are an expert ${examType} exam marker and question bank builder.

Below is the text of an exam paper. Extract every multiple choice question and do the following for each:
1. Copy the question text exactly
2. Copy all options (A-E) as an array in order
3. SOLVE the question and set "correct" to the 0-based index of the correct answer (A=0, B=1, C=2, D=3, E=4)
4. Write a brief step-by-step explanation of why that answer is correct. The explanation must be confident and final — no self-corrections, no "wait", no "let me recalculate". Present only the correct reasoning leading to the final answer.
5. Assign a subtopic (e.g. "Algebraic thinking", "Fractions", "Measurement", "Number operations", "Geometry", "Spatial reasoning", "Number patterns", "Problem solving", "Data & graphs")
6. Set difficulty: easy / medium / hard
7. ${topicInstruction}${imageContext}

IMPORTANT: Respond with ONLY valid JSON, no markdown, no prose.

Required format:
{"topics":[{"id":"string","name":"string","subtopics":["string"]}],"extractedQuestions":[{"topicId":"string","subtopic":"string","question":"string","options":["string"],"correct":2,"explanation":"string","difficulty":"easy","image_urls":[]}]}

Exam paper text:
${trimmed}`

    let anthropicRes
    try {
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 16000,
          system: 'You are a JSON-only responder. You must always respond with valid JSON and nothing else — no prose, no explanations, no apologies, no markdown. If you cannot extract questions, respond with {"topics":[],"extractedQuestions":[]}.',
          messages: [{ role: 'user', content: prompt }],
        }),
      })
    } catch (err) {
      return NextResponse.json({ error: 'Failed to reach Claude API: ' + err.message }, { status: 500 })
    }

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
      const preview = textOutput.slice(0, 300)
      return NextResponse.json({ error: `Claude returned non-JSON: "${preview}"` }, { status: 500 })
    }

    // Store extracted topics
    const topics = Array.isArray(parsedResponse.topics) ? parsedResponse.topics : []
    for (const t of topics) {
      if (!t.id || !t.name) continue
      await supabase.from('topics').upsert({ id: t.id, exam_type: examType, name: t.name }, { onConflict: 'id,exam_type' })
    }

    const questions = Array.isArray(parsedResponse.extractedQuestions) ? parsedResponse.extractedQuestions : []

    // Fetch existing questions for deduplication (include id and image_urls for backfill)
    const { data: existingQs } = await supabase
      .from('questions')
      .select('id, question, topic_id, image_urls, passage')
      .eq('exam_type', examType)
    // Map key → existing row so we can backfill images on duplicates
    const existingMap = new Map(
      (existingQs || []).map(q => [`${q.topic_id}::${q.question.trim().toLowerCase()}`, q])
    )

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
    const updatedQuestions = []
    const skippedQuestions = []
    const questionErrors = []

    const SELF_CORRECTION_PATTERNS = /\b(wait|let me recalculate|let me re-check|let me double.check|actually,|i made an error|i was wrong|correction:|re-checking|reconsider)\b/i

    for (const [idx, q] of questions.entries()) {
      if (!q || !q.topicId || !q.question || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correct !== 'number') {
        questionErrors.push({ idx, error: 'Invalid question format', q })
        continue
      }

      if (q.explanation && SELF_CORRECTION_PATTERNS.test(q.explanation)) {
        questionErrors.push({ idx, error: 'Explanation contains self-correction language — correct index may be wrong', q })
        continue
      }

      const resolvedTopicId = topicId || q.topicId
      const key = `${resolvedTopicId}::${q.question.trim().toLowerCase()}`
      const existing = existingMap.get(key)

      const qImageUrls = Array.isArray(q.image_urls) ? q.image_urls.filter(Boolean) : []

      if (existing) {
        // Backfill image_urls and/or passage if missing on the existing row
        const existingHasImages = Array.isArray(existing.image_urls) && existing.image_urls.length > 0
        const existingHasPassage = !!existing.passage
        const shouldUpdate = (!existingHasImages && qImageUrls.length > 0) || (!existingHasPassage && q.passage)
        if (shouldUpdate) {
          const updates = {}
          if (!existingHasImages && qImageUrls.length > 0) { updates.image_url = qImageUrls[0]; updates.image_urls = qImageUrls }
          if (!existingHasPassage && q.passage) updates.passage = q.passage
          const { error: updateErr } = await supabase.from('questions').update(updates).eq('id', existing.id)
          if (updateErr) {
            questionErrors.push({ idx, error: 'Backfill failed: ' + updateErr.message })
          } else {
            updatedQuestions.push(idx)
          }
        } else {
          skippedQuestions.push(idx)
        }
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
        passage: q.passage || null,
        options: shuffledOptions,
        correct: shuffledCorrect,
        explanation: q.explanation || '',
        difficulty: q.difficulty && ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
        year_level: yearLevel || null,
        question_source: questionSource,
        paper_year: paperYear || null,
        upload_source: 'PDF',
        image_url: qImageUrls[0] || null,
        image_urls: qImageUrls.length > 0 ? qImageUrls : null,
      }
      const { error: insertError } = await supabase.from('questions').insert(insert)
      if (insertError) {
        questionErrors.push({ idx, error: insertError.message })
      } else {
        insertedQuestions.push(q)
        existingMap.set(key, { id: null, image_urls: qImageUrls })
      }
    }

    return NextResponse.json({
      topics: parsedResponse.topics || [],
      inserted: insertedQuestions.length,
      updated: updatedQuestions.length,
      skipped: skippedQuestions.length,
      errors: questionErrors,
      raw: null,
    })
  }

  if (action === 'generateQuestions') {
    const { examType, topicId, subtopic, yearLevel, count = 10, questionSource, paperYear } = await request.json()
    const resolvedSource = questionSource === 'past_paper' ? 'past_paper' : 'sample'
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

    const yearLine = yearLevel ? `Year level: Year ${yearLevel}. Questions must be appropriate for NSW Year ${yearLevel} students.` : ''

    const prompt = `You are an expert ${examType} exam question writer for NSW Australia Year ${yearLevel || '4-6'} students.

Topic: ${topicDef.name}
${subtopicLine}
${yearLine}

Generate exactly ${n} unique, high-quality multiple-choice questions. Vary difficulty: 40% easy, 40% medium, 20% hard. Ensure every question is distinct — no duplicates or near-duplicates.

IMPORTANT: For each question, solve it yourself first, then place the correct answer at a RANDOM index (0–4). Do NOT always use index 0. The explanation must be confident and final — no self-corrections, no "wait", no "let me recalculate". Present only the correct reasoning leading to the final answer.

Respond with ONLY valid JSON (no markdown, no prose):
{"questions":[{"question":"...","visual":"optional text table or empty string","options":["A","B","C","D","E"],"correct":<0-based index>,"explanation":"step-by-step solution","difficulty":"easy|medium|hard","subtopic":"subtopic name"}]}`

    let anthropicRes
    try {
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 8000,
          system: 'You are a JSON-only responder. You must always respond with valid JSON and nothing else — no prose, no explanations, no apologies, no markdown. If you cannot generate questions, respond with {"questions":[]}.',
          messages: [{ role: 'user', content: prompt }],
        }),
      })
    } catch (err) {
      return NextResponse.json({ error: 'Failed to reach Claude API: ' + err.message }, { status: 500 })
    }

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
      const preview = textOutput.slice(0, 300)
      return NextResponse.json({ error: `Claude returned non-JSON: "${preview}"` }, { status: 500 })
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
        year_level: yearLevel || null,
        question_source: resolvedSource,
        paper_year: paperYear || null,
        upload_source: 'AI',
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
    const { examType, yearLevel, questions, questionSource, paperYear } = await request.json()
    const uploadSource = questionSource === 'past_paper' ? 'past_paper' : 'sample'
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
        year_level: yearLevel || null,
        question_source: uploadSource,
        paper_year: paperYear || null,
        upload_source: 'Json',
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
