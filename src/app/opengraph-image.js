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
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0e7490 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorative circles */}
        <div style={{ position: 'absolute', top: -100, right: 380, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex' }} />

        {/* LEFT: Text content */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '60px 0 60px 72px', width: 580, flexShrink: 0 }}>
          {/* Badge */}
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 40, padding: '8px 22px',
            color: '#bae6fd', fontSize: 18, letterSpacing: 2,
            textTransform: 'uppercase', marginBottom: 28,
            width: 'fit-content',
          }}>
            NAPLAN · OC · Selective
          </div>

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
            <div style={{ fontSize: 78, fontWeight: 800, color: '#ffffff', letterSpacing: -2, lineHeight: 1 }}>
              Self Paced
            </div>
            <div style={{ fontSize: 78, fontWeight: 800, color: '#67e8f9', letterSpacing: -2, lineHeight: 1 }}>
              Learning
            </div>
          </div>

          {/* Tagline */}
          <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.72)', lineHeight: 1.45, maxWidth: 460 }}>
            Exam mastery for Australian students — practice smarter, score higher.
          </div>

          {/* Domain */}
          <div style={{ marginTop: 36, fontSize: 20, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>
            www.selfpaced.com.au
          </div>
        </div>

        {/* RIGHT: Hero Illustration */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, paddingRight: 40, paddingTop: 20 }}>
          <svg viewBox="0 0 440 360" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 480, height: 'auto' }}>
            <circle cx="390" cy="72" r="100" fill="#FFF3E6" />
            <circle cx="52" cy="308" r="68" fill="#EDE9FE" opacity="0.7" />
            <circle cx="405" cy="308" r="44" fill="#E0F7FA" opacity="0.6" />
            {/* desk */}
            <rect x="62" y="252" width="316" height="20" rx="10" fill="#E8D0A8" />
            <rect x="86" y="272" width="16" height="76" rx="8" fill="#D4A07A" />
            <rect x="338" y="272" width="16" height="76" rx="8" fill="#D4A07A" />
            {/* books */}
            <rect x="68" y="220" width="80" height="13" rx="4" fill="#52C41A" /><rect x="68" y="220" width="7" height="13" rx="3" fill="#3d9c12" />
            <rect x="71" y="207" width="74" height="13" rx="4" fill="#FF6B35" /><rect x="71" y="207" width="7" height="13" rx="3" fill="#c95522" />
            <rect x="74" y="194" width="68" height="13" rx="4" fill="#7C3AED" /><rect x="74" y="194" width="7" height="13" rx="3" fill="#6027cc" />
            <rect x="77" y="181" width="62" height="13" rx="4" fill="#4A90D9" /><rect x="77" y="181" width="7" height="13" rx="3" fill="#3270b8" />
            {/* laptop */}
            <rect x="186" y="177" width="152" height="75" rx="9" fill="#1E1B4B" />
            <rect x="192" y="183" width="140" height="62" rx="6" fill="#2563EB" />
            <rect x="202" y="193" width="68" height="5" rx="2.5" fill="white" opacity="0.7" />
            <rect x="202" y="203" width="52" height="5" rx="2.5" fill="white" opacity="0.5" />
            <rect x="202" y="213" width="82" height="5" rx="2.5" fill="white" opacity="0.6" />
            <rect x="202" y="223" width="44" height="5" rx="2.5" fill="#FFD580" opacity="0.9" />
            <circle cx="292" cy="212" r="16" fill="#52C41A" />
            <path d="M284 212 L290 219 L301 204" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="170" y="252" width="184" height="12" rx="6" fill="#2D2A5E" />
            {/* student body */}
            <rect x="304" y="186" width="60" height="66" rx="22" fill="#FF6B35" />
            <rect x="323" y="194" width="22" height="5" rx="2.5" fill="#c95522" />
            {/* head */}
            <circle cx="334" cy="151" r="42" fill="#FFD580" />
            {/* hair */}
            <ellipse cx="334" cy="115" rx="42" ry="17" fill="#3D2000" />
            <ellipse cx="297" cy="139" rx="13" ry="20" fill="#3D2000" />
            <ellipse cx="371" cy="139" rx="13" ry="20" fill="#3D2000" />
            {/* eyes */}
            <circle cx="320" cy="147" r="9" fill="white" />
            <circle cx="348" cy="147" r="9" fill="white" />
            <circle cx="321" cy="148" r="5" fill="#2D1B0E" />
            <circle cx="349" cy="148" r="5" fill="#2D1B0E" />
            <circle cx="323" cy="146" r="2" fill="white" />
            <circle cx="351" cy="146" r="2" fill="white" />
            <path d="M313 135 Q320 130 327 135" stroke="#3D2000" strokeWidth="2.8" strokeLinecap="round" fill="none" />
            <path d="M341 135 Q348 130 355 135" stroke="#3D2000" strokeWidth="2.8" strokeLinecap="round" fill="none" />
            <circle cx="306" cy="162" r="10" fill="#FFB347" opacity="0.4" />
            <circle cx="362" cy="162" r="10" fill="#FFB347" opacity="0.4" />
            <path d="M319 167 Q334 180 349 167" stroke="#2D1B0E" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            {/* graduation cap */}
            <rect x="300" y="104" width="68" height="12" rx="3" fill="#1E1B4B" />
            <polygon points="334,83 382,104 286,104" fill="#1E1B4B" />
            <line x1="382" y1="104" x2="390" y2="127" stroke="#FF6B35" strokeWidth="4" strokeLinecap="round" />
            <circle cx="390" cy="133" r="7" fill="#FF6B35" />
            {/* stars */}
            <path d="M46 86 L50 100 L65 100 L54 109 L58 123 L46 114 L34 123 L38 109 L27 100 L42 100 Z" fill="#FFD580" />
            <path d="M388 182 L391 191 L401 191 L393 197 L396 206 L388 200 L380 206 L383 197 L375 191 L385 191 Z" fill="#FF6B35" opacity="0.85" />
            <path d="M16 215 L18 222 L26 222 L20 227 L22 234 L16 230 L10 234 L12 227 L6 222 L14 222 Z" fill="#7C3AED" opacity="0.75" />
            {/* pencil */}
            <g transform="rotate(-38, 158, 96)">
              <rect x="153" y="64" width="10" height="56" rx="4" fill="#FFD580" />
              <rect x="153" y="64" width="10" height="9" rx="3" fill="#94A3B8" />
              <polygon points="153,120 163,120 158,136" fill="#FF6B35" />
              <rect x="153" y="111" width="10" height="5" fill="#FFB347" />
            </g>
            {/* question bubble */}
            <circle cx="158" cy="50" r="30" fill="#7C3AED" />
            <circle cx="158" cy="50" r="26" fill="#8B5CF6" />
            <path d="M151 42 Q151 32 158 32 Q166 32 166 41 Q166 49 159 51 L159 56" stroke="white" strokeWidth="3.8" strokeLinecap="round" fill="none" />
            <circle cx="159" cy="64" r="3.2" fill="white" />
            {/* lightbulb */}
            <circle cx="44" cy="155" r="24" fill="#FFD580" />
            <rect x="38" y="174" width="12" height="11" rx="3" fill="#94A3B8" />
            <rect x="39" y="185" width="10" height="5" rx="2.5" fill="#7A8C9E" />
            <line x1="44" y1="127" x2="44" y2="121" stroke="#FFB347" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="66" y1="136" x2="71" y2="131" stroke="#FFB347" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="22" y1="136" x2="17" y2="131" stroke="#FFB347" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="72" y1="155" x2="78" y2="155" stroke="#FFB347" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="16" y1="155" x2="10" y2="155" stroke="#FFB347" strokeWidth="2.5" strokeLinecap="round" />
            {/* sparkles */}
            <circle cx="412" cy="138" r="5" fill="#FF6B35" />
            <circle cx="423" cy="154" r="3" fill="#FFD580" />
            <circle cx="410" cy="168" r="3.5" fill="#7C3AED" />
            <circle cx="28" cy="262" r="4" fill="#52C41A" />
            <circle cx="15" cy="278" r="2.5" fill="#4A90D9" />
          </svg>
        </div>
      </div>
    ),
    { ...size }
  )
}
