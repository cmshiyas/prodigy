'use client'

import { useState, useEffect, useCallback } from 'react'
import { ADMIN_EMAIL, EXAM_TYPES, EXAM_TOPICS, TIER_LABELS, EXAM_YEAR_LEVELS } from '@/lib/constants'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

// ── TOKEN LIMITS EDITOR ────────────────────────────────────────

// ── REFERRAL CONFIG EDITOR ─────────────────────────────────────

function ReferralConfigEditor({ idToken, onSignOut }) {
  const FIELDS = [
    { key: 'referral_gold_count',       label: 'Referrals for Gold',        type: 'number', hint: 'How many friends a user must invite to earn Gold' },
    { key: 'referral_platinum_count',   label: 'Referrals for Platinum',     type: 'number', hint: 'How many friends a user must invite to earn Platinum' },
    { key: 'referral_gold_benefit',     label: 'Gold benefit description',   type: 'text',   hint: 'Short text shown to users (e.g. "Free Gold access — permanently")' },
    { key: 'referral_platinum_benefit', label: 'Platinum benefit description',type: 'text',  hint: 'Short text shown to users (e.g. "Free Platinum access — permanently")' },
  ]
  const DEFAULTS = {
    referral_gold_count:       '3',
    referral_platinum_count:   '5',
    referral_gold_benefit:     'Free Gold access — permanently',
    referral_platinum_benefit: 'Free Platinum access — permanently',
  }

  const [values, setValues] = useState(null)
  const [saving, setSaving] = useState(null)
  const [saved, setSaved]   = useState(null)

  useEffect(() => {
    fetch('/api/admin?action=config', { headers: { Authorization: 'Bearer ' + idToken } })
      .then(r => r.json())
      .then(data => {
        if (!data?.config) return
        const map = {}
        data.config.forEach(({ key, value }) => { map[key] = value })
        const merged = {}
        FIELDS.forEach(f => { merged[f.key] = map[f.key] ?? DEFAULTS[f.key] })
        setValues(merged)
      })
  }, [idToken]) // eslint-disable-line

  const save = async (key) => {
    setSaving(key)
    try {
      const res = await fetch('/api/admin?action=config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ key, value: values[key] }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSaved(key); setTimeout(() => setSaved(null), 2000)
    } catch (err) { alert('Failed: ' + err.message) }
    finally { setSaving(null) }
  }

  if (!values) return <div style={{ padding: 24, color: '#64748b' }}>Loading referral config...</div>

  const goldCount     = parseInt(values.referral_gold_count)     || 3
  const platinumCount = parseInt(values.referral_platinum_count) || 5

  return (
    <div style={{ padding: '20px 24px', borderTop: '1.5px solid #E8D5C0' }}>
      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1rem', marginBottom: 4 }}>Referral Program Config</div>
      <div style={{ fontSize: '0.8rem', color: '#7A5C3F', marginBottom: 16 }}>Configure thresholds and benefit text shown to users on the website.</div>

      {/* Live preview */}
      <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 12, padding: '12px 16px', marginBottom: 18, fontSize: '0.85rem' }}>
        <div style={{ fontWeight: 800, color: '#166534', marginBottom: 8 }}>Preview (how it appears on site)</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#FEF3C7', color: '#F59E0B', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🥇</span>
            <div>
              <div style={{ fontWeight: 700, color: '#F59E0B' }}>Invite {goldCount} friends</div>
              <div style={{ color: '#6B7280', fontSize: '0.8rem' }}>{values.referral_gold_benefit}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#EDE9FE', color: '#7C3AED', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>💜</span>
            <div>
              <div style={{ fontWeight: 700, color: '#7C3AED' }}>Invite {platinumCount} friends</div>
              <div style={{ color: '#6B7280', fontSize: '0.8rem' }}>{values.referral_platinum_benefit}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {FIELDS.map(({ key, label, type, hint }) => (
          <div key={key} style={{ background: '#FFF3E6', borderRadius: 10, padding: '12px 16px', border: '1.5px solid #E8D5C0' }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: '0.75rem', color: '#7A5C3F', marginBottom: 8 }}>{hint}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type={type}
                value={values[key]}
                onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.9rem', background: 'white' }}
              />
              <button
                style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: 'pointer' }}
                onClick={() => save(key)}
                disabled={saving === key}
              >{saving === key ? '...' : saved === key ? '✓' : 'Save'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SUBSCRIPTION FEATURES EDITOR ───────────────────────────────

const SUB_TIERS = [
  { key: 'silver',   label: 'Silver',   color: '#94A3B8' },
  { key: 'gold',     label: 'Gold',     color: '#F59E0B' },
  { key: 'platinum', label: 'Platinum', color: '#8B5CF6' },
  { key: 'admin',    label: 'Admin',    color: '#EF4444' },
]
const SUB_FEATURES = [
  { key: 'analytics', label: 'Performance Analytics', hint: 'Show subtopic performance stats panel' },
  { key: 'history',   label: 'Attempt History',       hint: 'Show past quiz attempts list' },
  { key: 'all_exams', label: 'All Exam Types',         hint: 'Access to NAPLAN & Selective (if off, OC only)' },
]
const SUB_DEFAULTS = {
  question_limit_silver: '10', question_limit_gold: '40',
  question_limit_platinum: '999999', question_limit_admin: '999999',
  feature_analytics_silver: '0', feature_analytics_gold: '1', feature_analytics_platinum: '1', feature_analytics_admin: '1',
  feature_history_silver: '0',   feature_history_gold: '1',   feature_history_platinum: '1',   feature_history_admin: '1',
  feature_all_exams_silver: '0', feature_all_exams_gold: '1', feature_all_exams_platinum: '1', feature_all_exams_admin: '1',
}

function SubscriptionFeaturesEditor({ idToken }) {
  const [values, setValues] = useState(null)
  const [saving, setSaving] = useState(null)
  const [saved, setSaved]   = useState(null)
  const [savingAll, setSavingAll] = useState(false)
  const [savedAll, setSavedAll]   = useState(false)

  useEffect(() => {
    fetch('/api/admin?action=config', { headers: { Authorization: 'Bearer ' + idToken } })
      .then(r => r.json())
      .then(data => {
        if (!data?.config) return
        const map = {}
        data.config.forEach(({ key, value }) => { map[key] = value })
        const merged = {}
        Object.keys(SUB_DEFAULTS).forEach(k => { merged[k] = map[k] ?? SUB_DEFAULTS[k] })
        setValues(merged)
      })
  }, [idToken]) // eslint-disable-line

  const saveKey = async (key, val) => {
    const v = val ?? values[key]
    setSaving(key)
    try {
      const res = await fetch('/api/admin?action=config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ key, value: v }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSaved(key); setTimeout(() => setSaved(null), 2000)
    } catch (err) { alert('Failed: ' + err.message) }
    finally { setSaving(null) }
  }

  const toggleFeature = (key) => {
    const newVal = values[key] === '1' ? '0' : '1'
    setValues(v => ({ ...v, [key]: newVal }))
    saveKey(key, newVal)
  }

  const saveAll = async () => {
    if (!values) return
    setSavingAll(true)
    try {
      const results = await Promise.all(Object.keys(values).map(async key => {
        const res = await fetch('/api/admin?action=config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
          body: JSON.stringify({ key, value: values[key] }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(`Failed to save "${key}": ${err.error || res.status}`)
        }
        return key
      }))
      console.log('[saveAll] saved', results.length, 'keys:', results)
      setSavedAll(true); setTimeout(() => setSavedAll(false), 2000)
    } catch (err) { alert(err.message) }
    finally { setSavingAll(false) }
  }

  if (!values) return <div style={{ padding: 24, color: '#64748b' }}>Loading subscription config...</div>

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.05rem' }}>Subscription Plan Features</div>
        <button
          onClick={saveAll}
          disabled={savingAll}
          style={{ padding: '4px 14px', fontSize: '0.78rem', background: savedAll ? '#22C55E' : '#334155', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: 'pointer' }}
        >{savingAll ? 'Saving…' : savedAll ? '✓ Saved All' : 'Save All'}</button>
      </div>
      <div style={{ fontSize: '0.8rem', color: '#7A5C3F', marginBottom: 20 }}>Configure daily question limits and feature access per tier. Changes take effect immediately.</div>

      {/* Question Limits */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 10, color: '#2D1B0E' }}>Daily Question Limits</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {SUB_TIERS.map(({ key, label, color }) => {
            const cfgKey = `question_limit_${key}`
            return (
              <div key={key} style={{ background: '#FFF3E6', borderRadius: 10, padding: '12px 16px', border: '1.5px solid #E8D5C0' }}>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color, marginBottom: 8 }}>{label}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    value={values[cfgKey] || ''}
                    onChange={e => setValues(v => ({ ...v, [cfgKey]: e.target.value }))}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.9rem', background: 'white' }}
                  />
                  <button
                    onClick={() => saveKey(cfgKey)}
                    disabled={saving === cfgKey}
                    style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: 'pointer' }}
                  >{saving === cfgKey ? '…' : saved === cfgKey ? '✓' : 'Save'}</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Feature flags */}
      <div>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 10, color: '#2D1B0E' }}>Feature Access per Tier</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', background: '#FFF3E6', borderBottom: '2px solid #E8D5C0', fontFamily: 'Nunito', fontWeight: 900 }}>Feature</th>
                {SUB_TIERS.map(({ key, label, color }) => (
                  <th key={key} style={{ textAlign: 'center', padding: '8px 12px', background: '#FFF3E6', borderBottom: '2px solid #E8D5C0', fontFamily: 'Nunito', fontWeight: 900, color }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUB_FEATURES.map(({ key: fname, label, hint }) => (
                <tr key={fname} style={{ borderBottom: '1px solid #F0E4D4' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: '0.75rem', color: '#7A5C3F' }}>{hint}</div>
                  </td>
                  {SUB_TIERS.map(({ key: tier }) => {
                    const cfgKey = `feature_${fname}_${tier}`
                    const on = values[cfgKey] === '1'
                    const isSaving = saving === cfgKey
                    return (
                      <td key={tier} style={{ textAlign: 'center', padding: '10px 12px' }}>
                        <button
                          onClick={() => toggleFeature(cfgKey)}
                          disabled={isSaving}
                          style={{
                            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: on ? '#22C55E' : '#CBD5E1',
                            position: 'relative', transition: 'background 0.2s',
                            opacity: isSaving ? 0.6 : 1,
                          }}
                        >
                          <span style={{
                            position: 'absolute', top: 3, left: on ? 22 : 3,
                            width: 18, height: 18, borderRadius: '50%', background: 'white',
                            transition: 'left 0.2s', display: 'block',
                          }} />
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#7A5C3F', marginTop: 10 }}>Toggles auto-save on click.</div>
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
  const [uploadYearLevel, setUploadYearLevel] = useState('')
  const [uploadQuestionSource, setUploadQuestionSource] = useState('sample')
  const [uploadPaperYear, setUploadPaperYear] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadPdfFile, setUploadPdfFile] = useState(null)
  const [uploadPdfExamType, setUploadPdfExamType] = useState('OC')
  const [uploadPdfTopicId, setUploadPdfTopicId] = useState('')
  const [uploadPdfYearLevel, setUploadPdfYearLevel] = useState('')
  const [uploadPdfQuestionSource, setUploadPdfQuestionSource] = useState('sample')
  const [uploadPdfPaperYear, setUploadPdfPaperYear] = useState('')
  const [uploadPdfFormat, setUploadPdfFormat] = useState('standard')
  const [uploadPdfStatus, setUploadPdfStatus] = useState('')

  const [genExamType, setGenExamType] = useState('OC')
  const [genTopicId, setGenTopicId] = useState('')
  const [genSubtopic, setGenSubtopic] = useState('')
  const [genYearLevel, setGenYearLevel] = useState('')
  const [genQuestionSource, setGenQuestionSource] = useState('sample')
  const [genPaperYear, setGenPaperYear] = useState('')
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

  const deleteUser = async (userId, name) => {
    if (!confirm(`Permanently delete user "${name}"?\n\nThis will remove the account and all their data. This cannot be undone.`)) return
    try {
      const res = await fetch('/api/admin?action=deleteUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ userId }),
      })
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
        body: JSON.stringify({ examType: uploadExamType, yearLevel: uploadYearLevel, questions: questionData, questionSource: uploadQuestionSource, paperYear: uploadPaperYear }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      const errCount = data.errors?.length || 0
      setUploadStatus(`Uploaded ${data.inserted || 0} questions. ${errCount > 0 ? `${errCount} records failed.` : 'Done.'}`)
      setUploadFile(null)
      setUploadYearLevel('')
      setUploadQuestionSource('sample')
      setUploadPaperYear('')
      document.getElementById('question-upload-input').value = ''
      loadQuizBank()
    } catch (err) { setUploadStatus('Upload error: ' + err.message) }
  }

  const uploadPdf = async () => {
    if (!uploadPdfFile) { setUploadPdfStatus('Please select a PDF file first.'); return }
    if (uploadPdfFile.size > 4 * 1024 * 1024) { setUploadPdfStatus('PDF is too large (max 4 MB). Split the file and try again.'); return }
    setUploadPdfStatus('Sending PDF for extraction...')
    try {
      const formData = new FormData()
      formData.append('examType', uploadPdfExamType)
      if (uploadPdfTopicId) formData.append('topicId', uploadPdfTopicId)
      if (uploadPdfYearLevel) formData.append('yearLevel', uploadPdfYearLevel)
      formData.append('questionSource', uploadPdfQuestionSource)
      if (uploadPdfPaperYear) formData.append('paperYear', uploadPdfPaperYear)
      formData.append('format', uploadPdfFormat)
      formData.append('file', uploadPdfFile)
      const res = await fetch('/api/admin?action=uploadPdf', { method: 'POST', body: formData, headers: { Authorization: 'Bearer ' + idToken } })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error(`Server error (${res.status}): ${text.slice(0, 200)}`) }
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      const errorList = data.errors || []
      const topics = (data.topics || []).map(t => t.name).join(', ') || 'n/a'
      const errorDetails = errorList.length
        ? '\n\nErrors:\n' + errorList.map(e => `  Q${e.idx + 1}: ${e.error}`).join('\n')
        : ''
      const updatedPart = data.updated > 0 ? ` Updated (images backfilled): ${data.updated}.` : ''
      setUploadPdfStatus(`Extracted topics: ${topics}. Inserted: ${data.inserted || 0}.${updatedPart} Skipped: ${data.skipped || 0}. Errors: ${errorList.length}.${errorDetails}`)
      setUploadPdfFile(null)
      setUploadPdfYearLevel('')
      setUploadPdfQuestionSource('sample')
      setUploadPdfPaperYear('')
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
      const body = { examType: genExamType, topicId: genTopicId, yearLevel: genYearLevel, count, questionSource: genQuestionSource, paperYear: genPaperYear }
      if (genSubtopic) body.subtopic = genSubtopic
      const res = await fetch('/api/admin?action=generateQuestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      const errList = data.errors || []
      const errDetails = errList.length
        ? '\n\nFailed:\n' + errList.map(e => `  Q${e.idx + 1}: ${e.error}`).join('\n')
        : ''
      setGenStatus(`✓ Generated and saved ${data.generated} questions.${errList.length > 0 ? ` (${errList.length} failed)` : ''}${errDetails}`)
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
          {tabBtn('quizBank', 'Question Bank')}
          {tabBtn('questions', 'Questions')}
          {tabBtn('create', 'Create Question')}
          {tabBtn('analytics', 'Analytics')}
          {tabBtn('review', 'Answer Review')}
          {tabBtn('promos', 'Promo Codes')}
          {tabBtn('referral', 'Referral')}
          {tabBtn('referrals', 'Referral Details')}
          {tabBtn('feedback', 'Feedback')}
          {tabBtn('examDates', 'Exam Dates')}
          {tabBtn('subscription', 'Subscription')}
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
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 120px', gap: 12, padding: '14px 20px', background: '#FFF3E6', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7A5C3F' }}>
              <div>User</div><div>Email</div><div>Status / Tier</div><div>Actions</div>
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#7A5C3F', fontWeight: 600 }}>No users in this category.</div>
            ) : filtered.map(u => {
              const isAdmin = u.email === ADMIN_EMAIL
              const initials = (u.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 120px', gap: 12, padding: '14px 20px', borderBottom: '1px solid #E8D5C0', alignItems: 'center', fontSize: '0.88rem' }}>
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
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {!isAdmin && u.status !== 'approved' && <button onClick={() => updateUser(u.id, { status: 'approved' })} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: '#DCFCE7', color: '#166534', fontFamily: 'Nunito' }}>Approve</button>}
                    {!isAdmin && u.status !== 'rejected' && <button onClick={() => updateUser(u.id, { status: 'rejected' })} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: '#FEE2E2', color: '#991B1B', fontFamily: 'Nunito' }}>Reject</button>}
                    {!isAdmin && <button onClick={() => deleteUser(u.id, u.name || u.email)} style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #FECACA', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: '#FFF1F2', color: '#881337', fontFamily: 'Nunito' }}>Delete</button>}
                    {isAdmin && <span style={{ fontSize: '0.75rem', color: '#7A5C3F' }}>You</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Question Bank tab */}
      {adminView === 'quizBank' && (
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>Question Bank</div>
          <div style={{ fontSize: '0.82rem', color: '#7A5C3F', marginBottom: 20 }}>Upload PDF papers to extract and add questions to the bank.</div>

          {/* ── PDF Upload ── */}
          <div style={{ background: '#FFF8F3', border: '1.5px solid #E8D5C0', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.95rem', color: '#2D1B0E', marginBottom: 16 }}>Upload PDF</div>

            {/* Column headings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 0.8fr 1.2fr 1.6fr 1fr', gap: 12, marginBottom: 6 }}>
              {['Exam Type', 'Section', 'Year', 'Type of Test', 'Test Title', 'Format'].map(h => (
                <div key={h} style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7A5C3F', letterSpacing: '0.02em' }}>{h}</div>
              ))}
            </div>

            {/* Input row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 0.8fr 1.2fr 1.6fr 1fr', gap: 12, marginBottom: 14 }}>
              <select
                value={uploadPdfExamType}
                onChange={e => { setUploadPdfExamType(e.target.value); setUploadPdfTopicId(''); setUploadPdfYearLevel('') }}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', fontFamily: 'Nunito', fontSize: '0.88rem', width: '100%' }}
              >
                {EXAM_TYPES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>

              <select
                value={uploadPdfTopicId}
                onChange={e => setUploadPdfTopicId(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', fontFamily: 'Nunito', fontSize: '0.88rem', width: '100%' }}
              >
                <option value="">— Select section —</option>
                {(EXAM_TOPICS[uploadPdfExamType] || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <select
                value={uploadPdfYearLevel}
                onChange={e => setUploadPdfYearLevel(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', fontFamily: 'Nunito', fontSize: '0.88rem', width: '100%' }}
              >
                <option value="">—</option>
                {(EXAM_YEAR_LEVELS[uploadPdfExamType] || []).map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
              </select>

              <select
                value={uploadPdfQuestionSource}
                onChange={e => setUploadPdfQuestionSource(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', fontFamily: 'Nunito', fontSize: '0.88rem', width: '100%' }}
              >
                <option value="sample">Practice Test</option>
                <option value="past_paper">Past Year</option>
              </select>

              <input
                value={uploadPdfPaperYear}
                onChange={e => setUploadPdfPaperYear(e.target.value)}
                placeholder="e.g. 2024 Term 2"
                style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', fontFamily: 'Nunito', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box' }}
              />

              <select
                value={uploadPdfFormat}
                onChange={e => setUploadPdfFormat(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', fontFamily: 'Nunito', fontSize: '0.88rem', width: '100%' }}
              >
                <option value="standard">Standard</option>
                <option value="reading">Reading</option>
              </select>
            </div>

            {/* File upload row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                id="pdf-upload-input"
                type="file"
                accept="application/pdf"
                onChange={e => setUploadPdfFile(e.target.files?.[0] || null)}
                style={{ flex: 1, minWidth: 0, padding: '7px 8px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', fontFamily: 'Nunito', fontSize: '0.85rem' }}
              />
              <button
                onClick={uploadPdf}
                style={{ padding: '8px 20px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >Upload PDF</button>
            </div>

            {uploadPdfStatus && (
              <div style={{ marginTop: 10, fontSize: '0.82rem', whiteSpace: 'pre-wrap', color: (uploadPdfStatus.startsWith('PDF upload failed') || uploadPdfStatus.includes('\n\nErrors:')) ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                {uploadPdfStatus}
              </div>
            )}
          </div>

          {/* ── AI Question Generator ── */}
          <div style={{ background: '#F5F3FF', border: '1.5px solid #C4B5FD', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.95rem', color: '#5B21B6', marginBottom: 4 }}>AI Question Generator</div>
            <div style={{ fontSize: '0.8rem', color: '#7C3AED', marginBottom: 14 }}>Generate questions using Claude AI and add them directly to the question bank.</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1.4fr auto auto', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7C3AED', marginBottom: 5 }}>Exam Type</div>
                <select
                  value={genExamType}
                  onChange={e => { setGenExamType(e.target.value); setGenTopicId(''); setGenSubtopic(''); setGenYearLevel('') }}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #C4B5FD', background: 'white', fontFamily: 'Nunito', fontSize: '0.88rem', width: '100%' }}
                >
                  {EXAM_TYPES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7C3AED', marginBottom: 5 }}>Section</div>
                <select
                  value={genTopicId}
                  onChange={e => { setGenTopicId(e.target.value); setGenSubtopic('') }}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #C4B5FD', background: 'white', fontFamily: 'Nunito', fontSize: '0.88rem', width: '100%' }}
                >
                  <option value="">— Select section —</option>
                  {(EXAM_TOPICS[genExamType] || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7C3AED', marginBottom: 5 }}>Year</div>
                <select
                  value={genYearLevel}
                  onChange={e => setGenYearLevel(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #C4B5FD', background: 'white', fontFamily: 'Nunito', fontSize: '0.88rem', width: '100%' }}
                >
                  <option value="">All years</option>
                  {(EXAM_YEAR_LEVELS[genExamType] || []).map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7C3AED', marginBottom: 5 }}>Subtopic (optional)</div>
                <select
                  value={genSubtopic}
                  onChange={e => setGenSubtopic(e.target.value)}
                  disabled={!genTopicId}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #C4B5FD', background: 'white', fontFamily: 'Nunito', fontSize: '0.88rem', width: '100%', opacity: genTopicId ? 1 : 0.5 }}
                >
                  <option value="">All subtopics</option>
                  {(EXAM_TOPICS[genExamType] || []).find(t => t.id === genTopicId)?.subtopics?.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7C3AED', marginBottom: 5 }}>Type of Test</div>
                <select
                  value={genQuestionSource}
                  onChange={e => setGenQuestionSource(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #C4B5FD', background: 'white', fontFamily: 'Nunito', fontSize: '0.88rem', width: '100%' }}
                >
                  <option value="sample">Practice Test</option>
                  <option value="past_paper">Past Year</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7C3AED', marginBottom: 5 }}>Test Title</div>
                <input
                  type="text"
                  value={genPaperYear}
                  onChange={e => setGenPaperYear(e.target.value)}
                  placeholder="e.g. 2024 Term 2"
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #C4B5FD', background: 'white', fontFamily: 'Nunito', fontSize: '0.88rem', width: '100%' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7C3AED', marginBottom: 5 }}>Count</div>
                <input
                  type="number" min={1} max={50} value={genCount}
                  onChange={e => setGenCount(e.target.value)}
                  style={{ width: 64, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #C4B5FD', background: 'white', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.88rem' }}
                />
              </div>
              <div style={{ paddingTop: 20 }}>
                <button
                  onClick={generateQuestions}
                  disabled={genLoading || !genTopicId}
                  style={{ padding: '8px 16px', background: genLoading || !genTopicId ? '#C4B5FD' : '#7C3AED', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: genLoading || !genTopicId ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  {genLoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>

            {genStatus && (
              <div style={{ marginTop: 10, fontSize: '0.82rem', whiteSpace: 'pre-wrap', color: genStatus.startsWith('Error') || genStatus.includes('\n\nFailed:') ? '#DC2626' : genStatus.startsWith('✓') ? '#059669' : '#5B21B6', fontWeight: 600 }}>
                {genStatus}
              </div>
            )}
          </div>

          {/* ── JSON Upload (secondary) ── */}
          <details style={{ marginBottom: 20 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', color: '#7A5C3F', padding: '10px 14px', background: '#FFF8F3', border: '1.5px solid #E8D5C0', borderRadius: 8, listStyle: 'none', userSelect: 'none' }}>
              ▸ Bulk upload via JSON
            </summary>
            <div style={{ padding: '14px 14px 10px', border: '1.5px solid #E8D5C0', borderTop: 'none', borderRadius: '0 0 8px 8px', background: 'white' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                <select value={uploadExamType} onChange={e => { setUploadExamType(e.target.value); setUploadYearLevel('') }} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', fontFamily: 'Nunito' }}>
                  {EXAM_TYPES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
                <select value={uploadYearLevel} onChange={e => setUploadYearLevel(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', fontFamily: 'Nunito' }}>
                  <option value="">All year levels</option>
                  {(EXAM_YEAR_LEVELS[uploadExamType] || []).map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                </select>
                <select value={uploadQuestionSource} onChange={e => { setUploadQuestionSource(e.target.value); setUploadPaperYear('') }} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', fontFamily: 'Nunito' }}>
                  <option value="sample">Practice Test</option>
                  <option value="past_paper">Past Year Paper</option>
                </select>
                <input value={uploadPaperYear} onChange={e => setUploadPaperYear(e.target.value)} placeholder={uploadQuestionSource === 'past_paper' ? 'Year (e.g. 2023)' : 'Test number'} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', width: 140, fontFamily: 'Nunito' }} />
                <input id="question-upload-input" type="file" accept="application/json" onChange={e => setUploadFile(e.target.files?.[0] || null)} style={{ padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white' }} />
                <button style={{ padding: '7px 12px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: 'pointer' }} onClick={uploadQuestions}>Upload</button>
              </div>
              {uploadStatus && <div style={{ fontSize: '0.8rem', color: uploadStatus.startsWith('Upload error') ? '#EF4444' : '#10B981' }}>{uploadStatus}</div>}
            </div>
          </details>

          {/* ── Overview Stats ── */}
          <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1rem', marginBottom: 12, color: '#2D1B0E' }}>Overview</div>
          {loadingQuizBank ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#7A5C3F' }}>Loading...</div>
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
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7A5C3F', marginTop: 2 }}>{e.examType}</div>
                  </div>
                ))}
                {(quizBank.yearBreakdown || []).map(yb => (
                  <div key={`${yb.examType}-${yb.yearLevel}`} style={{ background: 'white', borderRadius: 12, border: '1.5px solid #E8D5C0', padding: '14px 20px', minWidth: 110, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669' }}>{yb.count}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginTop: 2 }}>{yb.examType} · {yb.yearLevel === 'unset' ? 'No year' : `Yr ${yb.yearLevel}`}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #E8D5C0', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontWeight: 800 }}>Questions per Topic</div>
                  <select value={quizBankTopicFilter} onChange={e => setQuizBankTopicFilter(e.target.value)} style={{ padding: '5px 8px', borderRadius: 7, border: '1.5px solid #E8D5C0', background: 'white', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'Nunito' }}>
                    <option value="all">All Exams</option>
                    {(quizBank.examBreakdown || []).map(e => <option key={e.examType} value={e.examType}>{e.examType}</option>)}
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
            </>
          ) : <div style={{ color: '#7A5C3F' }}>No data available.</div>}
        </div>
      )}

      {/* Questions tab */}
      {adminView === 'questions' && (
        <QuestionBankReview idToken={idToken} onSignOut={onSignOut} />
      )}

      {adminView === 'create' && (
        <CreateQuestion idToken={idToken} onSignOut={onSignOut} />
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

      {/* Promo Codes tab */}
      {adminView === 'promos' && (
        <PromoManager idToken={idToken} onSignOut={onSignOut} />
      )}

      {/* Referral tab */}
      {adminView === 'referral' && (
        <ReferralConfigEditor idToken={idToken} onSignOut={onSignOut} />
      )}

      {/* Referral Details tab */}
      {adminView === 'referrals' && (
        <ReferralDetailsViewer idToken={idToken} />
      )}

      {/* Feedback tab */}
      {adminView === 'feedback' && (
        <FeedbackViewer idToken={idToken} />
      )}

      {/* Exam Dates tab */}
      {adminView === 'examDates' && (
        <ExamDatesManager idToken={idToken} />
      )}

      {/* Subscription tab */}
      {adminView === 'subscription' && (
        <SubscriptionFeaturesEditor idToken={idToken} />
      )}
    </div>
  )
}

// ── REFERRAL DETAILS VIEWER ────────────────────────────────────

function ReferralDetailsViewer({ idToken }) {
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const pageSize = 50

  const load = async (p = 1, s = search) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ action: 'referrals', page: p, ...(s ? { search: s } : {}) })
      const res = await fetch(`/api/admin?${params}`, { headers: { Authorization: 'Bearer ' + idToken } })
      const json = await res.json()
      setData(json)
      setPage(p)
    } catch { setData({ referrals: [], total: 0, topReferrers: [] }) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, []) // eslint-disable-line

  const handleSearch = () => { setSearch(searchInput); load(1, searchInput) }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1
  const TIER_COLOUR = { silver: '#64748b', gold: '#F59E0B', platinum: '#7C3AED', admin: '#EF4444' }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>Referral Details</div>
      <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
        {data ? `${data.total} referred user${data.total !== 1 ? 's' : ''} total` : '…'}
      </div>

      {/* Top Referrers */}
      {data?.topReferrers?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Top Referrers</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.topReferrers.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' }}
                onClick={() => { setSearchInput(r.email); setSearch(r.email); load(1, r.email) }}>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem' }}>{r.name || r.email}</span>
                <span style={{ background: '#6366f1', color: 'white', borderRadius: 20, padding: '2px 9px', fontSize: '0.78rem', fontWeight: 700 }}>{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Filter by referred user name or email…"
          style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.88rem', fontFamily: 'Nunito', outline: 'none' }}
        />
        <button onClick={handleSearch} style={{ padding: '8px 18px', background: '#1E1B4B', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 700, cursor: 'pointer' }}>Search</button>
        {search && <button onClick={() => { setSearchInput(''); setSearch(''); load(1, '') }} style={{ padding: '8px 14px', background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 700, cursor: 'pointer' }}>Clear</button>}
      </div>

      {loading ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Loading…</div>
      ) : !data?.referrals?.length ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>No referrals found.</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Referred User', 'Email', 'Tier', 'Referred By', 'Referrer Email', 'Joined'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontFamily: 'Nunito', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{r.name || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>{r.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: TIER_COLOUR[r.tier] + '22', color: TIER_COLOUR[r.tier], borderRadius: 20, padding: '2px 10px', fontWeight: 700, fontSize: '0.78rem', textTransform: 'capitalize' }}>{r.tier}</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{r.referrer?.name || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>{r.referrer?.email || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
              <button onClick={() => load(page - 1)} disabled={page <= 1}
                style={{ padding: '6px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontFamily: 'Nunito', fontWeight: 700 }}>← Prev</button>
              <span style={{ padding: '6px 12px', color: '#64748b', fontSize: '0.88rem' }}>{page} / {totalPages}</span>
              <button onClick={() => load(page + 1)} disabled={page >= totalPages}
                style={{ padding: '6px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontFamily: 'Nunito', fontWeight: 700 }}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── FEEDBACK VIEWER ────────────────────────────────────────────

function FeedbackViewer({ idToken }) {
  const [feedbacks, setFeedbacks] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const pageSize = 30

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin?action=feedbacks&page=${p}`, {
        headers: { Authorization: 'Bearer ' + idToken },
      })
      const data = await res.json()
      setFeedbacks(data.feedbacks || [])
      setTotal(data.total || 0)
      setPage(p)
    } catch { setFeedbacks([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, []) // eslint-disable-line

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>
        Beta Feedback
      </div>
      <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
        {total} submission{total !== 1 ? 's' : ''} received
      </div>

      {loading ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Loading…</div>
      ) : feedbacks.length === 0 ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>No feedback yet.</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {feedbacks.map(fb => (
              <div key={fb.id} style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                      {fb.user_name || 'Anonymous'}
                    </span>
                    {fb.user_email && (
                      <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: 8 }}>{fb.user_email}</span>
                    )}
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {new Date(fb.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ color: '#334155', fontSize: '0.92rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  {fb.message}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
              <button
                onClick={() => load(page - 1)} disabled={page <= 1}
                style={{ padding: '6px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontFamily: 'Nunito', fontWeight: 700 }}
              >← Prev</button>
              <span style={{ padding: '6px 12px', color: '#64748b', fontSize: '0.88rem' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => load(page + 1)} disabled={page >= totalPages}
                style={{ padding: '6px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontFamily: 'Nunito', fontWeight: 700 }}
              >Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── PROMO MANAGER ──────────────────────────────────────────────

function PromoManager({ idToken, onSignOut }) {
  const [promos, setPromos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ code: '', tier: 'gold', duration_days: '', max_uses: '', expires_at: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const loadPromos = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin?action=promos', { headers: { Authorization: 'Bearer ' + idToken } })
      if (res.status === 403) { const e = await res.json(); if (e.error?.includes('Not')) { onSignOut(); return } }
      const data = await res.json()
      setPromos(data.promos || [])
    } catch (err) { alert('Failed to load promos: ' + err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadPromos() }, [idToken])

  const createPromo = async () => {
    if (!form.code.trim() || !form.tier) { setCreateError('Code and tier are required'); return }
    setCreating(true); setCreateError('')
    try {
      const res = await fetch('/api/admin?action=createPromo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({
          code: form.code.trim(),
          tier: form.tier,
          duration_days: form.duration_days ? parseInt(form.duration_days) : null,
          max_uses: form.max_uses ? parseInt(form.max_uses) : null,
          expires_at: form.expires_at || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setForm({ code: '', tier: 'gold', duration_days: '', max_uses: '', expires_at: '' })
      await loadPromos()
    } catch (err) { setCreateError(err.message) }
    finally { setCreating(false) }
  }

  const startEdit = (p) => {
    setEditingId(p.id)
    setEditError('')
    setEditForm({
      code: p.code,
      tier: p.tier,
      duration_days: p.duration_days ?? '',
      max_uses: p.max_uses ?? '',
      expires_at: p.expires_at ? p.expires_at.split('T')[0] : '',
      is_active: p.is_active,
    })
  }

  const cancelEdit = () => { setEditingId(null); setEditError('') }

  const saveEdit = async () => {
    if (!editForm.code.trim() || !editForm.tier) { setEditError('Code and tier are required'); return }
    setSaving(true); setEditError('')
    try {
      const res = await fetch('/api/admin?action=updatePromo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({
          promoId: editingId,
          code: editForm.code.trim(),
          tier: editForm.tier,
          duration_days: editForm.duration_days ? parseInt(editForm.duration_days) : null,
          max_uses: editForm.max_uses ? parseInt(editForm.max_uses) : null,
          expires_at: editForm.expires_at || null,
          is_active: editForm.is_active,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditingId(null)
      await loadPromos()
    } catch (err) { setEditError(err.message) }
    finally { setSaving(false) }
  }

  const togglePromo = async (promoId, isActive) => {
    try {
      const res = await fetch('/api/admin?action=togglePromo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ promoId, isActive }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await loadPromos()
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const deletePromo = async (promoId, code) => {
    if (!confirm(`Delete promo code "${code}"? This cannot be undone.`)) return
    try {
      const res = await fetch('/api/admin?action=deletePromo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ promoId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await loadPromos()
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const fieldStyle = { width: '100%', padding: '6px 9px', borderRadius: 7, border: '1.5px solid #C4B5FD', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.85rem', boxSizing: 'border-box', background: 'white' }

  const inp = (label, key, type = 'text', placeholder = '') => (
    <div style={{ flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 4 }}>{label}</div>
      <input
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.88rem', boxSizing: 'border-box' }}
      />
    </div>
  )

  const tierColors = { gold: '#F59E0B', platinum: '#8B5CF6' }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1rem', marginBottom: 4 }}>Promo Codes</div>
      <div style={{ fontSize: '0.8rem', color: '#7A5C3F', marginBottom: 20 }}>Create and manage promo codes that users can redeem to upgrade their plan.</div>

      {/* Create form */}
      <div style={{ background: '#FFF3E6', borderRadius: 12, padding: '16px 20px', border: '1.5px solid #E8D5C0', marginBottom: 24 }}>
        <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.9rem', marginBottom: 12, color: '#2D1B0E' }}>Create New Code</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          {inp('Code *', 'code', 'text', 'e.g. GOLD30')}
          <div style={{ flex: 1, minWidth: 100 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 4 }}>Tier *</div>
            <select
              value={form.tier}
              onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.88rem', background: 'white' }}
            >
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>
          {inp('Duration (days)', 'duration_days', 'number', 'blank = forever')}
          {inp('Max Uses', 'max_uses', 'number', 'blank = unlimited')}
          {inp('Expires At', 'expires_at', 'date', '')}
        </div>
        {createError && <div style={{ color: '#991B1B', fontSize: '0.83rem', fontWeight: 700, marginBottom: 8 }}>{createError}</div>}
        <button
          onClick={createPromo}
          disabled={creating}
          style={{ background: '#FF6B35', color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.88rem', cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}
        >{creating ? 'Creating...' : 'Create Code'}</button>
      </div>

      {/* Promo list */}
      {loading ? (
        <div style={{ color: '#7A5C3F', padding: '20px 0' }}>Loading...</div>
      ) : !promos || promos.length === 0 ? (
        <div style={{ color: '#94A3B8', fontSize: '0.9rem', padding: '20px 0' }}>No promo codes yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {promos.map(p => {
            if (editingId === p.id) {
              // ── Inline edit row ──
              return (
                <div key={p.id} style={{ background: '#F5F3FF', border: '1.5px solid #C4B5FD', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.85rem', color: '#5B21B6', marginBottom: 10 }}>Editing: {p.code}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 3 }}>Code *</div>
                      <input value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} style={fieldStyle} />
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 3 }}>Tier *</div>
                      <select value={editForm.tier} onChange={e => setEditForm(f => ({ ...f, tier: e.target.value }))} style={fieldStyle}>
                        <option value="gold">Gold</option>
                        <option value="platinum">Platinum</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 3 }}>Duration (days)</div>
                      <input type="number" placeholder="blank = forever" value={editForm.duration_days} onChange={e => setEditForm(f => ({ ...f, duration_days: e.target.value }))} style={fieldStyle} />
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 3 }}>Max Uses</div>
                      <input type="number" placeholder="blank = unlimited" value={editForm.max_uses} onChange={e => setEditForm(f => ({ ...f, max_uses: e.target.value }))} style={fieldStyle} />
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 3 }}>Expires At</div>
                      <input type="date" value={editForm.expires_at} onChange={e => setEditForm(f => ({ ...f, expires_at: e.target.value }))} style={fieldStyle} />
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 3 }}>Status</div>
                      <select value={editForm.is_active ? 'true' : 'false'} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.value === 'true' }))} style={fieldStyle}>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>
                  {editError && <div style={{ color: '#991B1B', fontSize: '0.82rem', fontWeight: 700, marginBottom: 8 }}>{editError}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveEdit} disabled={saving} style={{ padding: '6px 18px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: 7, fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={cancelEdit} style={{ padding: '6px 16px', background: 'white', color: '#5B21B6', border: '1.5px solid #C4B5FD', borderRadius: 7, fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )
            }

            // ── Normal row ──
            return (
              <div key={p.id} style={{ background: p.is_active ? 'white' : '#F8F8F8', border: `1.5px solid ${p.is_active ? '#E8D5C0' : '#D1D5DB'}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', opacity: p.is_active ? 1 : 0.65 }}>
                <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.06em', color: '#2D1B0E', minWidth: 110 }}>{p.code}</div>
                <span style={{ padding: '2px 10px', borderRadius: 20, background: p.tier === 'platinum' ? '#EDE9FE' : '#FEF3C7', color: tierColors[p.tier] || '#555', fontSize: '0.8rem', fontWeight: 800 }}>{p.tier}</span>
                <div style={{ fontSize: '0.8rem', color: '#7A5C3F', flex: 1 }}>
                  {p.duration_days ? `${p.duration_days}d` : 'Permanent'} · {p.max_uses ? `${p.uses_count}/${p.max_uses} uses` : `${p.uses_count} uses`}
                  {p.expires_at && ` · Exp ${new Date(p.expires_at).toLocaleDateString('en-AU')}`}
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: p.is_active ? '#DCFCE7' : '#FEE2E2', color: p.is_active ? '#166534' : '#991B1B' }}>{p.is_active ? 'Active' : 'Inactive'}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => startEdit(p)}
                    style={{ padding: '4px 12px', fontSize: '0.78rem', borderRadius: 6, border: '1.5px solid #C4B5FD', background: '#F5F3FF', fontFamily: 'Nunito', fontWeight: 700, cursor: 'pointer', color: '#5B21B6' }}
                  >Edit</button>
                  <button
                    onClick={() => togglePromo(p.id, !p.is_active)}
                    style={{ padding: '4px 12px', fontSize: '0.78rem', borderRadius: 6, border: '1.5px solid #E8D5C0', background: 'white', fontFamily: 'Nunito', fontWeight: 700, cursor: 'pointer', color: '#2D1B0E' }}
                  >{p.is_active ? 'Deactivate' : 'Activate'}</button>
                  <button
                    onClick={() => deletePromo(p.id, p.code)}
                    style={{ padding: '4px 12px', fontSize: '0.78rem', borderRadius: 6, border: '1.5px solid #FECACA', background: '#FEF2F2', fontFamily: 'Nunito', fontWeight: 700, cursor: 'pointer', color: '#991B1B' }}
                  >Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── CREATE QUESTION ────────────────────────────────────────────

function CreateQuestion({ idToken, onSignOut }) {
  const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E']
  const blankForm = () => ({
    examType: 'OC',
    topicId: '',
    yearLevel: '',
    subtopic: '',
    questionSource: 'sample',
    paperYear: '',
    format: 'standard',
    difficulty: 'medium',
    question: '',
    passage: '',
    visual: '',
    options: ['', '', '', ''],
    correct: 0,
    explanation: '',
    image_urls: [],
  })

  const [form, setForm] = useState(blankForm())
  const [pendingImageFiles, setPendingImageFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null) // { type: 'success'|'error', msg }
  const [showPreview, setShowPreview] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setOption = (i, val) => setForm(f => { const o = [...f.options]; o[i] = val; return { ...f, options: o } })
  const addOption = () => { if (form.options.length < 5) setForm(f => ({ ...f, options: [...f.options, ''] })) }
  const removeOption = (i) => setForm(f => {
    const o = f.options.filter((_, j) => j !== i)
    return { ...f, options: o, correct: f.correct >= o.length ? 0 : f.correct === i ? 0 : f.correct > i ? f.correct - 1 : f.correct }
  })

  const topicList = EXAM_TOPICS[form.examType] || []
  const yearLevels = EXAM_YEAR_LEVELS[form.examType] || []
  const subtopicSuggestions = topicList.find(t => t.id === form.topicId)?.subtopics || []

  const uploadImages = async () => {
    const urls = []
    for (const file of pendingImageFiles) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin?action=uploadImage', { method: 'POST', body: fd, headers: { Authorization: 'Bearer ' + idToken } })
      if (res.status === 403) { const e = await res.json(); if (e.error?.includes('Not')) { onSignOut(); return [] } }
      const data = await res.json()
      if (data.url) urls.push(data.url)
    }
    return urls
  }

  const handleSubmit = async () => {
    if (!form.topicId) { setStatus({ type: 'error', msg: 'Please select a Section.' }); return }
    if (!form.question.trim()) { setStatus({ type: 'error', msg: 'Question text is required.' }); return }
    if (form.options.some(o => !o.trim())) { setStatus({ type: 'error', msg: 'All options must be filled in.' }); return }
    if (!form.explanation.trim()) { setStatus({ type: 'error', msg: 'Explanation is required.' }); return }
    if (form.format === 'reading' && !form.passage.trim()) { setStatus({ type: 'error', msg: 'Passage is required for Reading format.' }); return }
    setSaving(true)
    setStatus(null)
    try {
      const newUrls = await uploadImages()
      const allUrls = [...form.image_urls, ...newUrls]
      const res = await fetch('/api/admin?action=createQuestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({
          examType: form.examType,
          topicId: form.topicId,
          yearLevel: form.yearLevel || null,
          subtopic: form.subtopic || null,
          questionSource: form.questionSource,
          paperYear: form.paperYear || null,
          difficulty: form.difficulty,
          question: form.question.trim(),
          passage: form.format === 'reading' ? form.passage.trim() : null,
          visual: form.visual.trim() || null,
          options: form.options,
          correct: form.correct,
          explanation: form.explanation.trim(),
          image_urls: allUrls,
        }),
      })
      if (res.status === 403) { const e = await res.json(); if (e.error?.includes('Not')) { onSignOut(); return } }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create question')
      setStatus({ type: 'success', msg: 'Question created successfully!' })
      setForm(blankForm())
      setPendingImageFiles([])
      setShowPreview(false)
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setSaving(false)
    }
  }

  const inpStyle = { padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', fontFamily: 'Nunito', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box', background: 'white' }
  const labelStyle = { fontSize: '0.75rem', fontWeight: 800, color: '#7A5C3F', letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }
  const sectionStyle = { background: '#FFF8F3', border: '1.5px solid #E8D5C0', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }

  const diffColor = { easy: '#059669', medium: '#D97706', hard: '#DC2626' }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>Create Question</div>
      <div style={{ fontSize: '0.82rem', color: '#7A5C3F', marginBottom: 20 }}>Manually author a question for any exam type. All fields marked * are required.</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>

        {/* ── LEFT COLUMN ── */}
        <div>

          {/* Meta */}
          <div style={sectionStyle}>
            <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#2D1B0E', marginBottom: 12 }}>Question Settings</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Exam Type *</label>
                <select value={form.examType} onChange={e => { set('examType', e.target.value); set('topicId', ''); set('yearLevel', '') }} style={inpStyle}>
                  {EXAM_TYPES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Section *</label>
                <select value={form.topicId} onChange={e => { set('topicId', e.target.value); set('subtopic', '') }} style={{ ...inpStyle, borderColor: !form.topicId ? '#FCA5A5' : '#E8D5C0' }}>
                  <option value="">— Select —</option>
                  {topicList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Year Level</label>
                <select value={form.yearLevel} onChange={e => set('yearLevel', e.target.value)} style={inpStyle}>
                  <option value="">— Any —</option>
                  {yearLevels.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Difficulty *</label>
                <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)} style={{ ...inpStyle, color: diffColor[form.difficulty], fontWeight: 700 }}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Type of Test</label>
                <select value={form.questionSource} onChange={e => { set('questionSource', e.target.value); set('paperYear', '') }} style={inpStyle}>
                  <option value="sample">Practice Test</option>
                  <option value="past_paper">Past Year Paper</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>{form.questionSource === 'past_paper' ? 'Year' : 'Test Title'}</label>
                <input
                  value={form.paperYear}
                  onChange={e => set('paperYear', e.target.value)}
                  placeholder={form.questionSource === 'past_paper' ? 'e.g. 2023' : 'e.g. Practice Test 1'}
                  style={inpStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Subtopic</label>
                <input
                  list="subtopic-suggestions"
                  value={form.subtopic}
                  onChange={e => set('subtopic', e.target.value)}
                  placeholder="e.g. Fractions"
                  style={inpStyle}
                />
                <datalist id="subtopic-suggestions">
                  {subtopicSuggestions.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div>
                <label style={labelStyle}>Format</label>
                <select value={form.format} onChange={e => set('format', e.target.value)} style={inpStyle}>
                  <option value="standard">Standard</option>
                  <option value="reading">Reading (with passage)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Passage (Reading only) */}
          {form.format === 'reading' && (
            <div style={sectionStyle}>
              <label style={labelStyle}>Reading Passage *</label>
              <textarea
                value={form.passage}
                onChange={e => set('passage', e.target.value)}
                rows={8}
                placeholder="Paste the full reading passage here…"
                style={{ ...inpStyle, resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>
          )}

          {/* Question */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Question *</label>
            <textarea
              value={form.question}
              onChange={e => set('question', e.target.value)}
              rows={4}
              placeholder="Enter the question text…"
              style={{ ...inpStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>Visual / Text Table <span style={{ fontWeight: 500, textTransform: 'none' }}>(optional — use for diagrams described in text)</span></label>
              <textarea
                value={form.visual}
                onChange={e => set('visual', e.target.value)}
                rows={3}
                placeholder="e.g. a plain-text table or ASCII diagram"
                style={{ ...inpStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {/* Images */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Images <span style={{ fontWeight: 500, textTransform: 'none' }}>(optional)</span></label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={e => setPendingImageFiles(prev => [...prev, ...Array.from(e.target.files)])}
              style={{ fontSize: '0.82rem', fontFamily: 'Nunito' }}
            />
            {pendingImageFiles.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {pendingImageFiles.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 6, padding: '3px 8px', fontSize: '0.78rem' }}>
                    <span style={{ color: '#0369A1', fontWeight: 600 }}>{f.name}</span>
                    <button onClick={() => setPendingImageFiles(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.9rem', padding: 0, lineHeight: 1 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div>

          {/* Options */}
          <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label style={{ ...labelStyle, margin: 0 }}>Answer Options * <span style={{ fontWeight: 500, textTransform: 'none' }}>— click the letter to mark as correct</span></label>
              {form.options.length < 5 && (
                <button onClick={addOption} style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6, border: '1.5px solid #BBF7D0', background: '#F0FDF4', color: '#166534', cursor: 'pointer', fontFamily: 'Nunito' }}>+ Add Option E</button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => set('correct', i)}
                    title="Mark as correct"
                    style={{
                      width: 30, height: 30, borderRadius: '50%', border: '2px solid',
                      borderColor: form.correct === i ? '#059669' : '#E8D5C0',
                      background: form.correct === i ? '#059669' : 'white',
                      color: form.correct === i ? 'white' : '#7A5C3F',
                      fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >{OPTION_LABELS[i]}</button>
                  <input
                    value={opt}
                    onChange={e => setOption(i, e.target.value)}
                    placeholder={`Option ${OPTION_LABELS[i]}…`}
                    style={{ ...inpStyle, flex: 1, borderColor: form.correct === i ? '#A7F3D0' : '#E8D5C0', background: form.correct === i ? '#F0FDF4' : 'white' }}
                  />
                  {form.options.length > 2 && (
                    <button onClick={() => removeOption(i)} title="Remove option" style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '1rem', padding: 2, flexShrink: 0 }}>✕</button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#7A5C3F' }}>
              Correct answer: <strong style={{ color: '#059669' }}>{OPTION_LABELS[form.correct]}: {form.options[form.correct] || '—'}</strong>
            </div>
          </div>

          {/* Explanation */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Explanation * <span style={{ fontWeight: 500, textTransform: 'none' }}>— step-by-step reasoning for the correct answer</span></label>
            <textarea
              value={form.explanation}
              onChange={e => set('explanation', e.target.value)}
              rows={6}
              placeholder="Explain why the correct answer is right. Be specific and step-by-step…"
              style={{ ...inpStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          {/* Preview card */}
          {showPreview && form.question && (
            <div style={{ background: '#F8F5F0', border: '1.5px solid #E8D5C0', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#7A5C3F', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>Preview</div>
              {form.format === 'reading' && form.passage && (
                <div style={{ background: 'white', border: '1px solid #E8D5C0', borderRadius: 8, padding: '10px 12px', marginBottom: 10, maxHeight: 160, overflowY: 'auto', fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#2D1B0E' }}>{form.passage}</div>
              )}
              {form.visual && <pre style={{ background: 'white', border: '1px solid #E8D5C0', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: '0.8rem', overflowX: 'auto' }}>{form.visual}</pre>}
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2D1B0E', marginBottom: 10, lineHeight: 1.5 }}>{form.question}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {form.options.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: form.correct === i ? '#DCFCE7' : 'white', border: `1px solid ${form.correct === i ? '#86EFAC' : '#E8D5C0'}`, borderRadius: 7, padding: '5px 10px', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 800, color: form.correct === i ? '#166534' : '#7A5C3F', width: 16 }}>{OPTION_LABELS[i]}</span>
                    <span style={{ color: '#2D1B0E' }}>{opt}</span>
                  </div>
                ))}
              </div>
              {form.explanation && (
                <div style={{ marginTop: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem', color: '#1D4ED8', lineHeight: 1.5 }}>
                  <strong>Explanation:</strong> {form.explanation}
                </div>
              )}
            </div>
          )}

          {/* Status */}
          {status && (
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: status.type === 'success' ? '#DCFCE7' : '#FEF2F2', border: `1.5px solid ${status.type === 'success' ? '#86EFAC' : '#FECACA'}`, color: status.type === 'success' ? '#166534' : '#991B1B', fontWeight: 700, fontSize: '0.85rem' }}>
              {status.msg}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowPreview(v => !v)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', color: '#2D1B0E' }}
            >{showPreview ? 'Hide Preview' : 'Preview'}</button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: saving ? '#E8D5C0' : '#FF6B35', color: 'white', fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.88rem', cursor: saving ? 'not-allowed' : 'pointer' }}
            >{saving ? 'Saving…' : 'Save Question'}</button>
            <button
              onClick={() => { setForm(blankForm()); setPendingImageFiles([]); setStatus(null); setShowPreview(false) }}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid #FECACA', background: '#FEF2F2', fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', color: '#991B1B' }}
            >Reset</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── QUESTION BANK REVIEW ───────────────────────────────────────

function QuestionBankReview({ idToken, onSignOut }) {
  const [examType, setExamType] = useState('OC')
  const [topicId, setTopicId] = useState('')
  const [uploadSource, setUploadSource] = useState('')
  const [paperYear, setPaperYear] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [questions, setQuestions] = useState(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [pendingImageFiles, setPendingImageFiles] = useState([]) // new files to upload
  const [uploadingImage, setUploadingImage] = useState(false)
  const [previewQuestion, setPreviewQuestion] = useState(null)
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [duplicates, setDuplicates] = useState(null)
  const [loadingDuplicates, setLoadingDuplicates] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  const doLoad = async (p, et, tid, s, us, py) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ action: 'questions', page: p })
      if (et) params.set('examType', et)
      if (tid) params.set('topicId', tid)
      if (s) params.set('search', s)
      if (us) params.set('uploadSource', us)
      if (py) params.set('paperYear', py)
      const res = await fetch(`/api/admin?${params}`, { headers: { Authorization: 'Bearer ' + idToken } })
      if (res.status === 403) { const e = await res.json(); if (e.error?.includes('Not')) { onSignOut(); return } }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuestions(data.questions || [])
      setTotal(data.total || 0)
      setSelectedIds(new Set())
    } catch (err) { alert('Failed to load questions: ' + err.message) }
    finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { doLoad(1, examType, topicId, search, uploadSource, paperYear); setPage(1) }, [examType, topicId, search, uploadSource, paperYear])

  const loadDuplicates = async () => {
    setLoadingDuplicates(true)
    try {
      const res = await fetch('/api/admin?action=duplicates', { headers: { Authorization: 'Bearer ' + idToken } })
      if (res.status === 403) { const e = await res.json(); if (e.error?.includes('Not')) { onSignOut(); return } }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDuplicates(data)
    } catch (err) { alert('Failed: ' + err.message) }
    finally { setLoadingDuplicates(false) }
  }

  const toggleDuplicates = () => {
    if (!showDuplicates) { setShowDuplicates(true); loadDuplicates() }
    else { setShowDuplicates(false); setDuplicates(null) }
  }

  const startEdit = (q) => {
    setEditingId(q.id)
    setEditError('')
    setPendingImageFiles([])
    const existingUrls = q.image_urls?.length ? q.image_urls : (q.image_url ? [q.image_url] : [])
    setEditForm({
      question: q.question,
      options: [...(q.options || [])],
      correct: q.correct,
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
      subtopic: q.subtopic || '',
      year_level: q.year_level || '',
      question_source: q.question_source || 'sample',
      paper_year: q.paper_year || '',
      image_urls: existingUrls,
    })
  }

  const cancelEdit = () => { setEditingId(null); setEditError(''); setPendingImageFiles([]) }

  const doUploadImages = async (files) => {
    if (!files.length) return []
    setUploadingImage(true)
    try {
      const urls = await Promise.all(files.map(async file => {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/admin?action=uploadImage', { method: 'POST', body: fd, headers: { Authorization: 'Bearer ' + idToken } })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        return data.url
      }))
      return urls
    } finally { setUploadingImage(false) }
  }

  const saveEdit = async () => {
    if (!editForm.question?.trim()) { setEditError('Question text is required'); return }
    setSaving(true); setEditError('')
    try {
      const newUrls = pendingImageFiles.length ? await doUploadImages(pendingImageFiles) : []
      const allUrls = [...(editForm.image_urls || []), ...newUrls]
      const res = await fetch('/api/admin?action=updateQuestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({
          questionId: editingId,
          question: editForm.question.trim(),
          options: editForm.options,
          correct: parseInt(editForm.correct),
          explanation: editForm.explanation,
          difficulty: editForm.difficulty,
          subtopic: editForm.subtopic,
          year_level: editForm.year_level,
          question_source: editForm.question_source,
          paper_year: editForm.paper_year,
          image_urls: allUrls,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditingId(null)
      setPendingImageFiles([])
      await doLoad(page, examType, topicId, search, uploadSource, paperYear)
    } catch (err) { setEditError(err.message) }
    finally { setSaving(false) }
  }

  const deleteQuestion = async (qId, qText) => {
    if (!confirm(`Delete this question?\n"${qText.slice(0, 100)}"\n\nThis cannot be undone.`)) return
    try {
      const res = await fetch('/api/admin?action=deleteQuestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ questionId: qId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await doLoad(page, examType, topicId, search, uploadSource, paperYear)
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const isPageAllSelected = !!(questions?.length) && questions.every(q => selectedIds.has(q.id))
  const isPagePartialSelected = !isPageAllSelected && !!(questions?.some(q => selectedIds.has(q.id)))

  const togglePageSelect = () => {
    if (isPageAllSelected) {
      setSelectedIds(prev => { const next = new Set(prev); questions.forEach(q => next.delete(q.id)); return next })
    } else {
      setSelectedIds(prev => { const next = new Set(prev); questions.forEach(q => next.add(q.id)); return next })
    }
  }

  const deleteSelected = async () => {
    const ids = [...selectedIds]
    if (!ids.length) return
    if (!confirm(`Delete ${ids.length} selected question${ids.length !== 1 ? 's' : ''}? This cannot be undone.`)) return
    try {
      const res = await fetch('/api/admin?action=deleteQuestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ questionIds: ids }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await doLoad(page, examType, topicId, search, uploadSource, paperYear)
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)
  const diffColors = { easy: '#059669', medium: '#D97706', hard: '#DC2626' }
  const inputStyle = { padding: '6px 9px', borderRadius: 7, border: '1.5px solid #BAE6FD', fontFamily: 'Nunito', fontSize: '0.85rem', boxSizing: 'border-box' }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1rem', marginBottom: 4 }}>Question Review</div>
      <div style={{ fontSize: '0.82rem', color: '#7A5C3F', marginBottom: 16 }}>Browse, edit, delete, and add images to questions in the bank.</div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <select value={examType} onChange={e => { setExamType(e.target.value); setTopicId('') }} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white' }}>
          <option value="">All Exams</option>
          {EXAM_TYPES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <select value={topicId} onChange={e => setTopicId(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', minWidth: 160 }}>
          <option value="">All Topics</option>
          {(EXAM_TOPICS[examType] || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={uploadSource} onChange={e => setUploadSource(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white' }}>
          <option value="">All Sources</option>
          <option value="AI">AI</option>
          <option value="PDF">PDF</option>
          <option value="Json">Json</option>
          <option value="Manual">Manual</option>
          <option value="none">Unknown</option>
        </select>
        <input
          value={paperYear}
          onChange={e => setPaperYear(e.target.value)}
          placeholder="Test Title…"
          style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', minWidth: 130, fontFamily: 'Nunito' }}
        />
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') setSearch(searchInput) }}
          placeholder="Search questions…"
          style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #E8D5C0', background: 'white', minWidth: 220, fontFamily: 'Nunito' }}
        />
        <button onClick={() => setSearch(searchInput)} style={{ padding: '7px 14px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: 'pointer' }}>Search</button>
        {(search || topicId || uploadSource || paperYear) && (
          <button onClick={() => { setSearch(''); setSearchInput(''); setTopicId(''); setUploadSource(''); setPaperYear('') }} style={{ padding: '7px 14px', background: 'white', color: '#7A5C3F', border: '1.5px solid #E8D5C0', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 700, cursor: 'pointer' }}>Clear</button>
        )}
        <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#7A5C3F', fontWeight: 600 }}>{total} questions</div>
        <button
          onClick={toggleDuplicates}
          style={{ padding: '7px 14px', background: showDuplicates ? '#7C3AED' : 'white', color: showDuplicates ? 'white' : '#7C3AED', border: '1.5px solid #C4B5FD', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >{showDuplicates ? 'Hide Duplicates' : '🔍 Find Duplicates'}</button>
      </div>

      {/* ── Duplicates panel ── */}
      {showDuplicates && (
        <div style={{ marginBottom: 20, background: '#F5F3FF', border: '1.5px solid #C4B5FD', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.95rem', color: '#5B21B6', marginBottom: 4 }}>Duplicate Questions</div>
          {loadingDuplicates ? (
            <div style={{ color: '#7C3AED', padding: '12px 0', fontSize: '0.88rem' }}>Scanning for duplicates…</div>
          ) : !duplicates ? null : duplicates.totalDuplicateGroups === 0 ? (
            <div style={{ color: '#059669', fontWeight: 700, fontSize: '0.88rem', padding: '8px 0' }}>✓ No duplicates found — your question bank is clean!</div>
          ) : (
            <>
              <div style={{ fontSize: '0.82rem', color: '#7C3AED', marginBottom: 14 }}>
                Found <strong>{duplicates.totalDuplicateGroups}</strong> duplicate group{duplicates.totalDuplicateGroups !== 1 ? 's' : ''} ({duplicates.totalExtraRows} extra rows). Keep one, delete the rest.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(duplicates.groups || []).map((group, gi) => (
                  <div key={gi} style={{ background: 'white', border: '1.5px solid #C4B5FD', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: '#EDE9FE', padding: '8px 14px', fontSize: '0.78rem', fontWeight: 700, color: '#5B21B6' }}>
                      Group {gi + 1} — {group.length} identical questions
                    </div>
                    <div style={{ padding: '10px 14px 4px' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1E293B', marginBottom: 10, lineHeight: 1.5 }}>
                        "{group[0].question.length > 160 ? group[0].question.slice(0, 160) + '…' : group[0].question}"
                      </div>
                      {group.map((q, qi) => (
                        <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid #EDE9FE' }}>
                          <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: '#DBEAFE', color: '#1D4ED8' }}>{q.exam_type}</span>
                            <span style={{ fontSize: '0.72rem', padding: '1px 7px', borderRadius: 20, background: '#F3F4F6', color: '#374151' }}>{q.topic_id}</span>
                            {q.subtopic && <span style={{ fontSize: '0.72rem', padding: '1px 7px', borderRadius: 20, background: '#F3F4F6', color: '#374151' }}>{q.subtopic}</span>}
                            {q.year_level && <span style={{ fontSize: '0.72rem', padding: '1px 7px', borderRadius: 20, background: '#F3F4F6', color: '#374151' }}>Yr {q.year_level}</span>}
                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Added {new Date(q.created_at).toLocaleDateString('en-AU')}</span>
                            {qi === 0 && <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: '#DCFCE7', color: '#166534' }}>oldest</span>}
                          </div>
                          <button
                            onClick={async () => {
                              if (!confirm('Delete this duplicate question? This cannot be undone.')) return
                              try {
                                const res = await fetch('/api/admin?action=deleteQuestion', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
                                  body: JSON.stringify({ questionId: q.id }),
                                })
                                if (!res.ok) throw new Error((await res.json()).error)
                                await loadDuplicates()
                                doLoad(page, examType, topicId, search, uploadSource, paperYear)
                              } catch (err) { alert('Failed: ' + err.message) }
                            }}
                            style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: 6, border: '1.5px solid #FECACA', background: '#FEF2F2', fontFamily: 'Nunito', fontWeight: 700, cursor: 'pointer', color: '#991B1B', flexShrink: 0 }}
                          >Delete</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#7A5C3F' }}>Loading questions...</div>
      ) : !questions || questions.length === 0 ? (
        <div style={{ color: '#94A3B8', padding: 20, textAlign: 'center' }}>No questions found.</div>
      ) : (
        <>
          {/* Selection toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '7px 12px', background: selectedIds.size > 0 ? '#FFF7ED' : '#F8FAFC', border: '1.5px solid', borderColor: selectedIds.size > 0 ? '#FED7AA' : '#E2E8F0', borderRadius: 8 }}>
            <input
              type="checkbox"
              checked={isPageAllSelected}
              ref={el => { if (el) el.indeterminate = isPagePartialSelected }}
              onChange={togglePageSelect}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#FF6B35' }}
            />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#7A5C3F' }}>
              {isPageAllSelected ? 'All on page selected' : isPagePartialSelected ? `${questions.filter(q => selectedIds.has(q.id)).length} on page selected` : 'Select page'}
            </span>
            {selectedIds.size > 0 && (
              <>
                <span style={{ fontSize: '0.82rem', color: '#92400E', fontWeight: 700, marginLeft: 4 }}>·  {selectedIds.size} total selected</span>
                <button
                  onClick={deleteSelected}
                  style={{ marginLeft: 'auto', padding: '5px 16px', background: '#DC2626', color: 'white', border: 'none', borderRadius: 7, fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                >Delete {selectedIds.size} selected</button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  style={{ padding: '5px 12px', background: 'white', color: '#7A5C3F', border: '1.5px solid #E8D5C0', borderRadius: 7, fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                >Clear</button>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questions.map(q => {
              if (editingId === q.id) {
                return (
                  <div key={q.id} style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: 12, padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.88rem', color: '#0369A1', marginBottom: 12 }}>
                      Editing · <span style={{ fontWeight: 600, opacity: 0.7, fontSize: '0.78rem' }}>{q.exam_type} / {q.topic_id}</span>
                    </div>

                    {/* Question text */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 3 }}>Question *</div>
                      <textarea
                        value={editForm.question}
                        onChange={e => setEditForm(f => ({ ...f, question: e.target.value }))}
                        rows={3}
                        style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
                      />
                    </div>

                    {/* Options */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 6 }}>Options — select radio for correct answer</div>
                      {(editForm.options || []).map((opt, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                          <input type="radio" checked={editForm.correct === i} onChange={() => setEditForm(f => ({ ...f, correct: i }))} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#7A5C3F', width: 22 }}>{String.fromCharCode(65 + i)}.</span>
                          <input
                            value={opt}
                            onChange={e => {
                              const opts = [...editForm.options]
                              opts[i] = e.target.value
                              setEditForm(f => ({ ...f, options: opts }))
                            }}
                            style={{ ...inputStyle, flex: 1, border: `1.5px solid ${editForm.correct === i ? '#059669' : '#BAE6FD'}`, background: editForm.correct === i ? '#F0FDF4' : 'white' }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Explanation + meta fields */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      <div style={{ flex: 2, minWidth: 200 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 3 }}>Explanation</div>
                        <textarea value={editForm.explanation} onChange={e => setEditForm(f => ({ ...f, explanation: e.target.value }))} rows={2} style={{ ...inputStyle, width: '100%', resize: 'vertical' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 100 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 3 }}>Difficulty</div>
                        <select value={editForm.difficulty} onChange={e => setEditForm(f => ({ ...f, difficulty: e.target.value }))} style={{ ...inputStyle, width: '100%', background: 'white' }}>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      <div style={{ flex: 1, minWidth: 100 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 3 }}>Subtopic</div>
                        <input value={editForm.subtopic} onChange={e => setEditForm(f => ({ ...f, subtopic: e.target.value }))} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 80 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 3 }}>Year Level</div>
                        <input value={editForm.year_level} placeholder="e.g. 4" onChange={e => setEditForm(f => ({ ...f, year_level: e.target.value }))} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 3 }}>Source Type</div>
                        <select value={editForm.question_source} onChange={e => setEditForm(f => ({ ...f, question_source: e.target.value, paper_year: '' }))} style={{ ...inputStyle, width: '100%', background: 'white' }}>
                          <option value="sample">Practice Test</option>
                          <option value="past_paper">Past Year Paper</option>
                        </select>
                      </div>
                      {editForm.question_source === 'sample' && (
                        <div style={{ flex: 1, minWidth: 100 }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 3 }}>Test Number</div>
                          <input value={editForm.paper_year} placeholder="Test number (e.g. 1)" type="number" min="1" onChange={e => setEditForm(f => ({ ...f, paper_year: e.target.value }))} style={{ ...inputStyle, width: '100%' }} />
                        </div>
                      )}
                      {editForm.question_source === 'past_paper' && (
                        <div style={{ flex: 1, minWidth: 100 }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 3 }}>Paper Year</div>
                          <input value={editForm.paper_year} placeholder="e.g. 2023" onChange={e => setEditForm(f => ({ ...f, paper_year: e.target.value }))} style={{ ...inputStyle, width: '100%' }} />
                        </div>
                      )}
                    </div>

                    {/* Multi-image upload */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7A5C3F', marginBottom: 6 }}>
                        Images (optional — multiple allowed)
                        {(editForm.image_urls?.length || pendingImageFiles.length) > 0 && (
                          <span style={{ marginLeft: 8, fontWeight: 600, color: '#0369A1' }}>
                            {(editForm.image_urls?.length || 0) + pendingImageFiles.length} image{((editForm.image_urls?.length || 0) + pendingImageFiles.length) !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {/* Existing saved images */}
                      {(editForm.image_urls || []).length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          {editForm.image_urls.map((url, i) => (
                            <div key={i} style={{ position: 'relative', display: 'inline-flex' }}>
                              <img src={url} alt={`img ${i + 1}`} style={{ height: 72, width: 72, borderRadius: 8, border: '1.5px solid #BAE6FD', objectFit: 'cover' }} />
                              <button
                                onClick={() => setEditForm(f => ({ ...f, image_urls: f.image_urls.filter((_, j) => j !== i) }))}
                                style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                                title="Remove"
                              >✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Pending new files */}
                      {pendingImageFiles.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          {pendingImageFiles.map((f, i) => (
                            <div key={i} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', background: '#F0F9FF', border: '1.5px dashed #7DD3FC', borderRadius: 8, padding: '4px 8px', fontSize: '0.75rem', color: '#0369A1', fontWeight: 600 }}>
                              📎 {f.name}
                              <button
                                onClick={() => setPendingImageFiles(prev => prev.filter((_, j) => j !== i))}
                                style={{ marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontWeight: 900, fontSize: '0.8rem' }}
                              >✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#F0F9FF', border: '1.5px dashed #7DD3FC', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: '#0369A1' }}>
                        + Add Image
                        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => {
                          const files = Array.from(e.target.files || [])
                          if (files.length) setPendingImageFiles(prev => [...prev, ...files])
                          e.target.value = ''
                        }} />
                      </label>
                    </div>

                    {editError && <div style={{ color: '#991B1B', fontSize: '0.82rem', fontWeight: 700, marginBottom: 8 }}>{editError}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={saveEdit}
                        disabled={saving || uploadingImage}
                        style={{ padding: '7px 20px', background: '#0369A1', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: (saving || uploadingImage) ? 'not-allowed' : 'pointer', opacity: (saving || uploadingImage) ? 0.7 : 1 }}
                      >{saving || uploadingImage ? 'Saving…' : 'Save Changes'}</button>
                      <button onClick={cancelEdit} style={{ padding: '7px 16px', background: 'white', color: '#0369A1', border: '1.5px solid #BAE6FD', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )
              }

              // Normal row
              const isSelected = selectedIds.has(q.id)
              return (
                <div key={q.id} style={{ background: isSelected ? '#FFF7ED' : 'white', border: `1.5px solid ${isSelected ? '#FED7AA' : '#E8D5C0'}`, borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(q.id)}
                    style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, cursor: 'pointer', accentColor: '#FF6B35' }}
                  />
                  {(q.image_urls?.length ? q.image_urls[0] : q.image_url) && (
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={q.image_urls?.length ? q.image_urls[0] : q.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1.5px solid #E8D5C0' }} />
                      {(q.image_urls?.length || 0) > 1 && (
                        <span style={{ position: 'absolute', bottom: -4, right: -4, background: '#0369A1', color: '#fff', borderRadius: 10, fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px' }}>+{q.image_urls.length - 1}</span>
                      )}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>
                      {q.question.length > 130 ? q.question.slice(0, 130) + '…' : q.question}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: '#DBEAFE', color: '#1D4ED8' }}>{q.exam_type}</span>
                      <span style={{ fontSize: '0.72rem', padding: '1px 7px', borderRadius: 20, background: '#F3F4F6', color: '#374151', fontWeight: 600 }}>{q.topic_id}</span>
                      {q.subtopic && <span style={{ fontSize: '0.72rem', padding: '1px 7px', borderRadius: 20, background: '#F3F4F6', color: '#374151' }}>{q.subtopic}</span>}
                      {q.difficulty && <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: '#F9FAFB', color: diffColors[q.difficulty] || '#374151' }}>{q.difficulty}</span>}
                      {q.year_level && <span style={{ fontSize: '0.72rem', padding: '1px 7px', borderRadius: 20, background: '#F3F4F6', color: '#374151' }}>Yr {q.year_level}</span>}
                      {q.question_source === 'past_paper'
                        ? <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: '#FEF3C7', color: '#92400E' }}>Past Paper{q.paper_year ? ` ${q.paper_year}` : ''}</span>
                        : <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: '#DCFCE7', color: '#166534' }}>Practice Test{q.paper_year ? ` #${q.paper_year}` : ''}</span>
                      }
                      {(q.image_urls?.length || q.image_url) && <span style={{ fontSize: '0.72rem', padding: '1px 7px', borderRadius: 20, background: '#ECFDF5', color: '#059669', fontWeight: 700 }}>📷 {q.image_urls?.length > 1 ? `${q.image_urls.length} images` : 'Image'}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setPreviewQuestion(q)} style={{ padding: '5px 12px', fontSize: '0.78rem', borderRadius: 6, border: '1.5px solid #D1FAE5', background: '#ECFDF5', fontFamily: 'Nunito', fontWeight: 700, cursor: 'pointer', color: '#065F46' }}>Preview</button>
                    <button onClick={() => startEdit(q)} style={{ padding: '5px 12px', fontSize: '0.78rem', borderRadius: 6, border: '1.5px solid #BAE6FD', background: '#F0F9FF', fontFamily: 'Nunito', fontWeight: 700, cursor: 'pointer', color: '#0369A1' }}>Edit</button>
                    <button onClick={() => deleteQuestion(q.id, q.question)} style={{ padding: '5px 12px', fontSize: '0.78rem', borderRadius: 6, border: '1.5px solid #FECACA', background: '#FEF2F2', fontFamily: 'Nunito', fontWeight: 700, cursor: 'pointer', color: '#991B1B' }}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, alignItems: 'center' }}>
              <button
                onClick={() => { const p = Math.max(1, page - 1); setPage(p); doLoad(p, examType, topicId, search, uploadSource, paperYear) }}
                disabled={page === 1}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1.5px solid #E8D5C0', background: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, fontFamily: 'Nunito', fontWeight: 700 }}
              >← Prev</button>
              <span style={{ fontSize: '0.85rem', color: '#7A5C3F', fontWeight: 600 }}>Page {page} of {totalPages}</span>
              <button
                onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); doLoad(p, examType, topicId, search, uploadSource, paperYear) }}
                disabled={page === totalPages}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1.5px solid #E8D5C0', background: 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1, fontFamily: 'Nunito', fontWeight: 700 }}
              >Next →</button>
            </div>
          )}
        </>
      )}

      {/* ── Question Preview Modal ── */}
      {previewQuestion && (() => {
        const pq = previewQuestion
        const labels = ['A', 'B', 'C', 'D', 'E']
        const diffColor = { easy: '#059669', medium: '#D97706', hard: '#DC2626' }[pq.difficulty] || '#374151'
        return (
          <div
            onClick={() => setPreviewQuestion(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', fontFamily: 'Nunito Sans, sans-serif' }}
            >
              {/* Modal header */}
              <div style={{ background: '#1E1B4B', padding: '14px 20px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ color: 'white', fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.95rem' }}>Question Preview</div>
                <button
                  onClick={() => setPreviewQuestion(null)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >✕</button>
              </div>

              {/* Question card body */}
              <div style={{ padding: '20px 24px' }}>
                {/* Meta badges */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#DBEAFE', color: '#1D4ED8' }}>{pq.exam_type} Track</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#F3F4F6', color: '#374151' }}>{pq.topic_id}</span>
                  {pq.subtopic && <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 20, background: '#F3F4F6', color: '#374151' }}>{pq.subtopic}</span>}
                  {pq.year_level && <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 20, background: '#F3F4F6', color: '#374151' }}>Year {pq.year_level}</span>}
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#F9FAFB', color: diffColor, border: `1px solid ${diffColor}30` }}>{pq.difficulty?.charAt(0).toUpperCase() + pq.difficulty?.slice(1)}</span>
                </div>

                {/* Question text */}
                <div style={{ fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.6, color: '#1E293B', marginBottom: 16 }}>{pq.question}</div>

                {/* Images */}
                {(() => {
                  const imgs = pq.image_urls?.length ? pq.image_urls : (pq.image_url ? [pq.image_url] : [])
                  return imgs.length > 0 ? (
                    <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {imgs.map((url, i) => (
                        <img key={i} src={url} alt={`diagram ${i + 1}`} style={{ maxWidth: imgs.length > 1 ? '48%' : '100%', maxHeight: 280, borderRadius: 10, border: '1.5px solid #E2E8F0', objectFit: 'contain' }} />
                      ))}
                    </div>
                  ) : null
                })()}

                {/* Visual text block */}
                {pq.visual && (
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: '0.9rem', fontFamily: 'Nunito' }}>
                    <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', margin: 0 }}>{pq.visual}</pre>
                  </div>
                )}

                {/* Options */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                  {(pq.options || []).map((opt, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10,
                        border: i === pq.correct ? '2px solid #22C55E' : '2px solid #E2E8F0',
                        background: i === pq.correct ? '#F0FDF4' : '#F8FAFC',
                        fontWeight: i === pq.correct ? 700 : 500,
                        fontSize: '0.92rem', color: i === pq.correct ? '#166534' : '#374151',
                      }}
                    >
                      <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0, background: i === pq.correct ? '#22C55E' : '#E2E8F0', color: i === pq.correct ? 'white' : '#374151' }}>
                        {i === pq.correct ? '✓' : labels[i]}
                      </span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                {pq.explanation && (
                  <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 12, padding: '12px 16px', fontSize: '0.9rem', color: '#166534', lineHeight: 1.6 }}>
                    <strong>Explanation: </strong>{pq.explanation}
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setPreviewQuestion(null)} style={{ padding: '8px 24px', background: '#1E1B4B', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Nunito', fontWeight: 800, cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}
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
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#FF6B35', marginBottom: 24 }}>Self Paced Learning</div>
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
            ⚙️ Admin Portal <span style={{ color: '#A5B4FC', fontSize: '0.85rem', fontWeight: 600 }}>— Self Paced Learning</span>
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

// ── EXAM DATES MANAGER ─────────────────────────────────────────

const TAG_OPTIONS = [
  { value: 'naplan',    label: 'NAPLAN',    color: '#3B82F6' },
  { value: 'oc',        label: 'OC',        color: '#F97316' },
  { value: 'selective', label: 'Selective', color: '#22C55E' },
]

const EMPTY_FORM = { exam: '', label: '', date: '', end_date: '', tag: 'naplan', note: '' }

function ExamDatesManager({ idToken }) {
  const [dates, setDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showPast, setShowPast] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin?action=examDates', { headers: { Authorization: 'Bearer ' + idToken } })
      const json = await res.json()
      setDates(json.dates || [])
    } catch { setDates([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const today = new Date().toISOString().split('T')[0]
  const visible = showPast ? dates : dates.filter(d => d.date >= today)

  function startEdit(d) {
    setEditingId(d.id)
    setForm({ exam: d.exam, label: d.label, date: d.date, end_date: d.end_date || '', tag: d.tag, note: d.note || '' })
    setError(null)
  }

  function cancelEdit() { setEditingId(null); setForm(EMPTY_FORM); setError(null) }

  async function save() {
    if (!form.exam.trim() || !form.label.trim() || !form.date || !form.tag) {
      setError('Exam, Label, Date and Tag are required.'); return
    }
    setSaving(true); setError(null)
    try {
      const action = editingId ? 'updateExamDate' : 'createExamDate'
      const body = editingId ? { id: editingId, ...form } : form
      const res = await fetch(`/api/admin?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Save failed'); return }
      cancelEdit()
      await load()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function remove(id) {
    if (!confirm('Delete this date?')) return
    try {
      await fetch('/api/admin?action=deleteExamDate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ id }),
      })
      await load()
    } catch { /* ignore */ }
  }

  const inp = { background: '#fff', border: '1.5px solid #E8D5C0', borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }
  const col = { flex: 1, minWidth: 120 }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>Exam Dates</div>
      <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 20 }}>Add and manage key exam dates shown on the student dashboard.</div>

      {/* Form */}
      <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 12, color: '#92400E' }}>
          {editingId ? '✏️ Edit Date' : '➕ Add New Date'}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={col}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Exam *</div>
            <select style={inp} value={form.exam} onChange={e => setForm(f => ({ ...f, exam: e.target.value }))}>
              <option value="">Select…</option>
              <option>NAPLAN</option>
              <option>OC</option>
              <option>Selective</option>
              <option>NAPLAN Writing</option>
              <option>Other</option>
            </select>
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Label *</div>
            <input style={inp} placeholder="e.g. OC Placement Test" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
          </div>
          <div style={col}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Tag * (colour)</div>
            <select style={inp} value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}>
              {TAG_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={col}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Date *</div>
            <input style={inp} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div style={col}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>End Date (optional)</div>
            <input style={inp} type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Note (optional)</div>
            <input style={inp} placeholder="e.g. Year 4 students" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
        </div>
        {error && <div style={{ color: '#DC2626', fontSize: '0.82rem', marginBottom: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={save} disabled={saving}
            style={{ background: '#FF6B35', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
          >{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Date'}</button>
          {editingId && (
            <button onClick={cancelEdit} style={{ background: '#fff', border: '1.5px solid #E8D5C0', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
          )}
        </div>
      </div>

      {/* Toggle past */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>{visible.length} date{visible.length !== 1 ? 's' : ''}</div>
        <label style={{ fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)} /> Show past dates
        </label>
      </div>

      {loading ? (
        <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>No dates yet — add one above.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map(d => {
            const tagInfo = TAG_OPTIONS.find(t => t.value === d.tag) || TAG_OPTIONS[0]
            const isPast = d.date < today
            return (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isPast ? '#F8F8F8' : '#fff', border: '1.5px solid #E8D5C0', borderRadius: 10, padding: '10px 14px', opacity: isPast ? 0.6 : 1 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: tagInfo.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{d.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                    <span style={{ fontWeight: 600 }}>{d.exam}</span>
                    {' · '}{new Date(d.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {d.end_date && ` → ${new Date(d.end_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`}
                    {d.note && <span style={{ marginLeft: 6, background: '#F1F5F9', borderRadius: 4, padding: '1px 6px' }}>{d.note}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => startEdit(d)} style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', color: '#1D4ED8' }}>Edit</button>
                  <button onClick={() => remove(d.id)} style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', color: '#DC2626' }}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 24, padding: 14, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: '0.8rem', color: '#64748b' }}>
        <strong>SQL to create table (run once in Supabase SQL Editor):</strong>
        <pre style={{ marginTop: 8, fontSize: '0.75rem', overflowX: 'auto', background: '#1e293b', color: '#e2e8f0', padding: 12, borderRadius: 8 }}>{`CREATE TABLE IF NOT EXISTS exam_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam text NOT NULL,
  label text NOT NULL,
  date date NOT NULL,
  end_date date,
  tag text NOT NULL DEFAULT 'naplan',
  note text,
  created_at timestamptz DEFAULT now()
);`}</pre>
      </div>
    </div>
  )
}
