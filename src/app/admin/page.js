'use client'

import { useState, useEffect, useCallback } from 'react'
import { ADMIN_EMAIL, EXAM_TYPES, EXAM_TOPICS, TOKEN_LIMITS, TIER_LABELS } from '@/lib/constants'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

// ── TOKEN LIMITS EDITOR ────────────────────────────────────────

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
            onSignOut()
            return null
          }
        }
        return r.json()
      })
      .then(data => {
        if (!data) return
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
          onSignOut(); return
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

  if (!limits) return <div style={{ padding: 24, color: '#64748b' }}>Loading config...</div>

  const tiers = [
    { key: 'silver',   label: 'Silver',   color: '#94A3B8' },
    { key: 'gold',     label: 'Gold',     color: '#F59E0B' },
    { key: 'platinum', label: 'Platinum', color: '#8B5CF6' },
    { key: 'admin',    label: 'Admin',    color: '#EF4444' },
  ]

  return (
    <div style={{ padding: '20px 24px', borderTop: '1.5px solid #E8D5C0' }}>
      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1rem', marginBottom: 4 }}>Token Limits</div>
      <div style={{ fontSize: '0.8rem', color: '#7A5C3F', marginBottom: 16 }}>Daily token limits per tier — changes take effect immediately.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {tiers.map(({ key, label, color }) => (
          <div key={key} style={{ background: '#FFF3E6', borderRadius: 10, padding: '12px 16px', border: '1.5px solid #E8D5C0' }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color, marginBottom: 8 }}>{label}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                value={limits[key] || ''}
                onChange={e => setLimits(l => ({ ...l, [key]: e.target.value }))}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.9rem', background: 'white' }}
              />
              <button
                style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: 'pointer' }}
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

// ── ADMIN PANEL ────────────────────────────────────────────────

function AdminPanel({ idToken, onSignOut }) {
  const [adminView, setAdminView] = useState('users')
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

  const [genExamType, setGenExamType] = useState('OC')
  const [genTopicId, setGenTopicId] = useState('')
  const [genSubtopic, setGenSubtopic] = useState('')
  const [genCount, setGenCount] = useState(10)
  const [genStatus, setGenStatus] = useState('')
  const [genLoading, setGenLoading] = useState(false)

  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  const [reviewUserId, setReviewUserId] = useState('')
  const [reviewResponses, setReviewResponses] = useState(null)
  const [loadingReview, setLoadingReview] = useState(false)
  const [reviewFilter, setReviewFilter] = useState('all')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin?action=users', { headers: { Authorization: 'Bearer ' + idToken } })
      if (res.status === 403) {
        const err = await res.json()
        if (err.error && (err.error.includes('Not authenticated') || err.error.includes('token') || err.error.includes('Token'))) { onSignOut(); return }
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(data.users)
    } catch (err) { alert('Failed to load users: ' + err.message) }
    finally { setLoading(false) }
  }, [idToken])

  const loadQuizBank = useCallback(async () => {
    setLoadingQuizBank(true)
    try {
      const res = await fetch('/api/admin?action=quizBank', { headers: { Authorization: 'Bearer ' + idToken } })
      if (res.status === 403) {
        const err = await res.json()
        if (err.error && (err.error.includes('Not authenticated') || err.error.includes('token') || err.error.includes('Token'))) { onSignOut(); return }
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuizBank(data)
    } catch (err) { alert('Failed to load quiz bank data: ' + err.message) }
    finally { setLoadingQuizBank(false) }
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
      const res = await fetch(`/api/admin?action=userResponses&userId=${encodeURIComponent(uid)}`, { headers: { Authorization: 'Bearer ' + idToken } })
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
        if (err.error && (err.error.includes('Not authenticated') || err.error.includes('token') || err.error.includes('Token'))) { onSignOut(); return }
      }
      if (!res.ok) throw new Error((await res.json()).error)
      await loadUsers()
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const uploadQuestions = async () => {
    if (!uploadFile) { setUploadStatus('Please choose a JSON file first.'); return }
    setUploadStatus('Reading file and uploading...')
    try {
      const text = await uploadFile.text()
      const questionData = JSON.parse(text)
      if (!Array.isArray(questionData)) throw new Error('Upload file must be a JSON array of questions.')
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
    } catch (err) { setUploadStatus('Upload error: ' + err.message) }
  }

  const uploadPdf = async () => {
    if (!uploadPdfFile) { setUploadPdfStatus('Please select a PDF file first.'); return }
    setUploadPdfStatus('Sending PDF for extraction...')
    try {
      const formData = new FormData()
      formData.append('examType', uploadPdfExamType)
      if (uploadPdfTopicId) formData.append('topicId', uploadPdfTopicId)
      formData.append('file', uploadPdfFile)
      const res = await fetch('/api/admin?action=uploadPdf', { method: 'POST', body: formData, headers: { Authorization: 'Bearer ' + idToken } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      const errors = data.errors?.length || 0
      const topics = (data.topics || []).map(t => t.name).join(', ') || 'n/a'
      setUploadPdfStatus(`Extracted topics: ${topics}. Inserted: ${data.inserted || 0}. Skipped: ${data.skipped || 0}. Errors: ${errors}.`)
      setUploadPdfFile(null)
      document.getElementById('pdf-upload-input').value = ''
      loadQuizBank()
    } catch (err) { setUploadPdfStatus('PDF upload failed: ' + err.message) }
  }

  const generateQuestions = async () => {
    if (!genTopicId) { setGenStatus('Please select a topic first.'); return }
    const count = Math.max(1, Math.min(50, parseInt(genCount) || 10))
    setGenLoading(true)
    setGenStatus('Generating questions with AI...')
    try {
      const body = { examType: genExamType, topicId: genTopicId, count }
      if (genSubtopic) body.subtopic = genSubtopic
      const res = await fetch('/api/admin?action=generateQuestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      const errCount = data.errors?.length || 0
      setGenStatus(`✓ Generated and saved ${data.generated} questions.${errCount > 0 ? ` (${errCount} failed)` : ''}`)
      loadQuizBank()
    } catch (err) {
      setGenStatus('Error: ' + err.message)
    } finally {
      setGenLoading(false)
    }
  }

  if (adminView === 'users' && loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#7A5C3F' }}>Loading users...</div>
  }

  const safeUsers = users || []
  const counts = {
    all: safeUsers.length,
    pending: safeUsers.filter(u => u.status === 'pending').length,
    approved: safeUsers.filter(u => u.status === 'approved').length,
    rejected: safeUsers.filter(u => u.status === 'rejected').length,
  }
  const filtered = filter === 'all' ? safeUsers : safeUsers.filter(u => u.status === filter)

  const tabBtn = (view, label) => (
    <button
      onClick={() => setAdminView(view)}
      style={{
        padding: '7px 16px', borderRadius: 20, border: '1.5px solid',
        borderColor: adminView === view ? '#FF6B35' : '#E8D5C0',
        background: adminView === view ? '#FF6B35' : 'white',
        color: adminView === view ? 'white' : '#2D1B0E',
        fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
      }}
    >{label}</button>
  )

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #E8D5C0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(45,27,14,0.08)' }}>
      {/* Panel header */}
      <div style={{ background: '#1E1B4B', padding: '20px 24px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.3rem' }}>Admin Panel</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: 4 }}>Manage user access, quiz bank, and platform analytics</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tabBtn('users', 'Users')}
          {tabBtn('quizBank', 'Quiz Bank')}
          {tabBtn('analytics', 'Analytics')}
          {tabBtn('review', 'Answer Review')}
        </div>
      </div>

      {/* Users tab */}
      {adminView === 'users' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '16px 20px', background: '#FFF3E6', borderBottom: '1.5px solid #E8D5C0' }}>
            {[['Total Users', counts.all, '#2D1B0E'], ['Pending', counts.pending, '#F59E0B'], ['Approved', counts.approved, '#52C41A'], ['Rejected', counts.rejected, '#EF4444']].map(([label, num, color]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.5rem', color }}>{num}</div>
                <div style={{ fontSize: '0.75rem', color: '#7A5C3F', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 20px', display: 'flex', gap: 8, borderBottom: '1.5px solid #E8D5C0', flexWrap: 'wrap' }}>
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid', borderColor: filter === f ? '#FF6B35' : '#E8D5C0', background: filter === f ? '#FF6B35' : 'white', color: filter === f ? 'white' : '#2D1B0E', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
              </button>
            ))}
          </div>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 120px', gap: 12, padding: '14px 20px', background: '#FFF3E6', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7A5C3F' }}>
              <div>User</div><div>Email</div><div>Status / Tier</div><div>Tokens Today</div><div>Actions</div>
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#7A5C3F', fontWeight: 600 }}>No users in this category.</div>
            ) : filtered.map(u => {
              const isAdmin = u.email === ADMIN_EMAIL
              const limit = TOKEN_LIMITS[u.tier] || 5000
              const pct = Math.min(100, Math.round(((u.tokensToday || 0) / limit) * 100))
              const initials = (u.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              const barColor = pct > 80 ? '#EF4444' : pct > 50 ? '#F59E0B' : '#52C41A'
              return (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 120px', gap: 12, padding: '14px 20px', borderBottom: '1px solid #E8D5C0', alignItems: 'center', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {u.picture
                      ? <img src={u.picture} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                      : <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FF6B35', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>{initials}</div>}
                    <div>
                      <div style={{ fontWeight: 700 }}>{u.name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#7A5C3F' }}>{new Date(u.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', wordBreak: 'break-all' }}>{u.email}</div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-block', background: isAdmin ? '#EDE9FE' : u.status === 'approved' ? '#DCFCE7' : u.status === 'pending' ? '#FEF3C7' : '#FEE2E2', color: isAdmin ? '#5B21B6' : u.status === 'approved' ? '#166534' : u.status === 'pending' ? '#92400E' : '#991B1B' }}>
                      {isAdmin ? 'Admin' : u.status}
                    </span>
                    {!isAdmin && (
                      <select
                        style={{ marginTop: 4, display: 'block', padding: '4px 8px', borderRadius: 6, border: '1.5px solid #E8D5C0', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'Nunito Sans', background: 'white', cursor: 'pointer', color: '#2D1B0E' }}
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
                    <div style={{ fontSize: '0.78rem', color: '#7A5C3F' }}>{(u.tokensToday || 0).toLocaleString()} / {limit.toLocaleString()}</div>
                    <div style={{ height: 4, background: '#E2E8F0', borderRadius: 2, marginTop: 3, width: 80 }}>
                      <div style={{ height: '100%', borderRadius: 2, width: pct + '%', background: barColor }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {!isAdmin && u.status !== 'approved' && <button onClick={() => updateUser(u.id, { status: 'approved' })} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: '#DCFCE7', color: '#166534', fontFamily: 'Nunito' }}>Approve</button>}
                    {!isAdmin && u.status !== 'rejected' && <button onClick={() => updateUser(u.id, { status: 'rejected' })} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: '#FEE2E2', color: '#991B1B', fontFamily: 'Nunito' }}>Reject</button>}
                    {isAdmin && <span style={{ fontSize: '0.75rem', color: '#7A5C3F' }}>You</span>}
                  </div>
                </div>
              )
            })}
          </div>
          <TokenLimitsEditor idToken={idToken} onSignOut={onSignOut} />
        </>
      )}

      {/* Quiz Bank tab */}
      {adminView === 'quizBank' && (
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1rem', marginBottom: 4 }}>Quiz Bank</div>
          <div style={{ fontSize: '0.85rem', color: '#7A5C3F', marginBottom: 16 }}>Analytics for questions in the bank.</div>

          <div style={{ padding: 14, borderRadius: 10, border: '1px solid #E8D5C0', background: '#FFF3E6', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Bulk upload sample questions (JSON)</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <select value={uploadExamType} onChange={e => setUploadExamType(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white' }}>
                {EXAM_TYPES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
              <input id="question-upload-input" type="file" accept="application/json" onChange={e => setUploadFile(e.target.files?.[0] || null)} style={{ padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white' }} />
              <button style={{ padding: '7px 12px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: 'pointer' }} onClick={uploadQuestions}>Upload</button>
            </div>
            {uploadStatus && <div style={{ fontSize: '0.8rem', color: uploadStatus.startsWith('Upload error') ? '#EF4444' : '#10B981' }}>{uploadStatus}</div>}
          </div>

          <div style={{ padding: 14, borderRadius: 10, border: '1px solid #E8D5C0', background: '#FFF3E6', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Upload PDF for AI topic extraction</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <select value={uploadPdfExamType} onChange={e => { setUploadPdfExamType(e.target.value); setUploadPdfTopicId('') }} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white' }}>
                {EXAM_TYPES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
              <select value={uploadPdfTopicId} onChange={e => setUploadPdfTopicId(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white' }}>
                <option value="">Auto-detect topic</option>
                {(EXAM_TOPICS[uploadPdfExamType] || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input id="pdf-upload-input" type="file" accept="application/pdf" onChange={e => setUploadPdfFile(e.target.files?.[0] || null)} style={{ padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white' }} />
              <button style={{ padding: '7px 12px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: 'pointer' }} onClick={uploadPdf}>Upload PDF</button>
            </div>
            {uploadPdfStatus && <div style={{ fontSize: '0.8rem', color: uploadPdfStatus.startsWith('PDF upload failed') ? '#EF4444' : '#10B981' }}>{uploadPdfStatus}</div>}
          </div>

          <div style={{ padding: 14, borderRadius: 10, border: '1px solid #C4B5FD', background: '#F5F3FF', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 2, color: '#5B21B6' }}>AI Question Generator</div>
            <div style={{ fontSize: '0.8rem', color: '#7C3AED', marginBottom: 10 }}>Generate questions using Claude AI and add them directly to the question bank.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <select
                value={genExamType}
                onChange={e => { setGenExamType(e.target.value); setGenTopicId(''); setGenSubtopic('') }}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #C4B5FD', background: 'white' }}
              >
                {EXAM_TYPES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
              <select
                value={genTopicId}
                onChange={e => { setGenTopicId(e.target.value); setGenSubtopic('') }}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #C4B5FD', background: 'white', minWidth: 160 }}
              >
                <option value="">— Select topic —</option>
                {(EXAM_TOPICS[genExamType] || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {genTopicId && (EXAM_TOPICS[genExamType] || []).find(t => t.id === genTopicId)?.subtopics?.length > 0 && (
                <select
                  value={genSubtopic}
                  onChange={e => setGenSubtopic(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #C4B5FD', background: 'white' }}
                >
                  <option value="">All subtopics</option>
                  {(EXAM_TOPICS[genExamType] || []).find(t => t.id === genTopicId)?.subtopics.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
              <input
                type="number"
                min={1}
                max={50}
                value={genCount}
                onChange={e => setGenCount(e.target.value)}
                style={{ width: 70, padding: '7px 10px', borderRadius: 8, border: '1.5px solid #C4B5FD', background: 'white', fontFamily: 'Nunito', fontWeight: 700 }}
                title="Number of questions (1–50)"
              />
              <button
                onClick={generateQuestions}
                disabled={genLoading || !genTopicId}
                style={{ padding: '7px 14px', background: genLoading || !genTopicId ? '#C4B5FD' : '#7C3AED', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: genLoading || !genTopicId ? 'not-allowed' : 'pointer' }}
              >
                {genLoading ? 'Generating...' : 'Generate & Add to Bank'}
              </button>
            </div>
            {genStatus && (
              <div style={{ fontSize: '0.82rem', color: genStatus.startsWith('Error') ? '#DC2626' : genStatus.startsWith('✓') ? '#059669' : '#5B21B6', fontWeight: 600 }}>
                {genStatus}
              </div>
            )}
          </div>

          <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.05rem', marginBottom: 4, marginTop: 8 }}>Question Bank Overview</div>
          {loadingQuizBank ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#7A5C3F' }}>Loading quiz bank data...</div>
          ) : quizBank ? (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #E8D5C0', padding: '14px 20px', minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FF6B35' }}>{quizBank.total || 0}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7A5C3F', marginTop: 2 }}>Total Questions</div>
                </div>
                {(quizBank.examBreakdown || []).map(e => (
                  <div key={e.examType} style={{ background: 'white', borderRadius: 12, border: '1.5px solid #E8D5C0', padding: '14px 20px', minWidth: 120, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1D4ED8' }}>{e.count}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7A5C3F', marginTop: 2 }}>{e.examType} Track</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #E8D5C0', padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontWeight: 800 }}>Questions per Topic</div>
                    <select value={quizBankTopicFilter} onChange={e => setQuizBankTopicFilter(e.target.value)} style={{ padding: '5px 8px', borderRadius: 7, border: '1.5px solid #E8D5C0', background: 'white', fontSize: '0.82rem', fontWeight: 600 }}>
                      <option value="all">All Exams</option>
                      {(quizBank.examBreakdown || []).map(e => <option key={e.examType} value={e.examType}>{e.examType} Track</option>)}
                    </select>
                  </div>
                  {quizBank.topics.map(t => {
                    const examEntries = quizBankTopicFilter === 'all' ? Object.entries(t.byExam || {}) : [[quizBankTopicFilter, (t.byExam || {})[quizBankTopicFilter] || 0]]
                    const count = quizBankTopicFilter === 'all' ? t.count : ((t.byExam || {})[quizBankTopicFilter] || 0)
                    if (quizBankTopicFilter !== 'all' && count === 0) return null
                    return (
                      <div key={t.topicId} style={{ borderBottom: '1px solid #E8D5C0', paddingBottom: 6, marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, marginBottom: 2 }}>
                          <span>{t.topicId}</span><span>{count}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {examEntries.map(([exam, cnt]) => (
                            <span key={exam} style={{ fontSize: '0.72rem', background: '#DBEAFE', color: '#1D4ED8', borderRadius: 999, padding: '1px 7px', fontWeight: 700 }}>{exam}: {cnt}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #E8D5C0', padding: 16 }}>
                  <div style={{ fontWeight: 800, marginBottom: 10 }}>Top Creators</div>
                  {quizBank.users.slice().sort((a, b) => b.count - a.count).map(u => (
                    <div key={u.userId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '4px 0', borderBottom: '1px solid #E8D5C0' }}>
                      <span>{u.name || u.email || 'Unknown'}</span>
                      <span style={{ fontWeight: 700 }}>{u.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : <div style={{ color: '#7A5C3F' }}>No quiz bank data.</div>}
        </div>
      )}

      {/* Analytics tab */}
      {adminView === 'analytics' && (
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>Analytics</div>
          <div style={{ fontSize: '0.82rem', color: '#7A5C3F', marginBottom: 16 }}>Platform activity over the last 30 days.</div>
          {loadingAnalytics ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#7A5C3F' }}>Loading analytics...</div>
          ) : analytics ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total Users', value: analytics.overview.totalUsers, color: '#1D4ED8' },
                  { label: 'Approved Users', value: analytics.overview.approvedUsers, color: '#059669' },
                  { label: 'Active (7d)', value: analytics.overview.activeUsers7d, color: '#7C3AED' },
                  { label: 'New Users (30d)', value: analytics.overview.newUsers30d, color: '#D97706' },
                  { label: 'Total Questions', value: analytics.overview.totalQuestions, color: '#0891B2' },
                  { label: 'Responses (30d)', value: analytics.overview.responses30d, color: '#be185d' },
                  { label: 'Correct Rate (30d)', value: analytics.overview.correctRate30d + '%', color: analytics.overview.correctRate30d >= 70 ? '#059669' : '#D97706' },
                ].map(c => (
                  <div key={c.label} style={{ background: 'white', borderRadius: 12, border: '1.5px solid #E8D5C0', padding: '14px 16px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: c.color }}>{c.value}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7A5C3F', marginTop: 2 }}>{c.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #E8D5C0', padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>Daily Activity (last 30 days)</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E8D5C0' }}>
                        {['Date', 'Responses', 'Correct', 'Correct %', 'Active Users'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 800, color: '#7A5C3F' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...analytics.dailyActivity].reverse().map(d => {
                        const pct = d.responses > 0 ? Math.round((d.correct / d.responses) * 100) : 0
                        return (
                          <tr key={d.date} style={{ borderBottom: '1px solid #E8D5C0' }}>
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
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #E8D5C0', padding: 16 }}>
                  <div style={{ fontWeight: 800, marginBottom: 10 }}>Most Active Users (30d)</div>
                  {analytics.activeUsers.map((u, i) => {
                    const pct = u.responses > 0 ? Math.round((u.correct / u.responses) * 100) : 0
                    return (
                      <div key={u.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #E8D5C0' }}>
                        <span style={{ fontWeight: 800, color: '#7A5C3F', fontSize: '0.8rem', width: 18 }}>#{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || u.email || 'Unknown'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#7A5C3F' }}>{u.email}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{u.responses}</div>
                          <div style={{ fontSize: '0.72rem', color: pct >= 70 ? '#059669' : '#D97706', fontWeight: 700 }}>{pct}% correct</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #E8D5C0', padding: 16 }}>
                  <div style={{ fontWeight: 800, marginBottom: 10 }}>Top Token Users (7d)</div>
                  {analytics.topTokenUsers.map((u, i) => (
                    <div key={u.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #E8D5C0' }}>
                      <span style={{ fontWeight: 800, color: '#7A5C3F', fontSize: '0.8rem', width: 18 }}>#{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || u.email || 'Unknown'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#7A5C3F' }}>{u.email}</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>{(u.tokens || 0).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : <div style={{ color: '#7A5C3F' }}>No analytics data.</div>}
        </div>
      )}

      {/* Answer Review tab */}
      {adminView === 'review' && (
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>Answer Review</div>
          <div style={{ fontSize: '0.82rem', color: '#7A5C3F', marginBottom: 16 }}>Inspect every question a student has answered.</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            <select
              value={reviewUserId}
              onChange={e => { setReviewUserId(e.target.value); setReviewResponses(null) }}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', fontSize: '0.9rem', minWidth: 220 }}
            >
              <option value="">Select a student…</option>
              {safeUsers.filter(u => u.status === 'approved').map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>
              ))}
            </select>
            <button
              style={{ padding: '8px 16px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: 'pointer', opacity: (!reviewUserId || loadingReview) ? 0.6 : 1 }}
              disabled={!reviewUserId || loadingReview}
              onClick={() => loadReview(reviewUserId)}
            >{loadingReview ? 'Loading…' : 'Load Answers'}</button>
            {reviewResponses && (
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', 'correct', 'wrong'].map(f => (
                  <button key={f} onClick={() => setReviewFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid', borderColor: reviewFilter === f ? '#FF6B35' : '#E8D5C0', background: reviewFilter === f ? '#FF6B35' : 'white', color: reviewFilter === f ? 'white' : '#2D1B0E', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {loadingReview && <div style={{ padding: 40, textAlign: 'center', color: '#7A5C3F' }}>Loading answers...</div>}
          {reviewResponses && (() => {
            const labels = ['A', 'B', 'C', 'D', 'E']
            const filteredR = reviewFilter === 'correct' ? reviewResponses.filter(r => r.isCorrect) : reviewFilter === 'wrong' ? reviewResponses.filter(r => !r.isCorrect) : reviewResponses
            const total = reviewResponses.length
            const correct = reviewResponses.filter(r => r.isCorrect).length
            return (
              <>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[{ label: 'Total Answered', value: total, color: '#1D4ED8' }, { label: 'Correct', value: correct, color: '#059669' }, { label: 'Wrong', value: total - correct, color: '#DC2626' }, { label: 'Score %', value: total > 0 ? Math.round((correct / total) * 100) + '%' : '—', color: '#7C3AED' }].map(c => (
                    <div key={c.label} style={{ background: 'white', border: '1.5px solid #E8D5C0', borderRadius: 10, padding: '10px 16px', minWidth: 100, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: c.color }}>{c.value}</div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F' }}>{c.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredR.map((r, i) => {
                    const q = r.questions
                    if (!q) return null
                    return (
                      <div key={i} style={{ background: r.isCorrect ? '#F0FDF4' : '#FEF2F2', border: `1.5px solid ${r.isCorrect ? '#BBF7D0' : '#FECACA'}`, borderRadius: 12, padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: r.isCorrect ? '#DCFCE7' : '#FEE2E2', color: r.isCorrect ? '#166534' : '#991B1B' }}>{r.isCorrect ? '✓ Correct' : '✗ Wrong'}</span>
                          <span style={{ fontSize: '0.75rem', color: '#7A5C3F' }}>{new Date(r.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>{q.question}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          {(q.options || []).map((opt, idx) => (
                            <div key={idx} style={{ padding: '6px 10px', borderRadius: 8, fontSize: '0.82rem', background: idx === q.correct ? '#DCFCE7' : idx === r.selectedOption ? '#FEE2E2' : 'white', border: `1px solid ${idx === q.correct ? '#BBF7D0' : idx === r.selectedOption ? '#FECACA' : '#E8D5C0'}`, fontWeight: idx === q.correct || idx === r.selectedOption ? 700 : 400 }}>
                              {labels[idx]}. {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// ── ADMIN PAGE ─────────────────────────────────────────────────

export default function AdminPage() {
  const [session, setSession] = useState(null) // { idToken, user }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Restore session from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem('admin-session')
      if (stored) setSession(JSON.parse(stored))
    } catch {}
  }, [])

  // Init Google Identity Services
  useEffect(() => {
    function init() {
      if (window._adminGoogleInitDone) return
      window._adminGoogleInitDone = true
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleSignIn,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      })
      const btn = document.getElementById('admin-google-btn')
      if (btn) {
        window.google.accounts.id.renderButton(btn, {
          theme: 'outline', size: 'large', shape: 'rectangular', width: 280,
        })
      }
    }
    window.onGoogleLibraryLoad = init
    if (typeof window !== 'undefined' && window.google?.accounts) init()
  }, [session])

  async function handleGoogleSignIn(response) {
    setLoading(true)
    setError(null)
    try {
      const idToken = response.credential
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: idToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (!data.user?.is_admin) {
        setError('Access denied. This portal is for administrators only.')
        return
      }
      const s = { idToken, user: data.user }
      setSession(s)
      if (typeof window !== 'undefined') localStorage.setItem('admin-session', JSON.stringify(s))
    } catch (err) {
      setError('Sign-in failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSignOut() {
    if (typeof window !== 'undefined') {
      window.google?.accounts?.id?.disableAutoSelect()
      window._adminGoogleInitDone = false
      localStorage.removeItem('admin-session')
    }
    setSession(null)
    setError(null)
  }

  const bg = 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)'

  // Not signed in
  if (!session) {
    return (
      <>
        <script src="https://accounts.google.com/gsi/client" async defer />
        <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Nunito Sans, sans-serif' }}>
          <div style={{ background: 'white', borderRadius: 24, padding: '3rem 2.5rem', maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⚙️</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.6rem', color: '#1E1B4B', marginBottom: 4 }}>Admin Portal</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#FF6B35', marginBottom: 24 }}>Exam Booster</div>
            <p style={{ color: '#4B5563', fontSize: '0.9rem', marginBottom: 28, lineHeight: 1.6 }}>Sign in with your administrator Google account to access the admin panel.</p>
            {error && <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#991B1B', fontSize: '0.88rem', marginBottom: 20, fontWeight: 600 }}>{error}</div>}
            {loading ? (
              <div style={{ color: '#7A5C3F', fontWeight: 600 }}>Signing in...</div>
            ) : (
              <div id="admin-google-btn" style={{ display: 'flex', justifyContent: 'center' }} />
            )}
          </div>
        </div>
      </>
    )
  }

  // Signed in — show admin panel
  return (
    <>
      <script src="https://accounts.google.com/gsi/client" async defer />
      <div style={{ minHeight: '100vh', background: '#FFF8F0', fontFamily: 'Nunito Sans, sans-serif' }}>
        {/* Admin header */}
        <header style={{ background: '#1E1B4B', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.2rem', color: 'white' }}>
            ⚙️ Admin Portal <span style={{ color: '#A5B4FC', fontSize: '0.85rem', fontWeight: 600 }}>— Exam Booster</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#A5B4FC', fontSize: '0.85rem', fontWeight: 600 }}>{session.user.email}</span>
            <button
              onClick={handleSignOut}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: 8, padding: '6px 14px', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
            >Logout</button>
          </div>
        </header>
        <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1.5rem' }}>
          <AdminPanel idToken={session.idToken} onSignOut={handleSignOut} />
        </div>
      </div>
    </>
  )
}
