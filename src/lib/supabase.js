import { createClient } from '@supabase/supabase-js'

// This file is server-only — never imported by client components
export function getSupabase() {
  if (!process.env.SUPABASE_URL) throw new Error('Missing SUPABASE_URL')
  if (!process.env.SUPABASE_SERVICE_KEY) throw new Error('Missing SUPABASE_SERVICE_KEY')
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}
