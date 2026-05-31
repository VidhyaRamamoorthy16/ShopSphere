import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import WorldMap from './WorldMap'
import DonutChart from '../components/DonutChart'

// ── Demo data shown when Redis has no real traffic ──────────────────────
const DEMO_OVERVIEW = {
  total_requests:   2847,
  blocked_requests: 312,
  allowed_requests: 2463,
  rate_limited:     72,
  threat_score:     11,
  avg_response_time: 66.36,
  uptime:           99.9,
  totalRequests:    2847,
  blockedRequests:  312,
  allowedRequests:  2463,
  rateLimited:      72,
  threatScore:      11,
}

const DEMO_REQUESTS = [
  { timestamp: new Date(Date.now() - 2000).toISOString(),  ip_address: '103.21.244.1', method: 'GET',  endpoint: '/api/products',          status_code: 200, duration_ms: 58,  action: 'allowed', reason: '' },
  { timestamp: new Date(Date.now() - 5000).toISOString(),  ip_address: '185.220.101.4',method: 'POST', endpoint: '/api/auth/login',         status_code: 403, duration_ms: 45,  action: 'blocked', reason: 'SQL Injection' },
  { timestamp: new Date(Date.now() - 8000).toISOString(),  ip_address: '45.142.212.10',method: 'GET',  endpoint: '/api/products?category=Electronics', status_code: 200, duration_ms: 62,  action: 'allowed', reason: '' },
  { timestamp: new Date(Date.now() - 12000).toISOString(), ip_address: '91.108.4.22',  method: 'POST', endpoint: '/api/cart',               status_code: 200, duration_ms: 74,  action: 'allowed', reason: '' },
  { timestamp: new Date(Date.now() - 15000).toISOString(), ip_address: '31.13.64.15',  method: 'GET',  endpoint: "/api/products?search=<script>", status_code: 403, duration_ms: 38, action: 'blocked', reason: 'XSS Attack' },
  { timestamp: new Date(Date.now() - 18000).toISOString(), ip_address: '142.250.1.5',  method: 'GET',  endpoint: '/api/products/1',         status_code: 200, duration_ms: 55,  action: 'allowed', reason: '' },
  { timestamp: new Date(Date.now() - 22000).toISOString(), ip_address: '52.26.1.8',    method: 'POST', endpoint: '/api/wishlist',           status_code: 200, duration_ms: 68,  action: 'allowed', reason: '' },
  { timestamp: new Date(Date.now() - 25000).toISOString(), ip_address: '178.62.1.33',  method: 'GET',  endpoint: "/api/products?file=../../etc/passwd", status_code: 403, duration_ms: 32, action: 'blocked', reason: 'Path Traversal' },
  { timestamp: new Date(Date.now() - 30000).toISOString(), ip_address: '103.21.244.2', method: 'GET',  endpoint: '/api/products?category=Mobiles',   status_code: 200, duration_ms: 61, action: 'allowed', reason: '' },
  { timestamp: new Date(Date.now() - 35000).toISOString(), ip_address: '66.249.66.1',  method: 'POST', endpoint: '/api/auth/login',         status_code: 403, duration_ms: 41, action: 'blocked', reason: 'Brute Force' },
]

const isAllZero = (data) =>
  !data ||
  (
    (data.total_requests   || data.totalRequests   || 0) === 0 &&
    (data.blocked_requests || data.blockedRequests || 0) === 0
  )

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
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [weekStats, setWeekStats] = useState({ total_7d: 0, blocked_7d: 0, threats_7d: 0, block_rate_pct: 0, daily: [] })
  const [windowWidth, setWindowWidth] = React.useState(window.innerWidth)

  const animatedTotal = useAnimatedCounter(data.totalRequests)
  const animatedBlocked = useAnimatedCounter(data.blocked)
  const animatedRate = useAnimatedCounter(data.rateLimited)
  const animatedThreat = useAnimatedCounter(data.threatScore)
  const [liveRequests, setLiveRequests] = useState([])

  const isMobile = windowWidth <= 768
  const chartHeight = isMobile ? 200 : 280
  const pieChartHeight = isMobile ? 180 : 200

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
          const fetchedData = {
            totalRequests: stats.total_requests,
            blocked: stats.blocked_requests,
            rateLimited: stats.rate_limited,
            threatScore: stats.threat_score
          }
          if (isAllZero(fetchedData)) {
            setIsDemoMode(true)
            setData(DEMO_OVERVIEW)
          } else {
            setIsDemoMode(false)
            setData(fetchedData)
          }
        }
      } catch (e) {
        console.log('Using mock data', e)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

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
      overflowX: 'hidden',
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

      {/* No traffic banner */}
      {/* Demo mode banner — shows when using predefined data */}
      {isDemoMode && (
        <div style={{
          background:   'rgba(245,158,11,0.08)',
          border:       '1px solid rgba(245,158,11,0.25)',
          borderRadius: 12,
          padding:      isMobile ? '10px 14px' : '12px 20px',
          marginBottom: isMobile ? 12 : 16,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          flexWrap:     'wrap',
          gap:          10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🎭</span>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
                Demo Mode — Showing sample data
              </span>
              <span style={{ fontSize: 11, color: '#6b7280', display: 'block', marginTop: 1 }}>
                Browse the store to see your real live traffic
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a
              href="https://shop-sphere-wine.vercel.app"
              target="_blank" rel="noreferrer"
              style={{
                background:     '#2563eb',
                color:          '#fff',
                borderRadius:   8,
                padding:        '6px 14px',
                fontSize:       11,
                fontWeight:     700,
                textDecoration: 'none',
                whiteSpace:     'nowrap',
              }}>
              🛒 Generate Real Traffic
            </a>
            <a
              href="https://shopsphere-gateway.onrender.com/health"
              target="_blank" rel="noreferrer"
              style={{
                background:     'rgba(255,255,255,0.05)',
                color:          '#9ca3af',
                borderRadius:   8,
                padding:        '6px 14px',
                fontSize:       11,
                fontWeight:     600,
                textDecoration: 'none',
                border:         '1px solid #1f2937',
                whiteSpace:     'nowrap',
              }}>
              ⚡ Wake Gateway
            </a>
          </div>
        </div>
      )}

      {/* ── SIMPLE DONUT CHART ── */}
      <DonutChart
        total={data.total_requests || data.totalRequests || 0}
        blocked={data.blocked_requests || data.blocked || 0}
        allowed={data.allowed_requests || data.allowedRequests || 0}
        rateLimited={data.rate_limited || data.rateLimited || 0}
        isMobile={isMobile}
      />

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
