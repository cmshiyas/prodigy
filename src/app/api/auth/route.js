import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { ADMIN_EMAIL } from '@/lib/constants'
import { getReferralConfig } from '@/lib/referralConfig'
import { randomBytes } from 'crypto'

function generateReferralCode() {
  return randomBytes(4).toString('hex').toUpperCase()
}

export async function POST(request) {
  try {
    const { credential, referralCode } = await request.json()
    if (!credential) return NextResponse.json({ error: 'Missing credential' }, { status: 400 })

    const payload = await verifyGoogleToken(credential)
    const { email, name, picture, sub: google_id } = payload
    const isAdmin = email === ADMIN_EMAIL
    const supabase = getSupabase()

    // Look up by google_id first, then fall back to email
    // (handles the case where a placeholder row exists with the email but wrong google_id)
    let { data: existing } = await supabase
      .from('users').select('*').eq('google_id', google_id).single()

    if (!existing) {
      const { data: byEmail } = await supabase
        .from('users').select('*').eq('email', email).single()
      if (byEmail) {
        // Update the placeholder row with the real google_id
        const { data, error } = await supabase
          .from('users')
          .update({ google_id, name, picture, is_admin: isAdmin, updated_at: new Date().toISOString() })
          .eq('email', email).select().single()
        if (error) throw new Error('DB update failed: ' + error.message)
        return respond(supabase, data)
      }
    }

    let user
    if (existing) {
      // Update profile info
      const { data, error } = await supabase
        .from('users')
        .update({ name, picture, updated_at: new Date().toISOString() })
        .eq('google_id', google_id).select().single()
      if (error) throw new Error('DB update failed: ' + error.message)
      user = data
    } else {
      // Brand new user (auto-approved)
      // Look up referrer if a referral code was provided
      let referredBy = null
      let referrer = null
      if (referralCode) {
        const { data: referrerData } = await supabase
          .from('users').select('id, tier').eq('referral_code', referralCode).single()
        if (referrerData) { referredBy = referrerData.id; referrer = referrerData }
      }
      const { data, error } = await supabase
        .from('users')
        .insert({ google_id, email, name, picture, is_admin: isAdmin, status: 'approved', tier: isAdmin ? 'admin' : 'silver', referral_code: generateReferralCode(), referred_by: referredBy })
        .select().single()
      if (error) throw new Error('DB insert failed: ' + error.message)
      user = data

      // Auto-upgrade referrer if they've hit a threshold
      if (referrer) await checkAndUpgradeReferrer(supabase, referrer)
    }

    return respond(supabase, user)

  } catch (err) {
    console.error('Auth error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function checkAndUpgradeReferrer(supabase, referrer) {
  // Don't touch admins or users already on platinum
  if (referrer.tier === 'admin' || referrer.tier === 'platinum') return

  const { count } = await supabase
    .from('users').select('id', { count: 'exact', head: true }).eq('referred_by', referrer.id)

  const { goldCount, platinumCount } = await getReferralConfig(supabase)

  let newTier = null
  if (count >= platinumCount) newTier = 'platinum'
  else if (count >= goldCount && referrer.tier !== 'platinum') newTier = 'gold'

  if (newTier && newTier !== referrer.tier) {
    await supabase.from('users').update({ tier: newTier, updated_at: new Date().toISOString() }).eq('id', referrer.id)
    console.log(`Referral reward: upgraded user ${referrer.id} to ${newTier} (${count} referrals)`)
  }
}

async function respond(supabase, user) {
  // Backfill referral code for users who don't have one yet
  if (!user.referral_code) {
    const { data: updated } = await supabase
      .from('users').update({ referral_code: generateReferralCode() })
      .eq('id', user.id).select().single()
    if (updated) user = updated
  }

  // Check if a promo-based tier upgrade has expired
  if (user.promo_expires_at && new Date(user.promo_expires_at) < new Date() && user.tier !== 'admin') {
    const { count: refCount } = await supabase
      .from('users').select('id', { count: 'exact', head: true }).eq('referred_by', user.id)
    const { goldCount, platinumCount } = await getReferralConfig(supabase)
    let revertTier = 'silver'
    if ((refCount || 0) >= platinumCount) revertTier = 'platinum'
    else if ((refCount || 0) >= goldCount) revertTier = 'gold'
    const { data: reverted } = await supabase
      .from('users').update({ tier: revertTier, promo_expires_at: null, updated_at: new Date().toISOString() })
      .eq('id', user.id).select().single()
    if (reverted) user = reverted
    console.log(`Promo expired: reverted user ${user.id} to ${revertTier}`)
  }

  const today = new Date().toISOString().split('T')[0]
  const { data: usage } = await supabase
    .from('token_usage').select('tokens_used').eq('user_id', user.id).eq('date', today).single()
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, picture: user.picture, status: user.status, tier: user.tier, is_admin: user.is_admin, referral_code: user.referral_code },
    tokensUsedToday: usage?.tokens_used || 0,
  })
}
