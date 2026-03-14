import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { message } = await request.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    let resolvedEmail = null
    let resolvedName  = null
    let userId        = null

    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { verifyGoogleToken } = await import('@/lib/google')
        const payload = await verifyGoogleToken(authHeader.split(' ')[1])
        resolvedEmail = payload.email
        resolvedName  = payload.name || null
        const { data: user } = await supabase
          .from('users').select('id').eq('email', payload.email).single()
        if (user) userId = user.id
      } catch { /* token optional */ }
    }

    await supabase.from('feedback').insert({
      user_id:    userId,
      user_email: resolvedEmail,
      user_name:  resolvedName,
      message:    message.trim(),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
