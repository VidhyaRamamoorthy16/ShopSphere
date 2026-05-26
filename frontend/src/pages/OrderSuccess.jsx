import React, { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function OrderSuccess() {
  const { state }  = useLocation()
  const navigate   = useNavigate()
  const [count, setCount] = useState(10)
  const confettiRef = useRef(null)

  useEffect(() => {
    if (!state?.orderId) { navigate('/'); return }
    // Countdown redirect
    const t = setInterval(() => {
      setCount(c => {
        if (c <= 1) { clearInterval(t); navigate('/orders'); return 0 }
        return c - 1
      })
    }, 1000)
    // Launch confetti
    launchConfetti()
    return () => clearInterval(t)
  }, [])

  const launchConfetti = () => {
    const canvas = confettiRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const pieces  = []
    const colors  = ['#2563eb','#16a34a','#f59e0b','#ef4444','#8b5cf6','#06b6d4']
    for (let i = 0; i < 120; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -20,
        r: Math.random() * 8 + 4,
        d: Math.random() * 80 + 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngle: 0,
        tiltSpeed: Math.random() * 0.1 + 0.05,
      })
    }
    let frame = 0
    const animate = () => {
      if (frame > 180) { ctx.clearRect(0,0,canvas.width,canvas.height); return }
      ctx.clearRect(0,0,canvas.width,canvas.height)
      pieces.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color + 'cc'
        ctx.fill()
        p.y += 3 + p.d / 60
        p.x += Math.sin(p.tiltAngle) * 2
        p.tiltAngle += p.tiltSpeed
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width }
      })
      frame++
      requestAnimationFrame(animate)
    }
    animate()
  }

  if (!state?.orderId) return null

  const { orderId, total, payMethod, address, items = [], coupon } = state
  const fmt = (n) => `$${parseFloat(n||0).toFixed(2)}`

  const shortId = String(orderId).length > 8
    ? String(orderId).slice(-8).toUpperCase()
    : String(orderId).toUpperCase()

  const payLabels = {
    cod:     '💵 Cash on Delivery',
    upi:     '📱 UPI Payment',
    card:    '💳 Card Payment',
    netbank: '🏦 Net Banking',
  }

  const estimatedDate = new Date()
  estimatedDate.setDate(estimatedDate.getDate() + 5)
  const dateStr = estimatedDate.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      {/* Confetti canvas */}
      <canvas ref={confettiRef} style={{ position:'fixed', top:0, left:0, pointerEvents:'none', zIndex:9999 }}/>

      <Navbar/>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 64px' }}>

        {/* Success card */}
        <div style={{
          background: '#fff', borderRadius: 24,
          border: '1px solid #f3f4f6',
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}>

          {/* Green header */}
          <div style={{
            background: 'linear-gradient(135deg, #065f46, #16a34a)',
            padding: '36px 32px', textAlign: 'center',
          }}>
            {/* Animated check */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, margin: '0 auto 16px',
              animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}>✅</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>
              Order Placed Successfully!
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
              Thank you for your purchase! Your order is confirmed and being processed.
            </p>
          </div>

          {/* Order details */}
          <div style={{ padding: '28px 32px' }}>

            {/* Order ID banner */}
            <div style={{
              background: '#f0fdf4', border: '1.5px solid #bbf7d0',
              borderRadius: 14, padding: '16px 20px', marginBottom: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 10,
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Order ID
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#111827', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                  #SS{shortId}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Estimated Delivery</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>📅 {dateStr}</div>
              </div>
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                { icon:'💳', label:'Payment',  value: payLabels[payMethod] || payMethod },
                { icon:'📦', label:'Status',   value: '✅ Order Confirmed' },
                { icon:'💰', label:'Total Paid',value: fmt(total) },
                { icon:'🚚', label:'Delivery',  value: '3–5 Business Days' },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ background: '#f9fafb', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>{icon} {label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Delivery address */}
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                📍 Delivering To
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{address?.full_name}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                {address?.address_line}, {address?.city}, {address?.state} — {address?.pincode}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>📞 {address?.phone}</div>
            </div>

            {/* Ordered items */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
                🛍️ Items Ordered ({items.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.slice(0, 4).map((item, i) => {
                  const product = item.products || item
                  const price   = parseFloat(product.price || 0)
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <img
                        src={product.image_url}
                        onError={e => { e.target.src=`https://picsum.photos/seed/${i}/48/48` }}
                        style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                        alt={product.name}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>×{item.quantity} • {product.category}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>${(price * item.quantity).toFixed(2)}</div>
                    </div>
                  )
                })}
                {items.length > 4 && (
                  <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>+{items.length - 4} more items</div>
                )}
              </div>
            </div>

            {/* What's next */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '16px 18px', marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', marginBottom: 10 }}>📬 What happens next?</div>
              {[
                { icon:'✅', step:'Order confirmed',    desc:'Your order is placed and confirmed' },
                { icon:'📦', step:'Packing',             desc:'Items are being prepared for dispatch' },
                { icon:'🚚', step:'Shipped',             desc:'Tracking details will be sent via email' },
                { icon:'🏠', step:'Delivered',           desc:`Expected by ${dateStr}` },
              ].map(({ icon, step, desc }, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < 3 ? 10 : 0 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{step}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/orders')}
                style={{
                  flex: 1, minWidth: 140,
                  background: '#2563eb', color: '#fff',
                  border: 'none', borderRadius: 12,
                  padding: '13px', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}>
                📦 Track My Order
              </button>
              <button
                onClick={() => navigate('/products')}
                style={{
                  flex: 1, minWidth: 140,
                  background: '#f9fafb', color: '#374151',
                  border: '1.5px solid #e5e7eb', borderRadius: 12,
                  padding: '13px', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}>
                🛍️ Continue Shopping
              </button>
            </div>

            {/* Auto redirect notice */}
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#9ca3af' }}>
              Redirecting to your orders in {count} seconds...
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0); opacity: 0 }
          to   { transform: scale(1); opacity: 1 }
        }
      `}</style>
    </div>
  )
}
