import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { getReferralConfig } from '@/lib/referralConfig'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload = await verifyGoogleToken(authHeader.split(' ')[1])
    const supabase = getSupabase()

    // Look up by google_id first (matches auth route logic — avoids wrong row if duplicate emails exist)
    let { data: user } = await supabase
      .from('users').select('id, referral_code').eq('google_id', payload.sub).single()
    if (!user) {
      const { data: byEmail } = await supabase
        .from('users').select('id, referral_code').eq('email', payload.email).single()
      user = byEmail
    }
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Fetch referred users as rows (more reliable than head:true count)
    const [{ data: referredUsers, error: countError }, config] = await Promise.all([
      supabase.from('users').select('id').eq('referred_by', user.id),
      getReferralConfig(supabase),
    ])

    if (countError) console.error('Referral count error:', countError.message)

    return NextResponse.json({
      referral_code: user.referral_code,
      referral_count: referredUsers?.length ?? 0,
      goldCount: config.goldCount,
      platinumCount: config.platinumCount,
      goldBenefit: config.goldBenefit,
      platinumBenefit: config.platinumBenefit,
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
