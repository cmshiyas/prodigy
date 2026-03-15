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
    const validExamIds = EXAM_TYPES.map(e => e.id)
    if (!validExamIds.includes(examType)) return NextResponse.json({ error: 'Invalid exam type' }, { status: 400 })

    const { data, error } = await supabase
      .from('questions')
      .select('question_source, paper_year')
      .eq('exam_type', examType)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Group and count
    const groupMap = {}
    for (const q of data || []) {
      const source = q.question_source || 'sample'
      const year = q.paper_year || null
      const key = `${source}::${year || ''}`
      if (!groupMap[key]) groupMap[key] = { question_source: source, paper_year: year, count: 0 }
      groupMap[key].count++
    }

    // Sort: past_paper first (newest year first), then sample
    const groups = Object.values(groupMap).sort((a, b) => {
      if (a.question_source !== b.question_source) return a.question_source === 'past_paper' ? -1 : 1
      if (a.paper_year && b.paper_year) return b.paper_year.localeCompare(a.paper_year)
      return 0
    })

    return NextResponse.json({ groups })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
