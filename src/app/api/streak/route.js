import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { resolveActiveUser } from '@/lib/resolveUser'

export const dynamic = 'force-dynamic'

const HABIT_THRESHOLD = 10

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = await verifyGoogleToken(token)
    const { sub: google_id } = payload
    const supabase = getSupabase()

    const resolved = await resolveActiveUser(supabase, google_id, request)
    if (resolved.error) return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    const { user } = resolved

    // Fetch all quiz attempts for this user
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('created_at, total_questions')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    // Aggregate total questions per UTC day
    const dayMap = {}
    for (const attempt of (attempts || [])) {
      const date = attempt.created_at.slice(0, 10) // YYYY-MM-DD
      dayMap[date] = (dayMap[date] || 0) + attempt.total_questions
    }

    // A day is "completed" if >= 10 questions were attempted
    const completedSet = new Set(
      Object.entries(dayMap)
        .filter(([, count]) => count >= HABIT_THRESHOLD)
        .map(([date]) => date)
    )

    // Today (UTC)
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const todayCount = dayMap[todayStr] || 0
    const todayCompleted = todayCount >= HABIT_THRESHOLD

    // Compute current streak going backwards from today
    let currentStreak = 0
    const checkDate = new Date(todayStr + 'T00:00:00Z')
    if (!todayCompleted) checkDate.setUTCDate(checkDate.getUTCDate() - 1)

    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10)
      if (completedSet.has(dateStr)) {
        currentStreak++
        checkDate.setUTCDate(checkDate.getUTCDate() - 1)
      } else {
        break
      }
    }

    // Compute longest ever streak
    const sortedDates = Array.from(completedSet).sort()
    let longestStreak = 0
    let tempStreak = 0
    let prevDate = null
    for (const dateStr of sortedDates) {
      if (!prevDate) {
        tempStreak = 1
      } else {
        const diffMs = new Date(dateStr + 'T00:00:00Z') - new Date(prevDate + 'T00:00:00Z')
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        tempStreak = diffDays === 1 ? tempStreak + 1 : 1
      }
      longestStreak = Math.max(longestStreak, tempStreak)
      prevDate = dateStr
    }

    // Build last 30 days for calendar heatmap
    const recentDays = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayStr + 'T00:00:00Z')
      d.setUTCDate(d.getUTCDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      recentDays.push({
        date: dateStr,
        count: dayMap[dateStr] || 0,
        completed: completedSet.has(dateStr),
        isToday: dateStr === todayStr,
      })
    }

    return NextResponse.json({
      currentStreak,
      longestStreak,
      todayCompleted,
      todayCount,
      recentDays,
      totalActiveDays: completedSet.size,
      habitThreshold: HABIT_THRESHOLD,
    })
  } catch (err) {
    console.error('Streak API error:', err.message)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
