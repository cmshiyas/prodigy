import { getSupabase } from '@/lib/supabase'

// Fallback limits if DB fetch fails
const FALLBACK_LIMITS = {
  admin:    999999,
  platinum: 50000,
  gold:     20000,
  silver:   5000,
}

export async function getTokenLimits() {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('config')
      .select('key, value')
      .in('key', ['token_limit_silver', 'token_limit_gold', 'token_limit_platinum', 'token_limit_admin'])

    if (error || !data?.length) return FALLBACK_LIMITS

    const limits = { ...FALLBACK_LIMITS }
    data.forEach(({ key, value }) => {
      const tier = key.replace('token_limit_', '')
      limits[tier] = parseInt(value, 10)
    })
    return limits
  } catch {
    return FALLBACK_LIMITS
  }
}
