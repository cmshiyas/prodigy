import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload = await verifyGoogleToken(authHeader.split(' ')[1])
    const supabase = getSupabase()

    const { data: user } = await supabase
      .from('users').select('id, referral_code').eq('email', payload.email).single()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { count } = await supabase
      .from('users').select('id', { count: 'exact', head: true }).eq('referred_by', user.id)

    return NextResponse.json({ referral_code: user.referral_code, referral_count: count || 0 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
