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
    ? `Hi! I'm ${user.name} (${user.email}). I have a question about Self Paced Learning.`
    : `Hi! I have a question about Self Paced Learning.`
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

function TrialModal({ onClose, onReferFriend }) {
  return (
    <div className="trial-modal-backdrop" onClick={onClose}>
      <div className="trial-modal" onClick={e => e.stopPropagation()}>
        <button className="trial-modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="trial-modal-icon">🎁</div>
        <h3 className="trial-modal-title">Get Gold or Platinum — Free!</h3>
        <p className="trial-modal-body">
          Invite your friends and unlock free premium access:
        </p>
        <div className="trial-referral-tiers">
          <div className="trial-referral-tier">
            <span className="trial-referral-tier-icon" style={{ background: '#FEF3C7', color: '#F59E0B' }}>🥇</span>
            <div>
              <strong style={{ color: '#F59E0B' }}>Invite 3 friends</strong>
              <div className="trial-referral-tier-desc">1 month Gold — free</div>
            </div>
          </div>
          <div className="trial-referral-tier">
            <span className="trial-referral-tier-icon" style={{ background: '#EDE9FE', color: '#7C3AED' }}>💜</span>
            <div>
              <strong style={{ color: '#7C3AED' }}>Invite 5 friends</strong>
              <div className="trial-referral-tier-desc">1 month Platinum — free</div>
            </div>
          </div>
        </div>
        <div className="trial-modal-actions">
          {onReferFriend && (
            <button className="btn btn-primary" style={{ background: 'var(--accent)' }} onClick={() => { onClose(); onReferFriend() }}>
              🔗 Get My Referral Link
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Maybe later</button>
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
          <p className="lp-pricing-note">All plans include a Google sign-in account and access via any device. Invite friends to earn free upgrades — 3 friends gets you Gold, 5 friends gets you Platinum.</p>
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
          </div>
        </div>
        <div className="lp-footer-bottom">
          © {new Date().getFullYear()} Self Paced Learning. All rights reserved.
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
        <div className="auth-logo">🎯 Self Paced Learning</div>
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


// ── STREAK CELEBRATION ────────────────────────────────────────

const STREAK_CONFIG = {
  1: { emoji: '🎉', heading: 'Nice work!', sub: '3 in a row — keep it up!', color: '#F59E0B', bg: 'linear-gradient(135deg,#FEF3C7,#FDE68A)' },
  2: { emoji: '🔥', heading: "You're on fire!", sub: '6 correct in a row — amazing!', color: '#EF4444', bg: 'linear-gradient(135deg,#FEE2E2,#FCA5A5)' },
  3: { emoji: '🚀', heading: 'Unstoppable!', sub: '9 in a row — you\'re a superstar!', color: '#7C3AED', bg: 'linear-gradient(135deg,#EDE9FE,#C4B5FD)' },
  4: { emoji: '🏆', heading: 'LEGENDARY!', sub: '15+ correct streak — absolute legend!', color: '#059669', bg: 'linear-gradient(135deg,#D1FAE5,#6EE7B7)' },
}

function ReferralModal({ user, referralCount, onClose }) {
  const [copied, setCopied] = useState(false)
  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}?ref=${user.referral_code}`
    : `https://exambooster.com.au?ref=${user.referral_code}`

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
        <div className="trial-modal-title">Refer a Friend</div>
        <div className="trial-modal-body">
          Share your link — when a friend signs up, you both help grow the community!
        </div>
        <div className="referral-modal-stat">
          <div className="referral-modal-stat-num">{referralCount}</div>
          <div className="referral-modal-stat-label">friend{referralCount !== 1 ? 's' : ''} referred<br/>so far</div>
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

function PlansScreen({ user, onHome, onReferFriend }) {
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
          {currentTier !== 'platinum' && ' Invite friends to earn a free upgrade, or contact us to upgrade directly.'}
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
        Invite friends using your referral link and unlock free premium access — 3 friends gets you Gold, 5 friends gets you Platinum. No credit card needed, no automatic billing — you are in full control.
      </p>
      {showTrialModal && <TrialModal onClose={() => setShowTrialModal(false)} onReferFriend={onReferFriend} />}
    </div>
  )
}

// ── HOME SCREEN ───────────────────────────────────────────────

function HomeScreen({ user, examType, onExamTypeChange, score, totalAnswered, topicStats, subtopicStats, onSelectTopic, onUpgrade }) {
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
            <span><strong>{TIER_LABELS[user.tier]} Tier</strong></span>
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
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [referralCount, setReferralCount] = useState(0)

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

  // Capture referral code from URL ?ref= param and store it
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get('ref')
      if (ref) {
        localStorage.setItem('oc-ref-code', ref)
        const url = new URL(window.location.href)
        url.searchParams.delete('ref')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [])

  // Fetch referral count when logged in
  useEffect(() => {
    if (!session?.idToken) return
    fetch('/api/referral', { headers: { Authorization: 'Bearer ' + session.idToken } })
      .then(r => r.json())
      .then(data => { if (data.referral_count !== undefined) setReferralCount(data.referral_count) })
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
      const storedRefCode = typeof window !== 'undefined' ? localStorage.getItem('oc-ref-code') : null
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: idToken, referralCode: storedRefCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (storedRefCode) localStorage.removeItem('oc-ref-code')
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
    setScreen('landing')
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
      if (data._usage) setSession(s => ({ ...s, tokensUsedToday: data._usage.tokensUsedToday }))

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
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => setScreen('app')}>Self Paced Learning <span>Practice · Consistency · Feedback</span></div>
        <div className="header-right">
          <button className="nav-btn" onClick={() => setScreen('app')}>Home</button>
        </div>
      </header>
      <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1.5rem' }}>
        <PlansScreen user={session.user} onHome={() => setScreen('app')} onReferFriend={() => setShowReferralModal(true)} />
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
        <div className="logo" onClick={() => { saveQuizAttempt(); resetQuizSession(); setScreen('app') }} style={{ cursor: 'pointer' }}>Self Paced Learning <span className="logo-sub">Practice · Consistency · Feedback</span></div>
        <div className="header-right">
          {/* Desktop nav */}
          <div className="desktop-nav">
            <button className="nav-btn" onClick={() => { saveQuizAttempt(); resetQuizSession(); setScreen('app') }}>Home</button>
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
            {!user.is_admin && (
              <button className="nav-btn nav-btn--plans" onClick={() => { setCurrentTopic(null); setScreen('plans') }}>Plans</button>
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
                <button className="mobile-nav-item" onClick={() => { saveQuizAttempt(); resetQuizSession(); setScreen('app'); setMobileMenuOpen(false) }}>🏠 Home</button>
                <button
                  className="mobile-nav-item"
                  onClick={() => { if (!perms.history) { setScreen('plans'); setMobileMenuOpen(false); return } setCurrentTopic(null); setScreen('history'); setMobileMenuOpen(false) }}
                >📋 History{!perms.history ? ' 🔒' : ''}</button>
                <button
                  className="mobile-nav-item"
                  onClick={() => { if (!perms.ranking) { setScreen('plans'); setMobileMenuOpen(false); return } setCurrentTopic(null); setScreen('ranking'); setMobileMenuOpen(false) }}
                >🏆 Ranking{!perms.ranking ? ' 🔒' : ''}</button>
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
      {showReferralModal && session.user?.referral_code && (
        <ReferralModal user={session.user} referralCount={referralCount} onClose={() => setShowReferralModal(false)} />
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
            {/* Home */}
            {!currentTopic && !loadingQuestion && (
              <HomeScreen
                user={user}
                examType={examType}
                onExamTypeChange={setExamType}
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
                <div className="loading-text">Loading your next {currentTopics.find(t => t.id === currentTopic)?.name} question...</div>
              </div>
            )}

            {/* Error */}
            {!loadingQuestion && questionError && (
              <div className="question-card">
                <div className="question-body">
                  {questionError.startsWith('NO_QUESTIONS:') ? (
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
                onHome={() => { saveQuizAttempt(); resetQuizSession(); setScreen('app') }}
              />
            )}
          </div>
        </div>
      <WhatsAppButton user={user} />
    </div>
  )
}
