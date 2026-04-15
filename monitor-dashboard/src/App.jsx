import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Overview from './pages/Overview'
import LiveRequests from './pages/LiveRequests'
import RateLimits from './pages/RateLimits'
import ThreatDetection from './pages/ThreatDetection'
import SystemHealth from './pages/SystemHealth'

const S = {
  layout: { display:'flex', height:'100vh', background:'#0F0F1A', overflow:'hidden' },
  sidebar: { width:'260px', background:'#1A1A2E', borderRight:'1px solid #2D2D4E', display:'flex', flexDirection:'column', flexShrink:0, height:'100vh' },
  logo: { padding:'24px 20px 16px', borderBottom:'1px solid #2D2D4E' },
  logoText: { fontSize:'20px', fontWeight:'700', color:'#EAEAF5', letterSpacing:'-0.02em' },
  logoSpan: { color:'#6C63FF' },
  logoSub: { fontSize:'11px', color:'#8888AA', marginTop:'4px' },
  redis: { display:'flex', alignItems:'center', gap:'8px', padding:'12px 20px', borderBottom:'1px solid #2D2D4E' },
  dot: { width:'8px', height:'8px', borderRadius:'50%', background:'#00D4AA', flexShrink:0 },
  redisText: { fontSize:'12px', color:'#00D4AA', fontWeight:'500' },
  nav: { flex:1, padding:'12px 0', overflowY:'auto' },
  navBottom: { padding:'16px 20px', borderTop:'1px solid #2D2D4E' },
  pill: { display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(0,212,170,0.1)', border:'1px solid rgba(0,212,170,0.3)', borderRadius:'20px', padding:'5px 12px', fontSize:'12px', color:'#00D4AA', fontWeight:'500' },
  ver: { fontSize:'11px', color:'#8888AA', marginTop:'8px' },
  main: { flex:1, overflowY:'auto', display:'flex', flexDirection:'column' },
  topbar: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', borderBottom:'1px solid #2D2D4E', background:'#0F0F1A', position:'sticky', top:0, zIndex:10 },
  pageTitle: { fontSize:'20px', fontWeight:'600', color:'#EAEAF5', letterSpacing:'-0.02em' },
  liveBadge: { display:'flex', alignItems:'center', gap:'6px', background:'rgba(255,71,87,0.15)', border:'1px solid rgba(255,71,87,0.3)', borderRadius:'20px', padding:'4px 12px', fontSize:'12px', color:'#FF4757', fontWeight:'600' },
  liveDot: { width:'7px', height:'7px', borderRadius:'50%', background:'#FF4757' },
}

const navItems = [
  { path:'/', label:'Overview', icon:'⊞' },
  { path:'/requests', label:'Live Requests', icon:'⚡' },
  { path:'/rate-limits', label:'Rate Limits', icon:'🛡' },
  { path:'/threats', label:'Threat Detection', icon:'⚠' },
  { path:'/health', label:'System Health', icon:'📊' },
]

export default function App() {
  const [time, setTime] = useState(new Date())
  const location = useLocation()
  const pageTitle = navItems.find(n => n.path === location.pathname)?.label || 'Overview'

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={S.layout}>
      <div style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoText}>Shop<span style={S.logoSpan}>Sphere</span></div>
          <div style={S.logoSub}>Admin Console</div>
        </div>
        <div style={S.redis}>
          <div style={S.dot}></div>
          <span style={S.redisText}>Redis Connected</span>
        </div>
        <nav style={S.nav}>
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} end={item.path==='/'} style={({isActive}) => ({
              display:'flex', alignItems:'center', gap:'12px', padding:'11px 20px',
              fontSize:'14px', fontWeight:'500', textDecoration:'none', transition:'all 0.15s',
              borderLeft: isActive ? '3px solid #6C63FF' : '3px solid transparent',
              color: isActive ? '#6C63FF' : '#8888AA',
              background: isActive ? 'rgba(108,99,255,0.1)' : 'transparent',
              marginBottom:'2px',
            })}>
              <span style={{fontSize:'16px'}}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={S.navBottom}>
          <div style={S.pill}><div style={S.dot}></div> Gateway Online</div>
          <div style={S.ver}>v2.4.1 · Build 20260405</div>
        </div>
      </div>

      <div style={S.main}>
        <div style={S.topbar}>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <div style={S.pageTitle}>{pageTitle}</div>
            <div style={S.liveBadge}><div style={S.liveDot}></div> LIVE</div>
          </div>
          <div style={{fontFamily:'JetBrains Mono, monospace', fontSize:'13px', color:'#8888AA'}}>
            {time.toLocaleTimeString('en-GB')}
          </div>
        </div>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/requests" element={<LiveRequests />} />
          <Route path="/rate-limits" element={<RateLimits />} />
          <Route path="/threats" element={<ThreatDetection />} />
          <Route path="/health" element={<SystemHealth />} />
        </Routes>
      </div>
    </div>
  )
}
