import { useState, useEffect } from 'react'

export default function RankingScreen({ user, idToken, onHome }) {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRankings()
  }, [])

  const fetchRankings = async () => {
    try {
      const res = await fetch('/api/rankings', {
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

  if (loading) {
    return (
      <div className="screen">
        <div className="nav-bar">
          <button className="nav-btn" onClick={onHome}>← Home</button>
          <h1>Topic Rankings</h1>
        </div>
        <div className="loading">Loading rankings...</div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="nav-bar">
        <button className="nav-btn" onClick={onHome}>← Home</button>
        <h1>Topic Rankings</h1>
      </div>

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
  )
}