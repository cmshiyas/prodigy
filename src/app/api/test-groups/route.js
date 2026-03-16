import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { EXAM_TYPES, EXAM_TOPICS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    await verifyGoogleToken(authHeader.split(' ')[1])
    const supabase = getSupabase()

    const { searchParams } = new URL(request.url)
    const examType = searchParams.get('examType') || 'OC'
    const validExamIds = EXAM_TYPES.map(e => e.id)
    if (!validExamIds.includes(examType)) return NextResponse.json({ error: 'Invalid exam type' }, { status: 400 })

    const { data, error } = await supabase
      .from('questions')
      .select('question_source, paper_year, topic_id')
      .eq('exam_type', examType)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const topicsConfig = EXAM_TOPICS[examType] || []

    // Group by (source, year), with per-topic counts
    const groupMap = {}
    for (const q of data || []) {
      const source = q.question_source || 'sample'
      const year = q.paper_year || null
      const key = `${source}::${year ?? ''}`
      if (!groupMap[key]) groupMap[key] = { question_source: source, paper_year: year, topicCounts: {}, total_count: 0 }
      groupMap[key].total_count++
      const tid = q.topic_id || 'unknown'
      groupMap[key].topicCounts[tid] = (groupMap[key].topicCounts[tid] || 0) + 1
    }

    const groups = Object.values(groupMap).map(g => ({
      question_source: g.question_source,
      paper_year: g.paper_year,
      total_count: g.total_count,
      topics: Object.entries(g.topicCounts)
        .map(([topic_id, count]) => ({
          topic_id,
          topic_name: topicsConfig.find(t => t.id === topic_id)?.name || topic_id,
          count,
        }))
        .sort((a, b) => {
          const ai = topicsConfig.findIndex(t => t.id === a.topic_id)
          const bi = topicsConfig.findIndex(t => t.id === b.topic_id)
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        }),
    }))

    // Sort: past_paper first (newest year first), then practice tests ascending by title
    groups.sort((a, b) => {
      if (a.question_source !== b.question_source) return a.question_source === 'past_paper' ? -1 : 1
      const ay = a.paper_year || ''
      const by = b.paper_year || ''
      if (a.question_source === 'past_paper') return by.localeCompare(ay, undefined, { numeric: true })
      return ay.localeCompare(by, undefined, { numeric: true })
    })

    return NextResponse.json({ groups }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
