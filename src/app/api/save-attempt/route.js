import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { EXAM_TYPES } from '@/lib/constants'
import { resolveActiveUser } from '@/lib/resolveUser'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    const { score, totalQuestions, correctAnswers, durationSeconds, topics, examType, idToken } = body

    // Accept token from Authorization header (normal) or body (sendBeacon on unload)
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : idToken
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = await verifyGoogleToken(token)
    const { sub: google_id } = payload
    const supabase = getSupabase()

    // Build a minimal request-like object so resolveActiveUser can read the child header
    const childId = request.headers.get('x-child-id')
    const fakeReq = { headers: { get: (h) => h === 'x-child-id' ? childId : null } }
    const resolved = await resolveActiveUser(supabase, google_id, fakeReq)
    if (resolved.error) return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    const { user } = resolved
    const validExamIds = EXAM_TYPES.map(item => item.id)
    const exam = validExamIds.includes(examType) ? examType : 'OC'

    const { error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        exam_type: exam,
        score,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        duration_seconds: durationSeconds,
        topics
      })

    if (error) {
      console.error('Failed to save quiz attempt:', error)
      return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Save attempt API error:', err.message)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}