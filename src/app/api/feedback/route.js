import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { ADMIN_EMAIL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { message } = await request.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (message.trim().length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 })
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

    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const from = resolvedName || resolvedEmail || 'Anonymous'
        await resend.emails.send({
          from: 'SelfPaced Feedback <hello@selfpaced.com.au>',
          to: 'hello@selfpaced.com.au',
          subject: `New feedback from ${from}`,
          html: `
            <h2>New Feedback Submission</h2>
            <p><strong>From:</strong> ${from}${resolvedEmail ? ` &lt;${resolvedEmail}&gt;` : ''}</p>
            <p><strong>Message:</strong></p>
            <blockquote style="border-left:4px solid #ccc;padding-left:12px;margin:0;color:#333;">
              ${message.trim().replace(/\n/g, '<br>')}
            </blockquote>
            <p style="color:#888;font-size:12px;margin-top:16px;">
              Submitted at ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}
            </p>
          `,
        })
      } catch { /* email failure should not break feedback submission */ }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
