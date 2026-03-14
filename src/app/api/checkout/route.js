import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

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

    const { tier } = await request.json()
    const PRICE_IDS = { gold: process.env.STRIPE_PRICE_GOLD, platinum: process.env.STRIPE_PRICE_PLATINUM }
    const priceId = PRICE_IDS[tier]
    if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.selfpaced.com.au'

    // Reuse existing Stripe customer if we have one
    let customerId = user.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/?checkout=success&tier=${tier}`,
      cancel_url:  `${baseUrl}/?checkout=cancel`,
      metadata: { user_id: user.id, tier },
      subscription_data: { metadata: { user_id: user.id, tier } },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
