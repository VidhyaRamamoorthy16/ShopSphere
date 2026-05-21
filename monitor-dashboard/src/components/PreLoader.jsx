import React, { useState, useEffect, useRef, useCallback } from 'react'

const MONITOR_URL = import.meta.env.VITE_MONITOR_URL || 'https://shopsphere-monitor.onrender.com'
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'https://shopsphere-gateway.onrender.com'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://shopsphere-atsj.onrender.com'

const SERVICES = [
  { name: 'API Gateway',  url: GATEWAY_URL, key: 'gateway', icon: '🔒', endpoints: ['/health', '/docs', '/ml/metrics'] },
  { name: 'Monitor API',  url: MONITOR_URL, key: 'monitor', icon: '📡', endpoints: ['/health', '/monitor/overview'] },
  { name: 'Backend API',  url: BACKEND_URL, key: 'backend', icon: '⚙️', endpoints: ['/health', '/api/products?limit=1'] },
]

const MAX_WAIT = 90  // seconds before showing skip button
const SKIP_AFTER = 120 // seconds — auto skip

export default function PreLoader({ onReady }) {
  const [statuses, setStatuses] = useState({
    gateway: 'waking', monitor: 'waking', backend: 'waking'
  })
  const [progress,  setProgress]  = useState(5)
  const [elapsed,   setElapsed]   = useState(0)
  const [message,   setMessage]   = useState('Sending wake-up signal to Render...')
  const [showSkip,  setShowSkip]  = useState(false)
  const [allReady,  setAllReady]  = useState(false)
  const [dots,      setDots]      = useState('')

  const readyFlags  = useRef({ gateway: false, monitor: false, backend: false })
  const startTime   = useRef(Date.now())
  const pingTimer   = useRef(null)
  const elapsedTimer= useRef(null)
  const isDone      = useRef(false)

  // Animated dots
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500)
    return () => clearInterval(t)
  }, [])

  // Elapsed counter
  useEffect(() => {
    elapsedTimer.current = setInterval(() => {
      const s = Math.floor((Date.now() - startTime.current) / 1000)
      setElapsed(s)
      if (s >= MAX_WAIT)  setShowSkip(true)
      if (s >= SKIP_AFTER && !isDone.current) handleSkip()
    }, 1000)
    return () => clearInterval(elapsedTimer.current)
  }, [])

  // Try multiple endpoints for a service
  const pingService = useCallback(async (svc) => {
    for (const endpoint of svc.endpoints) {
      try {
        const res = await fetch(`${svc.url}${endpoint}`, {
          signal: AbortSignal.timeout(8000),
          cache: 'no-store',
          mode: 'cors',
        })
        if (res.ok || res.status === 200 || res.status === 422) {
          // 422 means FastAPI docs endpoint responded — service is alive
          return true
        }
      } catch {}
    }
    return false
  }, [])

  const markReady = useCallback((key) => {
    readyFlags.current[key] = true
    setStatuses(prev => ({ ...prev, [key]: 'online' }))

    const onlineCount = Object.values(readyFlags.current).filter(Boolean).length
    const pct = Math.round((onlineCount / SERVICES.length) * 85) + 5
    setProgress(pct)

    const msgs = {
      1: 'First service is online! Waiting for others...',
      2: 'Two services online! Almost there...',
      3: 'All services online! Loading dashboard...',
    }
    if (msgs[onlineCount]) setMessage(msgs[onlineCount])

    if (onlineCount === SERVICES.length && !isDone.current) {
      isDone.current = true
      clearInterval(pingTimer.current)
      clearInterval(elapsedTimer.current)
      setAllReady(true)
      setProgress(100)
      setTimeout(onReady, 1000)
    }
  }, [onReady])

  const pingAll = useCallback(async () => {
    if (isDone.current) return

    const secs = Math.floor((Date.now() - startTime.current) / 1000)
    const msgCycle = [
      'Sending wake-up signal to Render',
      'Render is allocating compute resources',
      'Loading Python packages and ML model',
      'Connecting to Redis and Supabase',
      'Warming up request pipeline',
      'Services are starting up',
      'Still waiting — Render free tier can take up to 60s',
      'Almost ready — services are responding',
    ]
    const msgIdx = Math.min(Math.floor(secs / 10), msgCycle.length - 1)
    setMessage(msgCycle[msgIdx])

    await Promise.all(
      SERVICES.map(async (svc) => {
        if (readyFlags.current[svc.key]) return
        const ok = await pingService(svc)
        if (ok) markReady(svc.key)
        else setStatuses(prev => ({ ...prev, [svc.key]: secs > 10 ? 'waking' : 'pinging' }))
      })
    )
  }, [pingService, markReady])

  useEffect(() => {
    pingAll()
    pingTimer.current = setInterval(pingAll, 5000)
    return () => {
      clearInterval(pingTimer.current)
      clearInterval(elapsedTimer.current)
    }
  }, [pingAll])

  const handleSkip = useCallback(() => {
    if (isDone.current) return
    isDone.current = true
    clearInterval(pingTimer.current)
    clearInterval(elapsedTimer.current)
    onReady()
  }, [onReady])

  const colOf = (s) => s === 'online' ? '#10b981' : s === 'pinging' ? '#f59e0b' : '#3b82f6'
  const lblOf = (s) => s === 'online' ? 'Online ✓' : s === 'pinging' ? 'Pinging...' : 'Waking up...'

  const onlineCount = Object.values(statuses).filter(s => s === 'online').length

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', padding: '2rem',
    }}>

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:40 }}>
        <div style={{
          width:52, height:52, background:'#1d4ed8', borderRadius:14,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:26, fontWeight:900, color:'#fff',
        }}>S</div>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:'#fff' }}>ShopSphere</div>
          <div style={{ fontSize:13, color:'#6b7280' }}>Admin Console</div>
        </div>
      </div>

      {/* Card */}
      <div style={{
        background:'#111827', border:'1px solid #1f2937',
        borderRadius:20, padding:'36px 44px',
        maxWidth:500, width:'100%', textAlign:'center',
      }}>

        {/* Icon */}
        <div style={{
          width:68, height:68, borderRadius:'50%', margin:'0 auto 20px',
          background: allReady ? 'rgba(16,185,129,0.15)' : 'rgba(29,78,216,0.15)',
          border:`2px solid ${allReady ? '#10b981' : '#3b82f6'}`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:30,
        }}>
          {allReady ? '✅' : onlineCount > 0 ? '⚡' : '🔄'}
        </div>

        <h2 style={{ fontSize:20, fontWeight:700, color:'#fff', marginBottom:6 }}>
          {allReady ? 'All services online!' : `Starting up${dots}`}
        </h2>
        <p style={{ fontSize:13, color:'#6b7280', marginBottom:24, lineHeight:1.7 }}>
          {message}
        </p>

        {/* Progress bar */}
        <div style={{ background:'#1f2937', borderRadius:8, height:8, marginBottom:8, overflow:'hidden' }}>
          <div style={{
            height:'100%', background: allReady ? '#10b981' : '#1d4ed8',
            borderRadius:8, width:`${progress}%`, transition:'width 0.6s ease',
          }}/>
        </div>
        <div style={{ fontSize:12, color:'#4b5563', marginBottom:24 }}>
          {onlineCount}/{SERVICES.length} services online — {elapsed}s elapsed
        </div>

        {/* Service list */}
        <div style={{ display:'flex', flexDirection:'column', gap:8, textAlign:'left', marginBottom:20 }}>
          {SERVICES.map(svc => (
            <div key={svc.key} style={{
              display:'flex', alignItems:'center', gap:12,
              background:'#0d1117', borderRadius:10, padding:'10px 14px',
              border:`1px solid ${statuses[svc.key] === 'online' ? '#064e3b' : '#1f2937'}`,
            }}>
              <span style={{ fontSize:18 }}>{svc.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#e5e7eb' }}>{svc.name}</div>
                <div style={{ fontSize:10, color:'#4b5563', wordBreak:'break-all' }}>
                  {svc.url.replace('https://', '')}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                <div style={{
                  width:8, height:8, borderRadius:'50%',
                  background: colOf(statuses[svc.key]),
                  animation: statuses[svc.key] !== 'online' ? 'pulse 1.2s infinite' : 'none',
                }}/>
                <span style={{ fontSize:11, color: colOf(statuses[svc.key]), fontWeight:600 }}>
                  {lblOf(statuses[svc.key])}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Skip button */}
        {showSkip && !allReady && (
          <button onClick={handleSkip} style={{
            width:'100%', background:'#1f2937', border:'1px solid #374151',
            borderRadius:10, padding:'11px', color:'#9ca3af', fontSize:13,
            fontWeight:600, cursor:'pointer', marginBottom:16,
          }}>
            Skip and enter dashboard anyway →
          </button>
        )}

        {/* Info box */}
        <div style={{
          background:'rgba(29,78,216,0.08)', border:'1px solid rgba(29,78,216,0.2)',
          borderRadius:10, padding:'10px 14px', textAlign:'left',
        }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#93c5fd', marginBottom:4 }}>ℹ️ Why the wait?</div>
          <div style={{ fontSize:11, color:'#6b7280', lineHeight:1.6 }}>
            Render free tier services sleep after 15 min of inactivity.
            First wake-up takes 30–60 seconds. After {MAX_WAIT}s a skip button appears.
          </div>
        </div>
      </div>

      {/* Direct links */}
      <div style={{ marginTop:24, display:'flex', gap:20, flexWrap:'wrap', justifyContent:'center' }}>
        {[
          { l:'🛒 Visit Store',    u:'https://shop-sphere-wine.vercel.app' },
          { l:'⚙️ Gateway Health', u:`${GATEWAY_URL}/health` },
          { l:'📡 Monitor Health', u:`${MONITOR_URL}/health` },
        ].map(item => (
          <a key={item.u} href={item.u} target="_blank" rel="noreferrer"
            style={{ fontSize:12, color:'#4b5563', textDecoration:'none' }}
            onMouseEnter={e => e.target.style.color='#9ca3af'}
            onMouseLeave={e => e.target.style.color='#4b5563'}>
            {item.l}
          </a>
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}
