import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = getSupabase()
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('exam_dates')
      .select('id, exam, label, date, end_date, tag, note')
      .gte('date', today)
      .order('date', { ascending: true })
    if (error) return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
    return NextResponse.json({ dates: data || [] }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  } catch (err) {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
