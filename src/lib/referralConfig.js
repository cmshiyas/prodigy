// Reads referral tier thresholds and benefit text from the config table.
// Falls back to sensible defaults if not yet configured.
export async function getReferralConfig(supabase) {
  const { data } = await supabase
    .from('config')
    .select('key, value')
    .in('key', [
      'referral_gold_count',
      'referral_platinum_count',
      'referral_gold_benefit',
      'referral_platinum_benefit',
    ])

  const map = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  return {
    goldCount:        parseInt(map.referral_gold_count)    || 3,
    platinumCount:    parseInt(map.referral_platinum_count) || 5,
    goldBenefit:      map.referral_gold_benefit      || 'Free Gold access — permanently',
    platinumBenefit:  map.referral_platinum_benefit  || 'Free Platinum access — permanently',
  }
}
