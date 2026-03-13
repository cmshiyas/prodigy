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

    let query = supabase
      .from('questions')
      .select('topic_id, subtopic')
      .not('subtopic', 'is', null)

    if (examType) query = query.eq('exam_type', examType)

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch topics:', error)
      return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })
    }

    // Build { topicId: [subtopic, ...] } with unique values
    const subtopicsMap = {}
    for (const row of data) {
      if (!subtopicsMap[row.topic_id]) subtopicsMap[row.topic_id] = new Set()
      subtopicsMap[row.topic_id].add(row.subtopic)
    }

    const result = {}
    for (const [topicId, set] of Object.entries(subtopicsMap)) {
      result[topicId] = [...set]
    }

    return NextResponse.json({ subtopics: result })
  } catch (err) {
    console.error('Topics API error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
