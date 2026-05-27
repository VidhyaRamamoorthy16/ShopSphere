import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'
const getToken  = () => localStorage.getItem('token')
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`
})
const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`

const STATUS_CONFIG = {
  confirmed:  { label: 'Confirmed',    color: '#2563eb', bg: '#eff6ff', icon: '✅' },
  pending:    { label: 'Pending',      color: '#d97706', bg: '#fffbeb', icon: '⏳' },
  packed:     { label: 'Packed',       color: '#7c3aed', bg: '#f5f3ff', icon: '📦' },
  shipped:    { label: 'Shipped',      color: '#0891b2', bg: '#ecfeff', icon: '🚚' },
  delivered:  { label: 'Delivered',    color: '#16a34a', bg: '#f0fdf4', icon: '🏠' },
  cancelled:  { label: 'Cancelled',    color: '#dc2626', bg: '#fef2f2', icon: '❌' },
  returned:   { label: 'Returned',     color: '#9ca3af', bg: '#f9fafb', icon: '↩️' },
}

const PAY_LABELS = {
  cod:     '💵 Cash on Delivery',
  upi:     '📱 UPI',
  card:    '💳 Card',
  netbank: '🏦 Net Banking',
}

export default function Orders() {
  const navigate = useNavigate()
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [filter,  setFilter]  = useState('all')
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    if (!getToken()) { navigate('/login'); return }
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/orders`, { headers: getHeaders() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list = data.orders || data || []
      setOrders(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('Orders fetch error:', err)
      setError('Failed to load orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all'
    ? orders
    : orders.filter(o => o.status === filter)

  const tabs = [
    { key: 'all',       label: 'All Orders' },
    { key: 'confirmed', label: 'Confirmed'  },
    { key: 'shipped',   label: 'Shipped'    },
    { key: 'delivered', label: 'Delivered'  },
    { key: 'cancelled', label: 'Cancelled'  },
  ]

  const getShortId = (id) => 'SS' + String(id).slice(-8).toUpperCase()

  const getAddress = (raw) => {
    if (!raw) return 'Address not available'
    try {
      const a = typeof raw === 'string' ? JSON.parse(raw) : raw
      return `${a.address_line}, ${a.city}, ${a.state} — ${a.pincode}`
    } catch { return String(raw) }
  }

  const getDeliveryDate = (createdAt) => {
    const d = new Date(createdAt)
    d.setDate(d.getDate() + 5)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // ── Skeleton ────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '20px 12px' : '32px 40px' }}>
        <div style={{ height: 32, background: '#e5e7eb', borderRadius: 8, width: 200, marginBottom: 24 }}/>
        {[1,2,3].map(i => (
          <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, border: '1px solid #f3f4f6' }}>
            <div style={{ height: 16, background: '#f3f4f6', borderRadius: 4, width: '40%', marginBottom: 10 }}/>
            <div style={{ height: 12, background: '#f3f4f6', borderRadius: 4, width: '60%', marginBottom: 8 }}/>
            <div style={{ height: 12, background: '#f3f4f6', borderRadius: 4, width: '30%' }}/>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  )

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <Navbar />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '20px 12px' : '32px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: 2 }}>
              My Orders
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              {orders.length} order{orders.length !== 1 ? 's' : ''} placed
            </p>
          </div>
          <button onClick={fetchOrders} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#fff', border: '1.5px solid #e5e7eb',
            borderRadius: 10, padding: '8px 16px',
            fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer',
          }}>
            🔄 Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {tabs.map(tab => {
            const count = tab.key === 'all' ? orders.length : orders.filter(o => o.status === tab.key).length
            return (
              <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${filter === tab.key ? '#2563eb' : '#e5e7eb'}`,
                background: filter === tab.key ? '#eff6ff' : '#fff',
                color: filter === tab.key ? '#2563eb' : '#6b7280',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}>
                {tab.label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
              </button>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', marginBottom: 16, color: '#dc2626', fontSize: 14 }}>
            ⚠️ {error}
            <button onClick={fetchOrders} style={{ marginLeft: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Retry</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f3f4f6', padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📦</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              {filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
            </h2>
            <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>
              {filter === 'all' ? 'Start shopping to see your orders here!' : 'Try a different filter.'}
            </p>
            <button onClick={() => navigate('/products')} style={{
              background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: 12, padding: '12px 28px',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              🛒 Start Shopping
            </button>
          </div>
        )}

        {/* Orders list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(order => {
            const cfg     = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
            const shortId = getShortId(order.id)
            const items   = order.order_items || order.items || []
            const addr    = getAddress(order.shipping_address)
            const estDate = getDeliveryDate(order.created_at)

            return (
              <div key={order.id} style={{
                background: '#fff',
                border: '1px solid #f3f4f6',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)' }>

                {/* Order header */}
                <div style={{
                  padding: isMobile ? '14px 16px' : '16px 20px',
                  borderBottom: '1px solid #f9fafb',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: '#111827', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                        #{shortId}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                        {new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' • '}
                        {new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: cfg.bg,
                    border: `1.5px solid ${cfg.color}33`,
                    borderRadius: 20, padding: '5px 12px',
                  }}>
                    <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                  </div>
                </div>

                {/* Order body */}
                <div style={{ padding: isMobile ? '14px 16px' : '16px 20px' }}>

                  {/* Items preview */}
                  {items.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                      {items.slice(0, isMobile ? 3 : 4).map((item, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img
                            src={item.image_url || `https://picsum.photos/seed/${item.product_id}/60/60`}
                            onError={e => { e.target.src = `https://picsum.photos/seed/${i + 10}/60/60` }}
                            alt={item.name}
                            style={{ width: isMobile ? 52 : 60, height: isMobile ? 52 : 60, borderRadius: 10, objectFit: 'cover', border: '1px solid #f3f4f6' }}
                          />
                          {item.quantity > 1 && (
                            <div style={{
                              position: 'absolute', top: -4, right: -4,
                              background: '#2563eb', color: '#fff',
                              width: 18, height: 18, borderRadius: '50%',
                              fontSize: 9, fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>×{item.quantity}</div>
                          )}
                        </div>
                      ))}
                      {items.length > (isMobile ? 3 : 4) && (
                        <div style={{
                          width: isMobile ? 52 : 60, height: isMobile ? 52 : 60,
                          borderRadius: 10, background: '#f3f4f6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 600, color: '#6b7280',
                          border: '1px solid #e5e7eb',
                        }}>
                          +{items.length - (isMobile ? 3 : 4)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Item names */}
                  {items.length > 0 && (
                    <div style={{ fontSize: 13, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                      {items.slice(0, 2).map(i => i.name).join(', ')}
                      {items.length > 2 && ` +${items.length - 2} more`}
                    </div>
                  )}

                  {/* Info row */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'Total',    value: fmt(order.total_amount) },
                      { label: 'Payment',  value: PAY_LABELS[order.payment_method] || order.payment_method || 'N/A' },
                      { label: 'Items',    value: `${items.length} item${items.length !== 1 ? 's' : ''}` },
                      { label: 'Est. Delivery', value: order.status === 'delivered' ? '✅ Delivered' : estDate },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: '#f9fafb', borderRadius: 10, padding: '9px 12px' }}>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                        <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#111827' }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Address */}
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ flexShrink: 0 }}>📍</span>
                    <span>{addr}</span>
                  </div>

                  {/* Progress track */}
                  <OrderProgress status={order.status} />

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <button onClick={() => navigate(`/orders/${order.id}`)} style={{
                      flex: 1, minWidth: 120,
                      background: '#2563eb', color: '#fff', border: 'none',
                      borderRadius: 10, padding: '9px 14px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                      📋 View Details
                    </button>
                    {order.status === 'shipped' && (
                      <button style={{
                        flex: 1, minWidth: 120,
                        background: '#f0fdf4', color: '#16a34a',
                        border: '1.5px solid #bbf7d0', borderRadius: 10,
                        padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}>
                        🚚 Track Shipment
                      </button>
                    )}
                    {(order.status === 'confirmed' || order.status === 'pending') && (
                      <button style={{
                        background: '#fef2f2', color: '#dc2626',
                        border: '1.5px solid #fecaca', borderRadius: 10,
                        padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}>
                        ❌ Cancel
                      </button>
                    )}
                    {order.status === 'delivered' && (
                      <button onClick={() => navigate('/products')} style={{
                        background: '#f5f3ff', color: '#7c3aed',
                        border: '1.5px solid #ddd6fe', borderRadius: 10,
                        padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}>
                        ⭐ Leave Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Footer />
    </div>
  )
}

// ── Order Progress Bar ───────────────────────────────────────────────────────
function OrderProgress({ status }) {
  const steps = [
    { key: 'confirmed', label: 'Confirmed', icon: '✅' },
    { key: 'packed',    label: 'Packed',    icon: '📦' },
    { key: 'shipped',   label: 'Shipped',   icon: '🚚' },
    { key: 'delivered', label: 'Delivered', icon: '🏠' },
  ]
  const order_map = { confirmed: 0, packed: 1, shipped: 2, delivered: 3 }
  const currentIdx = order_map[status] ?? 0
  const isCancelled = status === 'cancelled'

  if (isCancelled) {
    return (
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
        ❌ This order was cancelled
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((step, i) => {
        const done    = i <= currentIdx
        const current = i === currentIdx
        return (
          <React.Fragment key={step.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done ? '#2563eb' : '#e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: done ? 12 : 10,
                border: current ? '2px solid #2563eb' : 'none',
                boxShadow: current ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
                transition: 'all 0.3s',
              }}>
                {done ? <span style={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>✓</span>
                      : <span style={{ color: '#9ca3af', fontSize: 10 }}>{i + 1}</span>}
              </div>
              <span style={{ fontSize: 9, color: done ? '#2563eb' : '#9ca3af', fontWeight: done ? 600 : 400, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < currentIdx ? '#2563eb' : '#e5e7eb', marginBottom: 18, transition: 'background 0.3s' }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
