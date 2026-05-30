import React, { useEffect, useRef } from 'react'

export default function DonutChart({ total, blocked, allowed, rateLimited, isMobile }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  const normal = Math.max(0, allowed - rateLimited)

  const data = [
    { label: 'Allowed',      value: normal,      color: '#3b82f6' },
    { label: 'Blocked',      value: blocked,     color: '#ef4444' },
    { label: 'Rate Limited', value: rateLimited,  color: '#f59e0b' },
  ].filter(d => d.value > 0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Destroy old chart
    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    // Dynamically import Chart.js
    import('chart.js/auto').then(({ Chart }) => {
      if (!canvas) return
      const total_val = data.reduce((s, d) => s + d.value, 0)

      chartRef.current = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: data.map(d => d.label),
          datasets: [{
            data:            data.map(d => d.value),
            backgroundColor: data.map(d => d.color),
            borderWidth:     0,
            hoverOffset:     6,
          }]
        },
        options: {
          responsive:          true,
          maintainAspectRatio: false,
          cutout:              '72%',
          animation:           { duration: 600, easing: 'easeInOutQuart' },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const pct = total_val > 0
                    ? ((ctx.raw / total_val) * 100).toFixed(1)
                    : 0
                  return `  ${ctx.label}: ${ctx.raw} (${pct}%)` 
                }
              },
              backgroundColor: '#1f2937',
              titleColor:      '#fff',
              bodyColor:       '#9ca3af',
              borderColor:     '#374151',
              borderWidth:     1,
              padding:         10,
              cornerRadius:    8,
            }
          }
        }
      })
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [total, blocked, allowed, rateLimited])

  const total_val = data.reduce((s, d) => s + d.value, 0)

  const blockPct = total_val > 0
    ? ((blocked / total_val) * 100).toFixed(1)
    : '0.0'

  return (
    <div style={{
      background:    '#111827',
      border:        '1px solid #1f2937',
      borderRadius:  16,
      padding:       isMobile ? '16px 14px' : '24px 28px',
      marginBottom:  isMobile ? 14 : 20,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: '#fff' }}>
            Request Breakdown
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            Live traffic distribution
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: '#065f46', borderRadius: 20, padding: '4px 12px',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#10b981',
            animation: 'pulse 1.5s infinite',
          }}/>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>LIVE</span>
        </div>
      </div>

      {/* Chart + center text + legend */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            isMobile ? 20 : 32,
        flexDirection:  isMobile ? 'column' : 'row',
      }}>

        {/* Donut */}
        <div style={{ position: 'relative', width: isMobile ? 160 : 200, height: isMobile ? 160 : 200, flexShrink: 0 }}>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Donut chart: ${normal} allowed, ${blocked} blocked, ${rateLimited} rate limited`}>
            Request breakdown: {normal} allowed, {blocked} blocked, {rateLimited} rate limited.
          </canvas>

          {/* Center label */}
          <div style={{
            position:   'absolute',
            top:        '50%',
            left:       '50%',
            transform:  'translate(-50%, -50%)',
            textAlign:  'center',
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
              {total_val.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
              total
            </div>
          </div>
        </div>

        {/* Legend + stats */}
        <div style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : 'auto' }}>

          {/* Legend items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {data.map(({ label, value, color }) => {
              const pct = total_val > 0 ? ((value / total_val) * 100).toFixed(1) : '0.0'
              const barW = total_val > 0 ? (value / total_val) * 100 : 0
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }}/>
                      <span style={{ fontSize: 13, color: '#e5e7eb', fontWeight: 500 }}>{label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                        {value.toLocaleString()}
                      </span>
                      <span style={{ fontSize: 11, color: '#6b7280', minWidth: 40, textAlign: 'right' }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                  {/* Mini progress bar */}
                  <div style={{ height: 4, background: '#1f2937', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width:  `${barW}%`,
                      background: color,
                      borderRadius: 4,
                      transition: 'width 0.6s ease',
                    }}/>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Block rate callout */}
          <div style={{
            background:   blocked > 100 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            border:       `1px solid ${blocked > 100 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
            borderRadius: 10,
            padding:      '10px 14px',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>Block rate</span>
            <span style={{
              fontSize:   16,
              fontWeight: 800,
              color:      blocked > 100 ? '#ef4444' : '#10b981',
            }}>
              {blockPct}%
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.4; }
        }
      `}</style>
    </div>
  )
}
