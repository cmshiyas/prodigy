import { useState, useEffect } from 'react'

export default function HistoryScreen({ user, idToken, onHome }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history', {
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
      <div className="screen">
        <div className="nav-bar">
          <button className="nav-btn" onClick={onHome}>← Home</button>
          <h1>Quiz History</h1>
        </div>
        <div className="loading">Loading history...</div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="nav-bar">
        <button className="nav-btn" onClick={onHome}>← Home</button>
        <h1>Quiz History</h1>
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
  )
}