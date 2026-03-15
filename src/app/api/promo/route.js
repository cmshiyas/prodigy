import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

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

    const { code } = await request.json()
    if (!code) return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })

    const { data: promo, error: promoErr } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .single()

    if (promoErr || !promo) return NextResponse.json({ error: 'Invalid promo code' }, { status: 404 })
    if (!promo.is_active) return NextResponse.json({ error: 'This promo code is no longer active' }, { status: 400 })
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 })
    }
    if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
      return NextResponse.json({ error: 'This promo code has reached its usage limit' }, { status: 400 })
    }

    // Check if user already redeemed this code
    const { data: existing } = await supabase
      .from('promo_redemptions')
      .select('id')
      .eq('promo_code_id', promo.id)
      .eq('user_id', user.id)
      .single()
    if (existing) return NextResponse.json({ error: 'You have already used this promo code' }, { status: 400 })

    // Don't downgrade
    const tierOrder = { silver: 0, gold: 1, platinum: 2, admin: 3 }
    if (user.tier !== 'silver' && (tierOrder[promo.tier] || 0) <= (tierOrder[user.tier] || 0)) {
      return NextResponse.json({ error: `You are already on the ${user.tier} plan or higher` }, { status: 400 })
    }

    const tierExpiresAt = promo.duration_days
      ? new Date(Date.now() + promo.duration_days * 24 * 60 * 60 * 1000).toISOString()
      : null

    await supabase.from('users').update({
      tier: promo.tier,
      promo_expires_at: tierExpiresAt,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    await supabase.from('promo_redemptions').insert({
      promo_code_id: promo.id,
      user_id: user.id,
      tier_granted: promo.tier,
      tier_expires_at: tierExpiresAt,
    })

    await supabase.from('promo_codes').update({ uses_count: promo.uses_count + 1 }).eq('id', promo.id)

    const expiryStr = tierExpiresAt
      ? ` Valid until ${new Date(tierExpiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.`
      : ' (Permanent)'

    return NextResponse.json({
      ok: true,
      tier: promo.tier,
      expiresAt: tierExpiresAt,
      message: `Upgraded to ${promo.tier.charAt(0).toUpperCase() + promo.tier.slice(1)}!${expiryStr}`,
    })
  } catch (err) {
    console.error('Promo error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
