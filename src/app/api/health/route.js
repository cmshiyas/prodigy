import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      hasAnthropicKey:   !!process.env.ANTHROPIC_API_KEY,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasSupabaseUrl:    !!process.env.SUPABASE_URL,
      hasSupabaseKey:    !!process.env.SUPABASE_SERVICE_KEY,
    },
  })
}
