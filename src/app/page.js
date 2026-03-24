'use client'

import { useState, useEffect, useCallback } from 'react'
import { EXAM_TYPES, EXAM_TOPICS, TOPIC_PROMPTS, TIER_LABELS, TIER_CLASSES, ADMIN_EMAIL, EXAM_YEAR_LEVELS } from '@/lib/constants'
import HistoryScreen from '@/components/HistoryScreen'
import RankingScreen from '@/components/RankingScreen'
import StreakScreen from '@/components/StreakScreen'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

const EXAM_DATE_COLORS = {
  naplan:    { bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6' },
  oc:        { bg: '#FFF7ED', border: '#FED7AA', dot: '#F97316' },
  selective: { bg: '#F0FDF4', border: '#BBF7D0', dot: '#22C55E' },
}

const TIER_PERMISSIONS = {
  silver:   { subtopics: false, history: false, ranking: false, streaks: true },
  gold:     { subtopics: true,  history: true,  ranking: false, streaks: true },
  platinum: { subtopics: true,  history: true,  ranking: true,  streaks: true },
  admin:    { subtopics: true,  history: true,  ranking: true,  streaks: true },
}

if (!GOOGLE_CLIENT_ID) {
  console.error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable')
}

const initTopicStats = () => {
  const s = {}
  Object.values(EXAM_TOPICS).flat().forEach(t => { s[t.id] = { correct: 0, total: 0 } })
  return s
}

// ── WHATSAPP CHAT BUTTON ──────────────────────────────────────

// ── FEEDBACK BUTTON ───────────────────────────────────────────
function FeedbackButton({ user, idToken }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | 'error'

  async function submit() {
    if (!message.trim()) return
    setStatus('sending')
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (idToken) headers['Authorization'] = 'Bearer ' + idToken
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: message.trim() }),
      })
      if (!res.ok) throw new Error()
      setStatus('sent')
      setMessage('')
      setTimeout(() => { setOpen(false); setStatus(null) }, 2500)
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <button className="feedback-fab" onClick={() => { setOpen(true); setStatus(null) }} aria-label="Send feedback">
        💬 <span className="feedback-fab-label">Feedback</span>
      </button>

      {open && (
        <div className="feedback-backdrop" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="feedback-panel">
            <button className="feedback-close" onClick={() => setOpen(false)}>✕</button>
            <div className="feedback-beta-badge">🚀 Beta</div>
            <div className="feedback-title">Help us improve</div>
            <div className="feedback-desc">
              We're in <strong>beta</strong> — your feedback shapes the product! Share bugs, ideas, or anything on your mind. We read every message.
            </div>

            {status === 'sent' ? (
              <div className="feedback-success">✅ Thank you! We really appreciate it.</div>
            ) : (
              <>
                <textarea
                  className="feedback-textarea"
                  placeholder="What could be better? Found a bug? Have a feature idea?"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  autoFocus
                />
                {status === 'error' && (
                  <div className="feedback-error">Something went wrong — please try again.</div>
                )}
                <button
                  className="btn btn-primary feedback-submit"
                  onClick={submit}
                  disabled={!message.trim() || status === 'sending'}
                >
                  {status === 'sending' ? 'Sending…' : 'Send Feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── TRIAL POPUP ───────────────────────────────────────────────

function TrialModal({ onClose, onReferFriend, onSignIn, idToken, onTierUpgrade, referralConfig = {} }) {
  const goldCount       = referralConfig.goldCount       || 3
  const platinumCount   = referralConfig.platinumCount   || 5
  const goldBenefit     = referralConfig.goldBenefit     || 'Free Gold access — permanently'
  const platinumBenefit = referralConfig.platinumBenefit || 'Free Platinum access — permanently'
  const [promoCode, setPromoCode] = useState('')
  const [promoStatus, setPromoStatus] = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [referralCount, setReferralCount] = useState(null)
  const [countError, setCountError] = useState(false)

  const fetchCount = () => {
    if (!idToken) return
    setCountError(false)
    setReferralCount(null)
    fetch('/api/referral', { headers: { Authorization: 'Bearer ' + idToken }, cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.referral_count !== undefined) setReferralCount(data.referral_count)
        else setCountError(true)
      })
      .catch(() => setCountError(true))
  }

  useEffect(() => { fetchCount() }, [idToken]) // eslint-disable-line

  async function redeemPromo() {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoStatus(null)
    try {
      const res = await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ code: promoCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPromoStatus({ type: 'error', message: data.error || 'Failed to redeem code' })
      } else {
        setPromoStatus({ type: 'success', message: data.message })
        setPromoCode('')
        if (onTierUpgrade) onTierUpgrade(data.tier)
      }
    } catch {
      setPromoStatus({ type: 'error', message: 'Network error. Please try again.' })
    } finally {
      setPromoLoading(false)
    }
  }

  return (
    <div className="trial-modal-backdrop" onClick={onClose}>
      <div className="trial-modal" onClick={e => e.stopPropagation()}>
        <button className="trial-modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="trial-modal-icon">🎁</div>
        <h3 className="trial-modal-title">Get Gold or Platinum — Free!</h3>
        <p className="trial-modal-body">
          Invite your friends and unlock free premium access:
        </p>
        {idToken && (
          <div className="referral-modal-stat">
            {countError ? (
              <button onClick={fetchCount} style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem', color: '#64748b' }}>↺ Retry</button>
            ) : (
              <div className="referral-modal-stat-num">{referralCount === null ? '…' : referralCount}</div>
            )}
            <div className="referral-modal-stat-label">friend{referralCount !== 1 ? 's' : ''} referred<br/>so far</div>
          </div>
        )}
        <div className="trial-referral-tiers">
          <div className="trial-referral-tier">
            <span className="trial-referral-tier-icon" style={{ background: referralCount >= goldCount ? '#FEF3C7' : '#F3F4F6', color: referralCount >= goldCount ? '#F59E0B' : '#9CA3AF' }}>🥇</span>
            <div>
              <strong style={{ color: referralCount >= goldCount ? '#F59E0B' : '#6B7280' }}>
                {referralCount >= goldCount ? '✓ ' : ''}Invite {goldCount} friends
              </strong>
              <div className="trial-referral-tier-desc">{goldBenefit}</div>
            </div>
          </div>
          <div className="trial-referral-tier">
            <span className="trial-referral-tier-icon" style={{ background: referralCount >= platinumCount ? '#EDE9FE' : '#F3F4F6', color: referralCount >= platinumCount ? '#7C3AED' : '#9CA3AF' }}>💜</span>
            <div>
              <strong style={{ color: referralCount >= platinumCount ? '#7C3AED' : '#6B7280' }}>
                {referralCount >= platinumCount ? '✓ ' : ''}Invite {platinumCount} friends
              </strong>
              <div className="trial-referral-tier-desc">{platinumBenefit}</div>
            </div>
          </div>
        </div>

        {/* Promo code section */}
        <div className="trial-promo-section">
          <div className="trial-promo-divider"><span>or redeem a promo code</span></div>
          {idToken ? (
            <>
              <div className="trial-promo-row">
                <input
                  className="trial-promo-input"
                  type="text"
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoStatus(null) }}
                  onKeyDown={e => e.key === 'Enter' && redeemPromo()}
                />
                <button
                  className="btn btn-primary trial-promo-btn"
                  onClick={redeemPromo}
                  disabled={promoLoading || !promoCode.trim()}
                >{promoLoading ? '...' : 'Apply'}</button>
              </div>
              {promoStatus && (
                <div className={`trial-promo-status trial-promo-status--${promoStatus.type}`}>{promoStatus.message}</div>
              )}
            </>
          ) : (
            <div className="trial-promo-hint">Sign in to redeem a promo code</div>
          )}
        </div>

        <div className="trial-modal-actions">
          {onReferFriend && (
            <button className="btn btn-primary" style={{ background: 'var(--accent)' }} onClick={() => { onClose(); onReferFriend() }}>
              🔗 Get My Referral Link
            </button>
          )}
          {!idToken && !onReferFriend && onSignIn && (
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: 10 }}>
                Sign in to get your personal referral link and start earning free access.
              </div>
              <button className="btn btn-primary" style={{ width: '100%', background: 'var(--accent)' }} onClick={() => { onClose(); onSignIn() }}>
                🔗 Sign In to Get My Referral Link
              </button>
            </div>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Maybe later</button>
        </div>
      </div>
    </div>
  )
}

// ── SCREEN COMPONENTS ─────────────────────────────────────────

function HeroIllustration() {
  return (
    <svg viewBox="0 0 440 360" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }}>
      <circle cx="390" cy="72" r="100" fill="#FFF3E6" />
      <circle cx="52" cy="308" r="68" fill="#EDE9FE" opacity="0.7" />
      <circle cx="405" cy="308" r="44" fill="#E0F7FA" opacity="0.6" />
      {/* desk */}
      <rect x="62" y="252" width="316" height="20" rx="10" fill="#E8D0A8" />
      <rect x="86" y="272" width="16" height="76" rx="8" fill="#D4A07A" />
      <rect x="338" y="272" width="16" height="76" rx="8" fill="#D4A07A" />
      {/* books */}
      <rect x="68" y="220" width="80" height="13" rx="4" fill="#52C41A" /><rect x="68" y="220" width="7" height="13" rx="3" fill="#3d9c12" />
      <rect x="71" y="207" width="74" height="13" rx="4" fill="#FF6B35" /><rect x="71" y="207" width="7" height="13" rx="3" fill="#c95522" />
      <rect x="74" y="194" width="68" height="13" rx="4" fill="#7C3AED" /><rect x="74" y="194" width="7" height="13" rx="3" fill="#6027cc" />
      <rect x="77" y="181" width="62" height="13" rx="4" fill="#4A90D9" /><rect x="77" y="181" width="7" height="13" rx="3" fill="#3270b8" />
      {/* laptop */}
      <rect x="186" y="177" width="152" height="75" rx="9" fill="#1E1B4B" />
      <rect x="192" y="183" width="140" height="62" rx="6" fill="#2563EB" />
      <rect x="202" y="193" width="68" height="5" rx="2.5" fill="white" opacity="0.7" />
      <rect x="202" y="203" width="52" height="5" rx="2.5" fill="white" opacity="0.5" />
      <rect x="202" y="213" width="82" height="5" rx="2.5" fill="white" opacity="0.6" />
      <rect x="202" y="223" width="44" height="5" rx="2.5" fill="#FFD580" opacity="0.9" />
      <circle cx="292" cy="212" r="16" fill="#52C41A" />
      <path d="M284 212 L290 219 L301 204" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="170" y="252" width="184" height="12" rx="6" fill="#2D2A5E" />
      {/* student body */}
      <rect x="304" y="186" width="60" height="66" rx="22" fill="#FF6B35" />
      <rect x="323" y="194" width="22" height="5" rx="2.5" fill="#c95522" />
      {/* head */}
      <circle cx="334" cy="151" r="42" fill="#FFD580" />
      {/* hair */}
      <ellipse cx="334" cy="115" rx="42" ry="17" fill="#3D2000" />
      <ellipse cx="297" cy="139" rx="13" ry="20" fill="#3D2000" />
      <ellipse cx="371" cy="139" rx="13" ry="20" fill="#3D2000" />
      {/* eyes */}
      <circle cx="320" cy="147" r="9" fill="white" />
      <circle cx="348" cy="147" r="9" fill="white" />
      <circle cx="321" cy="148" r="5" fill="#2D1B0E" />
      <circle cx="349" cy="148" r="5" fill="#2D1B0E" />
      <circle cx="323" cy="146" r="2" fill="white" />
      <circle cx="351" cy="146" r="2" fill="white" />
      <path d="M313 135 Q320 130 327 135" stroke="#3D2000" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M341 135 Q348 130 355 135" stroke="#3D2000" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <circle cx="306" cy="162" r="10" fill="#FFB347" opacity="0.4" />
      <circle cx="362" cy="162" r="10" fill="#FFB347" opacity="0.4" />
      <path d="M319 167 Q334 180 349 167" stroke="#2D1B0E" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      {/* graduation cap */}
      <rect x="300" y="104" width="68" height="12" rx="3" fill="#1E1B4B" />
      <polygon points="334,83 382,104 286,104" fill="#1E1B4B" />
      <line x1="382" y1="104" x2="390" y2="127" stroke="#FF6B35" strokeWidth="4" strokeLinecap="round" />
      <circle cx="390" cy="133" r="7" fill="#FF6B35" />
      {/* stars */}
      <path d="M46 86 L50 100 L65 100 L54 109 L58 123 L46 114 L34 123 L38 109 L27 100 L42 100 Z" fill="#FFD580" />
      <path d="M388 182 L391 191 L401 191 L393 197 L396 206 L388 200 L380 206 L383 197 L375 191 L385 191 Z" fill="#FF6B35" opacity="0.85" />
      <path d="M16 215 L18 222 L26 222 L20 227 L22 234 L16 230 L10 234 L12 227 L6 222 L14 222 Z" fill="#7C3AED" opacity="0.75" />
      {/* pencil */}
      <g transform="rotate(-38, 158, 96)">
        <rect x="153" y="64" width="10" height="56" rx="4" fill="#FFD580" />
        <rect x="153" y="64" width="10" height="9" rx="3" fill="#94A3B8" />
        <polygon points="153,120 163,120 158,136" fill="#FF6B35" />
        <rect x="153" y="111" width="10" height="5" fill="#FFB347" />
      </g>
      {/* question bubble */}
      <circle cx="158" cy="50" r="30" fill="#7C3AED" />
      <circle cx="158" cy="50" r="26" fill="#8B5CF6" />
      <path d="M151 42 Q151 32 158 32 Q166 32 166 41 Q166 49 159 51 L159 56" stroke="white" strokeWidth="3.8" strokeLinecap="round" fill="none" />
      <circle cx="159" cy="64" r="3.2" fill="white" />
      {/* lightbulb */}
      <circle cx="44" cy="155" r="24" fill="#FFD580" />
      <rect x="38" y="174" width="12" height="11" rx="3" fill="#94A3B8" />
      <rect x="39" y="185" width="10" height="5" rx="2.5" fill="#7A8C9E" />
      <line x1="44" y1="127" x2="44" y2="121" stroke="#FFB347" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="66" y1="136" x2="71" y2="131" stroke="#FFB347" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="22" y1="136" x2="17" y2="131" stroke="#FFB347" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="72" y1="155" x2="78" y2="155" stroke="#FFB347" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="16" y1="155" x2="10" y2="155" stroke="#FFB347" strokeWidth="2.5" strokeLinecap="round" />
      {/* sparkles */}
      <circle cx="412" cy="138" r="5" fill="#FF6B35" />
      <circle cx="423" cy="154" r="3" fill="#FFD580" />
      <circle cx="410" cy="168" r="3.5" fill="#7C3AED" />
      <circle cx="28" cy="262" r="4" fill="#52C41A" />
      <circle cx="15" cy="278" r="2.5" fill="#4A90D9" />
    </svg>
  )
}

function PracticeIcon() {
  return (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 160, height: 'auto' }}>
      <circle cx="60" cy="50" r="44" fill="#FFF3E6" />
      <rect x="30" y="22" width="56" height="66" rx="8" fill="white" stroke="#E8D5C0" strokeWidth="1.5" />
      <rect x="40" y="36" width="36" height="4" rx="2" fill="#E8D5C0" />
      <rect x="40" y="46" width="28" height="4" rx="2" fill="#E8D5C0" />
      <rect x="40" y="56" width="32" height="4" rx="2" fill="#E8D5C0" />
      <rect x="40" y="66" width="22" height="4" rx="2" fill="#E8D5C0" />
      <g transform="rotate(-30, 82, 38)">
        <rect x="78" y="18" width="8" height="38" rx="3" fill="#FFD580" />
        <rect x="78" y="18" width="8" height="7" rx="2" fill="#94A3B8" />
        <polygon points="78,56 86,56 82,68" fill="#FF6B35" />
        <rect x="78" y="49" width="8" height="4" fill="#FFB347" />
      </g>
      <circle cx="64" cy="53" r="12" fill="#FF6B35" />
      <path d="M61 47 Q61 43 64 43 Q67 43 67 47 Q67 51 64 52 L64 55" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="64" cy="58.5" r="1.8" fill="white" />
    </svg>
  )
}

function ConsistencyIcon() {
  return (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 160, height: 'auto' }}>
      <circle cx="60" cy="50" r="44" fill="#EDE9FE" />
      <rect x="22" y="26" width="76" height="58" rx="10" fill="white" stroke="#E8D5C0" strokeWidth="1.5" />
      <rect x="22" y="26" width="76" height="22" rx="10" fill="#7C3AED" />
      <rect x="22" y="37" width="76" height="11" fill="#7C3AED" />
      <rect x="37" y="19" width="7" height="14" rx="3" fill="#A78BFA" />
      <rect x="76" y="19" width="7" height="14" rx="3" fill="#A78BFA" />
      <rect x="46" y="31" width="28" height="4" rx="2" fill="white" opacity="0.65" />
      <circle cx="36" cy="60" r="8" fill="#52C41A" /><path d="M33 60 L35.5 63 L40 57" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy="60" r="8" fill="#52C41A" /><path d="M57 60 L59.5 63 L64 57" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="84" cy="60" r="8" fill="#52C41A" /><path d="M81 60 L83.5 63 L88 57" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="36" cy="76" r="8" fill="#52C41A" /><path d="M33 76 L35.5 79 L40 73" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy="76" r="8" fill="#52C41A" /><path d="M57 76 L59.5 79 L64 73" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="84" cy="76" r="8" fill="#FF6B35" />
      <path d="M84 70 Q88 74 86 79 Q84 75 82 79 Q80 74 84 70 Z" fill="#FFD580" />
      <path d="M84 73 Q86 76 85 79 Q84 77 83 79 Q82 76 84 73 Z" fill="white" opacity="0.5" />
    </svg>
  )
}

function FeedbackIcon() {
  return (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 160, height: 'auto' }}>
      <circle cx="60" cy="50" r="44" fill="#E0F2FE" />
      <rect x="20" y="18" width="80" height="54" rx="14" fill="#4A90D9" />
      <polygon points="38,72 28,86 56,72" fill="#4A90D9" />
      <circle cx="60" cy="42" r="20" fill="#FFD580" />
      <rect x="54" y="58" width="12" height="9" rx="3" fill="#94A3B8" />
      <rect x="55" y="67" width="10" height="4" rx="2" fill="#7A8C9E" />
      <path d="M55 42 Q60 35 65 42" stroke="#FF6B35" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="67" cy="33" r="5" fill="white" opacity="0.35" />
      <line x1="60" y1="19" x2="60" y2="15" stroke="#FFD580" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="76" y1="25" x2="79" y2="22" stroke="#FFD580" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="44" y1="25" x2="41" y2="22" stroke="#FFD580" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="82" y1="42" x2="86" y2="42" stroke="#FFD580" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="38" y1="42" x2="34" y2="42" stroke="#FFD580" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

// ── SUBSCRIPTION FEATURE HELPERS ───────────────────────────────

const FALLBACK_QLIMITS = { silver: 10, gold: 40, platinum: 999999, admin: 999999 }
const FALLBACK_FEATURES = {
  silver:   { all_exams: false, analytics: false, history: false },
  gold:     { all_exams: true,  analytics: true,  history: true  },
  platinum: { all_exams: true,  analytics: true,  history: true  },
  admin:    { all_exams: true,  analytics: true,  history: true  },
}

function getPlanFeatures(tier, subscriptionFeatures) {
  const f  = subscriptionFeatures?.features?.[tier] ?? FALLBACK_FEATURES[tier] ?? FALLBACK_FEATURES.silver
  const ql = subscriptionFeatures?.questionLimits?.[tier] ?? FALLBACK_QLIMITS[tier] ?? 10
  const qText = ql >= 999999 ? 'Unlimited questions per day' : `~${ql} questions per day`
  const ranking = tier === 'platinum' || tier === 'admin'
  const streaks  = tier === 'platinum' || tier === 'admin'
  return [
    { text: f.all_exams ? 'All exam tracks (OC, Selective, NAPLAN)' : 'OC exam track only', yes: f.all_exams },
    { text: qText, yes: true },
    { text: 'Instant answer explanations', yes: true },
    { text: 'Topic-level progress tracking', yes: true },
    { text: 'Subtopic drill & accuracy rates', yes: f.analytics },
    { text: 'Answer history review', yes: f.history },
    { text: 'Leaderboard & ranking', yes: ranking },
    { text: 'Streak celebration rewards', yes: streaks },
  ]
}

function LandingScreen({ onSignIn, referralConfig = {}, subscriptionFeatures }) {
  const [showTrialModal, setShowTrialModal] = useState(false)
  return (
    <div className="landing-screen">

      {/* ── HEADER ── */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-logo">
            <span className="lp-logo-icon">🎯</span>
            <span>Self Paced Learning</span>
          </div>
          <nav className="lp-nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#benefits">Benefits</a>
            <a href="#features">Features</a>
            <a href="#pricing" onClick={() => setShowTrialModal(true)}>Pricing</a>
          </nav>
          <button className="btn btn-primary" onClick={onSignIn}>Sign in</button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-text">
          <p className="lp-eyebrow">Self-paced exam mastery for Australian students</p>
          <h1 className="lp-h1">Practice. Consistency.<br/>Feedback. Mastery.</h1>
          <p className="lp-sub">Build exam confidence through consistent, self-paced practice for OC, Selective and NAPLAN exams — with instant feedback, subtopic tracking and streak rewards to keep kids motivated.</p>
          <div className="lp-cta-row">
            <button className="btn btn-primary lp-cta-btn" onClick={onSignIn}>Get Started Free</button>
            <button className="btn btn-secondary lp-cta-btn" onClick={onSignIn}>Sign in</button>
          </div>
        </div>
        <div className="lp-hero-illustration">
          <HeroIllustration />
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div className="lp-stats-strip">
        <div className="lp-stats-row">
          {[
            { n: '3+', l: 'Exam tracks' },
            { n: '1000+', l: 'Practice questions' },
            { n: '100%', l: 'Curriculum aligned' },
            { n: 'Live', l: 'Progress tracking' },
          ].map(s => (
            <div className="lp-stat-item" key={s.l}>
              <span className="lp-stat-n">{s.n}</span>
              <span className="lp-stat-l">{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PILLARS ── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-section-inner">
          <div className="lp-section-label">Our Method</div>
          <h2 className="lp-section-h2">The three pillars of exam mastery</h2>
          <div className="lp-pillars-grid">
            {[
              {
                Icon: PracticeIcon,
                title: 'Practice',
                color: '#FF6B35',
                bg: '#FFF3E6',
                desc: 'Targeted questions across every topic and subtopic — with instant, clear explanations so students actually learn from every answer, not just memorise.',
              },
              {
                Icon: ConsistencyIcon,
                title: 'Consistency',
                color: '#7C3AED',
                bg: '#F5F3FF',
                desc: 'Daily habit-building through streaks and progress tracking. Small, regular sessions beat last-minute cramming — showing up every day is the real secret.',
              },
              {
                Icon: FeedbackIcon,
                title: 'Feedback',
                color: '#4A90D9',
                bg: '#EFF6FF',
                desc: 'Every question comes with a step-by-step explanation showing exactly why the answer is correct. Real understanding, not guesswork.',
              },
            ].map(p => (
              <div className="lp-pillar-card" key={p.title} style={{ borderTop: `4px solid ${p.color}` }}>
                <div className="lp-pillar-illustration" style={{ background: p.bg }}>
                  <p.Icon />
                </div>
                <h3 className="lp-pillar-title" style={{ color: p.color }}>{p.title}</h3>
                <p className="lp-pillar-desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section" id="how-it-works">
        <div className="lp-section-inner">
          <div className="lp-section-label">How it works</div>
          <h2 className="lp-section-h2">Up and practising in minutes</h2>
          <div className="lp-steps">
            {[
              { n:'1', icon:'🔑', title:'Sign in with Google', desc:'Create your account in one click using your Google account. No passwords to remember.' },
              { n:'2', icon:'🎯', title:'Pick a topic or subtopic', desc:'Choose from OC, Selective or NAPLAN tracks. Drill into a specific subtopic or let the app pick at random.' },
              { n:'3', icon:'🤔', title:'Answer questions', desc:'Select your answer, then click Submit. Take your time — no accidental submissions.' },
              { n:'4', icon:'💡', title:'Get instant feedback', desc:'See the correct answer with a step-by-step explanation so you understand why, not just what.' },
              { n:'5', icon:'📈', title:'Track your progress', desc:'Your accuracy per topic and subtopic is saved permanently — pick up exactly where you left off.' },
              { n:'6', icon:'🏆', title:'Earn streak rewards', desc:'Correct answer streaks unlock exciting animations to keep your child motivated and engaged.' },
            ].map(s => (
              <div className="lp-step" key={s.n}>
                <div className="lp-step-num">{s.n}</div>
                <div className="lp-step-icon">{s.icon}</div>
                <h4 className="lp-step-title">{s.title}</h4>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="lp-section lp-section-alt" id="benefits">
        <div className="lp-section-inner">
          <div className="lp-section-label">Why Self Paced Learning</div>
          <h2 className="lp-section-h2">Benefits for students & parents</h2>
          <div className="lp-benefits">
            <div className="lp-benefit-col">
              <div className="lp-benefit-heading">👦 For Students</div>
              {[
                { icon:'🎮', title:'Fun, game-like practice', desc:'Streak celebrations and points make revision feel like a challenge, not a chore.' },
                { icon:'🧭', title:'Know exactly what to work on', desc:'Colour-coded subtopic scores show at a glance where you are strong and where to focus next.' },
                { icon:'🔄', title:'Never see the same question twice', desc:'Each session serves a fresh unanswered question from the bank — you only repeat once every question is done.' },
                { icon:'⚡', title:'Instant, clear explanations', desc:'Every answer comes with a step-by-step solution so you actually learn, not just memorise.' },
              ].map(b => (
                <div className="lp-benefit-item" key={b.title}>
                  <span className="lp-benefit-icon">{b.icon}</span>
                  <div><strong>{b.title}</strong><p>{b.desc}</p></div>
                </div>
              ))}
            </div>
            <div className="lp-benefit-col">
              <div className="lp-benefit-heading">👨‍👩‍👧 For Parents</div>
              {[
                { icon:'📊', title:'Full visibility into progress', desc:'See exactly which topics and subtopics your child is struggling with — updated after every session.' },
                { icon:'🕐', title:'Practice at any time', desc:'Available 24/7. Let your child practise for 10 minutes after school or an hour on weekends — no scheduling needed.' },
                { icon:'✅', title:'Curriculum-aligned content', desc:'All questions are mapped to OC, Selective and NAPLAN standards so you can trust the material is relevant.' },
                { icon:'🔒', title:'Safe and ad-free', desc:'No ads, no distractions. Approved accounts only — your child sees nothing but focused practice.' },
              ].map(b => (
                <div className="lp-benefit-item" key={b.title}>
                  <span className="lp-benefit-icon">{b.icon}</span>
                  <div><strong>{b.title}</strong><p>{b.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section" id="features">
        <div className="lp-section-inner">
          <div className="lp-section-label">Features</div>
          <h2 className="lp-section-h2">Everything needed to excel</h2>
          <div className="lp-features">
            {[
              { icon:'🤖', title:'AI-generated questions', desc:'Claude AI creates fresh questions tailored to the exact topic and difficulty level — never stale.' },
              { icon:'📚', title:'Growing question bank', desc:'Admin-uploaded past papers and AI generation continuously expand the question pool.' },
              { icon:'🗂️', title:'Topic & subtopic drill', desc:'Go broad across a topic or lock into one subtopic for focused, targeted practice.' },
              { icon:'📉', title:'Weakness detection', desc:'Red/amber/green indicators reveal subtopics needing more attention at a single glance.' },
              { icon:'🎯', title:'Select & Submit', desc:'Choose your answer, review it, then submit — preventing accidental wrong clicks.' },
              { icon:'💾', title:'Persistent across sessions', desc:'Progress, streaks and stats are saved to the cloud. Pick up exactly where you left off.' },
            ].map(f => (
              <div className="lp-feature-card" key={f.title}>
                <div className="lp-feature-icon">{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="lp-section lp-section-alt" id="pricing">
        <div className="lp-section-inner">
          <div className="lp-section-label">Pricing</div>
          <h2 className="lp-section-h2">Simple, transparent plans</h2>
          <p className="lp-section-sub">Start free. Upgrade when your child is ready to go further.</p>
          <div className="lp-pricing">

            {/* SILVER */}
            <div className="lp-plan">
              <div className="lp-plan-badge lp-plan-badge--silver">Silver</div>
              <div className="lp-plan-price"><span className="lp-plan-amount">Free</span></div>
              <p className="lp-plan-desc">Perfect for getting started and exploring the platform.</p>
              <ul className="lp-plan-features">
                {getPlanFeatures('silver', subscriptionFeatures).map((f, i) => (
                  <li key={i} className={`lp-feat lp-feat--${f.yes ? 'yes' : 'no'}`}>{f.text}</li>
                ))}
              </ul>
              <button className="btn btn-secondary lp-plan-btn" onClick={onSignIn}>Get Started Free</button>
            </div>

            {/* GOLD */}
            <div className="lp-plan lp-plan--gold">
              <div className="lp-plan-badge lp-plan-badge--gold">Gold</div>
              <div className="lp-plan-price">
                <span className="lp-plan-amount">$5</span>
                <span className="lp-plan-period">/month</span>
              </div>
              <p className="lp-plan-desc">For students who practise regularly and want to track improvement.</p>
              <ul className="lp-plan-features">
                {getPlanFeatures('gold', subscriptionFeatures).map((f, i) => (
                  <li key={i} className={`lp-feat lp-feat--${f.yes ? 'yes' : 'no'}`}>{f.text}</li>
                ))}
              </ul>
              <button className="btn btn-primary lp-plan-btn" onClick={() => setShowTrialModal(true)}>Get Gold</button>
            </div>

            {/* PLATINUM */}
            <div className="lp-plan lp-plan--platinum">
              <div className="lp-plan-popular">Most Popular</div>
              <div className="lp-plan-badge lp-plan-badge--platinum">Platinum</div>
              <div className="lp-plan-price">
                <span className="lp-plan-amount">$9</span>
                <span className="lp-plan-period">/month</span>
              </div>
              <p className="lp-plan-desc">Unlimited practice with every feature — the complete exam prep experience.</p>
              <ul className="lp-plan-features">
                {getPlanFeatures('platinum', subscriptionFeatures).map((f, i) => (
                  <li key={i} className={`lp-feat lp-feat--${f.yes ? 'yes' : 'no'}`}>{f.text}</li>
                ))}
              </ul>
              <button className="btn btn-primary lp-plan-btn lp-plan-btn--platinum" onClick={() => setShowTrialModal(true)}>Get Platinum</button>
            </div>

          </div>
          <p className="lp-pricing-note">All plans include a Google sign-in account and access via any device. Invite friends to earn free upgrades — 3 friends gets you Gold, 5 friends gets you Platinum. Prices are in AUD and include GST (10%). Billed monthly. Cancel anytime.</p>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="lp-cta-banner">
        <h2>Ready to build real exam confidence?</h2>
        <p>Join students already mastering exams through consistent, self-paced practice.</p>
        <button className="btn btn-primary lp-cta-btn" onClick={onSignIn}>Get Started — it's free</button>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="lp-logo-icon">🎯</span>
            <strong>Self Paced Learning</strong>
            <p>Practice. Consistency. Feedback. — for Australian school exams.</p>
          </div>
          <div className="lp-footer-links">
            <div className="lp-footer-col">
              <div className="lp-footer-heading">Product</div>
              <a href="#how-it-works">How it works</a>
              <a href="#benefits">Benefits</a>
              <a href="#features">Features</a>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-heading">Exams</div>
              <span>OC (Opportunity Class)</span>
              <span>Selective School</span>
              <span>NAPLAN</span>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-heading">Legal</div>
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <a href="mailto:hello@selfpaced.com.au">Contact Us</a>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          © {new Date().getFullYear()} Self Paced Learning. All rights reserved. ABN shown on invoices. All prices in AUD and include GST.
        </div>
      </footer>

      <FeedbackButton />
      {showTrialModal && <TrialModal onClose={() => setShowTrialModal(false)} onSignIn={onSignIn} referralConfig={referralConfig} />}
    </div>
  )
}

function AuthScreen() {
  useEffect(() => {
    function init() {
      if (window._googleInitDone) return
      window._googleInitDone = true
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r) => window._googleCallback(r),
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
        itp_support: false,
      })
      // Only render the button — no prompt()/One Tap/FedCM
      // This works in all browsers regardless of FedCM settings
      window.google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        { theme: 'outline', size: 'large', shape: 'rectangular', width: 300 }
      )
    }
    window.onGoogleLibraryLoad = init
    if (typeof window.google !== 'undefined' && window.google.accounts) init()
  }, [])

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">🎯 Self Paced Learning</div>
        <p className="auth-sub">Get started with AI-generated exam practice.</p>
        <div className="auth-divider">Sign in with Google</div>
        <div id="google-btn" className="g_id_signin" />
        <p style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text2)', lineHeight: 1.6 }}>
          By signing in you agree to our{' '}
          <a href="/terms" style={{ color: 'var(--primary, #7A5C3F)', textDecoration: 'underline' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" style={{ color: 'var(--primary, #7A5C3F)', textDecoration: 'underline' }}>Privacy Policy</a>.
        </p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text2)', lineHeight: 1.6 }}>
          This platform is designed for students aged 9–13. If you are under 18, a parent or guardian must review our Privacy Policy before signing in.
        </p>
      </div>
    </div>
  )
}

function PendingScreen({ email, onSignOut }) {
  return (
    <div className="status-screen">
      <div className="status-card">
        <div className="status-icon">⏳</div>
        <div className="status-title">Awaiting Approval</div>
        <p className="status-msg">Your account is pending admin approval. Check back soon!</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text2)', marginBottom: '1.5rem' }}>Signed in as: {email}</p>
        <button className="btn btn-secondary" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  )
}

function RejectedScreen({ onSignOut }) {
  return (
    <div className="status-screen">
      <div className="status-card">
        <div className="status-icon">🚫</div>
        <div className="status-title">Access Declined</div>
        <p className="status-msg">Your access request was not approved. Please contact the administrator if you believe this is a mistake.</p>
        <button className="btn btn-secondary" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  )
}


// ── STREAK CELEBRATION ────────────────────────────────────────

const STREAK_CONFIG = {
  1: { emoji: '🎉', heading: 'Nice work!', sub: '3 in a row — keep it up!', color: '#F59E0B', bg: 'linear-gradient(135deg,#FEF3C7,#FDE68A)' },
  2: { emoji: '🔥', heading: "You're on fire!", sub: '6 correct in a row — amazing!', color: '#EF4444', bg: 'linear-gradient(135deg,#FEE2E2,#FCA5A5)' },
  3: { emoji: '🚀', heading: 'Unstoppable!', sub: '9 in a row — you\'re a superstar!', color: '#7C3AED', bg: 'linear-gradient(135deg,#EDE9FE,#C4B5FD)' },
  4: { emoji: '🏆', heading: 'LEGENDARY!', sub: '15+ correct streak — absolute legend!', color: '#059669', bg: 'linear-gradient(135deg,#D1FAE5,#6EE7B7)' },
}

function ReferralModal({ user, idToken, referralConfig = {}, onClose }) {
  const [copied, setCopied] = useState(false)
  const [referralCount, setReferralCount] = useState(null)
  const [countError, setCountError] = useState(false)
  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}?ref=${user.referral_code}`
    : `https://www.selfpaced.com.au?ref=${user.referral_code}`

  const goldCount       = referralConfig.goldCount       || 3
  const platinumCount   = referralConfig.platinumCount   || 5
  const goldBenefit     = referralConfig.goldBenefit     || 'Free Gold access — permanently'
  const platinumBenefit = referralConfig.platinumBenefit || 'Free Platinum access — permanently'

  const fetchCount = () => {
    if (!idToken) return
    setCountError(false)
    setReferralCount(null)
    fetch('/api/referral', { headers: { Authorization: 'Bearer ' + idToken }, cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.referral_count !== undefined) setReferralCount(data.referral_count)
        else setCountError(true)
      })
      .catch(() => setCountError(true))
  }

  useEffect(() => { fetchCount() }, [idToken]) // eslint-disable-line

  function handleCopy() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="trial-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="trial-modal">
        <button className="trial-modal-close" onClick={onClose}>✕</button>
        <div className="trial-modal-icon">🎁</div>
        <div className="trial-modal-title">Get Premium — Free!</div>
        <div className="trial-modal-body">
          We're in <strong>beta</strong> — and you can unlock Gold or Platinum access completely free, just by inviting friends. No credit card. No catch.
        </div>
        <div className="referral-modal-stat">
          {countError ? (
            <button onClick={fetchCount} style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem', color: '#64748b' }}>↺ Retry</button>
          ) : (
            <div className="referral-modal-stat-num">{referralCount === null ? '…' : referralCount}</div>
          )}
          <div className="referral-modal-stat-label">friend{referralCount !== 1 ? 's' : ''} referred<br/>so far</div>
        </div>
        <div className="trial-referral-tiers" style={{ marginBottom: 12 }}>
          <div className="trial-referral-tier">
            <span className="trial-referral-tier-icon" style={{ background: referralCount >= goldCount ? '#FEF3C7' : '#F3F4F6', color: referralCount >= goldCount ? '#F59E0B' : '#9CA3AF' }}>🥇</span>
            <div>
              <strong style={{ color: referralCount >= goldCount ? '#F59E0B' : '#6B7280' }}>
                {referralCount >= goldCount ? '✓ ' : ''}{goldCount} friends → Gold
              </strong>
              <div className="trial-referral-tier-desc">{goldBenefit}</div>
            </div>
          </div>
          <div className="trial-referral-tier">
            <span className="trial-referral-tier-icon" style={{ background: referralCount >= platinumCount ? '#EDE9FE' : '#F3F4F6', color: referralCount >= platinumCount ? '#7C3AED' : '#9CA3AF' }}>💜</span>
            <div>
              <strong style={{ color: referralCount >= platinumCount ? '#7C3AED' : '#6B7280' }}>
                {referralCount >= platinumCount ? '✓ ' : ''}{platinumCount} friends → Platinum
              </strong>
              <div className="trial-referral-tier-desc">{platinumBenefit}</div>
            </div>
          </div>
        </div>
        <div className="referral-link-row">
          <input className="referral-link-input" readOnly value={referralLink} />
          <button className={`referral-copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <a
          className="trial-modal-wa-btn btn"
          href={`https://wa.me/?text=${encodeURIComponent('Join me on Self Paced Learning — master OC, Selective and NAPLAN exams through consistent practice and instant feedback! Sign up here: ' + referralLink)}`}
          target="_blank" rel="noopener noreferrer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.128.557 4.126 1.526 5.854L0 24l6.334-1.506A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.661-.483-5.207-1.327L3 22l1.357-3.72A9.962 9.962 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          Share on WhatsApp
        </a>
      </div>
    </div>
  )
}

function StreakCelebration({ celebration }) {
  if (!celebration) return null
  const cfg = STREAK_CONFIG[celebration.level] || STREAK_CONFIG[1]
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      {/* Confetti dots */}
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${5 + (i * 5.5) % 90}%`,
          top: '-20px',
          width: 10 + (i % 3) * 4,
          height: 10 + (i % 3) * 4,
          borderRadius: i % 2 === 0 ? '50%' : 3,
          background: ['#F59E0B','#EF4444','#3B82F6','#10B981','#8B5CF6','#EC4899'][i % 6],
          animation: `confettiFall ${1.2 + (i % 5) * 0.3}s ease-in ${(i % 4) * 0.1}s forwards`,
        }} />
      ))}
      {/* Main card */}
      <div style={{
        background: cfg.bg,
        borderRadius: 24,
        padding: '36px 48px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        animation: 'celebPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
        maxWidth: 340,
      }}>
        <div style={{ fontSize: '4rem', animation: 'wiggle 0.6s ease-in-out infinite alternate', display: 'inline-block' }}>{cfg.emoji}</div>
        <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.8rem', color: cfg.color, marginTop: 8 }}>{cfg.heading}</div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#374151', marginTop: 4 }}>{cfg.sub}</div>
        <div style={{ marginTop: 12, fontWeight: 800, fontSize: '1.1rem', color: cfg.color }}>{celebration.streak} correct in a row!</div>
      </div>
    </div>
  )
}

// ── SIDEBAR ───────────────────────────────────────────────────

function Sidebar({ currentTopic, currentSubtopic, topics, topicStats, subtopicStats, totalAnswered, onSelectTopic, canUseSubtopics, onUpgrade }) {
  return (
    <div className="sidebar">
      <div className="sidebar-card">
        <div className="sidebar-title sidebar-title--cta">👇 Click on a Topic to Practise</div>
        <div className="topic-list">
          {topics.map(t => (
            <div key={t.id}>
              <button
                className={`topic-btn${currentTopic === t.id && !currentSubtopic ? ' active' : currentTopic === t.id ? ' active-parent' : ''}`}
                onClick={() => onSelectTopic(t.id, null)}
              >
                <div className="topic-icon" style={{ background: t.bg, color: t.color, fontWeight: 800, fontSize: t.id === 'fractions' ? '13px' : '15px' }}>{t.icon}</div>
                <span style={{ flex: 1, lineHeight: 1.3 }}>{t.name}</span>
                <span className="topic-count">{topicStats[t.id]?.total || 0}</span>
              </button>
              {(() => {
                const statSubs = Object.keys(subtopicStats[t.id] || {})
                const allSubs = [...new Set([...(t.subtopics || []), ...statSubs])]
                if (allSubs.length === 0) return null
                if (!canUseSubtopics) {
                  return (
                    <button
                      onClick={onUpgrade}
                      style={{
                        marginLeft: 12, marginBottom: 4, padding: '5px 10px', borderRadius: 8,
                        background: '#FEF3C7', border: '1.5px dashed #F59E0B', color: '#92400E',
                        fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textAlign: 'left', width: 'calc(100% - 12px)',
                      }}
                    >
                      🔒 Subtopic drill — Gold+
                    </button>
                  )
                }
                return (
                  <div style={{ paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
                    {allSubs.map(sub => {
                      const stats = (subtopicStats[t.id] || {})[sub]
                      const pct = stats?.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null
                      const dotColor = pct === null ? '#cbd5e1' : pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
                      const isActive = currentTopic === t.id && currentSubtopic === sub
                      return (
                        <div
                          key={sub}
                          style={{
                            textAlign: 'left', padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem',
                            fontWeight: 500,
                            background: 'transparent',
                            color: '#64748b',
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{sub}</span>
                          {pct !== null && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: dotColor }}>{pct}%</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      </div>
      <div className="sidebar-card">
        <div className="sidebar-title">Your Progress</div>
        <div className="progress-section">
          <div className="progress-row"><span>Questions Answered</span><span>{totalAnswered}</span></div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: Math.min(100, totalAnswered * 5) + '%' }} /></div>
          {topics.filter(t => (topicStats[t.id]?.total || 0) > 0).length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text2)', textAlign: 'center', padding: '8px 0' }}>Start practising to see your stats!</p>
          ) : topics.filter(t => (topicStats[t.id]?.total || 0) > 0).map(t => {
            const s = topicStats[t.id] || { correct: 0, total: 0 }
            const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
            return (
              <div key={t.id} className="topic-stat-row">
                <div className="topic-stat-name">{t.name.split(' ')[0]}</div>
                <div className="topic-stat-bar">
                  <div className="topic-stat-fill" style={{ width: pct + '%', background: pct >= 70 ? '#52C41A' : pct >= 40 ? '#F59E0B' : '#EF4444' }} />
                </div>
                <div className="topic-stat-score">{s.correct}/{s.total}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── PLANS SCREEN ──────────────────────────────────────────────

const PLAN_META = [
  { tier: 'silver',   label: 'Silver',   price: 'Free', period: null,     desc: 'Get started and explore the platform at no cost.',                       color: '#64748B', bg: '#F1F5F9',  popular: false },
  { tier: 'gold',     label: 'Gold',     price: '$5',   period: '/month', desc: 'More questions and deeper tracking for serious practice.',                 color: '#92400E', bg: '#FEF3C7',  popular: false },
  { tier: 'platinum', label: 'Platinum', price: '$9',   period: '/month', desc: 'Unlimited questions and every feature — the complete experience.',         color: '#6D28D9', bg: '#EDE9FE',  popular: true  },
]

function PlansScreen({ user, idToken, onHome, onReferFriend, onTierUpgrade, referralConfig = {}, subscriptionFeatures }) {
  const currentTier     = user.tier || 'silver'
  const goldCount       = referralConfig.goldCount       || 3
  const platinumCount   = referralConfig.platinumCount   || 5
  const goldBenefit     = referralConfig.goldBenefit     || 'Free Gold access — permanently'
  const platinumBenefit = referralConfig.platinumBenefit || 'Free Platinum access — permanently'
  const [showTrialModal, setShowTrialModal] = useState(true)
  const [promoCode, setPromoCode] = useState('')
  const [promoStatus, setPromoStatus] = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)

  async function redeemPromo() {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoStatus(null)
    try {
      const res = await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ code: promoCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPromoStatus({ type: 'error', message: data.error || 'Failed to redeem code' })
      } else {
        setPromoStatus({ type: 'success', message: data.message })
        setPromoCode('')
        if (onTierUpgrade) onTierUpgrade(data.tier)
      }
    } catch {
      setPromoStatus({ type: 'error', message: 'Network error. Please try again.' })
    } finally {
      setPromoLoading(false)
    }
  }


  return (
    <div className="plans-screen">
      <div className="plans-header">
        <button className="btn btn-secondary" onClick={onHome} style={{ marginBottom: '1.5rem' }}>← Back</button>
        <h2 className="plans-title">Plans &amp; Pricing</h2>
        <p className="plans-sub">
          You are currently on the <strong style={{ color: PLAN_META.find(p=>p.tier===currentTier)?.color }}>{TIER_LABELS[currentTier]}</strong> plan.
          {currentTier !== 'platinum' && ' Invite friends to earn a free upgrade, or subscribe below.'}
        </p>
      </div>

      <div className="plans-grid">
        {PLAN_META.map(plan => {
          const isCurrent = plan.tier === currentTier
          const isDowngrade = PLAN_META.findIndex(p=>p.tier===plan.tier) < PLAN_META.findIndex(p=>p.tier===currentTier)
          const features = getPlanFeatures(plan.tier, subscriptionFeatures)
          return (
            <div
              key={plan.tier}
              className={`plan-card${isCurrent ? ' plan-card--current' : ''}${plan.popular && !isCurrent ? ' plan-card--popular' : ''}`}
              style={isCurrent ? { borderColor: plan.color } : {}}
            >
              {plan.popular && !isCurrent && (
                <div className="plan-popular-badge">Most Popular</div>
              )}
              {isCurrent && (
                <div className="plan-current-badge" style={{ background: plan.color }}>Your Plan</div>
              )}
              <div className="plan-badge" style={{ background: plan.bg, color: plan.color }}>{plan.label}</div>
              <div className="plan-price-row">
                <span className="plan-amount">{plan.price}</span>
                {plan.period && <span className="plan-period">{plan.period}</span>}
              </div>
              <p className="plan-desc">{plan.desc}</p>
              <ul className="plan-features">
                {features.map(f => (
                  <li key={f.text} className={`plan-feat${f.yes ? ' plan-feat--yes' : ' plan-feat--no'}`}>
                    {f.yes ? '✅' : '—'} {f.text}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="plan-current-label" style={{ color: plan.color }}>Active plan</div>
              ) : isDowngrade ? (
                <div className="plan-current-label" style={{ color: '#94a3b8' }}>Lower tier</div>
              ) : (
                <button
                  className={`btn btn-primary plan-upgrade-btn${plan.tier === 'platinum' ? ' plan-upgrade-btn--platinum' : ''}`}
                  style={plan.tier === 'gold' ? { background: '#F59E0B', borderColor: '#F59E0B', color: '#fff' } : {}}
                  onClick={() => onReferFriend && onReferFriend()}
                >
                  🎁 Get {plan.label} Free
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="promo-box">
        <div className="promo-box-title">Have a promo code?</div>
        <div className="promo-box-row">
          <input
            className="promo-input"
            type="text"
            placeholder="Enter code (e.g. GOLD30)"
            value={promoCode}
            onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoStatus(null) }}
            onKeyDown={e => e.key === 'Enter' && redeemPromo()}
          />
          <button
            className="btn btn-primary promo-btn"
            onClick={redeemPromo}
            disabled={promoLoading || !promoCode.trim()}
          >{promoLoading ? '...' : 'Apply'}</button>
        </div>
        {promoStatus && (
          <div className={`promo-status promo-status--${promoStatus.type}`}>{promoStatus.message}</div>
        )}
      </div>

      <p className="plans-note">
        🚀 We're in beta! Invite friends using your referral link to unlock premium access for free — {goldCount} friend{goldCount !== 1 ? 's' : ''} gets you Gold, {platinumCount} get{platinumCount === 1 ? 's' : ''} you Platinum. No payment needed during beta.
      </p>
      {showTrialModal && <TrialModal onClose={() => setShowTrialModal(false)} onReferFriend={onReferFriend} idToken={idToken} onTierUpgrade={onTierUpgrade} referralConfig={referralConfig} />}
    </div>
  )
}

// ── HOME SCREEN ───────────────────────────────────────────────

const COMING_SOON_EXAMS = new Set([])

// ── MANAGE CHILDREN MODAL ─────────────────────────────────────
const EXAM_TYPE_OPTIONS = [
  { id: 'OC', label: 'OC (Opportunity Class)' },
  { id: 'NAPLAN', label: 'NAPLAN' },
  { id: 'Selective', label: 'Selective' },
]

function ManageChildrenModal({ idToken, parentName, children, activeChild, onChildChange, onChildrenUpdated, onClose }) {
  const [view, setView] = useState('list') // 'list' | 'create' | 'edit'
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ childName: '', allowedExamTypes: [] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken }

  const openCreate = () => { setForm({ childName: '', allowedExamTypes: [] }); setError(''); setView('create') }
  const openEdit = (child) => {
    setEditTarget(child)
    setForm({ childName: child.child_name, allowedExamTypes: child.allowed_exam_types || [] })
    setError(''); setView('edit')
  }

  const toggleExam = (id) => setForm(f => ({
    ...f,
    allowedExamTypes: f.allowedExamTypes.includes(id) ? f.allowedExamTypes.filter(e => e !== id) : [...f.allowedExamTypes, id]
  }))

  const handleCreate = async () => {
    if (!form.childName.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/children', { method: 'POST', headers, body: JSON.stringify({ childName: form.childName, allowedExamTypes: form.allowedExamTypes }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onChildrenUpdated([...children, data.child])
      setView('list')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleEdit = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/children', { method: 'PUT', headers, body: JSON.stringify({ childId: editTarget.id, childName: form.childName, allowedExamTypes: form.allowedExamTypes }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const updated = children.map(c => c.id === editTarget.id ? data.child : c)
      onChildrenUpdated(updated)
      if (activeChild?.id === editTarget.id) onChildChange(data.child)
      setView('list')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (child) => {
    if (!confirm(`Remove "${child.child_name}"? Their practice history will also be deleted.`)) return
    try {
      const res = await fetch('/api/children', { method: 'DELETE', headers, body: JSON.stringify({ childId: child.id }) })
      if (!res.ok) throw new Error((await res.json()).error)
      const updated = children.filter(c => c.id !== child.id)
      onChildrenUpdated(updated)
      if (activeChild?.id === child.id) onChildChange(null)
    } catch (err) { alert('Failed to delete: ' + err.message) }
  }

  const examBadge = (types) => {
    if (!types?.length) return <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>All exams</span>
    return types.map(t => <span key={t} style={{ background: '#EDE9FE', color: '#7C3AED', borderRadius: 8, padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700, marginRight: 4 }}>{t}</span>)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 460, padding: '24px', boxShadow: '0 8px 40px rgba(0,0,0,0.2)', maxHeight: '85vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.1rem', color: '#1E1B4B' }}>
              {view === 'list' ? 'Manage Profiles' : view === 'create' ? 'Add Child' : 'Edit Child'}
            </div>
            {view === 'list' && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>Signed in as {parentName}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        {/* LIST VIEW */}
        {view === 'list' && (
          <>
            {/* Parent row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#FFF3E6', borderRadius: 10, marginBottom: 8, border: '1.5px solid #E8D5C0' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{parentName.split(' ')[0]} <span style={{ fontWeight: 500, color: '#64748b', fontSize: '0.8rem' }}>(you)</span></div>
                <div style={{ fontSize: '0.72rem', color: '#7A5C3F' }}>All exam types</div>
              </div>
            </div>

            {/* Children rows */}
            {children.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: '0.88rem' }}>No child profiles yet.</div>
            )}
            {children.map(child => (
              <div key={child.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'white', borderRadius: 10, marginBottom: 8, border: '1.5px solid #E8D5C0' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{child.child_name}</div>
                  <div style={{ marginTop: 3 }}>{examBadge(child.allowed_exam_types)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(child)} style={{ padding: '4px 10px', borderRadius: 7, border: '1.5px solid #BAE6FD', background: '#F0F9FF', color: '#0369A1', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(child)} style={{ padding: '4px 10px', borderRadius: 7, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>Remove</button>
                </div>
              </div>
            ))}

            <button onClick={openCreate} style={{ width: '100%', marginTop: 8, padding: '10px 0', borderRadius: 10, border: '1.5px dashed #7C3AED', background: '#FAFAFE', color: '#7C3AED', fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
              + Add Child Profile
            </button>
          </>
        )}

        {/* CREATE / EDIT FORM */}
        {(view === 'create' || view === 'edit') && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#374151', marginBottom: 5 }}>Child's Name *</label>
              <input
                value={form.childName}
                onChange={e => setForm(f => ({ ...f, childName: e.target.value }))}
                placeholder="e.g. Emma"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E8D5C0', fontFamily: 'Nunito', fontWeight: 600, fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#374151', marginBottom: 5 }}>
                Which exams is this child preparing for?
                <span style={{ fontWeight: 500, color: '#9CA3AF' }}> (leave blank for all)</span>
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {EXAM_TYPE_OPTIONS.map(({ id, label }) => {
                  const on = form.allowedExamTypes.includes(id)
                  return (
                    <button key={id} onClick={() => toggleExam(id)} style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${on ? '#7C3AED' : '#E8D5C0'}`, background: on ? '#7C3AED' : 'white', color: on ? 'white' : '#374151', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                      {label}
                    </button>
                  )
                })}
              </div>
              {form.allowedExamTypes.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 6 }}>No selection = all exam types visible</div>
              )}
            </div>

            {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.82rem', fontWeight: 600 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setView('list')} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>Back</button>
              <button
                onClick={view === 'create' ? handleCreate : handleEdit}
                disabled={saving}
                style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: saving ? '#C4B5FD' : '#7C3AED', color: 'white', fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.88rem', cursor: saving ? 'not-allowed' : 'pointer' }}
              >{saving ? 'Saving…' : view === 'create' ? 'Add Child' : 'Save Changes'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ExamDatesPanel({ examType }) {
  const [upcoming, setUpcoming] = useState([])

  useEffect(() => {
    fetch('/api/exam-dates', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { if (data.dates) setUpcoming(data.dates) })
      .catch(() => {})
  }, [])

  function daysUntil(dateStr) {
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const diff = new Date(dateStr) - now
    const days = Math.round(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days <= 14) return `${days} days`
    const weeks = Math.round(days / 7)
    if (weeks <= 8) return `${weeks}w away`
    const months = Math.round(days / 30)
    return `${months}mo away`
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="exam-dates-panel">
      <div className="exam-dates-header">
        <span className="exam-dates-title">📅 Key Exam Dates</span>
        <span className="exam-dates-sub">NSW 2026</span>
      </div>
      {upcoming.length === 0 ? (
        <div className="exam-dates-empty">No upcoming dates — check back soon!</div>
      ) : (
        <div className="exam-dates-list">
          {upcoming.map((d, i) => {
            const colors = EXAM_DATE_COLORS[d.tag] || EXAM_DATE_COLORS.naplan
            const isHighlighted = d.tag === (examType || '').toLowerCase()
            return (
              <div key={i} className={`exam-date-item${isHighlighted ? ' exam-date-item--active' : ''}`} style={{ background: colors.bg, borderColor: colors.border }}>
                <div className="exam-date-dot" style={{ background: colors.dot }} />
                <div className="exam-date-body">
                  <div className="exam-date-label">{d.label}</div>
                  <div className="exam-date-meta">
                    <span className="exam-date-when">{formatDate(d.date)}</span>
                    {d.note && <span className="exam-date-note">{d.note}</span>}
                  </div>
                </div>
                <div className="exam-date-countdown" style={{ color: colors.dot }}>{daysUntil(d.date)}</div>
              </div>
            )
          })}
        </div>
      )}
      <div className="exam-dates-footer">Dates are approximate — verify at <a href="https://education.nsw.gov.au" target="_blank" rel="noopener noreferrer">NSW DoE</a></div>
    </div>
  )
}

function HomeScreen({ user, examType, onExamTypeChange, yearLevel, onYearLevelChange, score, totalAnswered, topicStats, subtopicStats, onSelectTopic, onUpgrade, canAccessAllExams = true, testGroups = [], onTestTileClick, enabledExams = ['OC', 'NAPLAN', 'Selective'], children = [], activeChild = null, onChildChange, onManageChildren }) {
  const totalCorrect = Object.values(topicStats).reduce((a, v) => a + v.correct, 0)
  const topicList = EXAM_TOPICS[examType] || EXAM_TOPICS.OC
  const [showComingSoon, setShowComingSoon] = useState(null) // stores the exam label

  return (
    <div className="home-screen">
      {showComingSoon && (
        <div className="coming-soon-backdrop" onClick={() => setShowComingSoon(null)}>
          <div className="coming-soon-modal" onClick={e => e.stopPropagation()}>
            <button className="coming-soon-close" onClick={() => setShowComingSoon(null)} aria-label="Close">✕</button>
            <div className="coming-soon-icon">🚧</div>
            <h3 className="coming-soon-title">Coming Soon!</h3>
            <p className="coming-soon-body">
              We're working hard on <strong>{showComingSoon}</strong> questions and will have them ready soon. Stay tuned!
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowComingSoon(null)}>Got it</button>
          </div>
        </div>
      )}
      <div className="home-title">Hi {user.name.split(' ')[0]}! 👋</div>
      <div className="home-sub">Practice for {examType} exam-style questions. Choose a topic to generate a question.</div>
      {/* Child / Profile selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', flexShrink: 0 }}>Practising as:</span>
        <button
          onClick={() => onChildChange(null)}
          style={{ padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${!activeChild ? '#FF6B35' : '#E8D5C0'}`, background: !activeChild ? '#FF6B35' : 'white', color: !activeChild ? 'white' : '#2D1B0E', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
        >{user.name.split(' ')[0]} (You)</button>
        {children.map(child => (
          <button
            key={child.id}
            onClick={() => onChildChange(child)}
            style={{ padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${activeChild?.id === child.id ? '#7C3AED' : '#E8D5C0'}`, background: activeChild?.id === child.id ? '#7C3AED' : 'white', color: activeChild?.id === child.id ? 'white' : '#2D1B0E', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
          >{child.child_name}</button>
        ))}
        <button
          onClick={onManageChildren}
          style={{ padding: '4px 10px', borderRadius: 20, border: '1.5px dashed #CBD5E1', background: 'white', color: '#64748b', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
        >+ Manage</button>
      </div>

      <div style={{ marginBottom: 10, fontSize: '0.86rem', color: '#334155', fontWeight: 600 }}>
        Current track: <span style={{ fontWeight: 800 }}>{examType}</span>
      </div>
      <div className="exam-row" style={{ marginBottom: 16 }}>
        {EXAM_TYPES.filter(item => enabledExams.includes(item.id)).map(item => {
          const comingSoon = COMING_SOON_EXAMS.has(item.id)
          const locked = !canAccessAllExams && item.id !== 'OC'
          return (
            <button
              key={item.id}
              onClick={() => {
                if (locked) { onUpgrade(); return }
                if (comingSoon) { setShowComingSoon(item.label); return }
                onExamTypeChange(item.id)
                if (typeof window !== 'undefined') localStorage.setItem('selfpaced-examType', item.id)
              }}
              className={`exam-chip${examType === item.id ? ' active' : ''}${comingSoon ? ' exam-chip--soon' : ''}${locked ? ' exam-chip--locked' : ''}`}
              style={{ marginRight: 8 }}
              title={locked ? 'Upgrade to Gold or above' : comingSoon ? 'Coming soon' : undefined}
            >
              {item.label}
              {locked && <span className="exam-chip-lock-badge">🔒</span>}
              {!locked && comingSoon && <span className="exam-chip-soon-badge">Soon</span>}
            </button>
          )
        })}
      </div>
      {(EXAM_YEAR_LEVELS[examType] || []).length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', alignSelf: 'center' }}>Year level:</span>
          {(EXAM_YEAR_LEVELS[examType] || []).map(y => (
            <button
              key={y.value}
              onClick={() => onYearLevelChange(y.value)}
              className={`exam-chip${yearLevel === y.value ? ' active' : ''}`}
            >{y.label}</button>
          ))}
        </div>
      )}
      {(EXAM_YEAR_LEVELS[examType] || []).length === 1 && (
        <div style={{ marginBottom: 12, fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
          Year level: <span style={{ fontWeight: 800, color: '#334155' }}>{EXAM_YEAR_LEVELS[examType][0].label}</span>
        </div>
      )}
      <div className="stats-card" style={{ marginBottom: 20 }}>
        <div className="stats-title">This Session</div>
        <div className="stats-grid">
          <div className="stat-box"><div className="stat-num">{totalAnswered}</div><div className="stat-label">Attempted</div></div>
          <div className="stat-box"><div className="stat-num" style={{ color: 'var(--green)' }}>{totalCorrect}</div><div className="stat-label">Correct</div></div>
          <div className="stat-box"><div className="stat-num" style={{ color: 'var(--accent)' }}>{score}</div><div className="stat-label">Points</div></div>
        </div>
      </div>

      {testGroups.length > 0 && onTestTileClick && (() => {
        // Invert: build topic → [{ group, count }] map
        const topicMap = {}
        for (const g of testGroups) {
          for (const t of g.topics) {
            if (!topicMap[t.topic_id]) topicMap[t.topic_id] = { topic_name: t.topic_name, tests: [] }
            topicMap[t.topic_id].tests.push({ group: g, count: t.count })
          }
        }
        const topicOrder = (EXAM_TOPICS[examType] || []).map(t => t.id)
        const topicEntries = Object.entries(topicMap).sort(([a], [b]) => {
          const ai = topicOrder.indexOf(a), bi = topicOrder.indexOf(b)
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        })
        return (
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.95rem', marginBottom: 4, color: '#1E293B' }}>Practice Tests</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 14 }}>Select a topic to see available tests and past papers.</div>
            {topicEntries.map(([topicId, { topic_name, tests }]) => (
              <div key={topicId} className="paper-group paper-group--sample" style={{ marginBottom: 10 }}>
                <div className="paper-group-header">{topic_name}</div>
                <div className="paper-topic-tiles">
                  {tests.map((item, ti) => {
                    const isPast = item.group.question_source === 'past_paper'
                    const label = isPast
                      ? `📄 ${item.group.paper_year || 'Past Paper'}`
                      : `📋 ${item.group.title || item.group.paper_year || 'Practice Test'}`
                    const topic = { topic_id: topicId, topic_name, count: item.count }
                    return (
                      <button key={ti} className="paper-topic-tile" onClick={() => onTestTileClick(item.group, topic)}>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: '0.73rem', color: '#64748B' }}>{item.count} questions</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

// ── BALLOON PROGRESS BAR ──────────────────────────────────────

function BalloonProgressBar({ progress }) {
  const TOTAL = 10
  const blockColors = ['#06B6D4','#06B6D4','#3B82F6','#3B82F6','#8B5CF6','#8B5CF6','#EC4899','#EC4899','#F59E0B','#FF6B35']

  return (
    <div className="balloon-bar-wrap">
      <div className={`balloon-svg-wrap${progress === 10 ? ' balloon-pop' : ''}`}>
        <svg width="48" height="60" viewBox="0 0 48 60" fill="none">
          <ellipse cx="24" cy="26" rx="20" ry="24" fill={progress >= 8 ? '#FF6B35' : progress >= 5 ? '#F59E0B' : '#4ADE80'} />
          <ellipse cx="17" cy="16" rx="5" ry="7" fill="white" opacity="0.3" />
          <path d="M22 50 Q24 54 26 50" stroke="#888" strokeWidth="1.5" fill="none"/>
          <path d="M24 52 Q20 56 24 60" stroke="#aaa" strokeWidth="1.2" strokeDasharray="2 2" />
        </svg>
        {progress >= 7 && <div className="balloon-shimmer" />}
      </div>

      <div className="balloon-blocks">
        {Array.from({ length: TOTAL }).map((_, i) => {
          const blockIndex = TOTAL - 1 - i
          const filled = blockIndex < progress
          return (
            <div
              key={blockIndex}
              className={`balloon-block${filled ? ' balloon-block--filled' : ''}${filled && blockIndex === progress - 1 ? ' balloon-block--new' : ''}`}
              style={filled ? { background: blockColors[blockIndex], boxShadow: `0 0 8px ${blockColors[blockIndex]}88` } : {}}
            />
          )
        })}
      </div>

      <div className="balloon-label">{progress}/10</div>
    </div>
  )
}

// ── BALLOON POP OVERLAY ────────────────────────────────────────

function BalloonPopOverlay({ visible }) {
  if (!visible) return null
  const confetti = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * 360
    const dist = 120 + Math.random() * 80
    const dx = Math.round(Math.cos((angle * Math.PI) / 180) * dist)
    const dy = Math.round(Math.sin((angle * Math.PI) / 180) * dist)
    const colors = ['#FF6B35','#F59E0B','#4ADE80','#3B82F6','#EC4899','#8B5CF6','#06B6D4']
    const color = colors[i % colors.length]
    const shapes = ['●', '■', '▲', '★', '♦']
    return { dx, dy, color, shape: shapes[i % shapes.length] }
  })
  const words = ['AMAZING! 🎉', 'PERFECT! 🔥', 'LEGEND! 🏆', '10 STREAK! 🎊']
  const word = words[Math.floor(Math.random() * words.length)]

  return (
    <div className="balloon-pop-overlay">
      <div className="balloon-pop-graffiti">{word}</div>
      <div className="balloon-pop-sub">10 correct in a row! 🎈💥</div>
      {confetti.map((c, i) => (
        <span
          key={i}
          className="balloon-confetti"
          style={{ '--dx': `${c.dx}px`, '--dy': `${c.dy}px`, color: c.color, animationDelay: `${i * 0.03}s` }}
        >{c.shape}</span>
      ))}
    </div>
  )
}

// ── QUESTION VIEW ─────────────────────────────────────────────

const REPORT_REASONS = [
  { value: 'missing_image',       label: 'Missing Image' },
  { value: 'wrong_answer',        label: 'Wrong Answer' },
  { value: 'ambiguous_question',  label: 'Ambiguous Question' },
]

function QuestionView({ question, questionNumber, topicStats, examType, onAnswer, onNext, onHome, currentTopics, subtopics, currentSubtopic, onSubtopicChange, barProgress, idToken }) {
  const [answered, setAnswered] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState(null)
  const [reportStatus, setReportStatus] = useState(null) // null | 'submitting' | 'done' | 'error'
  const topic = currentTopics.find(t => t.id === question.topicId) || { name: 'Topic' }
  const labels = ['A', 'B', 'C', 'D', 'E']

  const handleSelect = (idx) => {
    if (answered) return
    setSelectedIdx(idx)
  }

  const handleSubmit = () => {
    if (answered || selectedIdx === null) return
    setAnswered(true)
    onAnswer(selectedIdx)
  }

  const handleReport = async () => {
    if (!reportReason || reportStatus === 'submitting' || reportStatus === 'done') return
    setReportStatus('submitting')
    try {
      const res = await fetch('/api/report-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ questionId: question.id, reason: reportReason }),
      })
      setReportStatus(res.ok ? 'done' : 'error')
    } catch {
      setReportStatus('error')
    }
  }

  const getOptionClass = (i) => {
    if (!answered) return i === selectedIdx ? 'option-btn selected' : 'option-btn'
    if (i === question.correct) return 'option-btn correct'
    if (i === selectedIdx && i !== question.correct) return 'option-btn wrong'
    return 'option-btn'
  }

  const isCorrect = selectedIdx === question.correct

  return (
    <>
      <div className="question-view-wrap">
      <div className="question-view-main">
      <div className="question-card">
        <div className="question-header">
          <span className="question-num">Question {questionNumber}</span>
          <div className="topic-pill" style={{ background: topic.color }}>{topic.name}</div>
          <div className="exam-pill" style={{ background: '#DBEAFE', color: '#1D4ED8', fontWeight: 700, padding: '4px 8px', borderRadius: 999, fontSize: '0.78rem' }}>{examType} Track</div>
          <div className={`diff-pill diff-${question.difficulty}`}>
            {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
          </div>
        </div>
        {subtopics && subtopics.length > 0 && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Subtopic:</span>
            {subtopics.map(sub => (
              <button
                key={sub}
                onClick={() => onSubtopicChange(sub)}
                style={{
                  padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                  border: currentSubtopic === sub ? 'none' : '1px solid #e2e8f0',
                  background: currentSubtopic === sub ? '#065F46' : '#f8fafc',
                  color: currentSubtopic === sub ? '#fff' : '#475569',
                  cursor: 'pointer',
                }}
              >{sub}</button>
            ))}
          </div>
        )}
        <div className="question-body">
          <div className="question-text">{question.question}</div>
          {(() => {
            const imgs = question.image_urls?.length ? question.image_urls : (question.image_url ? [question.image_url] : [])
            return imgs.length > 0 ? (
              <div className="question-image-wrap">
                {imgs.map((url, i) => (
                  <img key={i} src={url} alt={`Question diagram ${imgs.length > 1 ? i + 1 : ''}`} className="question-image" />
                ))}
              </div>
            ) : null
          })()}
          {question.visual && (
            <div className="question-visual">
              <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{question.visual}</pre>
            </div>
          )}
          <div className="options-grid">
            {question.options.map((opt, i) => (
              <button key={i} className={getOptionClass(i)} onClick={() => handleSelect(i)} disabled={answered}>
                <div className="option-label">{answered && i === question.correct ? '✓' : answered && i === selectedIdx && !isCorrect ? '✗' : labels[i]}</div>
                <span>{opt}</span>
              </button>
            ))}
          </div>
          {answered && (
            <div className={`feedback-box ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`}>
              {isCorrect
                ? <><strong>Correct!</strong> {question.explanation}</>
                : <><strong>Not quite.</strong> The correct answer was <strong>{labels[question.correct]}: {question.options[question.correct]}</strong>. {question.explanation}</>
              }
            </div>
          )}
        </div>
        <div className="question-footer">
          <button className="btn btn-secondary" onClick={onHome}>Home</button>
          {answered && <button className="btn btn-generate" onClick={onNext}>Next Question</button>}
          {!answered && selectedIdx === null && <span className="hint-text">Select an answer above</span>}
          {!answered && selectedIdx !== null && <button className="btn btn-primary" onClick={handleSubmit}>Submit Answer</button>}
          {question.id && (
            <button
              onClick={() => { setReportOpen(v => !v); setReportReason(null); setReportStatus(null) }}
              style={{
                marginLeft: 'auto', background: '#FFF7ED', border: '1.5px solid #FED7AA',
                color: '#C2410C', fontSize: '0.8rem', fontWeight: 700,
                cursor: 'pointer', padding: '6px 12px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >⚑ Report a Question?</button>
          )}
        </div>

        {reportOpen && question.id && (
          <div style={{
            margin: '0 16px 16px', padding: '14px 16px',
            background: '#FFF8F0', border: '1.5px solid #FED7AA',
            borderRadius: 12,
          }}>
            {reportStatus === 'done' ? (
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16A34A', textAlign: 'center', padding: '4px 0' }}>
                ✓ Thanks — we&apos;ll review this question.
              </div>
            ) : (
              <>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400E', marginBottom: 10 }}>
                  What&apos;s wrong with this question?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {REPORT_REASONS.map(r => (
                    <label key={r.value} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                      background: reportReason === r.value ? '#FEF3C7' : 'white',
                      border: `1.5px solid ${reportReason === r.value ? '#F59E0B' : '#E5E7EB'}`,
                      fontSize: '0.85rem', fontWeight: 600, color: '#374151',
                      transition: 'all 0.15s',
                    }}>
                      <input
                        type="radio"
                        name="report-reason"
                        value={r.value}
                        checked={reportReason === r.value}
                        onChange={() => setReportReason(r.value)}
                        style={{ accentColor: '#F59E0B' }}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
                {reportStatus === 'error' && (
                  <div style={{ fontSize: '0.78rem', color: '#DC2626', marginBottom: 8 }}>
                    Something went wrong — please try again.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleReport}
                    disabled={!reportReason || reportStatus === 'submitting'}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                      background: reportReason ? '#F59E0B' : '#E5E7EB',
                      color: reportReason ? 'white' : '#94A3B8',
                      fontWeight: 700, fontSize: '0.82rem', cursor: reportReason ? 'pointer' : 'default',
                    }}
                  >
                    {reportStatus === 'submitting' ? 'Submitting…' : 'Submit Report'}
                  </button>
                  <button
                    onClick={() => setReportOpen(false)}
                    style={{
                      padding: '8px 12px', borderRadius: 8,
                      border: '1.5px solid #E5E7EB', background: 'white',
                      fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', color: '#64748B',
                    }}
                  >Cancel</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <div className="stats-card">
        <div className="stats-title">Topic: {topic.name}</div>
        <div className="stats-grid">
          <div className="stat-box"><div className="stat-num">{topicStats[question.topicId].total}</div><div className="stat-label">Attempted</div></div>
          <div className="stat-box"><div className="stat-num" style={{ color: 'var(--green)' }}>{topicStats[question.topicId].correct}</div><div className="stat-label">Correct</div></div>
          <div className="stat-box">
            <div className="stat-num" style={{ color: 'var(--accent)' }}>
              {topicStats[question.topicId].total > 0 ? Math.round((topicStats[question.topicId].correct / topicStats[question.topicId].total) * 100) : 0}%
            </div>
            <div className="stat-label">Accuracy</div>
          </div>
        </div>
      </div>
      </div>
      <BalloonProgressBar progress={barProgress || 0} />
      </div>
    </>
  )
}

// ── MAIN APP ──────────────────────────────────────────────────

// ── PRACTICE TEST COMPONENTS ──────────────────────────────────

function TestConfirmModal({ group, topic, onConfirm, onCancel }) {
  const isPast = group.question_source === 'past_paper'
  const paperLabel = isPast ? `${group.paper_year || 'Past Paper'} Past Paper` : (group.title || 'Practice Test')
  return (
    <div className="test-confirm-backdrop" onClick={onCancel}>
      <div className="test-confirm-modal" onClick={e => e.stopPropagation()}>
        <button style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#94A3B8' }} onClick={onCancel}>✕</button>
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>📝</div>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1E293B', marginBottom: 6 }}>Start Test</div>
        <div style={{ fontSize: '0.88rem', color: '#475569', marginBottom: 4 }}><strong>{paperLabel}</strong></div>
        <div style={{ fontSize: '0.88rem', color: '#475569', marginBottom: 16 }}>Topic: <strong>{topic.topic_name}</strong></div>
        <div style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 20 }}>{topic.count} questions · Work through them all at your own pace</div>
        <button className="btn btn-primary" style={{ width: '100%', marginBottom: 8 }} onClick={onConfirm}>▶ Start Test</button>
        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function TestSession({ questions, label, idToken, activeChildId, onFinish }) {
  const [current, setCurrent] = useState(0)
  const [selections, setSelections] = useState({}) // { [index]: selectedIdx } — freely changeable until final submit
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState(null)
  const [reportStatus, setReportStatus] = useState(null) // null | 'submitting' | 'done' | 'error'

  const q = questions[current]
  const totalQ = questions.length
  const answered = Object.keys(selections).length
  const pct = Math.round((answered / totalQ) * 100)
  const unanswered = totalQ - answered

  // Reset report state when navigating to a new question
  useEffect(() => {
    setReportOpen(false)
    setReportReason(null)
    setReportStatus(null)
  }, [current])

  const handleReport = async () => {
    if (!reportReason || reportStatus === 'submitting' || reportStatus === 'done') return
    setReportStatus('submitting')
    try {
      const res = await fetch('/api/report-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ questionId: q.id, reason: reportReason }),
      })
      setReportStatus(res.ok ? 'done' : 'error')
    } catch {
      setReportStatus('error')
    }
  }

  function handleFinish() {
    // Record all responses at submission time
    for (const [idx, selectedOption] of Object.entries(selections)) {
      const question = questions[parseInt(idx)]
      if (question?.id && idToken) {
        fetch('/api/record-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken, ...(activeChildId ? { 'X-Child-Id': activeChildId } : {}) },
          body: JSON.stringify({ questionId: question.id, selectedOption, responseTimeSeconds: null }),
        }).catch(() => {})
      }
    }
    onFinish(selections)
  }

  return (
    <div className="question-card" style={{ paddingBottom: 24 }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', marginBottom: 10 }}>{label}</div>
      <div className="test-progress-wrap">
        <div className="test-progress-row">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>Question {current + 1} of {totalQ}</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>{answered} answered</span>
        </div>
        <div className="test-progress-track">
          <div className="test-progress-fill" style={{ width: pct + '%' }} />
        </div>
      </div>

      <div className="question-body">
        {q.passage && (
          <div style={{ background: '#F8F5F0', border: '1.5px solid #E8D5C0', borderRadius: 10, padding: '14px 16px', marginBottom: 16, maxHeight: 280, overflowY: 'auto' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#7A5C3F', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Reading Passage</div>
            <div style={{ fontSize: '0.88rem', lineHeight: 1.7, color: '#2D1B0E', whiteSpace: 'pre-wrap' }}>{q.passage}</div>
          </div>
        )}
        {q.visual && <pre className="visual-block">{q.visual}</pre>}
        <div className="question-text">{q.question}</div>
        {q.image_urls?.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {q.image_urls.map((url, i) => (
              <img key={i} src={url} alt="Question visual" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 6 }} />
            ))}
          </div>
        )}
        <div className="options-list">
          {q.options.map((opt, i) => {
            const isChosen = selections[current] === i
            const cls = 'option-btn' + (isChosen ? ' selected' : '')
            return (
              <button key={i} className={cls} onClick={() => setSelections(prev => ({ ...prev, [current]: i }))}>
                <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                <span>{opt}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>← Prev</button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {q.id && (
            <button
              onClick={() => { setReportOpen(v => !v); setReportReason(null); setReportStatus(null) }}
              style={{
                background: '#FFF7ED', border: '1.5px solid #FED7AA',
                color: '#C2410C', fontSize: '0.8rem', fontWeight: 700,
                cursor: 'pointer', padding: '6px 12px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >⚑ Report a Question?</button>
          )}
          {current < totalQ - 1 && (
            <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)}>Next →</button>
          )}
          {current === totalQ - 1 && (
            unanswered === 0
              ? <button className="btn btn-primary" style={{ background: 'var(--green)' }} onClick={handleFinish}>Submit & See Results</button>
              : <>
                  <button className="btn btn-secondary" onClick={() => {
                    const firstUnanswered = questions.findIndex((_, i) => selections[i] === undefined)
                    if (firstUnanswered !== -1) setCurrent(firstUnanswered)
                  }}>Go to Unanswered ({unanswered})</button>
                  <button className="btn btn-primary" style={{ background: 'var(--green)' }} onClick={handleFinish}>Submit Anyway</button>
                </>
          )}
        </div>
      </div>

      {reportOpen && q.id && (
        <div style={{
          marginTop: 14, padding: '14px 16px',
          background: '#FFF8F0', border: '1.5px solid #FED7AA',
          borderRadius: 12,
        }}>
          {reportStatus === 'done' ? (
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16A34A', textAlign: 'center', padding: '4px 0' }}>
              ✓ Thanks — we&apos;ll review this question.
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400E', marginBottom: 10 }}>
                What&apos;s wrong with this question?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {REPORT_REASONS.map(r => (
                  <label key={r.value} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                    background: reportReason === r.value ? '#FEF3C7' : 'white',
                    border: `1.5px solid ${reportReason === r.value ? '#F59E0B' : '#E5E7EB'}`,
                    fontSize: '0.85rem', fontWeight: 600, color: '#374151',
                  }}>
                    <input
                      type="radio"
                      name={`test-report-reason-${current}`}
                      value={r.value}
                      checked={reportReason === r.value}
                      onChange={() => setReportReason(r.value)}
                      style={{ accentColor: '#F59E0B' }}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
              {reportStatus === 'error' && (
                <div style={{ fontSize: '0.78rem', color: '#DC2626', marginBottom: 8 }}>
                  Something went wrong — please try again.
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleReport}
                  disabled={!reportReason || reportStatus === 'submitting'}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                    background: reportReason ? '#F59E0B' : '#E5E7EB',
                    color: reportReason ? 'white' : '#94A3B8',
                    fontWeight: 700, fontSize: '0.82rem', cursor: reportReason ? 'pointer' : 'default',
                  }}
                >
                  {reportStatus === 'submitting' ? 'Submitting…' : 'Submit Report'}
                </button>
                <button
                  onClick={() => setReportOpen(false)}
                  style={{
                    padding: '8px 12px', borderRadius: 8,
                    border: '1.5px solid #E5E7EB', background: 'white',
                    fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', color: '#64748B',
                  }}
                >Cancel</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function TestResultsScreen({ questions, answers, label, onReturnHome, idToken }) {
  const totalQ = questions.length
  const correct = questions.filter((q, i) => answers[i] === q.correct).length
  const pct = Math.round((correct / totalQ) * 100)
  const pass = pct >= 60
  const [reviewMode, setReviewMode] = useState(false)
  const [reportOpen, setReportOpen] = useState({})   // { [i]: true/false }
  const [reportReason, setReportReason] = useState({}) // { [i]: reason }
  const [reportStatus, setReportStatus] = useState({}) // { [i]: 'submitting'|'done'|'error' }
  const wrongQuestions = questions.map((q, i) => ({ q, i })).filter(({ i }) => answers[i] !== questions[i].correct)

  const handleReport = async (q, i) => {
    if (!reportReason[i]) return
    setReportStatus(s => ({ ...s, [i]: 'submitting' }))
    try {
      const res = await fetch('/api/report-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ questionId: q.id, reason: reportReason[i] }),
      })
      setReportStatus(s => ({ ...s, [i]: res.ok ? 'done' : 'error' }))
    } catch {
      setReportStatus(s => ({ ...s, [i]: 'error' }))
    }
  }

  if (reviewMode) {
    return (
      <div className="question-card">
        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1E293B', marginBottom: 16 }}>
          ❌ Reviewing Wrong Answers ({wrongQuestions.length})
        </div>
        {wrongQuestions.map(({ q, i }) => (
          <div key={i} style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 6, color: '#1E293B' }}>Q{i + 1}: {q.question}</div>
            {q.visual && <pre className="visual-block" style={{ fontSize: '0.78rem' }}>{q.visual}</pre>}
            {q.image_urls?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {q.image_urls.map((url, ui) => (
                  <img key={ui} src={url} alt="Question visual" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 4 }} />
                ))}
              </div>
            )}
            <div style={{ fontSize: '0.82rem', color: 'var(--red)', marginBottom: 2 }}>
              ✗ Your answer: {q.options[answers[i]] ?? '(not answered)'}
            </div>
            <div className="test-result-correct-ans">✓ Correct: {q.options[q.correct]}</div>
            {q.explanation && (
              <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 6, lineHeight: 1.5 }}>{q.explanation}</div>
            )}
            {q.id && (
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => setReportOpen(s => ({ ...s, [i]: !s[i] }))}
                  style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', color: '#C2410C', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: '5px 10px', borderRadius: 8 }}
                >⚑ Report a Question?</button>
                {reportOpen[i] && (
                  <div style={{ marginTop: 8, padding: '12px 14px', background: '#FFF8F0', border: '1.5px solid #FED7AA', borderRadius: 10 }}>
                    {reportStatus[i] === 'done' ? (
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16A34A' }}>✓ Thanks — we&apos;ll review this question.</div>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400E', marginBottom: 8 }}>What&apos;s wrong with this question?</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                          {REPORT_REASONS.map(r => (
                            <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: reportReason[i] === r.value ? '#FEF3C7' : 'white', border: `1.5px solid ${reportReason[i] === r.value ? '#F59E0B' : '#E5E7EB'}`, fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                              <input type="radio" name={`report-reason-${i}`} value={r.value} checked={reportReason[i] === r.value} onChange={() => setReportReason(s => ({ ...s, [i]: r.value }))} style={{ accentColor: '#F59E0B' }} />
                              {r.label}
                            </label>
                          ))}
                        </div>
                        {reportStatus[i] === 'error' && <div style={{ fontSize: '0.75rem', color: '#DC2626', marginBottom: 6 }}>Something went wrong — please try again.</div>}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleReport(q, i)} disabled={!reportReason[i] || reportStatus[i] === 'submitting'} style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none', background: reportReason[i] ? '#F59E0B' : '#E5E7EB', color: reportReason[i] ? 'white' : '#94A3B8', fontWeight: 700, fontSize: '0.8rem', cursor: reportReason[i] ? 'pointer' : 'default' }}>
                            {reportStatus[i] === 'submitting' ? 'Submitting…' : 'Submit Report'}
                          </button>
                          <button onClick={() => setReportOpen(s => ({ ...s, [i]: false }))} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', color: '#64748B' }}>Cancel</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={() => setReviewMode(false)}>← Back to Results</button>
      </div>
    )
  }

  return (
    <div className="question-card">
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', marginBottom: 12 }}>{label}</div>
      <div className="test-results-header">
        <div className={`test-score-ring${pass ? ' test-score-ring--pass' : ' test-score-ring--fail'}`}>
          <span style={{ fontSize: '1.6rem', fontWeight: 900 }}>{pct}%</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: pass ? '#166534' : '#991B1B', marginTop: 2 }}>{pass ? 'PASS' : 'KEEP TRYING'}</span>
        </div>
        <div style={{ fontSize: '0.92rem', color: '#64748B', marginTop: 10 }}>{correct} out of {totalQ} correct</div>
      </div>
      <div style={{ margin: '20px 0' }}>
        {questions.map((q, i) => {
          const isCorrect = answers[i] === q.correct
          return (
            <div key={i} className="test-result-row">
              <span className={`test-result-icon${isCorrect ? ' test-result-icon--correct' : ' test-result-icon--wrong'}`}>
                {isCorrect ? '✓' : '✗'}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#475569', flex: 1 }}>
                Q{i + 1}: {q.question.slice(0, 72)}{q.question.length > 72 ? '…' : ''}
              </span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
        {wrongQuestions.length > 0 && (
          <button className="btn btn-primary" style={{ background: '#EF4444' }} onClick={() => setReviewMode(true)}>
            Review Wrong Answers ({wrongQuestions.length})
          </button>
        )}
        <button className="btn btn-secondary" onClick={onReturnHome}>← Back to Home</button>
      </div>
    </div>
  )
}

export default function App() {
  // Initialize session from localStorage if available
  const getInitialSession = () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('selfpaced-session')
        return stored ? JSON.parse(stored) : { user: null, idToken: null }
      } catch (err) {
        console.warn('Failed to load session from localStorage:', err)
        return { user: null, idToken: null }
      }
    }
    return { user: null, idToken: null }
  }

  const initialSession = getInitialSession()
  const [screen, setScreen] = useState(initialSession.user ? 'app' : 'landing') // landing | auth | pending | rejected | app | history | ranking
  const [session, setSession] = useState(initialSession)
  const [examType, setExamType] = useState('OC')
  const [yearLevel, setYearLevel] = useState('4')
  const [currentTopic, setCurrentTopic] = useState(null)
  const [currentSubtopic, setCurrentSubtopic] = useState(null)
  const [question, setQuestion] = useState(null)
  const [loadingQuestion, setLoadingQuestion] = useState(false)
  const [questionError, setQuestionError] = useState(null)
  const [score, setScore] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [topicStats, setTopicStats] = useState(initTopicStats)
  const [subtopicStats, setSubtopicStats] = useState({})
  const [dynamicSubtopics, setDynamicSubtopics] = useState({})
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [quizSessionStartTime, setQuizSessionStartTime] = useState(null)
  const [quizTopicsAttempted, setQuizTopicsAttempted] = useState(new Set())
  const [correctStreak, setCorrectStreak] = useState(0)
  const [celebration, setCelebration] = useState(null) // { streak, level }
  const [barProgress, setBarProgress] = useState(0)
  const [balloonPopped, setBalloonPopped] = useState(false)
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [referralCount, setReferralCount] = useState(0)
  const [referralConfig, setReferralConfig] = useState({ goldCount: 3, platinumCount: 5, goldBenefit: 'Free Gold access — permanently', platinumBenefit: 'Free Platinum access — permanently' })
  const [subscriptionFeatures, setSubscriptionFeatures] = useState(null)
  const [children, setChildren] = useState([])
  const [activeChild, setActiveChild] = useState(null) // null = practising as parent
  const [showChildrenModal, setShowChildrenModal] = useState(false)
  const [testFilter, setTestFilter] = useState(null) // { source, paper_year, label } | null
  const [testGroups, setTestGroups] = useState([])
  const [confirmModal, setConfirmModal] = useState(null) // { group, topic } | null
  const [testSession, setTestSession] = useState(null)   // { questions, label } | null
  const [testResults, setTestResults] = useState(null)   // { questions, answers, label } | null
  const [exitTestConfirm, setExitTestConfirm] = useState(false)

  const baseTopics = EXAM_TOPICS[examType] || EXAM_TOPICS.OC
  const currentTopics = baseTopics.map(t => ({ ...t, subtopics: dynamicSubtopics[t.id] || [] }))

  // Register global Google callback
  useEffect(() => {
    window._googleCallback = handleGoogleSignIn
  }, [])

  // Load exam-type preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedExamType = localStorage.getItem('selfpaced-examType')
      const validExamIds = EXAM_TYPES.map(item => item.id)
      if (savedExamType && validExamIds.includes(savedExamType)) {
        setExamType(savedExamType)
      }
    }
  }, [])

  // Capture referral code from URL ?ref= param and store it
  // NOTE: We intentionally do NOT strip ?ref= from the URL so that if the user opens
  // the link in WhatsApp's in-app browser (where Google Sign-In is blocked) and then
  // opens in a real browser, the ref code is still present in the URL.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get('ref')
      if (ref) {
        localStorage.setItem('oc-ref-code', ref)
      }
    }
  }, [])

  // Handle Stripe checkout return (?checkout=success|cancel)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    const tier = params.get('tier')
    if (checkout) {
      const url = new URL(window.location.href)
      url.searchParams.delete('checkout')
      url.searchParams.delete('tier')
      window.history.replaceState({}, '', url.toString())
      if (checkout === 'success' && tier) {
        setSession(s => s?.user ? { ...s, user: { ...s.user, tier } } : s)
        setScreen('plans')
      }
    }
  }, [])

  // Fetch public config at mount (no auth needed — drives landing page referral display)
  useEffect(() => {
    fetch('/api/public-config')
      .then(r => r.json())
      .then(data => { if (data.goldCount) setReferralConfig(data) })
      .catch(() => {})
  }, [])

  // Fetch subscription features at mount (public, no auth)
  useEffect(() => {
    fetch('/api/subscription-features', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { if (data.features) setSubscriptionFeatures(data) })
      .catch(() => {})
  }, [])

  // Reset yearLevel when examType changes
  useEffect(() => {
    const levels = EXAM_YEAR_LEVELS[examType] || []
    setYearLevel(levels.length === 1 ? levels[0].value : '')
  }, [examType])

  // Fetch children when logged in; clear on sign-out
  useEffect(() => {
    if (!session?.idToken) { setChildren([]); setActiveChild(null); return }
    fetch('/api/children', { headers: { Authorization: 'Bearer ' + session.idToken } })
      .then(r => r.json())
      .then(data => { if (data.children) setChildren(data.children) })
      .catch(() => {})
  }, [session?.idToken])

  // When active child changes, ensure exam type is valid for that child
  useEffect(() => {
    if (!activeChild?.allowed_exam_types?.length) return
    if (!activeChild.allowed_exam_types.includes(examType)) setExamType(activeChild.allowed_exam_types[0])
  }, [activeChild]) // eslint-disable-line

  // Fetch referral count when logged in
  useEffect(() => {
    if (!session?.idToken) return
    fetch('/api/referral', { headers: { Authorization: 'Bearer ' + session.idToken }, cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.referral_count !== undefined) setReferralCount(data.referral_count)
        if (data.goldCount) setReferralConfig({
          goldCount: data.goldCount,
          platinumCount: data.platinumCount,
          goldBenefit: data.goldBenefit,
          platinumBenefit: data.platinumBenefit,
        })
      })
      .catch(() => {})
  }, [session?.idToken])

  // Fetch dynamic subtopics from DB whenever examType or session changes
  useEffect(() => {
    if (!session?.idToken) return
    fetch(`/api/topics?examType=${encodeURIComponent(examType)}`, {
      headers: { Authorization: 'Bearer ' + session.idToken }
    })
      .then(r => r.json())
      .then(data => { if (data.subtopics) setDynamicSubtopics(data.subtopics) })
      .catch(() => {})

    fetch(`/api/test-groups?examType=${encodeURIComponent(examType)}`, {
      headers: { Authorization: 'Bearer ' + session.idToken }
    })
      .then(r => r.json())
      .then(data => { if (data.groups) setTestGroups(data.groups) })
      .catch(() => {})
  }, [examType, session?.idToken])

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('selfpaced-session', JSON.stringify(session))
      } catch (err) {
        console.warn('Failed to save session to localStorage:', err)
      }
    }
  }, [session])

  useEffect(() => {
    async function fetchSubtopicStats() {
      if (!session?.idToken) return
      try {
        const res = await fetch(`/api/subtopic-performance?examType=${encodeURIComponent(examType)}`, {
          headers: { 'Authorization': 'Bearer ' + session.idToken, ...(activeChild ? { 'X-Child-Id': activeChild.id } : {}) },
          cache: 'no-store',
        })
        const data = await res.json()
        if (res.ok && data.subtopicStats) {
          setSubtopicStats(data.subtopicStats)
          setTopicStats(prev => {
            const reset = { ...prev }
            // Zero out topics for current exam type before merging DB stats
            Object.values(EXAM_TOPICS).flat().forEach(t => { reset[t.id] = { correct: 0, total: 0 } })
            Object.entries(data.topicStats || {}).forEach(([id, s]) => {
              reset[id] = { correct: s.correct, total: s.total }
            })
            return reset
          })
          // Sync totalAnswered from DB totals so it survives refresh
          const dbTotal = Object.values(data.topicStats || {}).reduce((sum, s) => sum + (s.total || 0), 0)
          setTotalAnswered(dbTotal)
        } else {
          setSubtopicStats({})
        }
      } catch (err) {
        console.error('Failed to fetch subtopic stats:', err)
      }
    }
    fetchSubtopicStats()
  }, [session.idToken, examType])

  // Validate stored session on app load - REMOVED
  // We now handle token expiration in API calls instead

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (showProfileMenu && !event.target.closest('.user-pill')) {
        setShowProfileMenu(false)
      }
      if (mobileMenuOpen && !event.target.closest('.mobile-nav-wrap')) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfileMenu, mobileMenuOpen])

  async function handleGoogleSignIn(response) {
    const idToken = response.credential
    try {
      // Read ref code from localStorage first, then fall back to current URL param
      // (URL param is the fallback for when users switch from WhatsApp's in-app browser to a real browser)
      const urlRef = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') : null
      const storedRefCode = (typeof window !== 'undefined' ? localStorage.getItem('oc-ref-code') : null) || urlRef
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: idToken, referralCode: storedRefCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (storedRefCode) localStorage.removeItem('oc-ref-code')
      window.history.replaceState(null, '', window.location.pathname)
      setSession({ user: data.user, idToken })
      setScreen('app')
    } catch (err) {
      alert('Sign-in failed: ' + err.message)
    }
  }

  function handleSignOut() {
    if (typeof window.google !== 'undefined') window.google.accounts.id.disableAutoSelect()
    window._googleInitDone = false
    setSession({ user: null, idToken: null })
    setScreen('landing')
    setCurrentTopic(null)
    setQuestion(null)
    setShowProfileMenu(false)
    // Clear stored session
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('selfpaced-session')
      } catch (err) {
        console.warn('Failed to clear session from localStorage:', err)
      }
    }
  }

  function handleProfileClick() {
    setShowProfileMenu(prev => !prev)
  }

  async function generateQuestion(topicId, subtopic = null, incomingTestFilter = undefined) {
    // incomingTestFilter is used when starting a test from a tile; otherwise use existing testFilter state
    const activeTestFilter = incomingTestFilter !== undefined ? incomingTestFilter : testFilter

    // Start quiz session tracking if not already started
    if (!quizSessionStartTime) {
      setQuizSessionStartTime(Date.now())
      setQuizTopicsAttempted(new Set())
    }

    if (activeTestFilter) {
      setCurrentTopic('__test__')
      setCurrentSubtopic(null)
    } else {
      // Add topic to attempted topics
      setQuizTopicsAttempted(prev => new Set([...prev, currentTopics.find(t => t.id === topicId)?.name]))
      setCurrentTopic(topicId)
      setCurrentSubtopic(subtopic)
    }
    setQuestion(null)
    setQuestionError(null)
    setLoadingQuestion(true)

    const topicName = currentTopics.find(t => t.id === topicId)?.name || topicId
    const prompt = `You are an expert at creating Australian Year 4 ${examType} exam-style questions.
Topic: ${topicName} — ${TOPIC_PROMPTS[topicId]}${subtopic ? `\nSubtopic: ${subtopic} — focus the question specifically on this subtopic.` : ''}
Create ONE multiple choice question for Year 4 (9-10 year olds). Vary difficulty: 40% easy, 40% medium, 20% hard.

IMPORTANT: The correct answer must be randomly distributed across positions A–E (indices 0–4). Do NOT always place the correct answer at index 0. Solve the question yourself first, then arrange the options so the correct answer appears at a random position.

Return ONLY valid JSON, no markdown, no explanation outside the JSON:
{"question":"...","visual":"optional table/list or empty string","options":["option1","option2","option3","option4","option5"],"correct":<0-based index of the correct option>,"explanation":"step-by-step solution","difficulty":"easy|medium|hard"}
Rules: exactly 5 options, correct is the 0-based index of the correct option (vary between 0 and 4), difficulty is easy/medium/hard.`

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.idToken, ...(activeChild ? { 'X-Child-Id': activeChild.id } : {}) },
        body: JSON.stringify({
          ...(activeTestFilter
            ? { questionSource: activeTestFilter.source, paperYear: activeTestFilter.paper_year }
            : { topicId, subtopic }
          ),
          examType,
          // Only send yearLevel for multi-year-level exams (NAPLAN, Selective)
          yearLevel: (EXAM_YEAR_LEVELS[examType]?.length > 1) ? yearLevel : undefined,
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        }),
      })

      if (res.status === 429) {
        const err = await res.json().catch(() => ({}))
        if (err.error === 'QUESTION_LIMIT') {
          setQuestionError('QUESTION_LIMIT:' + err.message + '|' + (err.tier || 'silver') + '|' + (err.limit || 10))
          return
        }
      }

      if (res.status === 403) {
        const err = await res.json()
        if (err.error === 'PENDING') { setScreen('pending'); return }
        if (err.error === 'TOKEN_LIMIT') { setQuestionError(err.message + '\n\nUpgrade your tier to get more daily tokens.'); return }
        if (err.error === 'INVALID_TOKEN' || err.error.includes('token')) {
          // Token expired or invalid - clear session
          console.log('Token expired during API call - clearing session')
          handleSignOut()
          setQuestionError('Your session has expired. Please sign in again.')
          return
        }
      }

      if (res.status === 404) {
        const err = await res.json().catch(() => ({}))
        if (err.error === 'NO_QUESTIONS') {
          setQuestionError('NO_QUESTIONS:' + (err.message || 'No questions available for this topic yet.'))
          return
        }
      }

      if (res.status === 500) {
        const err = await res.json().catch(() => ({ error: 'Server error' }))
        // Check if it's a token-related error
        if (err.error && (err.error.includes('token') || err.error.includes('Token') || err.error.includes('credential'))) {
          console.log('Token validation failed - clearing session')
          handleSignOut()
          setQuestionError('Your session has expired. Please sign in again.')
          return
        }
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Server error ' + res.status)
      }

      const data = await res.json()

      // The API now returns the question data directly
      setQuestion(data)
    } catch (err) {
      setQuestionError(err.message || 'Could not load question. Please try again.')
    } finally {
      setLoadingQuestion(false)
    }
  }

  async function handleAnswer(idx) {
    if (!question) return
    const isCorrect = idx === question.correct
    setTotalAnswered(n => n + 1)
    if (isCorrect) {
      setScore(s => s + (question.difficulty === 'hard' ? 3 : question.difficulty === 'medium' ? 2 : 1))
      setCorrectStreak(prev => {
        const next = prev + 1
        const p = TIER_PERMISSIONS[session.user?.tier] || TIER_PERMISSIONS.silver
        if (p.streaks && next % 3 === 0) {
          const level = next >= 15 ? 4 : next >= 9 ? 3 : next >= 6 ? 2 : 1
          setCelebration({ streak: next, level })
          setTimeout(() => setCelebration(null), 3500)
        }
        return next
      })
    } else {
      setCorrectStreak(0)
    }
    setBarProgress(prev => {
      const next = isCorrect ? Math.min(10, prev + 1) : Math.max(0, prev - 1)
      if (next === 10) {
        setBalloonPopped(true)
        setTimeout(() => { setBalloonPopped(false); setBarProgress(0) }, 3200)
      }
      return next
    })
    setTopicStats(prev => ({
      ...prev,
      [question.topicId]: {
        correct: prev[question.topicId].correct + (isCorrect ? 1 : 0),
        total: prev[question.topicId].total + 1,
      }
    }))

    if (question.subtopic) {
      setSubtopicStats(prev => {
        const topicMap = prev[question.topicId] || {}
        const existing = topicMap[question.subtopic] || { correct: 0, total: 0 }
        return {
          ...prev,
          [question.topicId]: {
            ...topicMap,
            [question.subtopic]: {
              correct: existing.correct + (isCorrect ? 1 : 0),
              total: existing.total + 1
            }
          }
        }
      })
    }

    // Record the response in the database
    if (question.id) {
      try {
        await fetch('/api/record-response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.idToken}`,
            ...(activeChild ? { 'X-Child-Id': activeChild.id } : {}),
          },
          body: JSON.stringify({
            questionId: question.id,
            selectedOption: idx,
            responseTimeSeconds: null
          })
        })
      } catch (err) {
        console.error('Failed to record response:', err)
        // Don't block the UI if recording fails
      }
    }
  }

  async function saveQuizAttempt() {
    if (!quizSessionStartTime || totalAnswered === 0) return

    try {
      const duration = Math.floor((Date.now() - quizSessionStartTime) / 1000)
      const correctAnswers = Object.values(topicStats).reduce((sum, topic) => sum + topic.correct, 0)

      await fetch('/api/save-attempt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.idToken}`,
          ...(activeChild ? { 'X-Child-Id': activeChild.id } : {}),
        },
        body: JSON.stringify({
          score,
          totalQuestions: totalAnswered,
          correctAnswers,
          durationSeconds: duration,
          topics: Array.from(quizTopicsAttempted),
          examType
        })
      })
    } catch (err) {
      console.error('Failed to save quiz attempt:', err)
    }
  }

  // Save attempt on page refresh / tab close using sendBeacon (works synchronously on unload)
  useEffect(() => {
    function handleBeforeUnload() {
      if (!quizSessionStartTime || totalAnswered === 0 || !session?.idToken) return
      const duration = Math.floor((Date.now() - quizSessionStartTime) / 1000)
      const correctAnswers = Object.values(topicStats).reduce((sum, t) => sum + t.correct, 0)
      const payload = JSON.stringify({
        score,
        totalQuestions: totalAnswered,
        correctAnswers,
        durationSeconds: duration,
        topics: Array.from(quizTopicsAttempted),
        examType,
        idToken: session.idToken,
      })
      navigator.sendBeacon('/api/save-attempt', new Blob([payload], { type: 'application/json' }))
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [quizSessionStartTime, totalAnswered, score, topicStats, quizTopicsAttempted, examType, session])

  function resetQuizSession() {
    setQuizSessionStartTime(null)
    setQuizTopicsAttempted(new Set())
    setScore(0)
    setBarProgress(0)
    setTotalAnswered(0)
    setTopicStats(initTopicStats)
    setCurrentTopic(null)
    setQuestion(null)
    setQuestionError(null)
    setTestFilter(null)
  }

  function handleGoHome() {
    if (testSession || testResults) {
      setExitTestConfirm(true)
    } else {
      saveQuizAttempt()
      resetQuizSession()
      setScreen('app')
    }
  }

  function confirmExitTest() {
    setExitTestConfirm(false)
    setTestSession(null)
    setTestResults(null)
    saveQuizAttempt()
    resetQuizSession()
    setScreen('app')
  }

  function openTestConfirmModal(group, topic) {
    setConfirmModal({ group, topic })
  }

  async function startTestSession(group, topic) {
    setConfirmModal(null)
    const params = new URLSearchParams({ examType, source: group.question_source, topicId: topic.topic_id })
    if (group.paper_year) params.set('paperYear', group.paper_year)
    try {
      const res = await fetch(`/api/test-questions?${params}`, {
        headers: { Authorization: 'Bearer ' + session.idToken }
      })
      const data = await res.json()
      if (!res.ok || !data.questions?.length) {
        alert(data.error || 'No questions found for this test.')
        return
      }
      const isPast = group.question_source === 'past_paper'
      const label = isPast
        ? `${group.paper_year || 'Past Paper'} Past Paper — ${topic.topic_name}`
        : `${group.title || (group.paper_year ? `Practice Test #${group.paper_year}` : 'Practice Test')} — ${topic.topic_name}`
      setTestSession({ questions: data.questions, label })
      setTestResults(null)
    } catch {
      alert('Failed to load test questions. Please try again.')
    }
  }

  // ── RENDER SCREENS ──────────────────────────────────────────
  if (screen === 'landing') return <LandingScreen onSignIn={() => setScreen('auth')} referralConfig={referralConfig} subscriptionFeatures={subscriptionFeatures} />
  if (screen === 'auth') return <AuthScreen />
  if (screen === 'pending') return <PendingScreen email={session.user?.email} onSignOut={handleSignOut} />
  if (screen === 'rejected') return <RejectedScreen onSignOut={handleSignOut} />
  if (screen === 'history') return <HistoryScreen user={session.user} idToken={session.idToken} activeChildId={activeChild?.id} examType={examType} onExamTypeChange={setExamType} onHome={() => setScreen('app')} onRanking={() => setScreen('ranking')} onStreak={() => setScreen('streak')} onPlans={() => setScreen('plans')} />
  if (screen === 'ranking') return <RankingScreen user={session.user} idToken={session.idToken} onHome={() => setScreen('app')} onHistory={() => setScreen('history')} onStreak={() => setScreen('streak')} onPlans={() => setScreen('plans')} />
  if (screen === 'streak') return <StreakScreen user={session.user} idToken={session.idToken} activeChildId={activeChild?.id} onHome={() => setScreen('app')} onHistory={() => setScreen('history')} onRanking={() => setScreen('ranking')} onPlans={() => setScreen('plans')} />
  if (screen === 'plans') return (
    <div>
      <header>
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => setScreen('app')}>Self Paced Learning <span>Practice · Consistency · Feedback</span></div>
        <div className="header-right">
          <button className="nav-btn" onClick={() => setScreen('app')}>Home</button>
          <button className="nav-btn" onClick={() => setScreen('history')}>History</button>
          <button className="nav-btn" onClick={() => setScreen('ranking')}>Ranking</button>
          <button className="nav-btn" onClick={() => setScreen('streak')}>Streak 🔥</button>
          <button className="nav-btn active">Plans</button>
          <div className="user-pill">
            {session.user.picture && <img src={session.user.picture} className="user-avatar" alt="" />}
            <span className="user-first-name">{session.user.name.split(' ')[0]}</span>
            <span className={`tier-badge ${TIER_CLASSES[session.user.tier] || 'tier-silver'}`}>{TIER_LABELS[session.user.tier] || session.user.tier}</span>
          </div>
        </div>
      </header>
      <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1.5rem' }}>
        <PlansScreen
          user={session.user}
          idToken={session.idToken}
          onHome={() => setScreen('app')}
          onReferFriend={() => setShowReferralModal(true)}
          onTierUpgrade={newTier => setSession(s => ({ ...s, user: { ...s.user, tier: newTier } }))}
          referralConfig={referralConfig}
          subscriptionFeatures={subscriptionFeatures}
        />
      </div>
      <FeedbackButton user={session.user} idToken={session.idToken} />
      {showReferralModal && session.user?.referral_code && (
        <ReferralModal user={session.user} idToken={session.idToken} referralConfig={referralConfig} onClose={() => setShowReferralModal(false)} />
      )}
      {showChildrenModal && (
        <ManageChildrenModal
          idToken={session.idToken}
          parentName={session.user.name}
          children={children}
          activeChild={activeChild}
          onChildChange={setActiveChild}
          onChildrenUpdated={updated => setChildren(updated)}
          onClose={() => setShowChildrenModal(false)}
        />
      )}
    </div>
  )

  const { user } = session
  const dbFeatures = subscriptionFeatures?.features?.[user.tier]
  const fallbackPerms = TIER_PERMISSIONS[user.tier] || TIER_PERMISSIONS.silver
  const perms = {
    subtopics: dbFeatures ? dbFeatures.analytics  : fallbackPerms.subtopics,
    history:   dbFeatures ? dbFeatures.history     : fallbackPerms.history,
    ranking:   fallbackPerms.ranking,
    streaks:   fallbackPerms.streaks,
    all_exams: dbFeatures ? dbFeatures.all_exams   : (user.tier !== 'silver'),
  }

  return (
    <div>
      {/* HEADER */}
      <header>
        <div className="logo" onClick={handleGoHome} style={{ cursor: 'pointer' }}>Self Paced Learning <span className="logo-sub">Practice · Consistency · Feedback</span></div>
        <div className="header-right">
          {/* Desktop nav */}
          <div className="desktop-nav">
            <button className="nav-btn" onClick={handleGoHome}>Home</button>
            <button
              className={`nav-btn${!perms.history ? ' nav-btn--locked' : ''}`}
              onClick={() => { if (!perms.history) { setCurrentTopic(null); setScreen('plans'); return } setCurrentTopic(null); setScreen('history') }}
              title={!perms.history ? 'Upgrade to Gold or above' : ''}
            >History{!perms.history ? ' 🔒' : ''}</button>
            <button
              className={`nav-btn${!perms.ranking ? ' nav-btn--locked' : ''}`}
              onClick={() => { if (!perms.ranking) { setCurrentTopic(null); setScreen('plans'); return } setCurrentTopic(null); setScreen('ranking') }}
              title={!perms.ranking ? 'Upgrade to Platinum' : ''}
            >Ranking{!perms.ranking ? ' 🔒' : ''}</button>
            <button
              className="nav-btn"
              onClick={() => { setCurrentTopic(null); setScreen('streak') }}
            >Streak 🔥</button>
            {!user.is_admin && (
              <button className="nav-btn nav-btn--plans" onClick={() => { setCurrentTopic(null); setScreen('plans') }}>Plans</button>
            )}
          </div>
          <div className="user-pill" onClick={handleProfileClick}>
            {user.picture && <img src={user.picture} className="user-avatar" alt="" />}
            <span className="user-first-name">{user.name.split(' ')[0]}</span>
            <span className={`tier-badge ${TIER_CLASSES[user.tier] || 'tier-silver'}`}>
              {TIER_LABELS[user.tier] || user.tier}
            </span>
            <div className="profile-dropdown" style={{ display: showProfileMenu ? 'block' : 'none' }}>
              <button className="dropdown-item" onClick={() => { setShowReferralModal(true); setShowProfileMenu(false) }}>
                <span>🎁</span> Refer a Friend
              </button>
              <button className="dropdown-item" onClick={handleSignOut}>
                <span>🚪</span> Logout
              </button>
            </div>
          </div>
          {/* Hamburger for mobile */}
          <div className="mobile-nav-wrap">
            <button className="hamburger-btn" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Menu">
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
            {mobileMenuOpen && (
              <div className="mobile-nav-dropdown">
                <button className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); handleGoHome() }}>🏠 Home</button>
                <button
                  className="mobile-nav-item"
                  onClick={() => { if (!perms.history) { setScreen('plans'); setMobileMenuOpen(false); return } setCurrentTopic(null); setScreen('history'); setMobileMenuOpen(false) }}
                >📋 History{!perms.history ? ' 🔒' : ''}</button>
                <button
                  className="mobile-nav-item"
                  onClick={() => { if (!perms.ranking) { setScreen('plans'); setMobileMenuOpen(false); return } setCurrentTopic(null); setScreen('ranking'); setMobileMenuOpen(false) }}
                >🏆 Ranking{!perms.ranking ? ' 🔒' : ''}</button>
                <button
                  className="mobile-nav-item"
                  onClick={() => { setCurrentTopic(null); setScreen('streak'); setMobileMenuOpen(false) }}
                >🔥 Streak</button>
                {!user.is_admin && (
                  <button className="mobile-nav-item" onClick={() => { setCurrentTopic(null); setScreen('plans'); setMobileMenuOpen(false) }}>💎 Plans &amp; Pricing</button>
                )}
                <button className="mobile-nav-item" onClick={() => { setShowReferralModal(true); setMobileMenuOpen(false) }}>🎁 Refer a Friend</button>
                <button className="mobile-nav-item mobile-nav-item--danger" onClick={() => { handleSignOut(); setMobileMenuOpen(false) }}>🚪 Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <StreakCelebration celebration={celebration} />
      {confirmModal && (
        <TestConfirmModal
          group={confirmModal.group}
          topic={confirmModal.topic}
          onConfirm={() => startTestSession(confirmModal.group, confirmModal.topic)}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {exitTestConfirm && (
        <div className="test-confirm-backdrop" onClick={() => setExitTestConfirm(false)}>
          <div className="test-confirm-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1E293B', marginBottom: 8 }}>
              Exit {testSession ? 'Test' : 'Review'}?
            </div>
            <div style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: 24 }}>
              {testSession
                ? 'Your progress will be lost if you leave now.'
                : 'Are you sure you want to leave the answer review?'}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginBottom: 8, background: '#ef4444', borderColor: '#ef4444' }} onClick={confirmExitTest}>Exit</button>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setExitTestConfirm(false)}>Stay</button>
          </div>
        </div>
      )}
      {showReferralModal && session.user?.referral_code && (
        <ReferralModal user={session.user} idToken={session.idToken} referralConfig={referralConfig} onClose={() => setShowReferralModal(false)} />
      )}

      {/* MAIN LAYOUT */}
      <div className="app">
          <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? '✕ Close Topics' : '📚 Choose Topic'}
          </button>
          <div className={`sidebar-overlay${sidebarOpen ? ' sidebar-overlay--open' : ''}`} onClick={() => setSidebarOpen(false)} />
          <div className={`sidebar-drawer${sidebarOpen ? ' sidebar-drawer--open' : ''}`}>
          <Sidebar
            currentTopic={currentTopic}
            currentSubtopic={currentSubtopic}
            topics={currentTopics}
            topicStats={topicStats}
            subtopicStats={subtopicStats}
            totalAnswered={totalAnswered}
            onSelectTopic={generateQuestion}
            canUseSubtopics={perms.subtopics}
            onUpgrade={() => setScreen('plans')}
          />
          </div>
          <div className="main">
            {/* Test Session */}
            {testSession && !testResults && (
              <TestSession
                questions={testSession.questions}
                label={testSession.label}
                idToken={session.idToken}
                activeChildId={activeChild?.id}
                onFinish={answers => {
                  setTestResults({ questions: testSession.questions, answers, label: testSession.label })
                  setTestSession(null)
                }}
              />
            )}

            {/* Test Results */}
            {testResults && (
              <TestResultsScreen
                questions={testResults.questions}
                answers={testResults.answers}
                label={testResults.label}
                idToken={session.idToken}
                onReturnHome={() => { setTestResults(null); setCurrentTopic(null); setQuestion(null); setQuestionError(null) }}
              />
            )}

            {/* Home */}
            {!testSession && !testResults && !currentTopic && !loadingQuestion && (
              <div className="home-with-dates">
                <HomeScreen
                  user={user}
                  examType={examType}
                  onExamTypeChange={setExamType}
                  yearLevel={yearLevel}
                  onYearLevelChange={setYearLevel}
                  score={score}
                  totalAnswered={totalAnswered}
                  topicStats={topicStats}
                  subtopicStats={subtopicStats}
                  onSelectTopic={generateQuestion}
                  onUpgrade={() => setScreen('plans')}
                  canAccessAllExams={perms.all_exams}
                  enabledExams={activeChild?.allowed_exam_types?.length ? activeChild.allowed_exam_types : (subscriptionFeatures?.enabledExams ?? ['OC', 'NAPLAN', 'Selective'])}
                  children={children}
                  activeChild={activeChild}
                  onChildChange={child => setActiveChild(child)}
                  onManageChildren={() => setShowChildrenModal(true)}
                  testGroups={testGroups}
                  onTestTileClick={openTestConfirmModal}
                />
                <ExamDatesPanel examType={examType} />
              </div>
            )}

            {/* Loading */}
            {!testSession && !testResults && loadingQuestion && (
              <div className="loading-card">
                <div className="spinner" />
                <div className="loading-text">Loading your next {currentTopic === '__test__' ? (testFilter ? (testFilter.source === 'past_paper' ? (testFilter.paper_year ? `${testFilter.paper_year} Past Paper` : 'Past Paper') : 'Sample Test') : 'practice') : currentTopics.find(t => t.id === currentTopic)?.name} question...</div>
              </div>
            )}

            {/* Error */}
            {!testSession && !testResults && !loadingQuestion && questionError && (
              <div className="question-card">
                <div className="question-body">
                  {questionError.startsWith('QUESTION_LIMIT:') ? (
                    (() => {
                      const [, msg, tier, limit] = questionError.split('|')[0].replace('QUESTION_LIMIT:', '').split('|')
                      const parts = questionError.replace('QUESTION_LIMIT:', '').split('|')
                      const tierName = (parts[1] || 'silver').charAt(0).toUpperCase() + (parts[1] || 'silver').slice(1)
                      const limitNum = parts[2] || '10'
                      const isGold = (parts[1] || '') === 'gold'
                      return (
                        <div style={{ textAlign: 'center', padding: '28px 0 8px' }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎯</div>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8, color: '#2D1B0E' }}>Daily Limit Reached</div>
                          <div style={{ color: '#7A5C3F', fontSize: '0.92rem', lineHeight: 1.6, maxWidth: 360, margin: '0 auto 20px' }}>
                            You've completed your <strong>{limitNum} questions</strong> for today on the <strong>{tierName}</strong> plan. Come back tomorrow — or upgrade for more daily practice!
                          </div>
                          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                            {!isGold && (
                              <button className="btn btn-primary" onClick={() => { saveQuizAttempt(); resetQuizSession(); setScreen('plans') }}>
                                Upgrade Plan ↑
                              </button>
                            )}
                            {isGold && (
                              <button className="btn btn-primary" style={{ background: '#7C3AED' }} onClick={() => { saveQuizAttempt(); resetQuizSession(); setScreen('plans') }}>
                                Upgrade to Platinum ↑
                              </button>
                            )}
                            <button className="btn btn-secondary" onClick={() => { saveQuizAttempt(); resetQuizSession(); setScreen('app') }}>Back to Home</button>
                          </div>
                        </div>
                      )
                    })()
                  ) : questionError.startsWith('NO_QUESTIONS:') ? (
                    <>
                      <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8, color: '#2D1B0E' }}>No Questions Available</div>
                        <div style={{ color: '#7A5C3F', fontSize: '0.92rem', lineHeight: 1.5, maxWidth: 360, margin: '0 auto' }}>
                          {questionError.replace('NO_QUESTIONS:', '')}
                        </div>
                      </div>
                      <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <button className="btn btn-secondary" onClick={() => { saveQuizAttempt(); resetQuizSession(); setScreen('app') }}>Back to Home</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="error-box">{questionError}</div>
                      <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                        <button className="btn btn-primary" onClick={() => generateQuestion(currentTopic)}>Try Again</button>
                        <button className="btn btn-secondary" onClick={() => { saveQuizAttempt(); resetQuizSession(); setScreen('app') }}>Back to Home</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Question */}
            {!testSession && !testResults && !loadingQuestion && !questionError && question && (
              <QuestionView
                question={question}
                questionNumber={totalAnswered + 1}
                topicStats={topicStats}
                examType={examType}
                currentTopics={currentTopics}
                subtopics={currentTopics.find(t => t.id === currentTopic)?.subtopics || []}
                currentSubtopic={currentSubtopic}
                onSubtopicChange={(sub) => generateQuestion(currentTopic, sub)}
                onAnswer={handleAnswer}
                onNext={() => testFilter ? generateQuestion(null, null, testFilter) : generateQuestion(currentTopic, currentSubtopic)}
                onHome={() => { saveQuizAttempt(); resetQuizSession(); setScreen('app') }}
                barProgress={barProgress}
                idToken={session.idToken}
              />
            )}
            <BalloonPopOverlay visible={balloonPopped} />
          </div>
        </div>
      <FeedbackButton user={user} idToken={session.idToken} />
    </div>
  )
}
