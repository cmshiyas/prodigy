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

    let sQuery = supabase.from('subtopics').select('topic_id, name')
    let tQuery = supabase.from('topics').select('id, name')
    if (examType) {
      sQuery = sQuery.eq('exam_type', examType)
      tQuery = tQuery.eq('exam_type', examType)
    }

    const [{ data: sData, error: sError }, { data: tData }] = await Promise.all([sQuery, tQuery])

    if (sError) {
      console.error('Failed to fetch subtopics:', sError)
      return NextResponse.json({ error: 'Failed to fetch subtopics' }, { status: 500 })
    }

    // Build subtopics map { topicId: [name, ...] }
    const subtopics = {}
    for (const row of sData || []) {
      if (!subtopics[row.topic_id]) subtopics[row.topic_id] = []
      subtopics[row.topic_id].push(row.name)
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
