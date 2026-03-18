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

    const [{ data, error }, { data: allPracticeTests }] = await Promise.all([
      supabase.from('questions').select('question_source, paper_year, paper_years, topic_id').eq('exam_type', examType),
      supabase.from('practice_tests').select('paper_year, question_source, title, is_published').eq('exam_type', examType),
    ])

    if (error) return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })

    // Build set of unpublished test identifiers and title map
    const unpublishedSet = new Set()
    const titleMap = {}
    for (const t of allPracticeTests || []) {
      const key = `${t.question_source}::${t.paper_year}`
      if (!t.is_published) unpublishedSet.add(key)
      titleMap[key] = t.title
    }

    const topicsConfig = EXAM_TOPICS[examType] || []

    // Group by (source, year), with per-topic counts
    // A question may appear in multiple practice tests via paper_years array
    const groupMap = {}
    for (const q of data || []) {
      const source = q.question_source || 'sample'
      const tid = q.topic_id || 'unknown'
      // Expand by paper_years if present, otherwise fall back to single paper_year
      const years = (q.paper_years?.length ? q.paper_years : (q.paper_year ? [q.paper_year] : [null]))
      const seenKeys = new Set() // avoid double-counting if paper_years has duplicates
      for (const year of years) {
        const key = `${source}::${year ?? ''}`
        if (seenKeys.has(key)) continue
        seenKeys.add(key)
        // Skip groups belonging to unpublished practice tests
        if (unpublishedSet.has(key)) continue
        if (!groupMap[key]) groupMap[key] = { question_source: source, paper_year: year, topicCounts: {}, total_count: 0 }
        groupMap[key].total_count++
        groupMap[key].topicCounts[tid] = (groupMap[key].topicCounts[tid] || 0) + 1
      }
    }

    const groups = Object.values(groupMap).map(g => ({
      question_source: g.question_source,
      paper_year: g.paper_year,
      title: titleMap[`${g.question_source}::${g.paper_year}`] || null,
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
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
