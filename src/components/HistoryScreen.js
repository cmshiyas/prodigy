import { useState, useEffect } from 'react'
import { EXAM_TYPES } from '../lib/constants'

export default function HistoryScreen({ user, idToken, examType, onExamTypeChange, onHome, onRanking }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [examType])

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/history?examType=${encodeURIComponent(examType)}`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setLoading(false)
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
            <button className="nav-btn active">History</button>
            <button className="nav-btn" onClick={onRanking}>Ranking</button>
            <div className="user-pill">
              {user.picture && <img src={user.picture} className="user-avatar" alt="" />}
              <span>{user.name.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        <div className="screen">
          <div style={{ margin: '16px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {EXAM_TYPES.map(item => (
              <button
                key={item.id}
                onClick={() => onExamTypeChange(item.id)}
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
          <div className="loading">Loading history...</div>
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
          <button className="nav-btn active">History</button>
          <button className="nav-btn" onClick={onRanking}>Ranking</button>
          <div className="user-pill">
            {user.picture && <img src={user.picture} className="user-avatar" alt="" />}
            <span>{user.name.split(' ')[0]}</span>
          </div>
        </div>
      </header>

      <div className="screen">
        <div style={{ margin: '16px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {EXAM_TYPES.map(item => (
            <button
              key={item.id}
              onClick={() => onExamTypeChange(item.id)}
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
        <div className="history-container">
          {history.length === 0 ? (
            <div className="empty-state">
              <h2>No quiz attempts yet</h2>
              <p>Complete some quizzes to see your history here!</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((attempt, index) => (
                <div key={index} className="history-item">
                  <div className="history-date">{new Date(attempt.date).toLocaleDateString()}</div>
                  <div className="history-score">
                    <span className="score-value">{attempt.score}</span>
                    <span className="score-label">points</span>
                  </div>
                  <div className="history-details">
                    <div className="detail-item">
                      <span className="detail-label">Questions:</span>
                      <span className="detail-value">{attempt.totalQuestions}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Accuracy:</span>
                      <span className="detail-value">{Math.round((attempt.correct / attempt.totalQuestions) * 100)}%</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Time:</span>
                      <span className="detail-value">{Math.round(attempt.duration / 60)}m {attempt.duration % 60}s</span>
                    </div>
                  </div>
                  <div className="history-topics">
                    {attempt.topics.map((topic, i) => (
                      <span key={i} className="topic-tag">{topic}</span>
                    ))}
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