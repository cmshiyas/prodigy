import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Self Paced Learning'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #0e7490 60%, #06b6d4 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 360, height: 360, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)', display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 280, height: 280, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)', display: 'flex',
        }} />

        {/* Badge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 40, padding: '10px 28px',
          color: '#bae6fd', fontSize: 22, letterSpacing: 2,
          textTransform: 'uppercase', marginBottom: 32,
        }}>
          NAPLAN · OC · Selective
        </div>

        {/* Headline */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 16,
        }}>
          <div style={{
            fontSize: 80, fontWeight: 800,
            color: '#ffffff', letterSpacing: -2,
            lineHeight: 1, textAlign: 'center',
          }}>
            Self Paced
          </div>
          <div style={{
            fontSize: 80, fontWeight: 800,
            color: '#67e8f9', letterSpacing: -2,
            lineHeight: 1, textAlign: 'center',
          }}>
            Learning
          </div>
        </div>

        {/* Tagline */}
        <div style={{
          marginTop: 32, fontSize: 28,
          color: 'rgba(255,255,255,0.75)',
          textAlign: 'center', maxWidth: 700,
          lineHeight: 1.4,
        }}>
          Exam mastery for Australian students — practice smarter, score higher.
        </div>

        {/* Domain */}
        <div style={{
          position: 'absolute', bottom: 40,
          fontSize: 22, color: 'rgba(255,255,255,0.5)',
          letterSpacing: 1,
        }}>
          www.selfpaced.com.au
        </div>
      </div>
    ),
    { ...size }
  )
}
