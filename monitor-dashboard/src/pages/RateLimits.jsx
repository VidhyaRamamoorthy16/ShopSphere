import React, { useState, useEffect } from 'react'

const MONITOR = (import.meta.env.VITE_MONITOR_URL || 'http://localhost:3000')

export default function RateLimits() {
  const [data, setData] = useState({ active: [], blocked_ips: [], historical: [], total_blocked_ips: 0 })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      const res = await fetch(`${MONITOR}/monitor/rate-limits/active`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      setData(d)
      setLastUpdate(new Date().toLocaleTimeString())
      setError(null)
    } catch (e) {
      setError(`Cannot reach Monitor API: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const s = {
    page: { background: '#0F0F1A', minHeight: '100vh', padding: '20px 24px', fontFamily: 'Inter, sans-serif' },
    title: { fontSize: 20, fontWeight: 600, color: '#EAEAF5', letterSpacing: '-0.02em', marginBottom: 20 },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
    card: { background: '#1A1A2E', border: '1px solid #2D2D4E', borderRadius: 16, padding: 16 },
    cardTitle: { fontSize: 13, fontWeight: 600, color: '#EAEAF5', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    badge: (color) => ({ background: `${color}22`, color, border: `1px solid ${color}44`, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }),
    ipRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #2D2D4E22' },
    mono: { fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#EAEAF5' },
    muted: { fontSize: 11, color: '#8888AA' },
    progressWrap: { height: 6, background: '#2D2D4E', borderRadius: 3, overflow: 'hidden', marginTop: 6 },
    errorBox: { background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '12px 16px', color: '#FF4757', fontSize: 13, marginBottom: 16 },
    emptyMsg: { color: '#8888AA', fontSize: 13, textAlign: 'center', padding: '24px 0' },
    summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 },
    sumCard: { background: '#1A1A2E', border: '1px solid #2D2D4E', borderRadius: 12, padding: 14, textAlign: 'center' },
  }

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={s.title}>Rate Limits</div>
        <div style={{ fontSize: 11, color: '#8888AA' }}>{lastUpdate ? `Updated ${lastUpdate}` : 'Loading...'}</div>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      <div style={s.summaryRow}>
        {[
          { label: 'Total blocked IPs', value: data.total_blocked_ips, color: '#FF4757' },
          { label: 'Active windows', value: data.active?.length || 0, color: '#FFA502' },
          { label: 'Historical events', value: data.historical?.length || 0, color: '#8888AA' },
        ].map(({ label, value, color }) => (
          <div key={label} style={s.sumCard}>
            <div style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
            <div style={{ fontSize: 11, color: '#8888AA', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={s.grid3}>

        {/* Active rate limit windows */}
        <div style={s.card}>
          <div style={s.cardTitle}>
            Active limits
            <span style={s.badge('#FFA502')}>{data.active?.length || 0}</span>
          </div>
          {loading ? <div style={s.emptyMsg}>Loading...</div>
            : data.active?.length === 0 ? (
              <div style={s.emptyMsg}>
                No active rate limits<br />
                <span style={{ fontSize: 11, color: '#6C63FF' }}>Fire 100+ requests to trigger</span>
              </div>
            ) : data.active.map((item, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={s.mono}>{item.ip}</span>
                  <span style={{ fontSize: 12, color: item.pct > 80 ? '#FF4757' : '#FFA502', fontWeight: 600 }}>
                    {item.count}/{item.limit}
                  </span>
                </div>
                <div style={s.progressWrap}>
                  <div style={{ height: '100%', width: `${item.pct}%`, background: item.pct > 80 ? '#FF4757' : '#FFA502', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 11, color: '#8888AA', marginTop: 4 }}>
                  {item.pct}% of limit · resets in {item.ttl_seconds}s
                </div>
              </div>
            ))}
        </div>

        {/* Blocked IPs */}
        <div style={s.card}>
          <div style={s.cardTitle}>
            Blocked IPs
            <span style={s.badge('#FF4757')}>{data.blocked_ips?.length || 0}</span>
          </div>
          {loading ? <div style={s.emptyMsg}>Loading...</div>
            : data.blocked_ips?.length === 0 ? (
              <div style={s.emptyMsg}>No IPs blocked yet</div>
            ) : data.blocked_ips.map((ip, i) => (
              <div key={i} style={s.ipRow}>
                <span style={s.mono}>{ip}</span>
                <span style={s.badge('#FF4757')}>BLOCKED</span>
              </div>
            ))}
        </div>

        {/* Historical — from Supabase */}
        <div style={s.card}>
          <div style={s.cardTitle}>
            Historical
            <span style={s.badge('#8888AA')}>{data.historical?.length || 0}</span>
          </div>
          <div style={{ fontSize: 11, color: '#8888AA', marginBottom: 10 }}>From Supabase — persists forever</div>
          {loading ? <div style={s.emptyMsg}>Loading...</div>
            : data.historical?.length === 0 ? (
              <div style={s.emptyMsg}>No historical events yet</div>
            ) : data.historical.map((item, i) => (
              <div key={i} style={s.ipRow}>
                <div>
                  <div style={s.mono}>{item.ip_address}</div>
                  <div style={s.muted}>{item.endpoint || '/'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#FF4757' }}>count: {item.request_count}</div>
                  <div style={s.muted}>{item.blocked_at ? new Date(item.blocked_at).toLocaleTimeString() : ''}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
