'use client'

import { useState, useEffect, useCallback } from 'react'
import { TOPICS, TOPIC_PROMPTS, TOKEN_LIMITS, TIER_LABELS, TIER_CLASSES, ADMIN_EMAIL } from '@/lib/constants'
import HistoryScreen from '@/components/HistoryScreen'
import RankingScreen from '@/components/RankingScreen'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

if (!GOOGLE_CLIENT_ID) {
  console.error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable')
}

const initTopicStats = () => {
  const s = {}
  TOPICS.forEach(t => { s[t.id] = { correct: 0, total: 0 } })
  return s
}

// ── SCREEN COMPONENTS ─────────────────────────────────────────

function LandingScreen({ onSignIn }) {
  return (
    <div className="landing-screen">
      <div className="landing-nav">
        <div className="landing-logo">Exam Booster</div>
        <button className="btn btn-primary" onClick={onSignIn}>Sign in</button>
      </div>
      <section className="landing-hero">
        <div>
          <p className="eyebrow">Practice Smarter for High-Stakes School Exams</p>
          <h1>AI-powered NAPLAN, OC & Selective questions that adapt to your practice history.</h1>
          <p className="landing-text">Get instant practice, track progress, and build confidence with real-style questions. We prioritize unattempted questions first, then generate new ones on demand.</p>
          <div className="landing-cta-row">
            <button className="btn btn-primary" onClick={onSignIn}>Get Started</button>
            <button className="btn btn-secondary" onClick={onSignIn}>Sign in / Sign up</button>
          </div>
        </div>
        <div className="hero-box">
          <div className="hero-stat"><strong>3+</strong> Exam tracks</div>
          <div className="hero-stat"><strong>1000+</strong> dynamic questions</div>
          <div className="hero-stat"><strong>1-click</strong> generate + save</div>
        </div>
      </section>
      <section className="landing-features-grid">
        <div className="feature-card">
          <h3>Exam-ready Practice</h3>
          <p>Use topic-based questions for NAPLAN, OC, and Selective standards with immediate detailed explanations.</p>
        </div>
        <div className="feature-card">
          <h3>AI Generation + Reuse</h3>
          <p>Reuses unattempted items from the question bank first, then generates new questions only when needed.</p>
        </div>
        <div className="feature-card">
          <h3>Track Progress</h3>
          <p>Monitor daily tokens, total attempts, accuracy, and performance over time.</p>
        </div>
      </section>
      <section className="landing-how">
        <h2>How it works</h2>
        <div className="step-grid">
          <div className="step-card"><div className="step-num">1</div><div><h4>Sign in</h4><p>Register with Google and get approved in minutes.</p></div></div>
          <div className="step-card"><div className="step-num">2</div><div><h4>Choose topic</h4><p>Select a subject and start a practice session.</p></div></div>
          <div className="step-card"><div className="step-num">3</div><div><h4>Answer & improve</h4><p>Submit answers, track responses, and continue with fresh questions.</p></div></div>
        </div>
      </section>
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

function TokenLimitsEditor({ idToken }) {
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
            handleSignOut()
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
          handleSignOut()
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

function AdminPanel({ idToken }) {
  const [adminView, setAdminView] = useState('users') // users | quizBank
  const [users, setUsers] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const [quizBank, setQuizBank] = useState(null)
  const [loadingQuizBank, setLoadingQuizBank] = useState(false)
  const [quizBankTopicFilter, setQuizBankTopicFilter] = useState('all')
  const [quizBankUserSort, setQuizBankUserSort] = useState('countDesc')

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
          handleSignOut()
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
          handleSignOut()
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

  useEffect(() => { loadUsers() }, [loadUsers])

  useEffect(() => {
    if (adminView === 'quizBank') loadQuizBank()
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
          handleSignOut()
          return
        }
      }
      if (!res.ok) throw new Error((await res.json()).error)
      await loadUsers()
    } catch (err) { alert('Failed: ' + err.message) }
  }

  if (adminView === 'users') {
    if (loading) return <div className="loading-card"><div className="spinner" /><div className="loading-text">Loading users...</div></div>
    if (!users) return null
  }

  const counts = {
    all: users.length,
    pending: users.filter(u => u.status === 'pending').length,
    approved: users.filter(u => u.status === 'approved').length,
    rejected: users.filter(u => u.status === 'rejected').length,
  }

  const filtered = filter === 'all' ? users : users.filter(u => u.status === filter)

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
      <TokenLimitsEditor idToken={idToken} />
    </>
  ) : (
    <div style={{ padding: '20px 24px', borderTop: '1.5px solid var(--border)' }}>
      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1rem', marginBottom: 4 }}>Quiz Bank</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: 16 }}>Analytics for questions created by users (per topic + most active creators).</div>

      {loadingQuizBank ? (
        <div className="loading-card"><div className="spinner" /><div className="loading-text">Loading quiz bank data...</div></div>
      ) : quizBank ? (
        <>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700 }}>Topic:</span>
              <select value={quizBankTopicFilter} onChange={e => setQuizBankTopicFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', fontSize: '0.9rem' }}>
                <option value="all">All</option>
                {quizBank.topics.map(t => (
                  <option key={t.topicId} value={t.topicId}>{t.topicId}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700 }}>Sort creators:</span>
              <select value={quizBankUserSort} onChange={e => setQuizBankUserSort(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', fontSize: '0.9rem' }}>
                <option value="countDesc">Most questions</option>
                <option value="countAsc">Fewest questions</option>
                <option value="nameAsc">Name A→Z</option>
                <option value="nameDesc">Name Z→A</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1.5px solid var(--border)', padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Questions per Topic</div>
              {quizBank.topics.length === 0 ? (
                <div style={{ color: 'var(--text2)' }}>No questions yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {quizBank.topics
                    .filter(t => quizBankTopicFilter === 'all' || t.topicId === quizBankTopicFilter)
                    .sort((a, b) => b.count - a.count)
                    .map(t => (
                      <div key={t.topicId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span>{t.topicId}</span>
                        <span style={{ fontWeight: 700 }}>{t.count}</span>
                      </div>
                    ))}
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
  )}
  </div>
  )
}


// ── SIDEBAR ───────────────────────────────────────────────────

function Sidebar({ currentTopic, topicStats, totalAnswered, onSelectTopic }) {
  return (
    <div className="sidebar">
      <div className="sidebar-card">
        <div className="sidebar-title">Topics</div>
        <div className="topic-list">
          {TOPICS.map(t => (
            <button
              key={t.id}
              className={`topic-btn${currentTopic === t.id ? ' active' : ''}`}
              onClick={() => onSelectTopic(t.id)}
            >
              <div className="topic-icon" style={{ background: t.bg, color: t.color, fontWeight: 800, fontSize: t.id === 'fractions' ? '13px' : '15px' }}>{t.icon}</div>
              <span style={{ flex: 1, lineHeight: 1.3 }}>{t.name}</span>
              <span className="topic-count">{topicStats[t.id].total}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="sidebar-card">
        <div className="sidebar-title">Your Progress</div>
        <div className="progress-section">
          <div className="progress-row"><span>Questions Answered</span><span>{totalAnswered}</span></div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: Math.min(100, totalAnswered * 5) + '%' }} /></div>
          {TOPICS.filter(t => topicStats[t.id].total > 0).length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text2)', textAlign: 'center', padding: '8px 0' }}>Start practising to see your stats!</p>
          ) : TOPICS.filter(t => topicStats[t.id].total > 0).map(t => {
            const s = topicStats[t.id]
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

// ── HOME SCREEN ───────────────────────────────────────────────

function HomeScreen({ user, tokensUsedToday, score, totalAnswered, topicStats, onSelectTopic }) {
  const limit = TOKEN_LIMITS[user.tier] || 5000
  const remaining = Math.max(0, limit - tokensUsedToday)
  const totalCorrect = Object.values(topicStats).reduce((a, v) => a + v.correct, 0)

  return (
    <div className="home-screen">
      <div className="home-title">Hi {user.name.split(' ')[0]}! 👋</div>
      <div className="home-sub">Practice for NAPLAN, OC, and Selective exam-style questions. Choose a topic to generate a question.</div>
      {!user.is_admin && (
        <div className="limit-banner" style={{ marginBottom: 20 }}>
          <strong>{TIER_LABELS[user.tier]} Tier</strong> — {remaining.toLocaleString()} tokens remaining today ({tokensUsedToday.toLocaleString()} / {limit.toLocaleString()} used). Resets at midnight.
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
      <div className="home-sub" style={{ marginBottom: 12, fontWeight: 700, fontSize: '0.9rem' }}>Choose a topic to practise:</div>
      <div className="topics-overview">
        {TOPICS.map(t => (
          <div key={t.id} className="topic-overview-card" onClick={() => onSelectTopic(t.id)}>
            <div className="toc-icon" style={{ background: t.bg }}>{t.icon}</div>
            <div><div className="toc-name">{t.name}</div><div className="toc-desc">{t.desc}</div></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── QUESTION VIEW ─────────────────────────────────────────────

function QuestionView({ question, questionNumber, topicStats, onAnswer, onNext, onHome }) {
  const [answered, setAnswered] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const topic = TOPICS.find(t => t.id === question.topicId)
  const labels = ['A', 'B', 'C', 'D', 'E']

  const handleAnswer = (idx) => {
    if (answered) return
    setAnswered(true)
    setSelectedIdx(idx)
    onAnswer(idx)
  }

  const getOptionClass = (i) => {
    if (!answered) return 'option-btn'
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
          <div className={`diff-pill diff-${question.difficulty}`}>
            {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
          </div>
        </div>
        <div className="question-body">
          <div className="question-text">{question.question}</div>
          {question.visual && (
            <div className="question-visual">
              <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{question.visual}</pre>
            </div>
          )}
          <div className="options-grid">
            {question.options.map((opt, i) => (
              <button key={i} className={getOptionClass(i)} onClick={() => handleAnswer(i)} disabled={answered}>
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
          {!answered && <span className="hint-text">Select an answer above</span>}
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
  const [showAdmin, setShowAdmin] = useState(false)
  const [currentTopic, setCurrentTopic] = useState(null)
  const [question, setQuestion] = useState(null)
  const [loadingQuestion, setLoadingQuestion] = useState(false)
  const [questionError, setQuestionError] = useState(null)
  const [score, setScore] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [topicStats, setTopicStats] = useState(initTopicStats)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [quizSessionStartTime, setQuizSessionStartTime] = useState(null)
  const [quizTopicsAttempted, setQuizTopicsAttempted] = useState(new Set())

  // Register global Google callback
  useEffect(() => {
    window._googleCallback = handleGoogleSignIn
  }, [])

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

  // Validate stored session on app load - REMOVED
  // We now handle token expiration in API calls instead

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (showProfileMenu && !event.target.closest('.user-pill')) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfileMenu])

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
      const s = data.user.status
      if (s === 'pending') setScreen('pending')
      else if (s === 'rejected') setScreen('rejected')
      else setScreen('app')
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

  async function generateQuestion(topicId) {
    // Start quiz session tracking if not already started
    if (!quizSessionStartTime) {
      setQuizSessionStartTime(Date.now())
      setQuizTopicsAttempted(new Set())
    }
    // Add topic to attempted topics
    setQuizTopicsAttempted(prev => new Set([...prev, TOPICS.find(t => t.id === topicId)?.name]))

    const topic = TOPICS.find(t => t.id === topicId)
    setCurrentTopic(topicId)
    setQuestion(null)
    setQuestionError(null)
    setLoadingQuestion(true)

    const prompt = `You are an expert at creating Australian Year 4 OC Placement Test maths questions.
Topic: ${topic.name} — ${TOPIC_PROMPTS[topicId]}
Create ONE multiple choice question for Year 4 (9-10 year olds). Vary difficulty: 40% easy, 40% medium, 20% hard.
Return ONLY valid JSON, no markdown:
{"question":"...","visual":"optional table/list or empty string","options":["A","B","C","D","E"],"correct":0,"explanation":"step-by-step solution","difficulty":"easy"}
Rules: exactly 5 options, correct is 0-4 index, difficulty is easy/medium/hard.`

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.idToken },
        body: JSON.stringify({
          topicId,
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
    }
    setTopicStats(prev => ({
      ...prev,
      [question.topicId]: {
        correct: prev[question.topicId].correct + (isCorrect ? 1 : 0),
        total: prev[question.topicId].total + 1,
      }
    }))

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
          topics: Array.from(quizTopicsAttempted)
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
  if (screen === 'history') return <HistoryScreen user={session.user} idToken={session.idToken} onHome={() => setScreen('app')} onRanking={() => setScreen('ranking')} />
  if (screen === 'ranking') return <RankingScreen user={session.user} idToken={session.idToken} onHome={() => setScreen('app')} onHistory={() => setScreen('history')} />

  const { user, tokensUsedToday } = session
  const limit = TOKEN_LIMITS[user.tier] || 5000
  const tokenPct = Math.min(100, Math.round((tokensUsedToday / limit) * 100))
  const tokenFillColor = tokenPct > 80 ? '#FCA5A5' : tokenPct > 50 ? '#FDE68A' : 'white'

  return (
    <div>
      {/* HEADER */}
      <header>
        <div className="logo" onClick={() => { saveQuizAttempt(); resetQuizSession(); setShowAdmin(false); setScreen('app') }} style={{ cursor: 'pointer' }}>Exam Booster <span>Practice Smarter</span></div>
        <div className="header-right">
          <button className="nav-btn" onClick={() => { saveQuizAttempt(); resetQuizSession(); setShowAdmin(false); setScreen('app') }}>Home</button>
          <button className="nav-btn" onClick={() => { setCurrentTopic(null); setShowAdmin(false); setScreen('history') }}>History</button>
          <button className="nav-btn" onClick={() => { setCurrentTopic(null); setShowAdmin(false); setScreen('ranking') }}>Ranking</button>
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
            <span>{user.name.split(' ')[0]}</span>
            <span className={`tier-badge ${TIER_CLASSES[user.tier] || 'tier-silver'}`}>
              {TIER_LABELS[user.tier] || user.tier}
            </span>
            <div className="profile-dropdown" style={{ display: showProfileMenu ? 'block' : 'none' }}>
              <button className="dropdown-item" onClick={handleSignOut}>
                <span>🚪</span> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ADMIN PANEL */}
      {showAdmin && (
        <div style={{ maxWidth: 1100, margin: '1.5rem auto', padding: '0 1.5rem' }}>
          <AdminPanel idToken={session.idToken} />
        </div>
      )}

      {/* MAIN LAYOUT */}
      {!showAdmin && (
        <div className="app">
          <Sidebar
            currentTopic={currentTopic}
            topicStats={topicStats}
            totalAnswered={totalAnswered}
            onSelectTopic={generateQuestion}
          />
          <div className="main">
            {/* Home */}
            {!currentTopic && !loadingQuestion && (
              <HomeScreen
                user={user}
                tokensUsedToday={tokensUsedToday}
                score={score}
                totalAnswered={totalAnswered}
                topicStats={topicStats}
                onSelectTopic={generateQuestion}
              />
            )}

            {/* Loading */}
            {loadingQuestion && (
              <div className="loading-card">
                <div className="spinner" />
                <div className="loading-text">Generating a {TOPICS.find(t => t.id === currentTopic)?.name} question...</div>
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
                onAnswer={handleAnswer}
                onNext={() => generateQuestion(currentTopic)}
                onHome={() => { saveQuizAttempt(); resetQuizSession(); setShowAdmin(false); setScreen('app') }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
