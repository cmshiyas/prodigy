import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'

export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const payload = await verifyGoogleToken(authHeader.split(' ')[1])
    const { sub: google_id } = payload
    const supabase = getSupabase()

    const { data: user, error: userErr } = await supabase
      .from('users').select('*').eq('google_id', google_id).single()

    if (userErr || !user) return NextResponse.json({ error: 'User not found' }, { status: 401 })
    if (user.status !== 'approved') return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const body = await request.json()
    const { questionId, selectedOption, responseTimeSeconds } = body

    if (!questionId || selectedOption === undefined) {
      return NextResponse.json({ error: 'questionId and selectedOption are required' }, { status: 400 })
    }

    // Get the question to check if the answer is correct
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('correct')
      .eq('id', questionId)
      .single()

    if (questionError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const isCorrect = selectedOption === question.correct

    // Record the response
    const { error: responseError } = await supabase
      .from('question_responses')
      .upsert({
        user_id: user.id,
        question_id: questionId,
        selected_option: selectedOption,
        is_correct: isCorrect,
        response_time_seconds: responseTimeSeconds || null
      }, {
        onConflict: ['user_id', 'question_id']
      })

    if (responseError) {
      console.error('Failed to record response:', responseError)
      return NextResponse.json({ error: 'Failed to record response' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      isCorrect,
      correctAnswer: question.correct
    })

  } catch (err) {
    console.error('Record response error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}