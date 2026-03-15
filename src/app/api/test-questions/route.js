import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { EXAM_TYPES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    await verifyGoogleToken(authHeader.split(' ')[1])
    const supabase = getSupabase()

    const { searchParams } = new URL(request.url)
    const examType = searchParams.get('examType') || 'OC'
    const source = searchParams.get('source')
    const paperYear = searchParams.get('paperYear') || null
    const topicId = searchParams.get('topicId')

    const validExamIds = EXAM_TYPES.map(e => e.id)
    if (!validExamIds.includes(examType)) return NextResponse.json({ error: 'Invalid exam type' }, { status: 400 })
    if (!source) return NextResponse.json({ error: 'source is required' }, { status: 400 })
    if (!topicId) return NextResponse.json({ error: 'topicId is required' }, { status: 400 })

    let query = supabase
      .from('questions')
      .select('id, question, visual, options, correct, explanation, difficulty, topic_id, subtopic, image_url, image_urls')
      .eq('exam_type', examType)
      .eq('topic_id', topicId)
      .eq('question_source', source)

    if (source === 'past_paper' && paperYear) {
      query = query.eq('paper_year', paperYear)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const questions = (data || []).map(q => ({
      id: q.id,
      question: q.question,
      visual: q.visual || null,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation,
      difficulty: q.difficulty,
      topicId: q.topic_id,
      subtopic: q.subtopic || null,
      image_url: q.image_url || null,
      image_urls: q.image_urls?.length ? q.image_urls : (q.image_url ? [q.image_url] : []),
    }))

    return NextResponse.json({ questions })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
