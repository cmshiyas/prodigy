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

    // Check if user exists
    const { data: existing } = await supabase
      .from('users').select('*').eq('google_id', google_id).single()

    let user
    if (existing) {
      const { data, error } = await supabase
        .from('users')
        .update({ name, picture, updated_at: new Date().toISOString() })
        .eq('google_id', google_id).select().single()
      if (error) throw new Error('DB update failed: ' + error.message)
      user = data
    } else {
      const { data, error } = await supabase
        .from('users')
        .insert({ google_id, email, name, picture, is_admin: isAdmin, status: isAdmin ? 'approved' : 'pending', tier: isAdmin ? 'admin' : 'silver' })
        .select().single()
      if (error) throw new Error('DB insert failed: ' + error.message)
      user = data
    }

    if (!user) throw new Error('Failed to create or fetch user')

    const today = new Date().toISOString().split('T')[0]
    const { data: usage } = await supabase
      .from('token_usage').select('tokens_used').eq('user_id', user.id).eq('date', today).single()

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, picture: user.picture, status: user.status, tier: user.tier, is_admin: user.is_admin },
      tokensUsedToday: usage?.tokens_used || 0,
    })
  } catch (err) {
    console.error('Auth error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
