import { useState, useEffect } from 'react'
import { EXAM_TYPES } from '../lib/constants'

export default function RankingScreen({ user, idToken, onHome, onHistory }) {
  const [rankings, setRankings] = useState([])
  const [subtopicStats, setSubtopicStats] = useState({})
  const [examType, setExamType] = useState('OC')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRankings()
    fetchSubtopicStats()
  }, [examType])

  const fetchRankings = async () => {
    try {
      const res = await fetch(`/api/rankings?examType=${encodeURIComponent(examType)}`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setRankings(data)
      }
    } catch (err) {
      console.error('Failed to fetch rankings:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubtopicStats = async () => {
    try {
      const res = await fetch(`/api/subtopic-performance?examType=${encodeURIComponent(examType)}`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSubtopicStats(data.subtopicStats || {})
      }
    } catch (err) {
      console.error('Failed to fetch subtopic stats:', err)
    }
  }

  if (loading) {
    return (
      <div>
        {/* HEADER */}
        <header>
          <div className="logo" onClick={onHome} style={{ cursor: 'pointer' }}>RepHub <span>Mastering by Reps</span></div>
          <div className="header-right">
            <button className="nav-btn" onClick={onHome}>Home</button>
            <button className="nav-btn" onClick={onHistory}>History</button>
            <button className="nav-btn active">Ranking</button>
            <div className="user-pill">
              {user.picture && <img src={user.picture} className="user-avatar" alt="" />}
              <span>{user.name.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        <div style={{ margin: '16px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {EXAM_TYPES.map(item => (
            <button
              key={item.id}
              onClick={() => setExamType(item.id)}
              style={{
                border: '1.5px solid #E5E7EB',
                borderRadius: 999,
                padding: '6px 12px',
                background: examType === item.id ? '#FFEDD5' : 'white',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="screen">
          <div className="loading">Loading rankings...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* HEADER */}
      <header>
        <div className="logo" onClick={onHome} style={{ cursor: 'pointer' }}>RepHub <span>Mastering by Reps</span></div>
        <div className="header-right">
          <button className="nav-btn" onClick={onHome}>Home</button>
          <button className="nav-btn" onClick={onHistory}>History</button>
          <button className="nav-btn active">Ranking</button>
          <div className="user-pill">
            {user.picture && <img src={user.picture} className="user-avatar" alt="" />}
            <span>{user.name.split(' ')[0]}</span>
          </div>
        </div>
      </header>

      <div className="screen">
        <div className="ranking-container">
          {rankings.length === 0 ? (
            <div className="empty-state">
              <h2>No ranking data yet</h2>
              <p>Complete some quizzes to see topic rankings!</p>
            </div>
          ) : (
            <div className="ranking-list">
              {rankings.map((topic, index) => (
                <div key={topic.id} className="ranking-item">
                  <div className="ranking-position">#{index + 1}</div>
                  <div className="ranking-content">
                    <div className="topic-name">{topic.name}</div>
                    <div className="ranking-stats">
                      <div className="stat-item">
                        <span className="stat-label">Accuracy:</span>
                        <span className="stat-value">{Math.round(topic.accuracy * 100)}%</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Questions:</span>
                        <span className="stat-value">{topic.totalQuestions}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Correct:</span>
                        <span className="stat-value">{topic.correctAnswers}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ranking-bar">
                    <div
                      className="ranking-fill"
                      style={{ width: `${topic.accuracy * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}