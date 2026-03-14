import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabase } from '@/lib/supabase'
import { getReferralConfig } from '@/lib/referralConfig'

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const body = await request.text()
  const sig  = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getSupabase()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId  = session.metadata?.user_id
    const tier    = session.metadata?.tier

    if (userId && tier) {
      await supabase.from('users').update({
        tier,
        stripe_subscription_id: session.subscription,
        promo_expires_at: null,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
      console.log(`Stripe: upgraded user ${userId} to ${tier}`)
    }
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
    const subscription = event.data.object

    // Only act on cancellations / expirations
    if (event.type === 'customer.subscription.updated' && subscription.status !== 'canceled' && subscription.status !== 'unpaid') {
      return NextResponse.json({ received: true })
    }

    const userId = subscription.metadata?.user_id
    if (!userId) {
      // Fall back to looking up by stripe_subscription_id
      const { data: user } = await supabase
        .from('users').select('id, referred_by').eq('stripe_subscription_id', subscription.id).single()
      if (user) {
        const { count: refCount } = await supabase
          .from('users').select('id', { count: 'exact', head: true }).eq('referred_by', user.id)
        const { goldCount, platinumCount } = await getReferralConfig(supabase)
        let revertTier = 'silver'
        if ((refCount || 0) >= platinumCount) revertTier = 'platinum'
        else if ((refCount || 0) >= goldCount) revertTier = 'gold'
        await supabase.from('users').update({
          tier: revertTier,
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id)
        console.log(`Stripe: subscription cancelled — reverted user ${user.id} to ${revertTier}`)
      }
      return NextResponse.json({ received: true })
    }

    const { data: user } = await supabase.from('users').select('id, referred_by').eq('id', userId).single()
    if (user) {
      const { count: refCount } = await supabase
        .from('users').select('id', { count: 'exact', head: true }).eq('referred_by', user.id)
      const { goldCount, platinumCount } = await getReferralConfig(supabase)
      let revertTier = 'silver'
      if ((refCount || 0) >= platinumCount) revertTier = 'platinum'
      else if ((refCount || 0) >= goldCount) revertTier = 'gold'
      await supabase.from('users').update({
        tier: revertTier,
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
      console.log(`Stripe: subscription cancelled — reverted user ${userId} to ${revertTier}`)
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object
    console.warn(`Stripe: payment failed for customer ${invoice.customer}`)
  }

  return NextResponse.json({ received: true })
}
