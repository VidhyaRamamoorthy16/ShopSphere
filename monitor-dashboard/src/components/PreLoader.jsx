import React, { useState, useEffect, useRef } from 'react'

const MONITOR_URL = import.meta.env.VITE_MONITOR_URL || 'http://localhost:3000'
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:5001'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const SERVICES = [
  { name: 'API Gateway',   url: GATEWAY_URL,  icon: '🔒', key: 'gateway'  },
  { name: 'Monitor API',   url: MONITOR_URL,  icon: '📡', key: 'monitor'  },
  { name: 'Backend API',   url: BACKEND_URL,  icon: '⚙️', key: 'backend'  },
]

export default function PreLoader({ onReady }) {
  const [statuses, setStatuses]   = useState({ gateway: 'pinging', monitor: 'pinging', backend: 'pinging' })
  const [progress, setProgress]   = useState(0)
  const [message,  setMessage]    = useState('Waking up services...')
  const [dots,     setDots]       = useState('')
  const [elapsed,  setElapsed]    = useState(0)
  const [allReady, setAllReady]   = useState(false)
  const startTime = useRef(Date.now())
  const intervalRef = useRef(null)
  const timerRef    = useRef(null)
  const readyRef    = useRef({ gateway: false, monitor: false, backend: false })

  // Animated dots
  useEffect(() => {
    const d = setInterval(() => setDots(p => p.length >= 3 ? '' : p + '.'), 500)
    return () => clearInterval(d)
  }, [])

  // Elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Ping a single service
  const pingService = async (svc) => {
    try {
      const r = await fetch(`${svc.url}/health`, {
        signal: AbortSignal.timeout(6000),
        cache: 'no-store',
      })
      if (r.ok) {
        readyRef.current[svc.key] = true
        setStatuses(prev => ({ ...prev, [svc.key]: 'online' }))
        return true
      }
    } catch {}
    setStatuses(prev => ({ ...prev, [svc.key]: 'waking' }))
    return false
  }

  // Ping all services in parallel
  const pingAll = async () => {
    const results = await Promise.all(SERVICES.map(pingService))
    const ready = results.every(Boolean)

    const onlineCount = results.filter(Boolean).length
    setProgress(Math.round((onlineCount / SERVICES.length) * 100))

    const msgs = [
      'Waking up Render services',
      'Loading ML model (Random Forest)',
      'Connecting to Redis and Supabase',
      'Warming up request pipeline',
      'Almost ready',
    ]
    const idx = Math.min(Math.floor(elapsed / 12), msgs.length - 1)
    setMessage(msgs[idx])

    if (ready) {
      setAllReady(true)
      clearInterval(intervalRef.current)
      clearInterval(timerRef.current)
      setProgress(100)
      setMessage('All services online!')
      setTimeout(onReady, 800)
    }
    return ready
  }

  useEffect(() => {
    pingAll()
    intervalRef.current = setInterval(pingAll, 4000)
    return () => {
      clearInterval(intervalRef.current)
      clearInterval(timerRef.current)
    }
  }, [])

  const statusColor = (s) =>
    s === 'online' ? '#10b981' : s === 'pinging' ? '#f59e0b' : '#3b82f6'

  const statusLabel = (s) =>
    s === 'online' ? 'Online' : s === 'pinging' ? 'Pinging...' : 'Waking up...'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      padding: '2rem',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
        <div style={{
          width: 52, height: 52, background: '#1d4ed8',
          borderRadius: 14, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#fff',
        }}>S</div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>ShopSphere</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Admin Console — Loading</div>
        </div>
      </div>

      {/* Main card */}
      <div style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: 20,
        padding: '40px 48px',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
      }}>

        {/* Spinner / check */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', margin: '0 auto 24px',
          background: allReady ? 'rgba(16,185,129,0.15)' : 'rgba(29,78,216,0.15)',
          border: `2px solid ${allReady ? '#10b981' : '#3b82f6'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32,
          animation: allReady ? 'none' : 'spin-border 1.5s linear infinite',
        }}>
          {allReady ? '✅' : '⚡'}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          {allReady ? 'Ready!' : `Starting up${dots}`}
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28, lineHeight: 1.7 }}>
          {message}
        </p>

        {/* Progress bar */}
        <div style={{ background: '#1f2937', borderRadius: 8, height: 8, marginBottom: 10, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: allReady ? '#10b981' : 'linear-gradient(90deg, #1d4ed8, #3b82f6)',
            borderRadius: 8,
            width: `${progress}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 28 }}>
          {progress}% — {elapsed}s elapsed
        </div>

        {/* Service status list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
          {SERVICES.map(svc => (
            <div key={svc.key} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#0d1117', borderRadius: 10, padding: '10px 14px',
              border: '1px solid #1f2937',
            }}>
              <span style={{ fontSize: 18 }}>{svc.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{svc.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{svc.url.replace('https://', '')}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: statusColor(statuses[svc.key]),
                  animation: statuses[svc.key] !== 'online' ? 'pulse 1.5s infinite' : 'none',
                }} />
                <span style={{ fontSize: 12, color: statusColor(statuses[svc.key]), fontWeight: 600 }}>
                  {statusLabel(statuses[svc.key])}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div style={{
          marginTop: 24, background: 'rgba(29,78,216,0.1)',
          border: '1px solid rgba(29,78,216,0.2)',
          borderRadius: 10, padding: '10px 14px', textAlign: 'left',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd', marginBottom: 4 }}>ℹ️ Why the wait?</div>
          <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
            Hosted on Render free tier — services sleep after 15 min of inactivity.
            First wake-up takes 30–60 seconds. Once live, everything runs at full speed.
          </div>
        </div>
      </div>

      {/* Bottom links */}
      <div style={{ marginTop: 28, display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: '🛒 Visit Store', url: 'https://shop-sphere-wine.vercel.app' },
          { label: '⚙️ Gateway Docs', url: `${GATEWAY_URL}/docs` },
          { label: '📡 Monitor Docs', url: `${MONITOR_URL}/docs` },
        ].map(link => (
          <a key={link.url} href={link.url} target="_blank" rel="noreferrer" style={{
            fontSize: 13, color: '#4b5563', textDecoration: 'none',
          }}
          onMouseEnter={e => e.target.style.color = '#9ca3af'}
          onMouseLeave={e => e.target.style.color = '#4b5563'}>
            {link.label}
          </a>
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin-border { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
