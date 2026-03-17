import { OAuth2Client } from 'google-auth-library'

// This file is server-only — never imported by client components
export async function verifyGoogleToken(idToken) {
  if (!process.env.GOOGLE_CLIENT_ID) throw new Error('Missing GOOGLE_CLIENT_ID')
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  })
  const payload = ticket.getPayload()
  if (!payload.email_verified) throw new Error('Google account email is not verified')
  return payload
}
