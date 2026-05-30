import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import WorldMap from './WorldMap'

const S = {
  content: { padding:'24px' },
  card: { background:'#1A1A2E', border:'1px solid #2D2D4E', borderRadius:'16px', padding:'20px' },
  label: { fontSize:'11px', color:'#8888AA', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' },
  bigNum: (color) => ({ fontSize:'32px', fontWeight:'700', color, letterSpacing:'-0.02em', marginBottom:'4px' }),
  sub: { fontSize:'12px', color:'#8888AA' },
  grid4: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'20px' },
  grid2: (isMobile) => ({ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'16px', marginBottom:'20px' }),
  table: { width:'100%', borderCollapse:'collapse' },
  th: { textAlign:'left', padding:'12px', fontSize:'12px', color:'#8888AA', borderBottom:'1px solid #2D2D4E' },
  td: { padding:'12px', fontSize:'13px', color:'#EAEAF5', borderBottom:'1px solid #2D2D4E' },
  badge: (color) => ({ display:'inline-block', padding:'4px 8px', borderRadius:'4px', fontSize:'11px', fontWeight:'600', color, background:color+'20' }),
  bar: { height:'8px', background:'#2D2D4E', borderRadius:'4px', overflow:'hidden' },
  barFill: (width, color) => ({ height:'100%', width, background:color, borderRadius:'4px' }),
}

const COLORS = {
  purple: '#6C63FF',
  red: '#FF4757',
  orange: '#FFA502',
  teal: '#00D4AA'
}

function useAnimatedCounter(target, duration = 1200) {
  const [count, setCount] = React.useState(0)
  React.useEffect(() => {
    if (!target || target === 0) { setCount(0); return }
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

const BASE = import.meta.env.VITE_MONITOR_URL || 'https://shopsphere-monitor.onrender.com'

const downloadFromAPI = async (endpoint, filename, type) => {
  try {
    const res = await fetch(`${BASE}${endpoint}`)
    if (!res.ok) {
      alert('Export failed — no data available')
      return
    }
    const data = await res.json()
    
    let content = ''
    let mimeType = type
    
    if (endpoint.includes('requests')) {
      content = data.csv || ''
      mimeType = 'text/csv'
    } else {
      content = JSON.stringify(data, null, 2)
      mimeType = 'application/json'
    }
    
    if (!content || content === '{}' || content === '[]') {
      alert('No data to export')
      return
    }
    
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    alert('Export failed: ' + e.message)
  }
}

const exportRequests = async () => {
  try {
    const res = await fetch(`${BASE}/api/export/requests`);

    if (!res.ok) {
      const text = await res.text();
      alert(text);
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `requests_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Download failed");
  }
};
const exportThreats = () => downloadFromAPI('/api/export/threats', `threats_${new Date().toISOString().slice(0,10)}.json`, 'application/json')
const exportStats = () => downloadFromAPI('/api/export/stats', `stats_${new Date().toISOString().slice(0,10)}.json`, 'application/json')

export default function Overview() {
  const [data, setData] = useState({
    totalRequests: 24871,
    blocked: 2063,
    rateLimited: 47,
    threatScore: 62
  })
  const [weekStats, setWeekStats] = useState({ total_7d: 0, blocked_7d: 0, threats_7d: 0, block_rate_pct: 0, daily: [] })
  const [windowWidth, setWindowWidth] = React.useState(window.innerWidth)

  const animatedTotal = useAnimatedCounter(data.totalRequests)
  const animatedBlocked = useAnimatedCounter(data.blocked)
  const animatedRate = useAnimatedCounter(data.rateLimited)
  const animatedThreat = useAnimatedCounter(data.threatScore)
  const [liveRequests, setLiveRequests] = useState([])
  const [rpmHistory, setRpmHistory] = useState([])
  const [prevTotal, setPrevTotal] = useState(0)
  const rpmRef = useRef([])

  const isMobile = windowWidth <= 768
  const chartHeight = isMobile ? 200 : 280
  const pieChartHeight = isMobile ? 180 : 200

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const MAX_POINTS_DESKTOP = 30
  const MAX_POINTS_MOBILE  = 15

  const updateRpmHistory = useCallback((currentTotal) => {
    const now      = new Date()
    const timeLabel = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    const maxPoints = isMobile ? MAX_POINTS_MOBILE : MAX_POINTS_DESKTOP

    setRpmHistory(prev => {
      const lastTotal = prev.length > 0 ? prev[prev.length - 1]._rawTotal || 0 : 0
      const rpm       = Math.max(0, currentTotal - lastTotal)

      const recent    = prev.slice(-5)
      const avgRpm    = recent.length > 0
        ? recent.reduce((s, p) => s + (p.total || 0), 0) / recent.length
        : 0
      const isSpike   = avgRpm > 0 && rpm > avgRpm * 3

      const newPoint = {
        time:      timeLabel,
        total:     rpm,
        blocked:   0,
        isSpike,
        _rawTotal: currentTotal,
      }

      const updated = [...prev, newPoint]
      return updated.length > maxPoints ? updated.slice(updated.length - maxPoints) : updated
    })
  }, [isMobile])

  useEffect(() => {
    fetch(`${BASE}/monitor/requests/live`)
      .then(r => r.json())
      .then(d => setLiveRequests(d.requests || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${BASE}/monitor/overview`)
        const stats = await res.json()
        if (stats.total_requests !== undefined) {
          setData({
            totalRequests: stats.total_requests,
            blocked: stats.blocked_requests,
            rateLimited: stats.rate_limited,
            threatScore: stats.threat_score
          })
          updateRpmHistory(stats.total_requests || 0)

          const blockedCount = stats.blocked_requests || 0
          setRpmHistory(prev => {
            if (prev.length === 0) return prev
            const updated = [...prev]
            const lastIdx = updated.length - 1
            const prevBlocked = lastIdx > 0 ? (updated[lastIdx - 1]._rawBlocked || 0) : 0
            updated[lastIdx] = {
              ...updated[lastIdx],
              blocked: Math.max(0, blockedCount - prevBlocked),
              _rawBlocked: blockedCount,
            }
            return updated
          })
        }
      } catch (e) {
        console.log('Using mock data', e)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [updateRpmHistory])

  useEffect(() => {
    const fetchWeekStats = async () => {
      try {
        await fetch(`${BASE}/monitor/stats/hourly`)
        const res = await fetch(`${BASE}/monitor/stats/summary`)
        const d = await res.json()
        setWeekStats(d)
      } catch (e) {}
    }
    fetchWeekStats()
    const interval = setInterval(fetchWeekStats, 60000)
    return () => clearInterval(interval)
  }, [])

  const lineData = Array.from({length: 30}, (_, i) => ({
    minute: i,
    value: 30 + Math.floor(Math.random() * 40)
  }))

  const pieData = [
    { name: 'Safe', value: 71, color: COLORS.teal },
    { name: 'Flagged', value: 20, color: COLORS.orange },
    { name: 'Blocked', value: 9, color: COLORS.red }
  ]

  const blockedIPs = [
    { ip: '192.168.1.105', reason: 'Rate limit exceeded', time: '14:32:18' },
    { ip: '10.0.0.45', reason: 'SQL Injection attempt', time: '14:28:42' },
    { ip: '172.16.0.22', reason: 'DDoS pattern detected', time: '14:15:33' },
    { ip: '203.0.113.88', reason: 'Brute force attack', time: '13:58:21' },
    { ip: '198.51.100.15', reason: 'Suspicious payload', time: '13:42:09' }
  ]

  const endpoints = [
    { name: '/api/products', count: 12453, percent: '85%' },
    { name: '/api/auth/login', count: 8432, percent: '62%' },
    { name: '/api/cart', count: 6211, percent: '45%' },
    { name: '/api/orders', count: 4198, percent: '32%' },
    { name: '/api/checkout', count: 3154, percent: '24%' }
  ]

  return (
    <>
    <div style={{
      padding: isMobile ? '12px' : '24px',
      minHeight: '100vh',
      background: '#0d1117',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Export Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <span style={{ color: '#8888AA', fontSize: '14px', marginRight: '8px' }}>Export Data:</span>
        <button
          onClick={exportRequests}
          style={{ padding: '8px 16px', background: '#6C63FF', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '13px' }}
        >
          📥 Requests CSV
        </button>
        <button
          onClick={exportThreats}
          style={{ padding: '8px 16px', background: '#FF4757', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '13px' }}
        >
          📥 Threats JSON
        </button>
        <button
          onClick={exportStats}
          style={{ padding: '8px 16px', background: '#2D2D4E', border: '1px solid #6C63FF', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '13px' }}
        >
          📥 Stats JSON
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? 10 : 16,
        marginBottom: isMobile ? 16 : 24,
      }}>
        <div style={S.card} className="stat-card-animate">
          <div style={S.label}>Total Requests</div>
          <div style={S.bigNum(COLORS.purple)}>{animatedTotal.toLocaleString()}</div>
          <div style={S.sub}>+12% from yesterday</div>
        </div>
        <div style={S.card} className="stat-card-animate">
          <div style={S.label}>Blocked</div>
          <div style={S.bigNum(COLORS.red)}>{animatedBlocked.toLocaleString()}</div>
          <div style={S.sub}>Threats prevented</div>
        </div>
        <div style={S.card} className="stat-card-animate">
          <div style={S.label}>Rate Limited</div>
          <div style={S.bigNum(COLORS.orange)}>{animatedRate}</div>
          <div style={S.sub}>Active limits</div>
        </div>
        <div style={S.card} className="stat-card-animate">
          <div style={S.label}>Threat Score</div>
          <div style={S.bigNum(COLORS.orange)}>{animatedThreat}/100</div>
          <div style={S.sub}>Elevated risk</div>
        </div>
      </div>

      {/* ── REAL-TIME REQUESTS PER MINUTE CHART ── */}
      <div style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: 16,
        padding: isMobile ? '14px 12px' : '20px 24px',
        marginBottom: isMobile ? 14 : 20,
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
              📈 Live Request Traffic
            </div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              Updates every 10s — last {isMobile ? 15 : 30} data points
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#065f46', borderRadius: 20, padding: '4px 12px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }}/>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>LIVE</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            { color: '#3b82f6', label: 'Total Requests' },
            { color: '#ef4444', label: 'Blocked' },
            { color: '#f59e0b', label: 'Spike detected', dashed: true },
          ].map(({ color, label, dashed }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 20, height: 2,
                background: dashed ? 'transparent' : color,
                borderTop: dashed ? `2px dashed ${color}` : 'none',
              }}/>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>{label}</span>
            </div>
          ))}
        </div>

        {rpmHistory.length < 2 ? (
          <div style={{ height: isMobile ? 180 : 250, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 24 }}>⏳</div>
            <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
              Collecting data... chart appears after 2 polling cycles (20 seconds)
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#3b82f6', opacity: 0.5,
                  animation: `bounce 1.2s ease infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}/>
              ))}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 250}>
            <AreaChart data={rpmHistory} margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? -20 : 0, bottom: 0 }}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="blockedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false}/>

              <XAxis
                dataKey="time"
                tick={{ fill: '#6b7280', fontSize: isMobile ? 9 : 11 }}
                tickLine={false}
                axisLine={{ stroke: '#1f2937' }}
                interval={isMobile ? 4 : 2}
              />

              <YAxis
                tick={{ fill: '#6b7280', fontSize: isMobile ? 9 : 11 }}
                tickLine={false}
                axisLine={false}
                hide={isMobile}
              />

              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: 10,
                  fontSize: 12,
                  color: '#fff',
                }}
                formatter={(value, name) => [
                  value,
                  name === 'total' ? '📊 Total' : '🚫 Blocked'
                ]}
                labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
              />

              {rpmHistory.map((point, i) =>
                point.isSpike ? (
                  <ReferenceLine
                    key={`spike-${i}`}
                    x={point.time}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={!isMobile ? { value: '⚠️', fill: '#f59e0b', fontSize: 10 } : undefined}
                  />
                ) : null
              )}

              <Area
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#totalGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6' }}
                animationDuration={300}
              />
              <Area
                type="monotone"
                dataKey="blocked"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#blockedGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#ef4444' }}
                animationDuration={300}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: 8,
          marginTop: 14,
          paddingTop: 14,
          borderTop: '1px solid #1f2937',
        }}>
          {[
            {
              label: 'Current RPM',
              value: rpmHistory.length > 0 ? rpmHistory[rpmHistory.length - 1].total : 0,
              color: '#3b82f6',
              icon: '📊',
            },
            {
              label: 'Peak RPM',
              value: rpmHistory.length > 0 ? Math.max(...rpmHistory.map(p => p.total)) : 0,
              color: '#f59e0b',
              icon: '⬆️',
            },
            {
              label: 'Avg RPM',
              value: rpmHistory.length > 0
                ? Math.round(rpmHistory.reduce((s, p) => s + p.total, 0) / rpmHistory.length)
                : 0,
              color: '#10b981',
              icon: '📈',
            },
            {
              label: 'Spikes',
              value: rpmHistory.filter(p => p.isSpike).length,
              color: '#ef4444',
              icon: '⚠️',
            },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: '#0d1117', borderRadius: 10, padding: isMobile ? '8px 10px' : '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color, marginBottom: 2 }}>{value}</div>
              <div style={{ fontSize: isMobile ? 9 : 10, color: '#6b7280' }}>{icon} {label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={S.grid2(isMobile)}>
        <div style={S.card}>
          <div style={{...S.label, marginBottom:'16px'}}>Requests per Minute</div>
          <div style={{ width: '100%', height: chartHeight, minWidth: 0, minHeight: isMobile ? '220px' : 'auto' }}>
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <AreaChart data={lineData}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="requestGradient" x1="0" y1="0"
                                x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6C63FF" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6C63FF" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3"
                             stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="minute"
                     tick={{ fill: '#8888AA', fontSize: 11 }}
                     axisLine={{ stroke: '#2D2D4E' }}
                     tickLine={false}/>
              <YAxis tick={{ fill: '#8888AA', fontSize: 11 }}
                     axisLine={false} tickLine={false}/>
              <Tooltip
                contentStyle={{
                  background: '#1A1A2E',
                  border: '1px solid #2D2D4E',
                  borderRadius: '8px',
                  color: '#EAEAF5',
                  fontSize: '12px'
                }}
                cursor={{ stroke: '#6C63FF', strokeWidth: 1,
                          strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6C63FF"
                strokeWidth={2.5}
                fill="url(#requestGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: '#6C63FF',
                  stroke: '#EAEAF5',
                  strokeWidth: 2
                }}
              />
            </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={S.card}>
          <div style={{...S.label, marginBottom:'16px'}}>Request Breakdown</div>
          <div style={{ width: '100%', height: pieChartHeight, minWidth: 0, minHeight: isMobile ? '220px' : 'auto' }}>
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{background:'#1A1A2E', border:'1px solid #2D2D4E', borderRadius:'8px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{display:'flex', justifyContent:'center', gap:'16px', marginTop:'8px'}}>
            {pieData.map(item => (
              <div key={item.name} style={{display:'flex', alignItems:'center', gap:'6px'}}>
                <span style={{width:'8px', height:'8px', borderRadius:'50%', background:item.color}}></span>
                <span style={{fontSize:'12px', color:'#8888AA'}}>{item.name} {item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <WorldMap requests={liveRequests || []} />

      <div style={S.grid4}>
        <div style={S.card}>
          <div style={S.label}>Total Requests (7 days)</div>
          <div style={S.bigNum(COLORS.purple)}>{weekStats.total_7d.toLocaleString()}</div>
          <div style={S.sub}>Last 7 days</div>
        </div>
        <div style={S.card}>
          <div style={S.label}>Blocked (7 days)</div>
          <div style={S.bigNum(COLORS.red)}>{weekStats.blocked_7d.toLocaleString()}</div>
          <div style={S.sub}>Threats prevented</div>
        </div>
        <div style={S.card}>
          <div style={S.label}>Threats (7 days)</div>
          <div style={S.bigNum(COLORS.orange)}>{weekStats.threats_7d}</div>
          <div style={S.sub}>Detected threats</div>
        </div>
        <div style={S.card}>
          <div style={S.label}>Block Rate</div>
          <div style={S.bigNum(COLORS.teal)}>{weekStats.block_rate_pct}%</div>
          <div style={S.sub}>Of total requests</div>
        </div>
      </div>

      <div style={S.grid2(isMobile)}>
        <div style={S.card}>
          <div style={{...S.label, marginBottom:'16px'}}>Daily Traffic (7 Days)</div>
          <div style={{ width: '100%', height: chartHeight, minWidth: 0, minHeight: isMobile ? '220px' : 'auto' }}>
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <BarChart data={weekStats.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D2D4E" />
                <XAxis dataKey="date" stroke="#8888AA" fontSize={11} />
                <YAxis stroke="#8888AA" fontSize={11} />
                <Tooltip contentStyle={{background:'#1A1A2E', border:'1px solid #2D2D4E', borderRadius:'8px'}} />
                <Bar dataKey="total" fill={COLORS.purple} name="Total" />
                <Bar dataKey="blocked" fill={COLORS.red} name="Blocked" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={S.card}>
          <div style={{...S.label, marginBottom:'16px'}}>Recently Blocked IPs</div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>IP Address</th>
                <th style={S.th}>Reason</th>
                <th style={S.th}>Time</th>
                <th style={S.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {blockedIPs.map((ip, i) => (
                <tr key={i}>
                  <td style={{...S.td, fontFamily:'JetBrains Mono, monospace'}}>{ip.ip}</td>
                  <td style={S.td}>{ip.reason}</td>
                  <td style={{...S.td, color:'#8888AA'}}>{ip.time}</td>
                  <td style={S.td}><span style={S.badge(COLORS.red)}>BLOCKED</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <style>{`
      @keyframes pulse {
        0%,100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.4; transform: scale(0.8); }
      }
      @keyframes bounce {
        0%,60%,100% { transform: translateY(0); }
        30%          { transform: translateY(-6px); }
      }
      @media (max-width: 768px) {
        .recharts-wrapper {
          max-width: 100% !important;
        }
        .recharts-surface {
          overflow: visible;
        }
      }
    `}</style>
    </>
  )
}
