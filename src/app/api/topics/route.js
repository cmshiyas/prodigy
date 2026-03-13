import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    await verifyGoogleToken(authHeader.split(' ')[1])
    const supabase = getSupabase()

    const url = new URL(request.url)
    const examType = url.searchParams.get('examType')

    let qQuery = supabase.from('questions').select('topic_id, subtopic').not('subtopic', 'is', null)
    let tQuery = supabase.from('topics').select('id, name')
    if (examType) {
      qQuery = qQuery.eq('exam_type', examType)
      tQuery = tQuery.eq('exam_type', examType)
    }

    const [{ data: qData, error: qError }, { data: tData }] = await Promise.all([qQuery, tQuery])

    if (qError) {
      console.error('Failed to fetch topics:', qError)
      return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })
    }

    // Build subtopics map { topicId: [subtopic, ...] }
    const subtopicsMap = {}
    for (const row of qData || []) {
      if (!subtopicsMap[row.topic_id]) subtopicsMap[row.topic_id] = new Set()
      subtopicsMap[row.topic_id].add(row.subtopic)
    }
    const subtopics = {}
    for (const [topicId, set] of Object.entries(subtopicsMap)) {
      subtopics[topicId] = [...set]
    }

    // Build topic names map { topicId: name }
    const topicNames = {}
    for (const t of tData || []) topicNames[t.id] = t.name

    return NextResponse.json({ subtopics, topicNames })
  } catch (err) {
    console.error('Topics API error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
