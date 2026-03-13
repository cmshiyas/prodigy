import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'
import { ADMIN_EMAIL } from '@/lib/constants'

export async function POST(request) {
  try {
    const { credential } = await request.json()
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
      const { data, error } = await supabase
        .from('users')
        .insert({ google_id, email, name, picture, is_admin: isAdmin, status: 'approved', tier: isAdmin ? 'admin' : 'silver' })
        .select().single()
      if (error) throw new Error('DB insert failed: ' + error.message)
      user = data
    }

    return respond(supabase, user)

  } catch (err) {
    console.error('Auth error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function respond(supabase, user) {
  const today = new Date().toISOString().split('T')[0]
  const { data: usage } = await supabase
    .from('token_usage').select('tokens_used').eq('user_id', user.id).eq('date', today).single()
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, picture: user.picture, status: user.status, tier: user.tier, is_admin: user.is_admin },
    tokensUsedToday: usage?.tokens_used || 0,
  })
}
