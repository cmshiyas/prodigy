import { NextResponse } from 'next/server'
import { verifyGoogleToken } from '@/lib/google'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = await verifyGoogleToken(authHeader.split(' ')[1])
    const supabase = getSupabase()

    // Resolve user
    let { data: user } = await supabase
      .from('users').select('id, name, email, referral_code').eq('google_id', payload.sub).single()
    if (!user) {
      const { data: byEmail } = await supabase
        .from('users').select('id, name, email, referral_code').eq('email', payload.email).single()
      user = byEmail
    }
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!user.referral_code) return NextResponse.json({ error: 'No referral code found' }, { status: 400 })

    const { friendEmail } = await request.json()

    if (!friendEmail?.trim() || !EMAIL_RE.test(friendEmail.trim())) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
    }

    const normalised = friendEmail.trim().toLowerCase()

    if (normalised === user.email?.toLowerCase()) {
      return NextResponse.json({ error: "You can't refer yourself" }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const referralLink = `https://www.selfpaced.com.au?ref=${user.referral_code}`
    const senderName = user.name || 'A friend'

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'SelfPaced <hello@selfpaced.com.au>',
      to: normalised,
      subject: `${senderName} invited you to SelfPaced`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
          <div style="text-align:center;padding:32px 0 16px;">
            <div style="font-size:2.5rem;">🎓</div>
            <h1 style="margin:8px 0 0;font-size:1.5rem;color:#1e293b;">You've been invited to SelfPaced</h1>
          </div>
          <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:24px;">
            <p style="margin:0 0 12px;font-size:1rem;line-height:1.6;">
              <strong>${senderName}</strong> thinks you'd love <strong>SelfPaced</strong> — the smart way to
              prepare for OC, Selective, and NAPLAN exams through consistent practice and instant feedback.
            </p>
            <p style="margin:0;font-size:0.95rem;color:#475569;line-height:1.6;">
              Sign up using ${senderName.split(' ')[0]}'s link and you'll both benefit as they unlock free premium access.
            </p>
          </div>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${referralLink}"
               style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;
                      padding:14px 32px;border-radius:8px;font-size:1rem;font-weight:600;">
              Start Practising Free →
            </a>
          </div>
          <p style="text-align:center;font-size:0.8rem;color:#94a3b8;margin:0;">
            SelfPaced · <a href="https://www.selfpaced.com.au" style="color:#94a3b8;">selfpaced.com.au</a>
          </p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('refer-friend error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
