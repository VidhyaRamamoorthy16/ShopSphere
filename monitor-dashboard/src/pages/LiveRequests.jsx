import React, { useState, useEffect, useRef } from 'react'

const MONITOR = (import.meta.env.VITE_MONITOR_URL || 'https://shopsphere-monitor.onrender.com')

// ── Demo data shown when Redis has no real traffic ──────────────────────
const DEMO_REQUESTS = [
  { timestamp: new Date(Date.now() - 2000).toISOString(),  ip_address: '103.21.244.1',  method: 'GET',  endpoint: '/api/products',           status_code: 200, duration_ms: 58,  action: 'allowed', reason: '' },
  { timestamp: new Date(Date.now() - 4000).toISOString(),  ip_address: '185.220.101.4', method: 'POST', endpoint: '/api/auth/login',          status_code: 403, duration_ms: 45,  action: 'blocked', reason: 'SQL Injection' },
  { timestamp: new Date(Date.now() - 7000).toISOString(),  ip_address: '45.142.212.10', method: 'GET',  endpoint: '/api/products?category=Electronics', status_code: 200, duration_ms: 62, action: 'allowed', reason: '' },
  { timestamp: new Date(Date.now() - 10000).toISOString(), ip_address: '91.108.4.22',   method: 'POST', endpoint: '/api/cart',                status_code: 200, duration_ms: 74, action: 'allowed', reason: '' },
  { timestamp: new Date(Date.now() - 13000).toISOString(), ip_address: '31.13.64.15',   method: 'GET',  endpoint: "/api/products?search=<script>alert(1)</script>", status_code: 403, duration_ms: 38, action: 'blocked', reason: 'XSS Attack' },
  { timestamp: new Date(Date.now() - 16000).toISOString(), ip_address: '142.250.1.5',   method: 'GET',  endpoint: '/api/products/electronics-1', status_code: 200, duration_ms: 55, action: 'allowed', reason: '' },
  { timestamp: new Date(Date.now() - 19000).toISOString(), ip_address: '52.26.1.8',     method: 'POST', endpoint: '/api/wishlist',            status_code: 200, duration_ms: 68, action: 'allowed', reason: '' },
  { timestamp: new Date(Date.now() - 22000).toISOString(), ip_address: '178.62.1.33',   method: 'GET',  endpoint: '/api/products?file=../../etc/passwd', status_code: 403, duration_ms: 32, action: 'blocked', reason: 'Path Traversal' },
  { timestamp: new Date(Date.now() - 25000).toISOString(), ip_address: '66.249.66.1',   method: 'POST', endpoint: '/api/auth/login',          status_code: 403, duration_ms: 41, action: 'blocked', reason: 'Brute Force' },
  { timestamp: new Date(Date.now() - 28000).toISOString(), ip_address: '103.21.244.2',  method: 'GET',  endpoint: '/api/products?category=Fashion', status_code: 200, duration_ms: 59, action: 'allowed', reason: '' },
  { timestamp: new Date(Date.now() - 31000).toISOString(), ip_address: '8.8.8.8',       method: 'GET',  endpoint: '/api/orders',             status_code: 200, duration_ms: 82, action: 'allowed', reason: '' },
  { timestamp: new Date(Date.now() - 34000).toISOString(), ip_address: '1.1.1.1',       method: 'GET',  endpoint: '/api/products?id=1 UNION SELECT * FROM users', status_code: 403, duration_ms: 29, action: 'blocked', reason: 'SQL Injection' },
]

const METHOD_COLORS = {
  GET: { bg: '#e3f2fd', color: '#0c447c' },
  POST: { bg: '#e8f5e9', color: '#27500a' },
  PUT: { bg: '#fff8e1', color: '#633806' },
  DELETE: { bg: '#ffebee', color: '#791f1f' },
  PATCH: { bg: '#f3e5f5', color: '#6a1b9a' },
}

const ACTION_COLORS = {
  ALLOWED: { bg: 'rgba(0,212,170,0.12)', color: '#00D4AA', border: '#00D4AA' },
  BLOCKED: { bg: 'rgba(255,71,87,0.12)', color: '#FF4757', border: '#FF4757' },
  FLAGGED: { bg: 'rgba(255,165,2,0.12)', color: '#FFA502', border: '#FFA502' },
  ERROR:   { bg: 'rgba(136,136,170,0.12)', color: '#8888AA', border: '#8888AA' },
}

const formatTime = (ts) => {
  if (!ts) return '—';
  try {
    const d = new Date(ts.includes('Z') ? ts : ts.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString();
  } catch (e) {
    return ts;
  }
}

export default function LiveRequests() {
  const [requests, setRequests] = useState([])
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const intervalRef = useRef(null)
  const wsRef = useRef(null)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${MONITOR}/monitor/requests/live`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const fetched = data.requests || []
      if (!fetched || fetched.length === 0) {
        setIsDemoMode(true)
        setRequests(DEMO_REQUESTS)
        setTotal(DEMO_REQUESTS.length)
      } else {
        setIsDemoMode(false)
        setRequests(fetched)
        setTotal(data.total || 0)
      }
      setLastUpdate(new Date().toLocaleTimeString())
      setError(null)
    } catch (e) {
      setError(`Cannot reach Monitor API: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let pollInterval = null

    const startPolling = () => {
      if (!pollInterval) {
        fetchRequests()
        pollInterval = setInterval(() => { if (!paused) fetchRequests() }, 2000)
      }
    }

    const connectWS = () => {
      try {
        const wsUrl = MONITOR.replace('http://', 'ws://').replace('https://', 'wss://')
        const ws = new WebSocket(`${wsUrl}/ws`)
        wsRef.current = ws
        ws.onopen = () => {
          setWsConnected(true)
          if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
        }
        ws.onmessage = (e) => {
          if (paused) return
          const msg = JSON.parse(e.data)
          if (msg.type === 'new_request' && msg.request?.ip) {
            setRequests(prev => [msg.request, ...prev.slice(0, 99)])
          }
          if (msg.stats) setTotal(msg.stats.total_requests || 0)
        }
        ws.onclose = () => { setWsConnected(false); startPolling() }
        ws.onerror = () => { setWsConnected(false); startPolling() }
      } catch (e) { startPolling() }
    }

    fetchRequests()
    connectWS()

    return () => {
      if (wsRef.current) wsRef.current.close()
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [])

  const filtered = filter === 'ALL'
    ? requests
    : requests.filter(r => r.action === filter)

  const counts = {
    ALL: requests.length,
    ALLOWED: requests.filter(r => r.action === 'ALLOWED').length,
    BLOCKED: requests.filter(r => r.action === 'BLOCKED').length,
    ERROR: requests.filter(r => r.action === 'ERROR').length,
  }

  const exportCSV = () => {
    if (requests.length === 0) {
      alert('No requests to export yet. Send some requests through port 5001 first.')
      return
    }

    const headers = ['Timestamp', 'IP Address', 'Method', 'Endpoint', 'Status', 'Duration (ms)', 'Action', 'Reason']

    const rows = requests.map(req => [
      formatTime(req.timestamp_str || req.timestamp || ''),
      req.ip || '',
      req.method || '',
      req.path || '',
      req.status || '',
      req.duration_ms || '',
      req.action || '',
      req.reason || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `shieldmart-requests-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const s = {
    page: { background: '#0F0F1A', minHeight: '100vh', padding: isMobile ? '12px' : '24px', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' },
    topBar: { display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: isMobile ? 14 : 20, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 0 },
    title: { fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#EAEAF5', letterSpacing: '-0.02em', marginBottom: 2 },
    liveBadge: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#FF4757', fontWeight: 600 },
    liveDot: { width: 7, height: 7, borderRadius: '50%', background: '#FF4757' },
    controls: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: isMobile ? 12 : 16, overflowX: 'auto', paddingBottom: 4, flexWrap: isMobile ? 'nowrap' : 'wrap' },
    filterBtn: (active) => ({
      padding: isMobile ? '6px 12px' : '7px 16px', borderRadius: 20, fontSize: isMobile ? 11 : 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${active ? '#2563eb' : '#1f2937'}`,
      background: active ? 'rgba(37,99,235,0.15)' : 'transparent', color: active ? '#60a5fa' : '#6b7280', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0
    }),
    pauseBtn: { padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid #2D2D4E', background: paused ? 'rgba(255,165,2,0.2)' : '#1A1A2E', color: paused ? '#FFA502' : '#8888AA' },
    updateTime: { fontSize: 11, color: '#8888AA', marginLeft: 'auto' },
    errorBox: { background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '12px 16px', color: '#FF4757', fontSize: 13, marginBottom: 16 },
    emptyBox: { background: '#1A1A2E', border: '1px solid #2D2D4E', borderRadius: 16, padding: 48, textAlign: 'center', color: '#8888AA', fontSize: 14 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
    th: { padding: '10px 12px', textAlign: 'left', color: '#8888AA', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2D2D4E' },
    card: { background: '#1A1A2E', border: '1px solid #2D2D4E', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
    statsRow: { display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 8 : 14, marginBottom: isMobile ? 12 : 18 },
    statCard: (color) => ({ background: '#111827', border: `1px solid #1f2937`, borderRadius: 12, padding: isMobile ? '10px 12px' : '14px 18px', textAlign: 'center' }),
    statNum: (color) => ({ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: color, letterSpacing: '-0.02em' }),
    statLabel: { fontSize: isMobile ? 9 : 10, color: '#6b7280', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 },
  }

  return (
    <div style={s.page}>
      {/* Page header */}
      <div style={s.topBar}>
        <div>
          <h2 style={s.title}>Live Requests</h2>
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            Real-time API traffic • Polling every 2s
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            background:   '#111827',
            border:       '1px solid #1f2937',
            borderRadius: 10,
            padding:      '6px 12px',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }}/>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>
              Polling — 2s
            </span>
          </div>
          <button onClick={() => setRequests([])} style={{
            background:   '#111827',
            border:       '1px solid #1f2937',
            borderRadius: 10,
            padding:      '6px 12px',
            color:        '#6b7280',
            fontSize:     11,
            fontWeight:   600,
            cursor:       'pointer',
          }}>
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Stat cards — 2x2 on mobile, 4x1 on desktop */}
      <div style={s.statsRow}>
        {[
          { label: 'TOTAL',   value: requests.length, color: '#3b82f6' },
          { label: 'ALLOWED', value: requests.filter(r => r.action === 'allowed' || (r.status_code >= 200 && r.status_code < 400)).length, color: '#10b981' },
          { label: 'BLOCKED', value: requests.filter(r => r.action === 'blocked' || r.status_code >= 400).length, color: '#ef4444' },
          { label: 'ERRORS',  value: requests.filter(r => r.status_code >= 500).length, color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background:   '#111827',
            border:       '1px solid #1f2937',
            borderRadius: 12,
            padding:      isMobile ? '10px 12px' : '14px 18px',
          }}>
            <div style={{ fontSize: isMobile ? 9 : 10, color: '#6b7280', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {error && <div style={s.errorBox}>{error} — Is Monitor API running on port 3000?</div>}

      {/* Filter buttons */}
      <div style={s.controls}>
        {['ALL', 'ALLOWED', 'BLOCKED', 'ERROR'].map(f => (
          <button key={f} style={s.filterBtn(filter === f)} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {/* Demo banner */}
      {isDemoMode && (
        <div style={{
          background:   'rgba(245,158,11,0.08)',
          border:       '1px solid rgba(245,158,11,0.25)',
          borderRadius: 10,
          padding:      '10px 16px',
          marginBottom: 12,
          fontSize:     12,
          color:        '#f59e0b',
          fontWeight:   600,
          display:      'flex',
          alignItems:   'center',
          gap:          8,
        }}>
          🎭 Demo Mode — showing sample requests.
          <a href="https://shop-sphere-wine.vercel.app" target="_blank" rel="noreferrer"
            style={{ color:'#60a5fa', fontWeight:700, textDecoration:'none', marginLeft:4 }}>
            Browse store to see real traffic →
          </a>
        </div>
      )}

      {/* ── REQUESTS FEED ── */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
          Loading requests...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>�</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
            No requests yet
          </div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            Browse the ShopSphere store to generate live traffic
          </div>
          <a
            href="https://shop-sphere-wine.vercel.app"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-block', marginTop: 14,
              background: '#2563eb', color: '#fff',
              borderRadius: 10, padding: '8px 20px',
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>
            Open Store →
          </a>
        </div>
      ) : isMobile ? (
        /* ── MOBILE: Card list view ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px' }}>
          {filtered.map((req, i) => {
            const isBlocked  = req.action === 'blocked'  || req.status_code >= 400
            const isAllowed  = req.action === 'allowed'  || (req.status_code >= 200 && req.status_code < 300)
            const statusColor = isBlocked ? '#ef4444' : isAllowed ? '#10b981' : '#f59e0b'

            const methodColor = {
              GET:    '#3b82f6',
              POST:   '#10b981',
              PUT:    '#f59e0b',
              DELETE: '#ef4444',
              PATCH:  '#8b5cf6',
            }[req.method] || '#6b7280'

            return (
              <div key={i} style={{
                background:   '#111827',
                border:       `1px solid ${isBlocked ? 'rgba(239,68,68,0.2)' : '#1f2937'}`,
                borderRadius: 12,
                padding:      '12px 14px',
                borderLeft:   `3px solid ${statusColor}`,
              }}>

                {/* Row 1: Method + Path + Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    background:   `${methodColor}22`,
                    color:        methodColor,
                    border:       `1px solid ${methodColor}44`,
                    borderRadius: 6,
                    padding:      '2px 8px',
                    fontSize:     10,
                    fontWeight:   700,
                    flexShrink:   0,
                  }}>
                    {req.method || 'GET'}
                  </span>
                  <span style={{
                    fontSize:     12,
                    color:        '#e5e7eb',
                    fontWeight:   500,
                    flex:         1,
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                  }}>
                    {req.endpoint || req.path || '/'}
                  </span>
                  <span style={{
                    fontSize:     11,
                    fontWeight:   700,
                    color:        statusColor,
                    flexShrink:   0,
                  }}>
                    {req.status_code || '—'}
                  </span>
                </div>

                {/* Row 2: IP + Time + Duration */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                    🌐 {req.ip_address || req.ip || 'unknown'}
                  </span>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>
                    ⏱ {req.duration_ms ? `${parseFloat(req.duration_ms).toFixed(0)}ms` : '—'}
                  </span>
                  <span style={{ fontSize: 11, color: '#4b5563', marginLeft: 'auto' }}>
                    {req.timestamp
                      ? new Date(req.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                      : '—'}
                  </span>
                </div>

                {/* Row 3: Action badge + threat reason */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    background:   isBlocked ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    color:        isBlocked ? '#ef4444' : '#10b981',
                    border:       `1px solid ${isBlocked ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                    borderRadius: 20,
                    padding:      '2px 10px',
                    fontSize:     10,
                    fontWeight:   700,
                    textTransform:'uppercase',
                  }}>
                    {isBlocked ? '🚫 Blocked' : '✅ Allowed'}
                  </span>
                  {req.reason && (
                    <span style={{
                      fontSize:   11,
                      color:      '#f59e0b',
                      fontWeight: 500,
                    }}>
                      ⚠️ {req.reason}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── DESKTOP: Table view ── */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1f2937' }}>
                {['Time', 'IP Address', 'Method', 'Endpoint', 'Status', 'Duration', 'Action', 'Reason'].map(h => (
                  <th key={h} style={{
                    padding:   '10px 14px',
                    textAlign: 'left',
                    fontSize:  11,
                    fontWeight:700,
                    color:     '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace:'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => {
                const isBlocked   = req.action === 'blocked' || req.status_code >= 400
                const isAllowed   = req.action === 'allowed' || (req.status_code >= 200 && req.status_code < 300)
                const statusColor = isBlocked ? '#ef4444' : isAllowed ? '#10b981' : '#f59e0b'
                const methodColor = { GET:'#3b82f6', POST:'#10b981', PUT:'#f59e0b', DELETE:'#ef4444', PATCH:'#8b5cf6' }[req.method] || '#6b7280'

                return (
                  <tr key={i} style={{
                    borderBottom: '1px solid #1f2937',
                    background:   i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    transition:   'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {req.timestamp
                        ? new Date(req.timestamp).toLocaleTimeString('en-US', { hour12: false })
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#9ca3af', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {req.ip_address || req.ip || '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        background:   `${methodColor}22`, color: methodColor,
                        border:       `1px solid ${methodColor}44`,
                        borderRadius: 6, padding: '2px 8px',
                        fontSize: 10, fontWeight: 700,
                      }}>
                        {req.method || 'GET'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#e5e7eb', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.endpoint || req.path || '/'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: statusColor }}>
                      {req.status_code || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                      {req.duration_ms ? `${parseFloat(req.duration_ms).toFixed(0)}ms` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        background:   isBlocked ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        color:        isBlocked ? '#ef4444' : '#10b981',
                        border:       `1px solid ${isBlocked ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                        borderRadius: 20, padding: '3px 10px',
                        fontSize: 10, fontWeight: 700,
                      }}>
                        {isBlocked ? '🚫 Blocked' : '✅ Allowed'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#f59e0b', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.reason || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
