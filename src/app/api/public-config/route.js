import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getReferralConfig } from '@/lib/referralConfig'

export const dynamic = 'force-dynamic'

// Public — no auth required. Returns UI-facing config values.
export async function GET() {
  try {
    const supabase = getSupabase()
    const config = await getReferralConfig(supabase)
    return NextResponse.json(config, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
  } catch (err) {
    // Return defaults on error so the UI never breaks
    return NextResponse.json({ goldCount: 3, platinumCount: 5, goldBenefit: 'Free Gold access — permanently', platinumBenefit: 'Free Platinum access — permanently' }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
  }
}
