import React, { useState, useEffect } from 'react'

const S = {
  content: { padding:'24px' },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' },
  title: { fontSize:'20px', fontWeight:'600', color:'#EAEAF5' },
  grid3: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px', marginBottom:'20px' },
  card: { background:'#1A1A2E', border:'1px solid #2D2D4E', borderRadius:'16px', padding:'20px' },
  serviceName: { fontSize:'14px', fontWeight:'600', color:'#EAEAF5', marginBottom:'4px' },
  servicePort: { fontSize:'12px', color:'#8888AA', marginBottom:'12px' },
  statusRow: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' },
  statusLabel: { fontSize:'12px', color:'#8888AA' },
  statusValue: (color) => ({ fontSize:'12px', fontWeight:'600', color }),
  dot: (color) => ({ width:'8px', height:'8px', borderRadius:'50%', background:color }),
  btn: { padding:'8px 16px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'500', background:'#6C63FF', color:'#fff', marginRight:'8px' },
  btnRed: { padding:'8px 16px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'500', background:'#FF4757', color:'#fff', marginRight:'8px' },
  btnAmber: { padding:'8px 16px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'500', background:'#FFA502', color:'#000', marginRight:'8px' },
}

const COLORS = {
  purple: '#6C63FF',
  red: '#FF4757',
  orange: '#FFA502',
  teal: '#00D4AA'
}

const BASE = 'http://localhost:3000'

export default function SystemHealth() {
  const [healthData, setHealthData] = useState([])
  const [redisInfo, setRedisInfo] = useState({ keys: 0, memory: '0 MB' })
  const [loading, setLoading] = useState({ flush: false, export: false, clear: false })
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch(`${BASE}/monitor/health`)
        const data = await res.json()
        
        const svcList = data.services || []
        const redis = data.redis || {}
        
        setHealthData(svcList)
        setRedisInfo({ 
          keys: redis.keys || 0, 
          memory: redis.memory || '0 MB' 
        })
      } catch (e) {
        console.log('Health check failed:', e)
      }
    }
    
    fetchHealth()
    const interval = setInterval(fetchHealth, 10000)
    return () => clearInterval(interval)
  }, [])

  const flushCache = async () => {
    setLoading({ ...loading, flush: true })
    try {
      const res = await fetch(`${BASE}/api/admin/flush-cache`, { method: 'POST' })
      const data = await res.json()
      setMessage(`✅ ${data.message || 'Cache flushed'}`)
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setMessage('❌ Failed to flush cache')
    }
    setLoading({ ...loading, flush: false })
  }

  const exportLogs = async () => {
    setLoading({ ...loading, export: true })
    try {
      const res = await fetch(`${BASE}/api/admin/export-logs`)
      if (!res.ok) throw new Error('Export failed')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `all_logs_${new Date().toISOString().slice(0,10)}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      
      setMessage('✅ Logs exported')
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setMessage('❌ Export failed')
    }
    setLoading({ ...loading, export: false })
  }

  const clearThreats = async () => {
    setLoading({ ...loading, clear: true })
    try {
      const res = await fetch(`${BASE}/api/admin/clear-threats`, { method: 'POST' })
      const data = await res.json()
      setMessage(`✅ ${data.message || 'Threats cleared'}`)
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setMessage('❌ Failed to clear threats')
    }
    setLoading({ ...loading, clear: false })
  }

  return (
    <div style={S.content}>
      <div style={S.header}>
        <div style={S.title}>System Health</div>
      </div>

      <div style={S.grid3}>
        {healthData.map((svc, i) => (
          <div key={i} style={S.card}>
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px'}}>
              <div style={S.dot(svc.status === 'online' ? COLORS.teal : COLORS.red)}></div>
              <div style={S.serviceName}>{svc.name}</div>
            </div>
            <div style={S.servicePort}>Port {svc.port}</div>
            <div style={S.statusRow}>
              <span style={S.statusLabel}>Status</span>
              <span style={S.statusValue(svc.status === 'online' ? COLORS.teal : COLORS.red)}>
                {svc.status === 'online' ? '● Online' : '● Offline'}
              </span>
            </div>
            <div style={S.statusRow}>
              <span style={S.statusLabel}>Uptime</span>
              <span style={S.statusValue('#EAEAF5')}>{svc.uptime}</span>
            </div>
            <div style={S.statusRow}>
              <span style={S.statusLabel}>Response</span>
              <span style={S.statusValue('#EAEAF5')}>{svc.responseTime}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{...S.card, display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap'}}>
        <button 
          style={{...S.btnAmber, opacity: loading.flush ? 0.6 : 1}} 
          onClick={flushCache}
          disabled={loading.flush}
        >
          {loading.flush ? '🗑 Flushing...' : '🗑 Flush Cache'}
        </button>
        <button 
          style={{...S.btn, opacity: loading.export ? 0.6 : 1}} 
          onClick={exportLogs}
          disabled={loading.export}
        >
          {loading.export ? '📥 Exporting...' : '📥 Export All Logs'}
        </button>
        <button 
          style={{...S.btnRed, opacity: loading.clear ? 0.6 : 1}} 
          onClick={clearThreats}
          disabled={loading.clear}
        >
          {loading.clear ? '🛡 Clearing...' : '🛡 Clear All Threats'}
        </button>
        {message && (
          <span style={{ fontSize: '13px', color: message.includes('✅') ? '#00D4AA' : '#FF4757' }}>
            {message}
          </span>
        )}
        <span style={{ fontSize: '12px', color: '#8888AA', marginLeft: 'auto' }}>
          Redis: {redisInfo.keys} keys | {redisInfo.memory}
        </span>
      </div>
    </div>
  )
}
