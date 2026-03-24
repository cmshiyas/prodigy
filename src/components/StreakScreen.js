import { useState, useEffect } from 'react'

const MILESTONE_REWARDS = [
  { days: 1,   emoji: '🌱', title: 'First Step!',       desc: 'Every champion starts with day one. Keep going!',                              color: '#16A34A', bg: '#DCFCE7' },
  { days: 3,   emoji: '🔥', title: '3-Day Warrior!',    desc: 'Three days in a row — the habit is forming fast!',                            color: '#D97706', bg: '#FEF3C7' },
  { days: 5,   emoji: '⚡', title: '5-Day Streak!',     desc: "Five days strong. You're building real momentum!",                            color: '#7C3AED', bg: '#EDE9FE' },
  { days: 7,   emoji: '⭐', title: 'Week Champion!',    desc: "A full week of consistency. That's genuinely impressive!",                    color: '#1D4ED8', bg: '#DBEAFE' },
  { days: 10,  emoji: '🚀', title: '10-Day Rocket!',    desc: "Double digits! You're practising like a pro.",                               color: '#BE185D', bg: '#FCE7F3' },
  { days: 14,  emoji: '💪', title: '2-Week Legend!',    desc: "Two solid weeks. Science says habits form at 21 days — you're almost there!", color: '#0891B2', bg: '#CFFAFE' },
  { days: 21,  emoji: '🧠', title: 'Habit Locked In!',  desc: '21 days — your brain has officially wired this in. Incredible!',             color: '#059669', bg: '#D1FAE5' },
  { days: 30,  emoji: '🏆', title: 'Monthly Master!',   desc: "30 days of excellence. You're in the top 1% of learners!",                   color: '#DC2626', bg: '#FEE2E2' },
  { days: 50,  emoji: '💎', title: 'Diamond Learner!',  desc: '50 days! Your dedication is something truly extraordinary.',                  color: '#6D28D9', bg: '#EDE9FE' },
  { days: 100, emoji: '👑', title: 'Century Legend!',   desc: '100 days of practice. You are a once-in-a-generation learner!',              color: '#92400E', bg: '#FEF3C7' },
]

const ENCOURAGEMENTS = [
  'Every question you answer makes you sharper! 🧠',
  'Consistency beats talent every single time! 🎯',
  'Small steps every day lead to giant leaps! 🌟',
  'Your future self will thank you for showing up today! ✨',
  'Champions are made through daily habits like yours! 🏅',
  "The best exam prep is the one you actually do! 📚",
  "You're building something amazing, one day at a time! 💫",
  "Keep the streak alive — you've got this! 🔥",
  'Every day you practise, your brain gets stronger! 💪',
  'Consistency is the secret weapon of top performers! ⚡',
  'Another day, another step closer to your goal! 🎖️',
  'You showed up today — that matters more than you know! 🙌',
]

function getRewardForStreak(streak) {
  if (streak === 0) return null
  const unlocked = MILESTONE_REWARDS.filter(r => r.days <= streak)
  return unlocked.length > 0 ? unlocked[unlocked.length - 1] : null
}

function getNextMilestone(streak) {
  return MILESTONE_REWARDS.find(r => r.days > streak) || null
}

function getDailyEncouragement(streak) {
  return ENCOURAGEMENTS[streak % ENCOURAGEMENTS.length]
}

export default function StreakScreen({ user, idToken, activeChildId, onHome, onHistory, onRanking, onPlans }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/streak', { headers: { Authorization: `Bearer ${idToken}`, ...(activeChildId ? { 'X-Child-Id': activeChildId } : {}) } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [idToken, activeChildId])

  const NavHeader = () => (
    <header>
      <div className="logo" onClick={onHome} style={{ cursor: 'pointer' }}>
        Self Paced Learning <span>Practice · Consistency · Feedback</span>
      </div>
      <div className="header-right">
        <button className="nav-btn" onClick={onHome}>Home</button>
        <button className="nav-btn" onClick={onHistory}>History</button>
        <button className="nav-btn" onClick={onRanking}>Ranking</button>
        <button className="nav-btn active">Streak</button>
        {!user.is_admin && <button className="nav-btn nav-btn--plans" onClick={onPlans}>Plans</button>}
        <div className="user-pill">
          {user.picture && <img src={user.picture} className="user-avatar" alt="" />}
          <span>{user.name.split(' ')[0]}</span>
        </div>
      </div>
    </header>
  )

  if (loading) {
    return (
      <div>
        <NavHeader />
        <div className="screen">
          <div className="loading">Loading your streak...</div>
        </div>
      </div>
    )
  }

  const streak = data?.currentStreak || 0
  const longest = data?.longestStreak || 0
  const todayCount = data?.todayCount || 0
  const todayCompleted = data?.todayCompleted || false
  const recentDays = data?.recentDays || []
  const totalActiveDays = data?.totalActiveDays || 0
  const habitThreshold = data?.habitThreshold || 10

  const reward = getRewardForStreak(streak)
  const nextMilestone = getNextMilestone(streak)
  const encouragement = getDailyEncouragement(streak)

  return (
    <div>
      <NavHeader />
      <div className="screen">
        <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 48 }}>

          {/* ── Current Streak Hero ── */}
          <div style={{
            background: streak > 0
              ? 'linear-gradient(135deg, #FFF7ED, #FEF3C7)'
              : 'linear-gradient(135deg, #F8FAFC, #F1F5F9)',
            border: `2px solid ${streak > 0 ? '#FED7AA' : '#E2E8F0'}`,
            borderRadius: 20,
            padding: '32px 24px',
            textAlign: 'center',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 4 }}>
              {streak > 0 ? '🔥' : '💤'}
            </div>
            <div style={{
              fontFamily: 'Nunito', fontWeight: 900, fontSize: '4rem',
              color: streak > 0 ? '#D97706' : '#CBD5E1', lineHeight: 1,
            }}>
              {streak}
            </div>
            <div style={{
              fontWeight: 700, fontSize: '1rem',
              color: streak > 0 ? '#92400E' : '#94A3B8',
              marginTop: 4,
            }}>
              {streak === 0 ? 'No active streak' : streak === 1 ? 'day streak' : 'day streak'}
            </div>
            {streak === 0 ? (
              <div style={{ fontSize: '0.88rem', color: '#94A3B8', marginTop: 12 }}>
                Complete {habitThreshold}+ questions today to start your streak!
              </div>
            ) : (
              <div style={{
                fontSize: '0.88rem', color: '#92400E', marginTop: 10,
                fontWeight: 600, maxWidth: 360, margin: '10px auto 0',
              }}>
                {encouragement}
              </div>
            )}
          </div>

          {/* ── Today's Progress ── */}
          <div style={{
            background: 'white', border: '1.5px solid #E5E7EB',
            borderRadius: 16, padding: '20px', marginBottom: 20,
          }}>
            <div style={{
              fontFamily: 'Nunito', fontWeight: 800, fontSize: '1rem', color: '#1E293B',
              marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>Today&apos;s Habit</span>
              {todayCompleted && (
                <span style={{
                  background: '#DCFCE7', color: '#16A34A', borderRadius: 99,
                  padding: '2px 10px', fontSize: '0.8rem', fontWeight: 700,
                }}>✓ Done!</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 12, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (todayCount / habitThreshold) * 100)}%`,
                  background: todayCompleted
                    ? '#22C55E'
                    : 'linear-gradient(90deg, #F59E0B, #EF4444)',
                  borderRadius: 99,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{
                fontSize: '0.88rem', fontWeight: 700, color: '#475569',
                minWidth: 50, textAlign: 'right',
              }}>
                {todayCount}/{habitThreshold}
              </span>
            </div>
            {!todayCompleted && (
              <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: 8 }}>
                {habitThreshold - todayCount} more question{habitThreshold - todayCount !== 1 ? 's' : ''} needed to complete today&apos;s habit
              </div>
            )}
          </div>

          {/* ── Current Reward Unlocked ── */}
          {reward && (
            <div style={{
              background: reward.bg,
              border: `2px solid ${reward.color}44`,
              borderRadius: 16, padding: '20px', marginBottom: 20,
            }}>
              <div style={{
                fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.8rem',
                color: reward.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
              }}>
                🎁 Reward Unlocked
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: '2.8rem' }}>{reward.emoji}</div>
                <div>
                  <div style={{
                    fontFamily: 'Nunito', fontWeight: 900,
                    fontSize: '1.2rem', color: reward.color,
                  }}>{reward.title}</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
                    {reward.desc}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Next Milestone Progress ── */}
          {nextMilestone && (
            <div style={{
              background: '#F8FAFC', border: '1.5px dashed #CBD5E1',
              borderRadius: 16, padding: '16px 20px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ fontSize: '2rem', opacity: 0.45 }}>{nextMilestone.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>
                  Next: <strong>{nextMilestone.title}</strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 2 }}>
                  {nextMilestone.days - streak} more day{nextMilestone.days - streak !== 1 ? 's' : ''} to unlock
                </div>
                <div style={{ marginTop: 8, height: 6, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (streak / nextMilestone.days) * 100)}%`,
                    background: 'linear-gradient(90deg, #F59E0B, #EF4444)',
                    borderRadius: 99,
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* ── 30-Day Calendar Heatmap ── */}
          <div style={{
            background: 'white', border: '1.5px solid #E5E7EB',
            borderRadius: 16, padding: '20px', marginBottom: 20,
          }}>
            <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '1rem', color: '#1E293B', marginBottom: 16 }}>
              Last 30 Days
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {recentDays.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} question${day.count !== 1 ? 's' : ''}${day.completed ? ' ✓' : ''}`}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    background: day.completed ? '#22C55E' : day.isToday ? '#FEF9C3' : '#F1F5F9',
                    border: day.isToday ? '2px solid #F59E0B' : '1.5px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: day.completed ? 'white' : day.isToday ? '#D97706' : '#CBD5E1',
                    cursor: 'default',
                  }}
                >
                  {new Date(day.date + 'T00:00:00').getDate()}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: '#22C55E', display: 'inline-block' }} /> Completed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: '#F1F5F9', border: '1px solid #CBD5E1', display: 'inline-block' }} /> Missed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: '#FEF9C3', border: '2px solid #F59E0B', display: 'inline-block' }} /> Today
              </span>
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Current Streak', value: streak,          unit: streak === 1 ? 'day' : 'days',          emoji: '🔥' },
              { label: 'Best Streak',    value: longest,         unit: longest === 1 ? 'day' : 'days',         emoji: '🏅' },
              { label: 'Active Days',   value: totalActiveDays, unit: totalActiveDays === 1 ? 'day' : 'days', emoji: '📅' },
            ].map((stat, i) => (
              <div key={i} style={{
                background: 'white', border: '1.5px solid #E5E7EB',
                borderRadius: 14, padding: '16px 12px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.4rem' }}>{stat.emoji}</div>
                <div style={{
                  fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.6rem',
                  color: '#1E293B', marginTop: 4,
                }}>{stat.value}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', marginTop: 2 }}>{stat.unit}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* ── All Milestones ── */}
          <div>
            <div style={{
              fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.9rem',
              color: '#64748B', marginBottom: 12,
            }}>
              All Milestones
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MILESTONE_REWARDS.map((milestone, i) => {
                const unlocked = streak >= milestone.days
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 12,
                    background: unlocked ? milestone.bg : '#F8FAFC',
                    border: `1.5px solid ${unlocked ? milestone.color + '44' : '#E2E8F0'}`,
                    opacity: unlocked ? 1 : 0.55,
                    transition: 'opacity 0.2s',
                  }}>
                    <span style={{ fontSize: '1.6rem', filter: unlocked ? 'none' : 'grayscale(1)' }}>
                      {milestone.emoji}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: 700, fontSize: '0.85rem',
                        color: unlocked ? milestone.color : '#94A3B8',
                      }}>
                        {milestone.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 1 }}>
                        {milestone.days} day{milestone.days !== 1 ? 's' : ''} streak
                      </div>
                    </div>
                    {unlocked ? (
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700, color: milestone.color,
                        background: 'white', padding: '2px 10px', borderRadius: 99,
                        border: `1px solid ${milestone.color}33`,
                      }}>Unlocked!</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#CBD5E1', whiteSpace: 'nowrap' }}>
                        {milestone.days - streak}d to go
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
