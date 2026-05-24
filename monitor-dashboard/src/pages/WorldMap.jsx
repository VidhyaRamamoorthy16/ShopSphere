import React, { useState, useEffect } from 'react'
import {
  ComposableMap, Geographies, Geography, Marker, ZoomableGroup
} from 'react-simple-maps'

const GEO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// IP to country mapping using free API
async function getCountryFromIP(ip) {
  try {
    if (ip === '127.0.0.1' || ip === 'localhost' ||
        ip.startsWith('192.168') || ip.startsWith('10.')) {
      return { country: 'IN', lat: 20.5937, lng: 78.9629,
               name: 'India' }
    }
    const res = await fetch(`https://ipapi.co/${ip}/json/`)
    const data = await res.json()
    return {
      country: data.country_code,
      lat: data.latitude,
      lng: data.longitude,
      name: data.country_name
    }
  } catch {
    return null
  }
}

export default function WorldMap({ requests = [] }) {
  const [markers, setMarkers] = useState([])
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    if (!requests.length) return
    const uniqueIPs = [...new Set(
      requests.slice(0, 20).map(r => r.ip_address)
    )]
    Promise.all(uniqueIPs.map(ip => getCountryFromIP(ip)))
      .then(results => {
        const valid = results.filter(Boolean)
        const countMap = {}
        valid.forEach(r => {
          const key = r.country
          if (!countMap[key]) countMap[key] = { ...r, count: 0 }
          countMap[key].count++
        })
        setMarkers(Object.values(countMap))
      })
  }, [requests])

  return (
    <div style={{
      background: '#1A1A2E',
      border: '1px solid #2D2D4E',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '16px'
      }}>
        <span style={{
          fontSize: '13px', color: '#8888AA',
          textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>
          REQUEST ORIGINS
        </span>
        <span style={{
          fontSize: '12px', color: '#6C63FF',
          background: 'rgba(108,99,255,0.1)',
          padding: '4px 10px', borderRadius: '20px'
        }}>
          {markers.length} countries
        </span>
      </div>

      <ComposableMap
        projection="geoMercator"
        style={{ width: '100%', height: '280px' }}
        projectionConfig={{ scale: 120, center: [0, 20] }}
      >
        <ZoomableGroup>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#2D2D4E"
                  stroke="#1A1A2E"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover:   { fill: '#3D3D6E', outline: 'none' },
                    pressed: { outline: 'none' }
                  }}
                />
              ))
            }
          </Geographies>
          {markers.map((m, i) => (
            <Marker
              key={i}
              coordinates={[m.lng, m.lat]}
              onMouseEnter={() => setTooltip(m)}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle
                r={Math.min(4 + m.count * 2, 12)}
                fill="#6C63FF"
                fillOpacity={0.8}
                stroke="#EAEAF5"
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
              />
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {tooltip && (
        <div style={{
          marginTop: '8px', fontSize: '12px',
          color: '#EAEAF5', textAlign: 'center'
        }}>
          {tooltip.name} — {tooltip.count} request
          {tooltip.count > 1 ? 's' : ''}
        </div>
      )}

      {markers.length === 0 && (
        <div style={{
          textAlign: 'center', color: '#8888AA',
          fontSize: '13px', marginTop: '20px'
        }}>
          Waiting for request data to map origins...
        </div>
      )}
    </div>
  )
}
