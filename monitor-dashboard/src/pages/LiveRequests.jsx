import React, { useState, useEffect, useRef } from 'react'

const MONITOR = (import.meta.env.VITE_MONITOR_URL || 'http://localhost:3000')

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

export default function LiveRequests() {
  const [requests, setRequests] = useState([])
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const intervalRef = useRef(null)
  const wsRef = useRef(null)

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${MONITOR}/monitor/requests/live`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRequests(data.requests || [])
      setTotal(data.total || 0)
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
      req.timestamp_str || req.timestamp || '',
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
    page: { background: '#0F0F1A', minHeight: '100vh', padding: '20px 24px', fontFamily: 'Inter, sans-serif' },
    topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: 600, color: '#EAEAF5', letterSpacing: '-0.02em' },
    liveBadge: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#FF4757', fontWeight: 600 },
    liveDot: { width: 7, height: 7, borderRadius: '50%', background: '#FF4757' },
    controls: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
    filterBtn: (active) => ({
      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1px solid ${active ? '#6C63FF' : '#2D2D4E'}`,
      background: active ? 'rgba(108,99,255,0.2)' : '#1A1A2E', color: active ? '#6C63FF' : '#8888AA', transition: 'all 0.15s'
    }),
    pauseBtn: { padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid #2D2D4E', background: paused ? 'rgba(255,165,2,0.2)' : '#1A1A2E', color: paused ? '#FFA502' : '#8888AA' },
    updateTime: { fontSize: 11, color: '#8888AA', marginLeft: 'auto' },
    errorBox: { background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '12px 16px', color: '#FF4757', fontSize: 13, marginBottom: 16 },
    emptyBox: { background: '#1A1A2E', border: '1px solid #2D2D4E', borderRadius: 16, padding: 48, textAlign: 'center', color: '#8888AA', fontSize: 14 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
    th: { padding: '10px 12px', textAlign: 'left', color: '#8888AA', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2D2D4E' },
    card: { background: '#1A1A2E', border: '1px solid #2D2D4E', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 },
    statCard: (color) => ({ background: '#1A1A2E', border: `1px solid #2D2D4E`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }),
    statNum: (color) => ({ fontSize: 24, fontWeight: 700, color: color, letterSpacing: '-0.02em' }),
    statLabel: { fontSize: 11, color: '#8888AA', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' },
  }

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={s.title}>Live Requests</div>
          <div style={s.liveBadge}><div style={s.liveDot} /> LIVE</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, padding:'4px 10px', background: wsConnected ? 'rgba(0,229,160,0.1)' : 'rgba(255,184,48,0.1)', borderRadius:20, border:`1px solid ${wsConnected ? 'rgba(0,229,160,0.3)' : 'rgba(255,184,48,0.3)'}` }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background: wsConnected ? '#00E5A0' : '#FFB830', animation:'pulse 2s infinite' }} />
            <span style={{ color: wsConnected ? '#00E5A0' : '#FFB830', fontWeight:500 }}>
              {wsConnected ? 'WebSocket — live' : 'Polling — 2s'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#8888AA' }}>
            {lastUpdate ? `Updated ${lastUpdate}` : 'Connecting...'}
          </div>
        </div>
      </div>

      <div style={s.statsRow}>
        {[
          { label: 'Total', count: counts.ALL, color: '#6C63FF' },
          { label: 'Allowed', count: counts.ALLOWED, color: '#00D4AA' },
          { label: 'Blocked', count: counts.BLOCKED, color: '#FF4757' },
          { label: 'Errors', count: counts.ERROR, color: '#8888AA' },
        ].map(({ label, count, color }) => (
          <div key={label} style={s.statCard(color)}>
            <div style={s.statNum(color)}>{count}</div>
            <div style={s.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {error && <div style={s.errorBox}>{error} — Is Monitor API running on port 3000?</div>}

      <div style={s.controls}>
        {['ALL', 'ALLOWED', 'BLOCKED', 'ERROR'].map(f => (
          <button key={f} style={s.filterBtn(filter === f)} onClick={() => setFilter(f)}>
            {f} {counts[f] > 0 ? `(${counts[f]})` : ''}
          </button>
        ))}
        <button style={s.pauseBtn} onClick={() => setPaused(p => !p)}>
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button style={{ ...s.pauseBtn, marginLeft: 4 }} onClick={fetchRequests}>↻ Refresh</button>
        <button onClick={exportCSV}>Export CSV</button>
      </div>

      {loading ? (
        <div style={s.emptyBox}>Loading requests...</div>
      ) : filtered.length === 0 ? (
        <div style={s.emptyBox}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
          <div style={{ marginBottom: 8 }}>No {filter !== 'ALL' ? filter.toLowerCase() + ' ' : ''}requests yet</div>
          <div style={{ fontSize: 12, color: '#6C63FF', marginTop: 8 }}>
            Send a request through port 5001 to see it here
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#8888AA', marginTop: 12, background: '#0F0F1A', padding: '8px 16px', borderRadius: 8, display: 'inline-block' }}>
            curl http://localhost:5001/api/products
          </div>
        </div>
      ) : (
        <div style={s.card}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Time', 'IP Address', 'Method', 'Endpoint', 'Status', 'Duration', 'Action', 'Reason'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => {
                const ac = ACTION_COLORS[req.action] || ACTION_COLORS.ERROR
                const mc = METHOD_COLORS[req.method] || METHOD_COLORS.GET
                return (
                  <tr key={i} style={{
                    borderLeft: `3px solid ${ac.border}`,
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    transition: 'background 0.15s'
                  }}>
                    <td style={{ padding: '10px 12px', color: '#8888AA', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {req.timestamp || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#EAEAF5' }}>
                      {req.ip || '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: mc.bg, color: mc.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                        {req.method}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#EAEAF5', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.path}
                    </td>
                    <td style={{ padding: '10px 12px', color: req.status >= 400 ? '#FF4757' : '#00D4AA', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>
                      {req.status}
                    </td>
                    <td style={{ padding: '10px 12px', color: req.duration_ms > 500 ? '#FFA502' : '#8888AA', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                      {req.duration_ms}ms
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: ac.bg, color: ac.color, border: `1px solid ${ac.border}33`, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>
                        {req.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#FF4757', fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
