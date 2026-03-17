import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { QUESTION_LIMITS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const TIERS = ['silver', 'gold', 'platinum', 'admin']
const FEATURE_NAMES = ['analytics', 'history', 'all_exams']

// Defaults if not yet set in DB
const FEATURE_DEFAULTS = {
  silver:   { analytics: false, history: false, all_exams: false },
  gold:     { analytics: true,  history: true,  all_exams: true  },
  platinum: { analytics: true,  history: true,  all_exams: true  },
  admin:    { analytics: true,  history: true,  all_exams: true  },
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('config').select('key, value').limit(1000)

  if (error) console.error('[subscription-features] config fetch error:', error)

  const map = {}
  ;(data || []).forEach(({ key, value }) => { map[key] = value })

  const questionLimits = {}
  TIERS.forEach(tier => {
    const val = parseInt(map[`question_limit_${tier}`])
    questionLimits[tier] = isNaN(val) ? (QUESTION_LIMITS[tier] ?? 10) : val
  })

  const features = {}
  TIERS.forEach(tier => {
    features[tier] = {}
    FEATURE_NAMES.forEach(fname => {
      const key = `feature_${fname}_${tier}`
      if (map[key] !== undefined) {
        features[tier][fname] = map[key] === '1'
      } else {
        features[tier][fname] = FEATURE_DEFAULTS[tier]?.[fname] ?? false
      }
    })
  })

  return NextResponse.json({ questionLimits, features }, {
    headers: { 'Cache-Control': 'no-store' }
  })
}
