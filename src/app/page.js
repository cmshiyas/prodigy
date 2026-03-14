'use client'

import { useState, useEffect, useCallback } from 'react'
import { EXAM_TYPES, EXAM_TOPICS, TOPIC_PROMPTS, TOKEN_LIMITS, TIER_LABELS, TIER_CLASSES, ADMIN_EMAIL } from '@/lib/constants'
import HistoryScreen from '@/components/HistoryScreen'
import RankingScreen from '@/components/RankingScreen'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

const TIER_PERMISSIONS = {
  silver:   { subtopics: false, history: false, ranking: false, streaks: false },
  gold:     { subtopics: true,  history: true,  ranking: false, streaks: false },
  platinum: { subtopics: true,  history: true,  ranking: true,  streaks: true  },
  admin:    { subtopics: true,  history: true,  ranking: true,  streaks: true  },
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

const WA_NUMBER = '61432302644'

function WhatsAppButton({ user }) {
  const message = user
    ? `Hi! I'm ${user.name} (${user.email}). I have a question about Exam Booster.`
    : `Hi! I have a question about Exam Booster.`
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="wa-btn"
      aria-label="Chat with us on WhatsApp"
    >
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="wa-icon">
        <circle cx="16" cy="16" r="16" fill="#25D366"/>
        <path d="M23.5 8.5A10.45 10.45 0 0016 5.5C10.2 5.5 5.5 10.2 5.5 16c0 1.84.48 3.63 1.38 5.2L5.5 26.5l5.42-1.42A10.46 10.46 0 0016 26.5c5.8 0 10.5-4.7 10.5-10.5 0-2.8-1.09-5.44-3-7.5zm-7.5 16.1c-1.56 0-3.08-.42-4.4-1.2l-.32-.19-3.22.85.86-3.14-.2-.33A8.56 8.56 0 017.44 16c0-4.73 3.84-8.56 8.56-8.56 2.28 0 4.44.89 6.05 2.51A8.52 8.52 0 0124.57 16c0 4.73-3.84 8.6-8.57 8.6zm4.7-6.42c-.26-.13-1.53-.75-1.77-.84-.24-.09-.41-.13-.58.13-.17.26-.66.84-.8 1.01-.15.17-.3.19-.55.06-.26-.13-1.08-.4-2.06-1.27-.76-.68-1.28-1.52-1.43-1.77-.15-.26-.02-.4.11-.53.12-.11.26-.3.39-.44.13-.14.17-.24.26-.4.09-.17.04-.31-.02-.44-.06-.13-.58-1.4-.8-1.92-.2-.5-.42-.43-.58-.44h-.5c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.43 1.02 2.6c.13.17 1.77 2.7 4.28 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.53-.63 1.74-1.23.22-.6.22-1.11.15-1.23-.07-.12-.24-.18-.5-.31z" fill="white"/>
      </svg>
      <span className="wa-label">Chat with us</span>
    </a>
  )
}

// ── TRIAL POPUP ───────────────────────────────────────────────

const WA_TRIAL_MSG = encodeURIComponent("Hi! I'd like a free upgrade during the trial period. Please activate my plan!")
const WA_TRIAL_URL = `https://wa.me/${WA_NUMBER}?text=${WA_TRIAL_MSG}`

function TrialModal({ onClose }) {
  return (
    <div className="trial-modal-backdrop" onClick={onClose}>
      <div className="trial-modal" onClick={e => e.stopPropagation()}>
        <button className="trial-modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="trial-modal-icon">🎉</div>
        <h3 className="trial-modal-title">It's completely free right now!</h3>
        <p className="trial-modal-body">
          We're currently in our <strong>free trial period</strong> — all plans including Gold and Platinum are available at no cost.
          <br /><br />
          Hit the upgrade button on any plan and send us a quick WhatsApp message — we'll activate it for you instantly, for free!
        </p>
        <div className="trial-modal-actions">
          <a
            href={WA_TRIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary trial-modal-wa-btn"
            onClick={onClose}
          >
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 20, height: 20, flexShrink: 0 }}>
              <circle cx="16" cy="16" r="16" fill="#25D366"/>
              <path d="M23.5 8.5A10.45 10.45 0 0016 5.5C10.2 5.5 5.5 10.2 5.5 16c0 1.84.48 3.63 1.38 5.2L5.5 26.5l5.42-1.42A10.46 10.46 0 0016 26.5c5.8 0 10.5-4.7 10.5-10.5 0-2.8-1.09-5.44-3-7.5zm-7.5 16.1c-1.56 0-3.08-.42-4.4-1.2l-.32-.19-3.22.85.86-3.14-.2-.33A8.56 8.56 0 017.44 16c0-4.73 3.84-8.56 8.56-8.56 2.28 0 4.44.89 6.05 2.51A8.52 8.52 0 0124.57 16c0 4.73-3.84 8.6-8.57 8.6zm4.7-6.42c-.26-.13-1.53-.75-1.77-.84-.24-.09-.41-.13-.58.13-.17.26-.66.84-.8 1.01-.15.17-.3.19-.55.06-.26-.13-1.08-.4-2.06-1.27-.76-.68-1.28-1.52-1.43-1.77-.15-.26-.02-.4.11-.53.12-.11.26-.3.39-.44.13-.14.17-.24.26-.4.09-.17.04-.31-.02-.44-.06-.13-.58-1.4-.8-1.92-.2-.5-.42-.43-.58-.44h-.5c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.43 1.02 2.6c.13.17 1.77 2.7 4.28 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.53-.63 1.74-1.23.22-.6.22-1.11.15-1.23-.07-.12-.24-.18-.5-.31z" fill="white"/>
            </svg>
            Contact us on WhatsApp — it's free!
          </a>
          <button className="btn btn-secondary" onClick={onClose}>Got it, thanks!</button>
        </div>
      </div>
    </div>
  )
}

// ── SCREEN COMPONENTS ─────────────────────────────────────────

function LandingScreen({ onSignIn }) {
  const [showTrialModal, setShowTrialModal] = useState(false)
  return (
    <div className="landing-screen">

      {/* ── HEADER ── */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-logo">
            <span className="lp-logo-icon">📘</span>
            <span>Exam Booster</span>
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
          <p className="lp-eyebrow">AI-powered exam preparation for Australian students</p>
          <h1 className="lp-h1">Build exam confidence<br/>one question at a time</h1>
          <p className="lp-sub">Targeted practice questions for OC, Selective and NAPLAN exams — with instant feedback, subtopic tracking and streak rewards to keep kids motivated.</p>
          <div className="lp-cta-row">
            <button className="btn btn-primary lp-cta-btn" onClick={onSignIn}>Get Started Free</button>
            <button className="btn btn-secondary lp-cta-btn" onClick={onSignIn}>Sign in</button>
          </div>
        </div>
        <div className="lp-hero-stats">
          <div className="lp-stat-card"><div className="lp-stat-num">3+</div><div className="lp-stat-label">Exam tracks</div></div>
          <div className="lp-stat-card"><div className="lp-stat-num">1000+</div><div className="lp-stat-label">Practice questions</div></div>
          <div className="lp-stat-card"><div className="lp-stat-num">100%</div><div className="lp-stat-label">Curriculum aligned</div></div>
          <div className="lp-stat-card"><div className="lp-stat-num">Live</div><div className="lp-stat-label">Progress tracking</div></div>
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
          <div className="lp-section-label">Why Exam Booster</div>
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
                <li className="lp-feat lp-feat--yes">All exam tracks (OC, Selective, NAPLAN)</li>
                <li className="lp-feat lp-feat--yes">~10 questions per day</li>
                <li className="lp-feat lp-feat--yes">Instant answer explanations</li>
                <li className="lp-feat lp-feat--yes">Topic-level progress tracking</li>
                <li className="lp-feat lp-feat--no">Subtopic drill & accuracy rates</li>
                <li className="lp-feat lp-feat--no">Answer history review</li>
                <li className="lp-feat lp-feat--no">Leaderboard & ranking</li>
                <li className="lp-feat lp-feat--no">Streak celebration rewards</li>
              </ul>
              <button className="btn btn-secondary lp-plan-btn" onClick={() => setShowTrialModal(true)}>Get Started Free</button>
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
                <li className="lp-feat lp-feat--yes">All exam tracks (OC, Selective, NAPLAN)</li>
                <li className="lp-feat lp-feat--yes">~40 questions per day</li>
                <li className="lp-feat lp-feat--yes">Instant answer explanations</li>
                <li className="lp-feat lp-feat--yes">Topic-level progress tracking</li>
                <li className="lp-feat lp-feat--yes">Subtopic drill & accuracy rates</li>
                <li className="lp-feat lp-feat--yes">Answer history review</li>
                <li className="lp-feat lp-feat--no">Leaderboard & ranking</li>
                <li className="lp-feat lp-feat--no">Streak celebration rewards</li>
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
                <li className="lp-feat lp-feat--yes">All exam tracks (OC, Selective, NAPLAN)</li>
                <li className="lp-feat lp-feat--yes">~100 questions per day (unlimited)</li>
                <li className="lp-feat lp-feat--yes">Instant answer explanations</li>
                <li className="lp-feat lp-feat--yes">Topic-level progress tracking</li>
                <li className="lp-feat lp-feat--yes">Subtopic drill & accuracy rates</li>
                <li className="lp-feat lp-feat--yes">Answer history review</li>
                <li className="lp-feat lp-feat--yes">Leaderboard & ranking</li>
                <li className="lp-feat lp-feat--yes">Streak celebration rewards</li>
              </ul>
              <button className="btn btn-primary lp-plan-btn lp-plan-btn--platinum" onClick={() => setShowTrialModal(true)}>Get Platinum</button>
            </div>

          </div>
          <p className="lp-pricing-note">All plans include a Google sign-in account and access via any device. Upgrades managed by the admin — contact us on WhatsApp to upgrade.</p>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="lp-cta-banner">
        <h2>Ready to boost your child's exam results?</h2>
        <p>Join students already practising smarter with Exam Booster.</p>
        <button className="btn btn-primary lp-cta-btn" onClick={onSignIn}>Get Started — it's free</button>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="lp-logo-icon">📘</span>
            <strong>Exam Booster</strong>
            <p>AI-powered practice for Australian school exams.</p>
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
          </div>
        </div>
        <div className="lp-footer-bottom">
          © {new Date().getFullYear()} Exam Booster. All rights reserved.
        </div>
      </footer>

      <WhatsAppButton />
      {showTrialModal && <TrialModal onClose={() => setShowTrialModal(false)} />}
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
        <div className="auth-logo">📘 Exam Booster</div>
        <p className="auth-sub">Get started with AI-generated exam practice.</p>
        <div className="auth-divider">Sign in with Google</div>
        <div id="google-btn" className="g_id_signin" />
        <p style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text2)' }}>
          Save your progress and continue later.
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


// ── TOKEN LIMITS EDITOR ───────────────────────────────────────

function TokenLimitsEditor({ idToken, onSignOut }) {
  const [limits, setLimits] = useState(null)
  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState(null)

  useEffect(() => {
    fetch('/api/admin?action=config', {
      headers: { Authorization: 'Bearer ' + idToken }
    })
      .then(async r => {
        if (r.status === 403) {
          const err = await r.json()
          if (err.error && (err.error.includes('Not authenticated') || err.error.includes('token') || err.error.includes('Token'))) {
            console.log('Admin API authentication failed - clearing session')
            onSignOut()
            return null
          }
        }
        return r.json()
      })
      .then(data => {
        if (!data) return // Already handled auth error
        const map = {}
        data.config.forEach(({ key, value }) => {
          map[key.replace('token_limit_', '')] = value
        })
        setLimits(map)
      })
  }, [idToken])

  const save = async (tier, value) => {
    setSaving(tier)
    try {
      const res = await fetch('/api/admin?action=config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ key: 'token_limit_' + tier, value }),
      })
      if (res.status === 403) {
        const err = await res.json()
        if (err.error && (err.error.includes('Not authenticated') || err.error.includes('token') || err.error.includes('Token'))) {
          console.log('Admin API authentication failed - clearing session')
          onSignOut()
          return
        }
      }
      if (!res.ok) throw new Error((await res.json()).error)
      setSaved(tier)
      setTimeout(() => setSaved(null), 2000)
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setSaving(null)
    }
  }

  if (!limits) return <div className="loading-text">Loading config...</div>

  const tiers = [
    { key: 'silver',   label: 'Silver',   color: '#94A3B8' },
    { key: 'gold',     label: 'Gold',     color: '#F59E0B' },
    { key: 'platinum', label: 'Platinum', color: '#8B5CF6' },
    { key: 'admin',    label: 'Admin',    color: '#EF4444' },
  ]

  return (
    <div style={{ padding: '20px 24px', borderTop: '1.5px solid var(--border)' }}>
      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1rem', marginBottom: 4 }}>Token Limits</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: 16 }}>Daily token limits per tier — changes take effect immediately, no redeployment needed.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {tiers.map(({ key, label, color }) => (
          <div key={key} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 16px', border: '1.5px solid var(--border)' }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color, marginBottom: 8 }}>{label}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                value={limits[key] || ''}
                onChange={e => setLimits(l => ({ ...l, [key]: e.target.value }))}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.9rem', background: 'white' }}
              />
              <button
                className="btn btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                onClick={() => save(key, limits[key])}
                disabled={saving === key}
              >
                {saving === key ? '...' : saved === key ? '✓' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ADMIN PANEL ───────────────────────────────────────────────

function AdminPanel({ idToken, onSignOut }) {
  const [adminView, setAdminView] = useState('users') // users | quizBank | analytics
  const [users, setUsers] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const [quizBank, setQuizBank] = useState(null)
  const [loadingQuizBank, setLoadingQuizBank] = useState(false)
  const [quizBankTopicFilter, setQuizBankTopicFilter] = useState('all')
  const [quizBankUserSort, setQuizBankUserSort] = useState('countDesc')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadExamType, setUploadExamType] = useState('OC')
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadPdfFile, setUploadPdfFile] = useState(null)
  const [uploadPdfExamType, setUploadPdfExamType] = useState('OC')
  const [uploadPdfTopicId, setUploadPdfTopicId] = useState('')
  const [uploadPdfStatus, setUploadPdfStatus] = useState('')

  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  const [reviewUserId, setReviewUserId] = useState('')
  const [reviewResponses, setReviewResponses] = useState(null)
  const [loadingReview, setLoadingReview] = useState(false)
  const [reviewFilter, setReviewFilter] = useState('all') // all | correct | wrong

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin?action=users', {
        headers: { Authorization: 'Bearer ' + idToken },
      })
      if (res.status === 403) {
        const err = await res.json()
        if (err.error && (err.error.includes('Not authenticated') || err.error.includes('token') || err.error.includes('Token'))) {
          console.log('Admin API authentication failed - clearing session')
          onSignOut()
          return
        }
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(data.users)
    } catch (err) {
      alert('Failed to load users: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [idToken])

  const loadQuizBank = useCallback(async () => {
    setLoadingQuizBank(true)
    try {
      const res = await fetch('/api/admin?action=quizBank', {
        headers: { Authorization: 'Bearer ' + idToken },
      })
      if (res.status === 403) {
        const err = await res.json()
        if (err.error && (err.error.includes('Not authenticated') || err.error.includes('token') || err.error.includes('Token'))) {
          console.log('Admin API authentication failed - clearing session')
          onSignOut()
          return
        }
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuizBank(data)
    } catch (err) {
      alert('Failed to load quiz bank data: ' + err.message)
    } finally {
      setLoadingQuizBank(false)
    }
  }, [idToken])

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true)
    try {
      const res = await fetch('/api/admin?action=analytics', { headers: { Authorization: 'Bearer ' + idToken } })
      if (res.status === 403) { const e = await res.json(); if (e.error?.includes('Not')) { onSignOut(); return } }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAnalytics(data)
    } catch (err) { alert('Failed to load analytics: ' + err.message) }
    finally { setLoadingAnalytics(false) }
  }, [idToken])

  const loadReview = useCallback(async (uid) => {
    if (!uid) return
    setLoadingReview(true)
    setReviewResponses(null)
    try {
      const res = await fetch(`/api/admin?action=userResponses&userId=${encodeURIComponent(uid)}`, {
        headers: { Authorization: 'Bearer ' + idToken }
      })
      if (res.status === 403) { const e = await res.json(); if (e.error?.includes('Not')) { onSignOut(); return } }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReviewResponses(data.responses)
    } catch (err) { alert('Failed to load responses: ' + err.message) }
    finally { setLoadingReview(false) }
  }, [idToken])

  useEffect(() => { loadUsers() }, [loadUsers])

  useEffect(() => {
    if (adminView === 'quizBank') loadQuizBank()
    if (adminView === 'analytics') loadAnalytics()
    if (adminView === 'review') { setReviewUserId(''); setReviewResponses(null) }
  }, [adminView])

  const updateUser = async (userId, updates) => {
    try {
      const res = await fetch('/api/admin?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ userId, ...updates }),
      })
      if (res.status === 403) {
        const err = await res.json()
        if (err.error && (err.error.includes('Not authenticated') || err.error.includes('token') || err.error.includes('Token'))) {
          console.log('Admin API authentication failed - clearing session')
          onSignOut()
          return
        }
      }
      if (!res.ok) throw new Error((await res.json()).error)
      await loadUsers()
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const uploadQuestions = async () => {
    if (!uploadFile) {
      setUploadStatus('Please choose a JSON file first.')
      return
    }

    setUploadStatus('Reading file and uploading...')
    try {
      const text = await uploadFile.text()
      const questionData = JSON.parse(text)
      if (!Array.isArray(questionData)) {
        throw new Error('Upload file must be a JSON array of questions.')
      }

      const res = await fetch('/api/admin?action=uploadQuestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ examType: uploadExamType, questions: questionData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      const errCount = data.errors?.length || 0
      setUploadStatus(`Uploaded ${data.inserted || 0} questions. ${errCount > 0 ? `${errCount} records failed.` : 'Done.'}`)
      setUploadFile(null)
      document.getElementById('question-upload-input').value = ''
      loadQuizBank()
    } catch (err) {
      setUploadStatus('Upload error: ' + err.message)
    }
  }

  const uploadPdf = async () => {
    if (!uploadPdfFile) {
      setUploadPdfStatus('Please select a PDF file first.')
      return
    }

    setUploadPdfStatus('Sending PDF for extraction...')
    try {
      const formData = new FormData()
      formData.append('examType', uploadPdfExamType)
      if (uploadPdfTopicId) formData.append('topicId', uploadPdfTopicId)
      formData.append('file', uploadPdfFile)

      const res = await fetch('/api/admin?action=uploadPdf', {
        method: 'POST',
        body: formData,
        headers: { Authorization: 'Bearer ' + idToken },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      const errors = data.errors?.length || 0
      const topics = (data.topics || []).map(t => t.name).join(', ') || 'n/a'
      setUploadPdfStatus(`Extracted topics: ${topics}. Inserted: ${data.inserted || 0}. Skipped (duplicates): ${data.skipped || 0}. Errors: ${errors}.`)
      setUploadPdfFile(null)
      document.getElementById('pdf-upload-input').value = ''
      loadQuizBank()
    } catch (err) {
      setUploadPdfStatus('PDF upload failed: ' + err.message)
    }
  }

  if (adminView === 'users') {
    if (loading) return <div className="loading-card"><div className="spinner" /><div className="loading-text">Loading users...</div></div>
    if (!users) return null
  }

  const safeUsers = users || []
  const counts = {
    all: safeUsers.length,
    pending: safeUsers.filter(u => u.status === 'pending').length,
    approved: safeUsers.filter(u => u.status === 'approved').length,
    rejected: safeUsers.filter(u => u.status === 'rejected').length,
  }

  const filtered = filter === 'all' ? safeUsers : safeUsers.filter(u => u.status === filter)

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div>
          <div className="admin-title">Admin Panel</div>
          <div className="admin-sub">Manage user access and token limits</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={`filter-btn${adminView === 'users' ? ' active' : ''}`} onClick={() => setAdminView('users')}>Users</button>
          <button className={`filter-btn${adminView === 'quizBank' ? ' active' : ''}`} onClick={() => setAdminView('quizBank')}>Quiz Bank</button>
          <button className={`filter-btn${adminView === 'analytics' ? ' active' : ''}`} onClick={() => setAdminView('analytics')}>Analytics</button>
          <button className={`filter-btn${adminView === 'review' ? ' active' : ''}`} onClick={() => setAdminView('review')}>Answer Review</button>
        </div>
      </div>
      {adminView === 'users' ? (
        <>
          <div className="admin-stats">
        <div className="admin-stat"><div className="admin-stat-num">{counts.all}</div><div className="admin-stat-label">Total Users</div></div>
        <div className="admin-stat"><div className="admin-stat-num" style={{ color: '#F59E0B' }}>{counts.pending}</div><div className="admin-stat-label">Pending</div></div>
        <div className="admin-stat"><div className="admin-stat-num" style={{ color: '#52C41A' }}>{counts.approved}</div><div className="admin-stat-label">Approved</div></div>
        <div className="admin-stat"><div className="admin-stat-num" style={{ color: '#EF4444' }}>{counts.rejected}</div><div className="admin-stat-label">Rejected</div></div>
      </div>
      <div className="admin-filters">
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>
      <div className="users-table">
        <div className="user-row header-row">
          <div>User</div><div>Email</div><div>Status / Tier</div><div>Tokens Today</div><div>Actions</div>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text2)', fontWeight: 600 }}>No users in this category.</div>
        ) : filtered.map(u => {
          const isAdmin = u.email === ADMIN_EMAIL
          const limit = TOKEN_LIMITS[u.tier] || 5000
          const pct = Math.min(100, Math.round(((u.tokensToday || 0) / limit) * 100))
          const initials = (u.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          const barColor = pct > 80 ? '#EF4444' : pct > 50 ? '#F59E0B' : '#52C41A'
          return (
            <div className="user-row" key={u.id}>
              <div className="user-info">
                {u.picture
                  ? <img src={u.picture} className="user-mini-avatar" alt="" />
                  : <div className="user-mini-initials">{initials}</div>}
                <div>
                  <div className="user-name">{u.name || 'Unknown'}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>{new Date(u.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.82rem', wordBreak: 'break-all' }}>{u.email}</div>
              <div>
                <span className={`status-chip status-${isAdmin ? 'admin' : u.status}`}>{isAdmin ? 'Admin' : u.status}</span>
                {!isAdmin && (
                  <select
                    className="tier-select"
                    style={{ marginTop: 4, display: 'block' }}
                    value={u.tier}
                    onChange={e => updateUser(u.id, { tier: e.target.value })}
                  >
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                  </select>
                )}
              </div>
              <div>
                <div className="token-usage-small">{(u.tokensToday || 0).toLocaleString()} / {limit.toLocaleString()}</div>
                <div className="token-bar-mini">
                  <div className="token-bar-mini-fill" style={{ width: pct + '%', background: barColor }} />
                </div>
              </div>
              <div className="action-btns">
                {!isAdmin && u.status !== 'approved' && <button className="action-btn btn-approve" onClick={() => updateUser(u.id, { status: 'approved' })}>Approve</button>}
                {!isAdmin && u.status !== 'rejected' && <button className="action-btn btn-reject" onClick={() => updateUser(u.id, { status: 'rejected' })}>Reject</button>}
                {isAdmin && <span style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>You</span>}
              </div>
            </div>
          )
        })}
      </div>
      <TokenLimitsEditor idToken={idToken} onSignOut={onSignOut} />
    </>
  ) : adminView === 'quizBank' ? (
    <div style={{ padding: '20px 24px', borderTop: '1.5px solid var(--border)' }}>
      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1rem', marginBottom: 4 }}>Quiz Bank</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: 16 }}>Analytics for questions created by users (per topic + most active creators).</div>
      <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Bulk upload sample questions</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text2)', marginBottom: 8 }}>
          Upload a JSON file containing an array of questions. Each question should include topicId, question, options (array), correct (index 0-based), explanation, difficulty (easy|medium|hard), and optional visual.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          <select value={uploadExamType} onChange={e => setUploadExamType(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white' }}>
            {EXAM_TYPES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <input id="question-upload-input" type="file" accept="application/json" onChange={e => setUploadFile(e.target.files?.[0] || null)} style={{ padding: '6px 8px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white' }} />
          <button className="btn btn-primary" style={{ padding: '7px 12px' }} onClick={uploadQuestions}>Upload sample questions</button>
        </div>
        {uploadStatus && <div style={{ fontSize: '0.8rem', color: uploadStatus.startsWith('Upload error') ? '#EF4444' : '#10B981' }}>{uploadStatus}</div>}
      </div>
      <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Upload sample PDF for AI topic extraction</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text2)', marginBottom: 8 }}>
          Upload a PDF file with sample questions; the AI will extract core topics/components and generate question entries.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          <select value={uploadPdfExamType} onChange={e => { setUploadPdfExamType(e.target.value); setUploadPdfTopicId('') }} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white' }}>
            {EXAM_TYPES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <select value={uploadPdfTopicId} onChange={e => setUploadPdfTopicId(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white' }}>
            <option value="">Auto-detect topic</option>
            {(EXAM_TOPICS[uploadPdfExamType] || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input id="pdf-upload-input" type="file" accept="application/pdf" onChange={e => setUploadPdfFile(e.target.files?.[0] || null)} style={{ padding: '6px 8px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white' }} />
          <button className="btn btn-primary" style={{ padding: '7px 12px' }} onClick={uploadPdf}>Upload PDF and extract topics</button>
        </div>
        {uploadPdfStatus && <div style={{ fontSize: '0.8rem', color: uploadPdfStatus.startsWith('PDF upload failed') ? '#EF4444' : '#10B981' }}>{uploadPdfStatus}</div>}
      </div>

      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.05rem', marginBottom: 4, marginTop: 8 }}>Question Bank Overview</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text2)', marginBottom: 14 }}>Total questions loaded in the bank, broken down by exam track and topic.</div>

      {loadingQuizBank ? (
        <div className="loading-card"><div className="spinner" /><div className="loading-text">Loading quiz bank data...</div></div>
      ) : quizBank ? (
        <>
          {/* Exam type summary cards */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1.5px solid var(--border)', padding: '14px 20px', minWidth: 120, textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent)' }}>{quizBank.total || 0}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text2)', marginTop: 2 }}>Total Questions</div>
            </div>
            {(quizBank.examBreakdown || []).map(e => (
              <div key={e.examType} style={{ background: 'var(--surface)', borderRadius: 12, border: '1.5px solid var(--border)', padding: '14px 20px', minWidth: 120, textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1D4ED8' }}>{e.count}</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text2)', marginTop: 2 }}>{e.examType} Track</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>Sort creators:</span>
            <select value={quizBankUserSort} onChange={e => setQuizBankUserSort(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', fontSize: '0.9rem' }}>
              <option value="countDesc">Most questions</option>
              <option value="countAsc">Fewest questions</option>
              <option value="nameAsc">Name A→Z</option>
              <option value="nameDesc">Name Z→A</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1.5px solid var(--border)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 800 }}>Questions per Topic</div>
                <select value={quizBankTopicFilter} onChange={e => setQuizBankTopicFilter(e.target.value)} style={{ padding: '5px 8px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'white', fontSize: '0.82rem', fontWeight: 600 }}>
                  <option value="all">All Exams</option>
                  {(quizBank.examBreakdown || []).map(e => (
                    <option key={e.examType} value={e.examType}>{e.examType} Track</option>
                  ))}
                </select>
              </div>
              {quizBank.topics.length === 0 ? (
                <div style={{ color: 'var(--text2)' }}>No questions yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {quizBank.topics
                    .filter(t => quizBankTopicFilter === 'all' || (t.byExam || {})[quizBankTopicFilter] > 0)
                    .sort((a, b) => {
                      const aCount = quizBankTopicFilter === 'all' ? a.count : ((a.byExam || {})[quizBankTopicFilter] || 0)
                      const bCount = quizBankTopicFilter === 'all' ? b.count : ((b.byExam || {})[quizBankTopicFilter] || 0)
                      return bCount - aCount
                    })
                    .map(t => {
                      const examEntries = quizBankTopicFilter === 'all'
                        ? Object.entries(t.byExam || {})
                        : [[quizBankTopicFilter, (t.byExam || {})[quizBankTopicFilter] || 0]]
                      return (
                        <div key={t.topicId} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, marginBottom: 2 }}>
                            <span>{t.topicId}</span>
                            <span>{quizBankTopicFilter === 'all' ? t.count : ((t.byExam || {})[quizBankTopicFilter] || 0)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {examEntries.map(([exam, cnt]) => (
                              <span key={exam} style={{ fontSize: '0.72rem', background: '#DBEAFE', color: '#1D4ED8', borderRadius: 999, padding: '1px 7px', fontWeight: 700 }}>
                                {exam}: {cnt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1.5px solid var(--border)', padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Top Creators</div>
              {quizBank.users.length === 0 ? (
                <div style={{ color: 'var(--text2)' }}>No creators found.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {quizBank.users
                    .slice()
                    .sort((a, b) => {
                      if (quizBankUserSort === 'countDesc') return b.count - a.count
                      if (quizBankUserSort === 'countAsc') return a.count - b.count
                      if (quizBankUserSort === 'nameAsc') return (a.name || a.email || '').localeCompare(b.name || b.email || '')
                      if (quizBankUserSort === 'nameDesc') return (b.name || b.email || '').localeCompare(a.name || a.email || '')
                      return 0
                    })
                    .map(u => (
                      <div key={u.userId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span>{u.name || u.email || 'Unknown'}</span>
                        <span style={{ fontWeight: 700 }}>{u.count}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div style={{ color: 'var(--text2)' }}>No quiz bank data available.</div>
      )}
    </div>
  ) : adminView === 'analytics' ? (
    <div style={{ padding: '20px 24px', borderTop: '1.5px solid var(--border)' }}>
      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>Analytics</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text2)', marginBottom: 16 }}>Platform activity over the last 30 days.</div>
      {loadingAnalytics ? (
        <div className="loading-card"><div className="spinner" /><div className="loading-text">Loading analytics...</div></div>
      ) : analytics ? (
        <>
          {/* Overview cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Users', value: analytics.overview.totalUsers, color: '#1D4ED8' },
              { label: 'Approved Users', value: analytics.overview.approvedUsers, color: '#059669' },
              { label: 'Active (7d)', value: analytics.overview.activeUsers7d, color: '#7C3AED' },
              { label: 'New Users (30d)', value: analytics.overview.newUsers30d, color: '#D97706' },
              { label: 'Total Questions', value: analytics.overview.totalQuestions, color: '#0891B2' },
              { label: 'Responses (30d)', value: analytics.overview.responses30d, color: '#be185d' },
              { label: 'Correct Rate (30d)', value: analytics.overview.correctRate30d + '%', color: analytics.overview.correctRate30d >= 70 ? '#059669' : analytics.overview.correctRate30d >= 40 ? '#D97706' : '#DC2626' },
            ].map(c => (
              <div key={c.label} style={{ background: 'var(--surface)', borderRadius: 12, border: '1.5px solid var(--border)', padding: '14px 16px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text2)', marginTop: 2 }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Daily activity table */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1.5px solid var(--border)', padding: 16, marginBottom: 20 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Daily Activity (last 30 days)</div>
            {analytics.dailyActivity.length === 0 ? (
              <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>No activity yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Date', 'Responses', 'Correct', 'Correct %', 'Active Users'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 800, color: 'var(--text2)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...analytics.dailyActivity].reverse().map(d => {
                      const pct = d.responses > 0 ? Math.round((d.correct / d.responses) * 100) : 0
                      return (
                        <tr key={d.date} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 600 }}>{d.date}</td>
                          <td style={{ padding: '6px 10px' }}>{d.responses}</td>
                          <td style={{ padding: '6px 10px', color: '#059669' }}>{d.correct}</td>
                          <td style={{ padding: '6px 10px', fontWeight: 700, color: pct >= 70 ? '#059669' : pct >= 40 ? '#D97706' : '#DC2626' }}>{pct}%</td>
                          <td style={{ padding: '6px 10px' }}>{d.activeUsers}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Active users + top token users side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1.5px solid var(--border)', padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Most Active Users (30d)</div>
              {analytics.activeUsers.length === 0 ? (
                <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>No activity yet.</div>
              ) : analytics.activeUsers.map((u, i) => {
                const pct = u.responses > 0 ? Math.round((u.correct / u.responses) * 100) : 0
                return (
                  <div key={u.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 800, color: 'var(--text2)', fontSize: '0.8rem', width: 18 }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || u.email || 'Unknown'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{u.email}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{u.responses}</div>
                      <div style={{ fontSize: '0.72rem', color: pct >= 70 ? '#059669' : pct >= 40 ? '#D97706' : '#DC2626', fontWeight: 700 }}>{pct}% correct</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1.5px solid var(--border)', padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Top Token Users (7d)</div>
              {analytics.topTokenUsers.length === 0 ? (
                <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>No token usage yet.</div>
              ) : analytics.topTokenUsers.map((u, i) => (
                <div key={u.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text2)', fontSize: '0.8rem', width: 18 }}>#{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || u.email || 'Unknown'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{u.email}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>{(u.tokens || 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ color: 'var(--text2)' }}>No analytics data available.</div>
      )}
    </div>
  ) : adminView === 'review' ? (
    <div style={{ padding: '20px 24px', borderTop: '1.5px solid var(--border)' }}>
      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>Answer Review</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text2)', marginBottom: 16 }}>Inspect every question a student has answered — see what they selected vs the correct answer.</div>

      {/* User selector */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <select
          value={reviewUserId}
          onChange={e => { setReviewUserId(e.target.value); setReviewResponses(null) }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', fontSize: '0.9rem', minWidth: 220 }}
        >
          <option value="">Select a student…</option>
          {safeUsers.filter(u => u.status === 'approved').map(u => (
            <option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>
          ))}
        </select>
        <button
          className="btn btn-primary"
          style={{ padding: '8px 16px' }}
          disabled={!reviewUserId || loadingReview}
          onClick={() => loadReview(reviewUserId)}
        >
          {loadingReview ? 'Loading…' : 'Load Answers'}
        </button>
        {reviewResponses && (
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'correct', 'wrong'].map(f => (
              <button key={f} className={`filter-btn${reviewFilter === f ? ' active' : ''}`} onClick={() => setReviewFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {loadingReview && <div className="loading-card"><div className="spinner" /><div className="loading-text">Loading answers…</div></div>}

      {reviewResponses && (() => {
        const labels = ['A', 'B', 'C', 'D', 'E']
        const filtered = reviewFilter === 'correct' ? reviewResponses.filter(r => r.isCorrect)
          : reviewFilter === 'wrong' ? reviewResponses.filter(r => !r.isCorrect)
          : reviewResponses
        const total = reviewResponses.length
        const correct = reviewResponses.filter(r => r.isCorrect).length
        return (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Total Answered', value: total, color: '#1D4ED8' },
                { label: 'Correct', value: correct, color: '#059669' },
                { label: 'Wrong', value: total - correct, color: '#DC2626' },
                { label: 'Score %', value: total > 0 ? Math.round((correct / total) * 100) + '%' : '—', color: correct / total >= 0.7 ? '#059669' : correct / total >= 0.4 ? '#D97706' : '#DC2626' },
              ].map(c => (
                <div key={c.label} style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 16px', minWidth: 100, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: c.color }}>{c.value}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text2)' }}>{c.label}</div>
                </div>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ color: 'var(--text2)', padding: '1rem 0' }}>No answers in this category.</div>
            ) : filtered.map((r, i) => (
              <div key={i} style={{
                background: r.isCorrect ? '#F0FDF4' : '#FEF2F2',
                border: `1.5px solid ${r.isCorrect ? '#BBF7D0' : '#FECACA'}`,
                borderRadius: 12, padding: 16, marginBottom: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#DBEAFE', color: '#1D4ED8', borderRadius: 999, padding: '2px 8px' }}>{r.examType}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#F3F4F6', color: '#374151', borderRadius: 999, padding: '2px 8px' }}>{r.topicId}</span>
                    {r.subtopic && <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#EDE9FE', color: '#7C3AED', borderRadius: 999, padding: '2px 8px' }}>{r.subtopic}</span>}
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#F3F4F6', color: '#374151', borderRadius: 999, padding: '2px 8px' }}>{r.difficulty}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: '1.1rem' }}>{r.isCorrect ? '✅' : '❌'}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>{new Date(r.answeredAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 10, lineHeight: 1.5 }}>{r.question}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  {r.options.map((opt, oi) => {
                    const isSelected = oi === r.selectedOption
                    const isCorrect = oi === r.correct
                    let bg = '#F9FAFB', border = '#E5E7EB', color = '#374151'
                    if (isCorrect) { bg = '#D1FAE5'; border = '#6EE7B7'; color = '#065F46' }
                    if (isSelected && !isCorrect) { bg = '#FEE2E2'; border = '#FCA5A5'; color = '#991B1B' }
                    return (
                      <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: bg, border: `1.5px solid ${border}` }}>
                        <span style={{ fontWeight: 800, fontSize: '0.8rem', color }}>{labels[oi]}</span>
                        <span style={{ fontSize: '0.82rem', color, fontWeight: isCorrect || isSelected ? 700 : 400 }}>{opt}</span>
                        {isSelected && !isCorrect && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#DC2626', fontWeight: 800 }}>Selected</span>}
                        {isCorrect && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#059669', fontWeight: 800 }}>Correct</span>}
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#374151', background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '8px 10px' }}>
                  <strong>Explanation:</strong> {r.explanation}
                </div>
              </div>
            ))}
          </>
        )
      })()}
    </div>
  ) : null}
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
        <div className="sidebar-title">Choose a Topic or Subtopic to Practise</div>
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
                        <button
                          key={sub}
                          onClick={() => onSelectTopic(t.id, sub)}
                          style={{
                            textAlign: 'left', padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem',
                            fontWeight: isActive ? 700 : 500,
                            background: isActive ? t.bg : 'transparent',
                            color: isActive ? t.color : '#64748b',
                            border: 'none', cursor: 'pointer', width: '100%',
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{sub}</span>
                          {pct !== null && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: dotColor }}>{pct}%</span>
                          )}
                        </button>
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

const PLANS = [
  {
    tier: 'silver',
    label: 'Silver',
    price: 'Free',
    period: null,
    desc: 'Get started and explore the platform at no cost.',
    color: '#64748B',
    bg: '#F1F5F9',
    features: [
      { text: 'All exam tracks (OC, Selective, NAPLAN)', yes: true },
      { text: '~10 questions per day', yes: true },
      { text: 'Instant answer explanations', yes: true },
      { text: 'Topic-level progress tracking', yes: true },
      { text: 'Subtopic drill & accuracy rates', yes: false },
      { text: 'Answer history review', yes: false },
      { text: 'Leaderboard & ranking', yes: false },
      { text: 'Streak celebration rewards', yes: false },
    ],
  },
  {
    tier: 'gold',
    label: 'Gold',
    price: '$5',
    period: '/month',
    desc: 'More questions and deeper tracking for serious practice.',
    color: '#92400E',
    bg: '#FEF3C7',
    features: [
      { text: 'All exam tracks (OC, Selective, NAPLAN)', yes: true },
      { text: '~40 questions per day', yes: true },
      { text: 'Instant answer explanations', yes: true },
      { text: 'Topic-level progress tracking', yes: true },
      { text: 'Subtopic drill & accuracy rates', yes: true },
      { text: 'Answer history review', yes: true },
      { text: 'Leaderboard & ranking', yes: false },
      { text: 'Streak celebration rewards', yes: false },
    ],
  },
  {
    tier: 'platinum',
    label: 'Platinum',
    price: '$9',
    period: '/month',
    desc: 'Unlimited questions and every feature — the complete experience.',
    color: '#6D28D9',
    bg: '#EDE9FE',
    popular: true,
    features: [
      { text: 'All exam tracks (OC, Selective, NAPLAN)', yes: true },
      { text: '~100 questions per day (unlimited)', yes: true },
      { text: 'Instant answer explanations', yes: true },
      { text: 'Topic-level progress tracking', yes: true },
      { text: 'Subtopic drill & accuracy rates', yes: true },
      { text: 'Answer history review', yes: true },
      { text: 'Leaderboard & ranking', yes: true },
      { text: 'Streak celebration rewards', yes: true },
    ],
  },
]

const WA_UPGRADE_NUMBER = '61432302644'

function PlansScreen({ user, onHome }) {
  const currentTier = user.tier || 'silver'
  const [showTrialModal, setShowTrialModal] = useState(true)

  function upgradeUrl(plan) {
    const msg = `Hi! I'm ${user.name} (${user.email}) and I'd like to upgrade to the ${plan.label} plan (${ plan.price}${plan.period || ''}). Please help me get set up!`
    return `https://wa.me/${WA_UPGRADE_NUMBER}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="plans-screen">
      <div className="plans-header">
        <button className="btn btn-secondary" onClick={onHome} style={{ marginBottom: '1.5rem' }}>← Back</button>
        <h2 className="plans-title">Plans &amp; Pricing</h2>
        <p className="plans-sub">
          You are currently on the <strong style={{ color: PLANS.find(p=>p.tier===currentTier)?.color }}>{TIER_LABELS[currentTier]}</strong> plan.
          {currentTier !== 'platinum' && ' Upgrade any time via WhatsApp — instant activation.'}
        </p>
      </div>

      <div className="plans-grid">
        {PLANS.map(plan => {
          const isCurrent = plan.tier === currentTier
          const isDowngrade = PLANS.findIndex(p=>p.tier===plan.tier) < PLANS.findIndex(p=>p.tier===currentTier)
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
                {plan.features.map(f => (
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
                <a
                  href={upgradeUrl(plan)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn btn-primary plan-upgrade-btn${plan.tier === 'platinum' ? ' plan-upgrade-btn--platinum' : ''}`}
                  style={plan.tier === 'gold' ? { background: '#F59E0B', borderColor: '#F59E0B', color: '#fff' } : {}}
                >
                  Upgrade to {plan.label} via WhatsApp
                </a>
              )}
            </div>
          )
        })}
      </div>

      <p className="plans-note">
        Upgrades are activated manually by the admin. Message us on WhatsApp and your plan will be upgraded within a few hours. No automatic billing — you are in full control.
      </p>
      {showTrialModal && <TrialModal onClose={() => setShowTrialModal(false)} />}
    </div>
  )
}

// ── HOME SCREEN ───────────────────────────────────────────────

function HomeScreen({ user, examType, onExamTypeChange, tokensUsedToday, score, totalAnswered, topicStats, subtopicStats, onSelectTopic, onUpgrade }) {
  const limit = TOKEN_LIMITS[user.tier] || 5000
  const remaining = Math.max(0, limit - tokensUsedToday)
  const totalCorrect = Object.values(topicStats).reduce((a, v) => a + v.correct, 0)
  const topicList = EXAM_TOPICS[examType] || EXAM_TOPICS.OC

  return (
    <div className="home-screen">
      <div className="home-title">Hi {user.name.split(' ')[0]}! 👋</div>
      <div className="home-sub">Practice for {examType} exam-style questions. Choose a topic to generate a question.</div>
      <div style={{ marginBottom: 10, fontSize: '0.86rem', color: '#334155', fontWeight: 600 }}>
        Current track: <span style={{ fontWeight: 800 }}>{examType}</span>
      </div>
      <div className="exam-row" style={{ marginBottom: 16 }}>
        {EXAM_TYPES.map(item => (
          <button
            key={item.id}
            onClick={() => {
              onExamTypeChange(item.id)
              if (typeof window !== 'undefined') localStorage.setItem('oc-trainer-examType', item.id)
            }}
            className={`exam-chip${examType === item.id ? ' active' : ''}`}
            style={{ marginRight: 8 }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {!user.is_admin && (
        <div className="limit-banner" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span><strong>{TIER_LABELS[user.tier]} Tier</strong> — {remaining.toLocaleString()} tokens remaining today ({tokensUsedToday.toLocaleString()} / {limit.toLocaleString()} used). Resets at midnight.</span>
            {user.tier === 'silver' && (
              <button
                className="btn btn-primary"
                style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                onClick={onUpgrade}
              >Upgrade ↑</button>
            )}
          </div>
          {user.tier === 'silver' && (
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#92400E' }}>
              🔒 Subtopic drill, History, Ranking &amp; Streak rewards unlock with Gold or Platinum.
            </div>
          )}
          {user.tier === 'gold' && (
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#92400E' }}>
              🔒 Leaderboard &amp; Streak rewards unlock with Platinum.
            </div>
          )}
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
    </div>
  )
}

// ── QUESTION VIEW ─────────────────────────────────────────────

function QuestionView({ question, questionNumber, topicStats, examType, onAnswer, onNext, onHome, currentTopics, subtopics, currentSubtopic, onSubtopicChange }) {
  const [answered, setAnswered] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(null)
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

  const getOptionClass = (i) => {
    if (!answered) return i === selectedIdx ? 'option-btn selected' : 'option-btn'
    if (i === question.correct) return 'option-btn correct'
    if (i === selectedIdx && i !== question.correct) return 'option-btn wrong'
    return 'option-btn'
  }

  const isCorrect = selectedIdx === question.correct

  return (
    <>
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
        </div>
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
    </>
  )
}

// ── MAIN APP ──────────────────────────────────────────────────

export default function App() {
  // Initialize session from localStorage if available
  const getInitialSession = () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('oc-trainer-session')
        return stored ? JSON.parse(stored) : { user: null, idToken: null, tokensUsedToday: 0 }
      } catch (err) {
        console.warn('Failed to load session from localStorage:', err)
        return { user: null, idToken: null, tokensUsedToday: 0 }
      }
    }
    return { user: null, idToken: null, tokensUsedToday: 0 }
  }

  const initialSession = getInitialSession()
  const [screen, setScreen] = useState(initialSession.user ? 'app' : 'landing') // landing | auth | pending | rejected | app | history | ranking
  const [session, setSession] = useState(initialSession)
  const [examType, setExamType] = useState('OC')
  const [showAdmin, setShowAdmin] = useState(false)
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

  const baseTopics = EXAM_TOPICS[examType] || EXAM_TOPICS.OC
  const currentTopics = baseTopics.map(t => ({ ...t, subtopics: dynamicSubtopics[t.id] || [] }))

  // Register global Google callback
  useEffect(() => {
    window._googleCallback = handleGoogleSignIn
  }, [])

  // Load exam-type preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedExamType = localStorage.getItem('oc-trainer-examType')
      const validExamIds = EXAM_TYPES.map(item => item.id)
      if (savedExamType && validExamIds.includes(savedExamType)) {
        setExamType(savedExamType)
      }
    }
  }, [])

  // Fetch dynamic subtopics from DB whenever examType or session changes
  useEffect(() => {
    if (!session?.idToken) return
    fetch(`/api/topics?examType=${encodeURIComponent(examType)}`, {
      headers: { Authorization: 'Bearer ' + session.idToken }
    })
      .then(r => r.json())
      .then(data => { if (data.subtopics) setDynamicSubtopics(data.subtopics) })
      .catch(() => {})
  }, [examType, session?.idToken])

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('oc-trainer-session', JSON.stringify(session))
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
          headers: { 'Authorization': 'Bearer ' + session.idToken }
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
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: idToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSession({ user: data.user, idToken, tokensUsedToday: data.tokensUsedToday || 0 })
      setScreen('app')
    } catch (err) {
      alert('Sign-in failed: ' + err.message)
    }
  }

  function handleSignOut() {
    if (typeof window.google !== 'undefined') window.google.accounts.id.disableAutoSelect()
    window._googleInitDone = false
    setSession({ user: null, idToken: null, tokensUsedToday: 0 })
    setScreen('auth')
    setShowAdmin(false)
    setCurrentTopic(null)
    setQuestion(null)
    setShowProfileMenu(false)
    // Clear stored session
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('oc-trainer-session')
      } catch (err) {
        console.warn('Failed to clear session from localStorage:', err)
      }
    }
  }

  function handleProfileClick() {
    setShowProfileMenu(prev => !prev)
  }

  async function generateQuestion(topicId, subtopic = null) {
    // Start quiz session tracking if not already started
    if (!quizSessionStartTime) {
      setQuizSessionStartTime(Date.now())
      setQuizTopicsAttempted(new Set())
    }
    // Add topic to attempted topics
    setQuizTopicsAttempted(prev => new Set([...prev, currentTopics.find(t => t.id === topicId)?.name]))

    const topic = currentTopics.find(t => t.id === topicId)
    setCurrentTopic(topicId)
    setCurrentSubtopic(subtopic)
    setQuestion(null)
    setQuestionError(null)
    setLoadingQuestion(true)

    const prompt = `You are an expert at creating Australian Year 4 ${examType} exam-style questions.
Topic: ${topic.name} — ${TOPIC_PROMPTS[topicId]}${subtopic ? `\nSubtopic: ${subtopic} — focus the question specifically on this subtopic.` : ''}
Create ONE multiple choice question for Year 4 (9-10 year olds). Vary difficulty: 40% easy, 40% medium, 20% hard.

IMPORTANT: The correct answer must be randomly distributed across positions A–E (indices 0–4). Do NOT always place the correct answer at index 0. Solve the question yourself first, then arrange the options so the correct answer appears at a random position.

Return ONLY valid JSON, no markdown, no explanation outside the JSON:
{"question":"...","visual":"optional table/list or empty string","options":["option1","option2","option3","option4","option5"],"correct":<0-based index of the correct option>,"explanation":"step-by-step solution","difficulty":"easy|medium|hard"}
Rules: exactly 5 options, correct is the 0-based index of the correct option (vary between 0 and 4), difficulty is easy/medium/hard.`

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.idToken },
        body: JSON.stringify({
          topicId,
          subtopic,
          examType,
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        }),
      })

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
      if (data._usage) setSession(s => ({ ...s, tokensUsedToday: data._usage.tokensUsedToday }))

      // The API now returns the question data directly
      setQuestion(data)
    } catch (err) {
      setQuestionError(err.message || 'Could not generate question. Please try again.')
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
            'Authorization': `Bearer ${session.idToken}`
          },
          body: JSON.stringify({
            questionId: question.id,
            selectedOption: idx,
            responseTimeSeconds: null // Could track this in the future
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
          'Authorization': `Bearer ${session.idToken}`
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

  function resetQuizSession() {
    setQuizSessionStartTime(null)
    setQuizTopicsAttempted(new Set())
    setScore(0)
    setTotalAnswered(0)
    setTopicStats(initTopicStats)
    setCurrentTopic(null)
    setQuestion(null)
    setQuestionError(null)
  }

  // ── RENDER SCREENS ──────────────────────────────────────────
  if (screen === 'landing') return <LandingScreen onSignIn={() => setScreen('auth')} />
  if (screen === 'auth') return <AuthScreen />
  if (screen === 'pending') return <PendingScreen email={session.user?.email} onSignOut={handleSignOut} />
  if (screen === 'rejected') return <RejectedScreen onSignOut={handleSignOut} />
  if (screen === 'history') return <HistoryScreen user={session.user} idToken={session.idToken} examType={examType} onExamTypeChange={setExamType} onHome={() => setScreen('app')} onRanking={() => setScreen('ranking')} />
  if (screen === 'ranking') return <RankingScreen user={session.user} idToken={session.idToken} onHome={() => setScreen('app')} onHistory={() => setScreen('history')} />
  if (screen === 'plans') return (
    <div>
      <header>
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => setScreen('app')}>Exam Booster <span>Practice Smarter</span></div>
        <div className="header-right">
          <button className="nav-btn" onClick={() => setScreen('app')}>Home</button>
        </div>
      </header>
      <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1.5rem' }}>
        <PlansScreen user={session.user} onHome={() => setScreen('app')} />
      </div>
      <WhatsAppButton user={session.user} />
    </div>
  )

  const { user, tokensUsedToday } = session
  const limit = TOKEN_LIMITS[user.tier] || 5000
  const perms = TIER_PERMISSIONS[user.tier] || TIER_PERMISSIONS.silver
  const tokenPct = Math.min(100, Math.round((tokensUsedToday / limit) * 100))
  const tokenFillColor = tokenPct > 80 ? '#FCA5A5' : tokenPct > 50 ? '#FDE68A' : 'white'

  return (
    <div>
      {/* HEADER */}
      <header>
        <div className="logo" onClick={() => { saveQuizAttempt(); resetQuizSession(); setShowAdmin(false); setScreen('app') }} style={{ cursor: 'pointer' }}>Exam Booster <span className="logo-sub">Practice Smarter</span></div>
        <div className="header-right">
          {/* Desktop nav */}
          <div className="desktop-nav">
            <button className="nav-btn" onClick={() => { saveQuizAttempt(); resetQuizSession(); setShowAdmin(false); setScreen('app') }}>Home</button>
            <button
              className={`nav-btn${!perms.history ? ' nav-btn--locked' : ''}`}
              onClick={() => { if (!perms.history) { setCurrentTopic(null); setShowAdmin(false); setScreen('plans'); return } setCurrentTopic(null); setShowAdmin(false); setScreen('history') }}
              title={!perms.history ? 'Upgrade to Gold or above' : ''}
            >History{!perms.history ? ' 🔒' : ''}</button>
            <button
              className={`nav-btn${!perms.ranking ? ' nav-btn--locked' : ''}`}
              onClick={() => { if (!perms.ranking) { setCurrentTopic(null); setShowAdmin(false); setScreen('plans'); return } setCurrentTopic(null); setShowAdmin(false); setScreen('ranking') }}
              title={!perms.ranking ? 'Upgrade to Platinum' : ''}
            >Ranking{!perms.ranking ? ' 🔒' : ''}</button>
            {!user.is_admin && (
              <button className="nav-btn nav-btn--plans" onClick={() => { setCurrentTopic(null); setShowAdmin(false); setScreen('plans') }}>Plans</button>
            )}
          </div>
          {!user.is_admin && (
            <div className="token-bar-wrap">
              <div>{tokensUsedToday.toLocaleString()} / {limit.toLocaleString()} tokens</div>
              <div className="token-bar">
                <div className="token-bar-fill" style={{ width: tokenPct + '%', background: tokenFillColor }} />
              </div>
            </div>
          )}
          {user.is_admin && (
            <button className={`admin-nav-btn${showAdmin ? ' active' : ''}`} onClick={() => setShowAdmin(v => !v)}>
              Admin Panel
            </button>
          )}
          <div className="user-pill" onClick={handleProfileClick}>
            {user.picture && <img src={user.picture} className="user-avatar" alt="" />}
            <span className="user-first-name">{user.name.split(' ')[0]}</span>
            <span className={`tier-badge ${TIER_CLASSES[user.tier] || 'tier-silver'}`}>
              {TIER_LABELS[user.tier] || user.tier}
            </span>
            <div className="profile-dropdown" style={{ display: showProfileMenu ? 'block' : 'none' }}>
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
                <button className="mobile-nav-item" onClick={() => { saveQuizAttempt(); resetQuizSession(); setShowAdmin(false); setScreen('app'); setMobileMenuOpen(false) }}>🏠 Home</button>
                <button
                  className="mobile-nav-item"
                  onClick={() => { if (!perms.history) { setScreen('plans'); setMobileMenuOpen(false); return } setCurrentTopic(null); setShowAdmin(false); setScreen('history'); setMobileMenuOpen(false) }}
                >📋 History{!perms.history ? ' 🔒' : ''}</button>
                <button
                  className="mobile-nav-item"
                  onClick={() => { if (!perms.ranking) { setScreen('plans'); setMobileMenuOpen(false); return } setCurrentTopic(null); setShowAdmin(false); setScreen('ranking'); setMobileMenuOpen(false) }}
                >🏆 Ranking{!perms.ranking ? ' 🔒' : ''}</button>
                {!user.is_admin && (
                  <button className="mobile-nav-item" onClick={() => { setCurrentTopic(null); setShowAdmin(false); setScreen('plans'); setMobileMenuOpen(false) }}>💎 Plans &amp; Pricing</button>
                )}
                {user.is_admin && (
                  <button className="mobile-nav-item" onClick={() => { setShowAdmin(v => !v); setMobileMenuOpen(false) }}>⚙️ Admin Panel</button>
                )}
                <button className="mobile-nav-item mobile-nav-item--danger" onClick={() => { handleSignOut(); setMobileMenuOpen(false) }}>🚪 Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ADMIN PANEL */}
      {showAdmin && (
        <div style={{ maxWidth: 1100, margin: '1.5rem auto', padding: '0 1.5rem' }}>
          <AdminPanel idToken={session.idToken} onSignOut={handleSignOut} />
        </div>
      )}

      <StreakCelebration celebration={celebration} />

      {/* MAIN LAYOUT */}
      {!showAdmin && (
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
            {/* Home */}
            {!currentTopic && !loadingQuestion && (
              <HomeScreen
                user={user}
                examType={examType}
                onExamTypeChange={setExamType}
                tokensUsedToday={tokensUsedToday}
                score={score}
                totalAnswered={totalAnswered}
                topicStats={topicStats}
                subtopicStats={subtopicStats}
                onSelectTopic={generateQuestion}
                onUpgrade={() => setScreen('plans')}
              />
            )}

            {/* Loading */}
            {loadingQuestion && (
              <div className="loading-card">
                <div className="spinner" />
                <div className="loading-text">Generating a {currentTopics.find(t => t.id === currentTopic)?.name} question...</div>
              </div>
            )}

            {/* Error */}
            {!loadingQuestion && questionError && (
              <div className="question-card">
                <div className="question-body">
                  <div className="error-box">{questionError}</div>
                  <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                    <button className="btn btn-primary" onClick={() => generateQuestion(currentTopic)}>Try Again</button>
                    <button className="btn btn-secondary" onClick={() => { saveQuizAttempt(); resetQuizSession(); setShowAdmin(false); setScreen('app') }}>Back to Home</button>
                  </div>
                </div>
              </div>
            )}

            {/* Question */}
            {!loadingQuestion && !questionError && question && (
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
                onNext={() => generateQuestion(currentTopic, currentSubtopic)}
                onHome={() => { saveQuizAttempt(); resetQuizSession(); setShowAdmin(false); setScreen('app') }}
              />
            )}
          </div>
        </div>
      )}
      <WhatsAppButton user={user} />
    </div>
  )
}
