import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import PreLoader from './components/PreLoader'
import { startKeepAlive } from './utils/keepAlive'

// Lazy load all pages
const Overview        = React.lazy(() => import('./pages/Overview'))
const LiveRequests    = React.lazy(() => import('./pages/LiveRequests'))
const RateLimits      = React.lazy(() => import('./pages/RateLimits'))
const ThreatDetection = React.lazy(() => import('./pages/ThreatDetection'))
const SystemHealth    = React.lazy(() => import('./pages/SystemHealth'))
const Sidebar         = React.lazy(() => import('./components/Sidebar'))

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (ready) {
      // Start keep-alive pings once services are confirmed online
      const stop = startKeepAlive()
      return stop
    }
  }, [ready])

  if (!ready) {
    return <PreLoader onReady={() => setReady(true)} />
  }

  return (
    <Router>
      <React.Suspense fallback={
        <div style={{ minHeight:'100vh', background:'#0d1117', display:'flex',
          alignItems:'center', justifyContent:'center', color:'#6b7280', fontSize:14 }}>
          Loading...
        </div>
      }>
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0d1117' }}>
          <Sidebar />
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Routes>
              <Route path="/"            element={<Navigate to="/overview" replace />} />
              <Route path="/overview"    element={<Overview />} />
              <Route path="/requests"    element={<LiveRequests />} />
              <Route path="/rate-limits" element={<RateLimits />} />
              <Route path="/threats"     element={<ThreatDetection />} />
              <Route path="/health"      element={<SystemHealth />} />
              <Route path="*"            element={<Navigate to="/overview" replace />} />
            </Routes>
          </div>
        </div>
      </React.Suspense>
    </Router>
  )
}
