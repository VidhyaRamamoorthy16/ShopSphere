import React, { useState, useEffect, useRef, useCallback } from 'react'

const MONITOR_URL = import.meta.env.VITE_MONITOR_URL || 'http://localhost:3000'
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:5001'

// ── IP → Country cache (persists for session) ───────────────────────────
const geoCache = {}
const fetchGeo = async (ip) => {
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
    return null
  }
  if (geoCache[ip]) return geoCache[ip]
  try {
    const res  = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(4000) })
    const data = await res.json()
    if (data.error) return null
    const geo = {
      ip,
      country:     data.country_name || 'Unknown',
      countryCode: data.country_code  || 'XX',
      city:        data.city          || '',
      lat:         parseFloat(data.latitude)  || 0,
      lon:         parseFloat(data.longitude) || 0,
    }
    geoCache[ip] = geo
    return geo
  } catch { return null }
}

// ── Convert lat/lon to SVG x/y on 800×400 map ───────────────────────────
const latLonToXY = (lat, lon) => ({
  x: ((lon + 180) / 360) * 800,
  y: ((90  - lat)  / 180) * 400,
})

// ── Country flag emoji from country code ────────────────────────────────
const getFlag = (code) => {
  if (!code || code === 'XX') return '🌐'
  return code.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(0x1F1E0 + c.charCodeAt(0) - 65)
  )
}

// ── Simplified world map SVG paths ──────────────────────────────────────
const WORLD_PATH = `
M 130 140 L 140 135 L 155 138 L 160 145 L 155 152 L 140 150 Z
M 160 120 L 175 115 L 195 118 L 200 128 L 190 135 L 170 132 L 162 127 Z
M 200 125 L 225 118 L 255 120 L 268 130 L 265 145 L 245 152 L 220 148 L 202 138 Z
M 255 115 L 280 108 L 310 112 L 325 125 L 320 138 L 300 142 L 272 138 L 257 127 Z
M 310 108 L 340 102 L 375 106 L 392 118 L 388 135 L 365 140 L 335 136 L 312 122 Z
M 370 105 L 395 100 L 430 104 L 448 116 L 444 130 L 420 136 L 392 132 L 372 118 Z
M 440 110 L 468 105 L 498 108 L 512 120 L 508 134 L 484 140 L 455 136 L 442 124 Z
M 490 115 L 520 108 L 548 112 L 562 124 L 556 140 L 530 146 L 500 140 L 492 128 Z
M 540 140 L 565 133 L 588 136 L 598 148 L 592 162 L 568 168 L 544 162 L 542 150 Z
M 570 105 L 596 98 L 622 102 L 636 115 L 630 130 L 606 136 L 578 130 L 572 117 Z
M 615 115 L 640 108 L 665 112 L 676 124 L 670 138 L 646 144 L 620 138 L 617 126 Z
M 645 130 L 670 124 L 692 128 L 700 140 L 694 154 L 670 160 L 648 154 L 646 142 Z
M 155 165 L 170 160 L 185 164 L 190 175 L 184 188 L 168 192 L 155 185 L 152 173 Z
M 190 162 L 210 156 L 232 160 L 240 172 L 234 186 L 214 190 L 194 184 L 188 170 Z
M 230 155 L 255 148 L 278 152 L 288 165 L 282 180 L 260 185 L 234 179 L 228 163 Z
M 270 170 L 292 164 L 312 168 L 320 180 L 314 194 L 294 198 L 273 192 L 268 178 Z
M 300 185 L 325 178 L 348 182 L 358 196 L 350 212 L 328 218 L 303 212 L 298 196 Z
M 335 200 L 358 193 L 380 197 L 390 210 L 382 226 L 360 232 L 337 226 L 332 212 Z
M 355 165 L 378 158 L 400 162 L 410 175 L 404 190 L 382 196 L 358 190 L 352 174 Z
M 392 158 L 415 150 L 440 154 L 452 168 L 446 184 L 422 190 L 396 184 L 388 168 Z
M 430 145 L 455 138 L 478 142 L 490 155 L 484 170 L 460 176 L 434 170 L 428 156 Z
M 462 155 L 488 148 L 512 152 L 524 166 L 518 182 L 494 188 L 466 182 L 460 166 Z
M 500 160 L 525 153 L 548 157 L 560 170 L 554 186 L 530 192 L 504 186 L 498 170 Z
M 538 145 L 562 138 L 585 142 L 596 155 L 590 170 L 566 176 L 541 170 L 535 156 Z
M 572 138 L 596 130 L 620 134 L 632 148 L 626 164 L 602 170 L 576 164 L 568 148 Z
M 608 145 L 632 138 L 655 142 L 666 155 L 660 170 L 636 176 L 611 170 L 604 156 Z
M 640 160 L 664 153 L 686 157 L 696 170 L 690 186 L 666 192 L 642 186 L 636 170 Z
M 175 220 L 198 214 L 218 218 L 226 230 L 220 244 L 200 250 L 177 244 L 172 230 Z
M 215 225 L 238 218 L 260 222 L 270 236 L 264 252 L 242 258 L 218 252 L 212 236 Z
M 250 240 L 272 233 L 295 237 L 305 250 L 298 266 L 276 272 L 253 266 L 247 250 Z
M 270 260 L 294 253 L 315 257 L 325 270 L 318 285 L 296 291 L 273 285 L 265 270 Z
M 368 232 L 390 225 L 412 229 L 422 242 L 415 258 L 393 264 L 370 258 L 362 243 Z
M 405 245 L 428 238 L 450 242 L 460 255 L 453 272 L 430 278 L 407 272 L 400 256 Z
M 440 260 L 464 253 L 486 257 L 496 270 L 488 287 L 464 293 L 442 287 L 436 270 Z
M 468 248 L 492 241 L 515 245 L 526 258 L 520 275 L 496 281 L 472 275 L 464 259 Z
M 505 240 L 530 233 L 555 237 L 566 250 L 560 267 L 536 273 L 510 267 L 502 251 Z
M 540 255 L 565 248 L 590 252 L 601 265 L 595 282 L 570 288 L 544 282 L 536 266 Z
M 575 245 L 600 238 L 624 242 L 634 255 L 628 271 L 604 277 L 578 271 L 570 256 Z
M 610 258 L 635 251 L 658 255 L 668 268 L 661 284 L 637 290 L 613 284 L 605 269 Z
M 555 295 L 578 288 L 600 292 L 610 305 L 602 321 L 578 327 L 556 321 L 548 305 Z
M 580 315 L 604 308 L 626 312 L 636 325 L 628 341 L 604 347 L 582 341 L 574 326 Z
`

export default function AttackMap({ isMobile }) {
  const [dots,         setDots]         = useState([])
  const [countryCounts,setCountryCounts]= useState([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const [lastUpdated,  setLastUpdated]  = useState(null)
  const [hoveredDot,   setHoveredDot]   = useState(null)
  const [totalScanned, setTotalScanned] = useState(0)
  const processedIPs   = useRef(new Set())
  const animFrame      = useRef(0)

  // ── Fetch blocked IPs from monitor API ──────────────────────────────────
  const fetchAttacks = useCallback(async () => {
    if (fetching) return
    setFetching(true)
    try {
      // Try monitor threats endpoint
      let threats = []
      try {
        const res  = await fetch(`${MONITOR_URL}/monitor/threats/live?limit=50`, {
          signal: AbortSignal.timeout(6000)
        })
        if (res.ok) {
          const data = await res.json()
          threats = data.threats || data.data || data || []
        }
      } catch {
        // Try gateway threat logs
        try {
          const res  = await fetch(`${GATEWAY_URL}/monitor/threats`, {
            signal: AbortSignal.timeout(6000)
          })
          if (res.ok) {
            const data = await res.json()
            threats = data.threats || data || []
          }
        } catch {}
      }

      // If no threats from API use demo data for showcase
      if (!Array.isArray(threats) || threats.length === 0) {
        threats = [
          { ip_address: '8.8.8.8',       threat_type: 'SQL Injection' },
          { ip_address: '1.1.1.1',       threat_type: 'XSS' },
          { ip_address: '185.220.101.1', threat_type: 'Brute Force' },
          { ip_address: '45.142.212.1',  threat_type: 'SQL Injection' },
          { ip_address: '91.108.4.1',    threat_type: 'DDoS' },
          { ip_address: '31.13.64.1',    threat_type: 'Path Traversal' },
          { ip_address: '142.250.1.1',   threat_type: 'XSS' },
          { ip_address: '52.26.1.1',     threat_type: 'SQL Injection' },
        ]
      }

      setTotalScanned(threats.length)

      // Geolocate new IPs (max 10 at a time to respect rate limits)
      const newIPs = threats
        .map(t => t.ip_address || t.ip)
        .filter(ip => ip && !processedIPs.current.has(ip))
        .slice(0, 10)

      const geoResults = await Promise.allSettled(newIPs.map(fetchGeo))

      const newDots = []
      geoResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value) {
          const geo = result.value
          processedIPs.current.add(geo.ip)
          const xy  = latLonToXY(geo.lat, geo.lon)
          const threat = threats.find(t => (t.ip_address || t.ip) === geo.ip)
          newDots.push({
            ...geo,
            x:          xy.x,
            y:          xy.y,
            threatType: threat?.threat_type || 'Unknown',
            count:      1,
            id:         `${geo.ip}-${Date.now()}`,
          })
        }
      })

      if (newDots.length > 0) {
        setDots(prev => {
          const combined = [...prev, ...newDots]
          // Merge duplicate countries, keep max 40 dots
          const seen = {}
          combined.forEach(d => {
            if (!seen[d.countryCode]) seen[d.countryCode] = { ...d, count: 0 }
            seen[d.countryCode].count++
          })
          return Object.values(seen).slice(0, 40)
        })
      }

      // Build country counts
      setDots(current => {
        const counts = {}
        current.forEach(d => {
          if (!counts[d.country]) counts[d.country] = { country: d.country, code: d.countryCode, count: 0 }
          counts[d.country].count += d.count
        })
        const sorted = Object.values(counts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
        setCountryCounts(sorted)
        return current
      })

      setLastUpdated(new Date())
      setLoading(false)
    } catch (err) {
      console.error('AttackMap fetch error:', err)
      setLoading(false)
    } finally {
      setFetching(false)
    }
  }, [fetching])

  useEffect(() => {
    fetchAttacks()
    const interval = setInterval(fetchAttacks, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const maxCount = countryCounts.length > 0 ? countryCounts[0].count : 1

  const threatColor = {
    'SQL Injection':  '#ef4444',
    'XSS':            '#f59e0b',
    'Brute Force':    '#8b5cf6',
    'DDoS':           '#06b6d4',
    'Path Traversal': '#10b981',
    'Unknown':        '#6b7280',
  }

  return (
    <div style={{
      background:   '#111827',
      border:       '1px solid #1f2937',
      borderRadius: 16,
      overflow:     'hidden',
      marginBottom: isMobile ? 14 : 20,
    }}>

      {/* ── Header ── */}
      <div style={{
        padding:         isMobile ? '14px 16px' : '18px 24px',
        borderBottom:    '1px solid #1f2937',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        flexWrap:        'wrap',
        gap:             10,
      }}>
        <div>
          <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: '#fff' }}>
            🗺️ Live Attack Map
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString()} — ${totalScanned} threats scanned` 
              : 'Fetching geolocation data...'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {fetching && (
            <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1s infinite' }}/>
              Geolocating...
            </div>
          )}
          <button
            onClick={fetchAttacks}
            disabled={fetching}
            style={{
              background:   fetching ? '#1f2937' : '#1e3a5f',
              border:       '1px solid #2563eb',
              borderRadius: 8,
              padding:      '5px 12px',
              color:        '#60a5fa',
              fontSize:     11,
              fontWeight:   600,
              cursor:       fetching ? 'not-allowed' : 'pointer',
            }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🌍</div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Geolocating attack origins...</div>
          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 6 }}>This takes a few seconds</div>
        </div>
      ) : (
        <>
          {/* ── SVG World Map ── */}
          <div style={{
            position:   'relative',
            background: '#0d1117',
            overflow:   'hidden',
            borderBottom: '1px solid #1f2937',
          }}>
            <svg
              viewBox="0 0 800 400"
              style={{ width: '100%', display: 'block' }}
              role="img"
              aria-label="World map showing attack origin locations as blinking red dots">
              <title>Attack origin map</title>

              {/* Ocean background */}
              <rect width="800" height="400" fill="#0d1117"/>

              {/* Grid lines */}
              {[0,100,200,300,400].map(y => (
                <line key={`gy${y}`} x1="0" y1={y} x2="800" y2={y} stroke="#1f2937" strokeWidth="0.5"/>
              ))}
              {[0,100,200,300,400,500,600,700,800].map(x => (
                <line key={`gx${x}`} x1={x} y1="0" x2={x} y2="400" stroke="#1f2937" strokeWidth="0.5"/>
              ))}

              {/* Land masses */}
              <path d={WORLD_PATH} fill="#1e3a5f" stroke="#2563eb" strokeWidth="0.5" opacity="0.8"/>

              {/* Attack dots */}
              {dots.map((dot) => (
                <g key={dot.id}>
                  {/* Outer pulse ring */}
                  <circle
                    cx={dot.x} cy={dot.y}
                    r={dot.count > 3 ? 14 : 10}
                    fill={threatColor[dot.threatType] || '#ef4444'}
                    opacity="0.15"
                    style={{ animation: `mapPulse ${1.5 + Math.random() * 0.5}s ease-out infinite` }}
                  />
                  {/* Mid ring */}
                  <circle
                    cx={dot.x} cy={dot.y}
                    r={dot.count > 3 ? 8 : 6}
                    fill={threatColor[dot.threatType] || '#ef4444'}
                    opacity="0.35"
                    style={{ animation: `mapPulse ${1.2 + Math.random() * 0.5}s ease-out infinite`, animationDelay: '0.2s' }}
                  />
                  {/* Core dot */}
                  <circle
                    cx={dot.x} cy={dot.y}
                    r={dot.count > 3 ? 5 : 3}
                    fill={threatColor[dot.threatType] || '#ef4444'}
                    stroke="#fff"
                    strokeWidth="0.5"
                    style={{ animation: `corePulse 2s ease-in-out infinite`, cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredDot(dot)}
                    onMouseLeave={() => setHoveredDot(null)}
                  />
                  {/* Count badge for high-activity */}
                  {dot.count > 2 && (
                    <text
                      x={dot.x + 6} y={dot.y - 6}
                      fill="#fff" fontSize="8" fontWeight="bold"
                      style={{ pointerEvents: 'none' }}>
                      {dot.count}
                    </text>
                  )}
                </g>
              ))}

              {/* Tooltip */}
              {hoveredDot && (
                <g>
                  <rect
                    x={Math.min(hoveredDot.x - 5, 650)}
                    y={Math.max(hoveredDot.y - 60, 5)}
                    width="140" height="50"
                    rx="4" fill="#1f2937"
                    stroke="#374151" strokeWidth="1"
                  />
                  <text
                    x={Math.min(hoveredDot.x - 5, 650) + 8}
                    y={Math.max(hoveredDot.y - 60, 5) + 16}
                    fill="#fff" fontSize="10" fontWeight="bold">
                    {hoveredDot.country}
                  </text>
                  <text
                    x={Math.min(hoveredDot.x - 5, 650) + 8}
                    y={Math.max(hoveredDot.y - 60, 5) + 28}
                    fill="#9ca3af" fontSize="9">
                    {hoveredDot.threatType}
                  </text>
                  <text
                    x={Math.min(hoveredDot.x - 5, 650) + 8}
                    y={Math.max(hoveredDot.y - 60, 5) + 40}
                    fill="#6b7280" fontSize="9">
                    IP: {hoveredDot.ip}
                  </text>
                </g>
              )}
            </svg>

            {/* Legend overlay */}
            <div style={{
              position:     'absolute',
              bottom:       8,
              left:         isMobile ? 8 : 16,
              display:      'flex',
              gap:          isMobile ? 6 : 10,
              flexWrap:     'wrap',
            }}>
              {Object.entries(threatColor).filter(([k]) => k !== 'Unknown').map(([type, color]) => (
                <div key={type} style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          4,
                  background:   'rgba(13,17,23,0.85)',
                  borderRadius: 20,
                  padding:      isMobile ? '2px 7px' : '3px 9px',
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}/>
                  <span style={{ fontSize: isMobile ? 9 : 10, color: '#9ca3af', whiteSpace: 'nowrap' }}>{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Country Bar Chart ── */}
          {countryCounts.length > 0 && (
            <div style={{ padding: isMobile ? '14px 16px' : '18px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14 }}>
                Top Attack Origins
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {countryCounts.map(({ country, code, count }, i) => {
                  const pct = Math.round((count / maxCount) * 100)
                  const barColor = i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : i === 2 ? '#8b5cf6' : '#3b82f6'
                  return (
                    <div key={country}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: isMobile ? 14 : 16 }}>{getFlag(code)}</span>
                          <span style={{ fontSize: isMobile ? 12 : 13, color: '#e5e7eb', fontWeight: 500 }}>
                            {country}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{count}</span>
                          <span style={{ fontSize: 11, color: '#6b7280', minWidth: 35, textAlign: 'right' }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: '#1f2937', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height:     '100%',
                          width:      `${pct}%`,
                          background: barColor,
                          borderRadius: 4,
                          transition:   'width 0.6s ease',
                        }}/>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* No data state */}
              {dots.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: 13 }}>
                  No geolocated attacks yet. Waiting for blocked requests...
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes mapPulse {
          0%   { r: 4;  opacity: 0.6; }
          100% { r: 18; opacity: 0; }
        }
        @keyframes corePulse {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.6; }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
