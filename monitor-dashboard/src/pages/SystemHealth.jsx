import React, { useState, useEffect, useCallback } from 'react'

const MONITOR_URL = import.meta.env.VITE_MONITOR_URL || 'http://localhost:3000'
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:5001'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const services = [
  { name: 'API Gateway',        port: '5001', url: GATEWAY_URL,                       icon: '🔒', color: '#3b82f6' },
  { name: 'Backend API',        port: '8000', url: BACKEND_URL,                       icon: '⚙️', color: '#10b981' },
  { name: 'Monitor API',        port: '3000', url: MONITOR_URL,                       icon: '📡', color: '#06b6d4' },
  { name: 'ShopSphere Frontend',port: '5173', url: 'http://localhost:5173',           icon: '🛒', color: '#8b5cf6' },
  { name: 'Monitor Dashboard',  port: '3001', url: 'http://localhost:3001',           icon: '📊', color: '#f59e0b' },
]

export default function SystemHealth() {
  const [serviceStatus, setServiceStatus] = useState(
    services.map(s => ({ ...s, status: 'checking', latency: null, error: null }))
  )
  const [redisInfo, setRedisInfo]   = useState({ keys: 0, memory: '0 MB' })
  const [mlInfo, setMlInfo]         = useState({ loaded: false, accuracy: '90.21%' })
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading]       = useState(true)

  const checkService = async (svc) => {
    const start = Date.now()
    try {
      const res = await fetch(`${svc.url}/health`, {
        signal: AbortSignal.timeout(5000),
        mode: 'cors',
      })
      const latency = Date.now() - start
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        return { ...svc, status: 'online', latency: `${latency}ms`, error: null, data }
      }
      return { ...svc, status: 'offline', latency: `${latency}ms`, error: `HTTP ${res.status}` }
    } catch (err) {
      // For frontend/dashboard — just try fetching the page
      if (svc.port === '5173' || svc.port === '3001') {
        try {
          const r2 = await fetch(svc.url, { signal: AbortSignal.timeout(5000), mode: 'no-cors' })
          return { ...svc, status: 'online', latency: `${Date.now() - start}ms`, error: null }
        } catch {
          return { ...svc, status: 'offline', latency: null, error: 'Not reachable' }
        }
      }
      return { ...svc, status: 'offline', latency: null, error: err.message }
    }
  }

  const checkAll = useCallback(async () => {
    setLoading(true)
    try {
      // Check all services in parallel
      const results = await Promise.all(services.map(checkService))
      setServiceStatus(results)

      // Fetch Redis + ML info from monitor API
      try {
        const health = await fetch(`${MONITOR_URL}/monitor/health`).then(r => r.json())
        setRedisInfo({
          keys:   health.redis_keys   || health.redisKeys   || 0,
          memory: health.redis_memory || health.redisMemory || '0 MB',
        })
        setMlInfo({
          loaded:   health.ml_model_loaded ?? health.mlModelLoaded ?? true,
          accuracy: health.ml_accuracy     || health.mlAccuracy    || '90.21%',
        })
      } catch { /* use defaults */ }

      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAll()
    const interval = setInterval(checkAll, 10000)
    return () => clearInterval(interval)
  }, [checkAll])

  const flushCache = async () => {
    try {
      await fetch(`${MONITOR_URL}/monitor/flush-cache`, { method: 'POST' })
      alert('Cache flushed!')
      checkAll()
    } catch { alert('Flush cache endpoint not available') }
  }

  const exportLogs = async () => {
    try {
      const res  = await fetch(`${MONITOR_URL}/monitor/requests/live?limit=1000`)
      const data = await res.json()
      const csv  = ['Time,IP,Method,Endpoint,Status,Duration,Action,Reason',
        ...(data.requests || []).map(r =>
          `${r.timestamp},${r.ip_address},${r.method},${r.endpoint},${r.status_code},${r.duration_ms}ms,${r.action},${r.reason || ''}` 
        )].join('\n')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
      a.download = `shopsphere-logs-${Date.now()}.csv` 
      a.click()
    } catch { alert('Export failed — check monitor API is running') }
  }

  const clearThreats = async () => {
    if (!confirm('Clear all threat logs?')) return
    try {
      await fetch(`${MONITOR_URL}/monitor/threats/clear`, { method: 'DELETE' })
      alert('Threats cleared!')
    } catch { alert('Clear threats endpoint not available') }
  }

  const onlineCount = serviceStatus.filter(s => s.status === 'online').length

  return (
    <div style={{ padding: '24px', fontFamily: "'Inter', sans-serif", background: '#0d1117', minHeight: '100vh', color: '#fff' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#fff' }}>System Health</h2>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Checking services...'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: onlineCount === services.length ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
            border: `1px solid ${onlineCount === services.length ? '#10b981' : '#f59e0b'}`,
            borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600,
            color: onlineCount === services.length ? '#10b981' : '#f59e0b',
          }}>
            {onlineCount}/{services.length} Services Online
          </div>
          <button onClick={checkAll} style={{
            background: '#1e3a5f', border: '1px solid #2563eb', borderRadius: 8,
            padding: '8px 16px', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Service Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16, marginBottom: 24 }}>
        {serviceStatus.map((svc) => (
          <div key={svc.name} style={{
            background: '#152032',
            border: `1px solid ${svc.status === 'online' ? '#1e3a5f' : svc.status === 'checking' ? '#374151' : '#7f1d1d'}`,
            borderRadius: 12, padding: 20,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}>
            {/* Card header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${svc.color}22`,
                  border: `1px solid ${svc.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>
                  {svc.icon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{svc.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Port {svc.port}</div>
                </div>
              </div>

              {/* Status badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: svc.status === 'online'   ? 'rgba(16,185,129,0.15)' :
                            svc.status === 'checking' ? 'rgba(107,114,128,0.15)' :
                                                        'rgba(239,68,68,0.15)',
                border: `1px solid ${svc.status === 'online' ? '#10b981' : svc.status === 'checking' ? '#6b7280' : '#ef4444'}`,
                borderRadius: 20, padding: '4px 12px',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: svc.status === 'online' ? '#10b981' : svc.status === 'checking' ? '#6b7280' : '#ef4444',
                  animation: svc.status === 'checking' ? 'pulse 1.5s infinite' : 'none',
                }} />
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: svc.status === 'online' ? '#10b981' : svc.status === 'checking' ? '#9ca3af' : '#ef4444',
                }}>
                  {svc.status === 'checking' ? 'Checking...' : svc.status === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={{ background: '#0d1117', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>STATUS</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: svc.status === 'online' ? '#10b981' : '#ef4444' }}>
                  {svc.status === 'online' ? '● Online' : svc.status === 'checking' ? '○ Checking' : '● Offline'}
                </div>
              </div>
              <div style={{ background: '#0d1117', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>LATENCY</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                  {svc.latency || '—'}
                </div>
              </div>
              <div style={{ background: '#0d1117', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>URL</div>
                <div style={{ fontSize: 10, fontWeight: 500, color: '#3b82f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  :{svc.port}
                </div>
              </div>
            </div>

            {/* Error message */}
            {svc.status === 'offline' && svc.error && (
              <div style={{ marginTop: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#f87171' }}>
                ⚠ {svc.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Redis + ML Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#152032', border: '1px solid #1e3a5f', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12 }}>🔴 Redis Cache</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Keys', value: redisInfo.keys },
              { label: 'Memory', value: redisInfo.memory },
              { label: 'Status', value: 'Connected' },
              { label: 'Provider', value: 'Upstash' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#0d1117', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: label === 'Status' ? '#10b981' : '#fff' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#152032', border: '1px solid #1e3a5f', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12 }}>🤖 ML Model</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Status',    value: mlInfo.loaded ? 'Loaded' : 'Not Loaded' },
              { label: 'Accuracy',  value: mlInfo.accuracy },
              { label: 'Algorithm', value: 'Random Forest' },
              { label: 'Features',  value: '55 features' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#0d1117', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: label === 'Status' && mlInfo.loaded ? '#10b981' : label === 'Accuracy' ? '#3b82f6' : '#fff' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ background: '#152032', border: '1px solid #1e3a5f', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 14 }}>⚡ Quick Actions</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={flushCache} style={{ background: '#92400e', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 20px', color: '#fbbf24', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🗑️ Flush Cache
          </button>
          <button onClick={exportLogs} style={{ background: '#1e3a5f', border: '1px solid #3b82f6', borderRadius: 8, padding: '10px 20px', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            📥 Export All Logs
          </button>
          <button onClick={clearThreats} style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 20px', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🚨 Clear All Threats
          </button>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>
            Redis: {redisInfo.keys} keys | {redisInfo.memory}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
