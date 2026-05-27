import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const API_BASE  = import.meta.env.VITE_API_URL || 'http://localhost:5001'
const getToken  = () => localStorage.getItem('token')
const getHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })
const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`

const STATUS_CONFIG = {
  confirmed: { label: 'Order Confirmed', color: '#2563eb', bg: '#eff6ff', icon: '✅', desc: 'Your order has been placed and confirmed.' },
  packed:    { label: 'Being Packed',    color: '#7c3aed', bg: '#f5f3ff', icon: '📦', desc: 'Your items are being carefully packed.' },
  shipped:   { label: 'Out for Delivery',color: '#0891b2', bg: '#ecfeff', icon: '🚚', desc: 'Your order is on the way!' },
  delivered: { label: 'Delivered',       color: '#16a34a', bg: '#f0fdf4', icon: '🏠', desc: 'Your order has been delivered successfully.' },
  cancelled: { label: 'Cancelled',       color: '#dc2626', bg: '#fef2f2', icon: '❌', desc: 'This order was cancelled.' },
}

export default function OrderDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [order,    setOrder]   = useState(null)
  const [loading,  setLoading] = useState(true)
  const [isMobile, setIsMobile]= useState(window.innerWidth <= 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    if (!getToken()) { navigate('/login'); return }
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/orders/${id}`, { headers: getHeaders() })
      if (!res.ok) throw new Error('Order not found')
      const data = await res.json()
      setOrder(data.order || data)
    } catch (err) {
      console.error(err)
      navigate('/orders')
    } finally { setLoading(false) }
  }

  const cancelOrder = async () => {
    const confirmed = window.confirm('Cancel this order? This cannot be undone.')
    if (!confirmed) return

    try {
      const res = await fetch(`${API_BASE}/api/orders/${id}/cancel`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to cancel')
      }
      alert('Order cancelled successfully!')
      fetchOrder() // Refresh order detail
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb' }}>
      <div style={{ fontSize:14, color:'#6b7280' }}>Loading order details...</div>
    </div>
  )

  if (!order) return null

  const cfg     = STATUS_CONFIG[order.status] || STATUS_CONFIG.confirmed
  const items   = order.order_items || order.items || []
  const shortId = 'SS' + String(order.id).slice(-8).toUpperCase()

  const getAddress = (raw) => {
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return {} }
  }
  const addr = getAddress(order.shipping_address)

  const estDelivery = new Date(order.created_at)
  estDelivery.setDate(estDelivery.getDate() + 5)

  const TIMELINE = [
    { key:'confirmed', label:'Order Placed',      icon:'🛒',  done: true,                                    time: new Date(order.created_at).toLocaleString() },
    { key:'packed',    label:'Order Packed',       icon:'📦',  done: ['packed','shipped','delivered'].includes(order.status), time: order.status === 'confirmed' ? 'Pending' : 'Completed' },
    { key:'shipped',   label:'Out for Delivery',   icon:'🚚',  done: ['shipped','delivered'].includes(order.status),          time: order.status === 'shipped' || order.status === 'delivered' ? 'In Progress' : 'Pending' },
    { key:'delivered', label:'Delivered',          icon:'🏠',  done: order.status === 'delivered',            time: order.status === 'delivered' ? 'Delivered' : estDelivery.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) },
  ]

  return (
    <div style={{ background:'#f9fafb', minHeight:'100vh' }}>
      <Navbar />
      <div style={{ maxWidth:840, margin:'0 auto', padding: isMobile ? '16px 12px 40px' : '32px 40px 64px' }}>

        {/* Back button */}
        <button onClick={() => navigate('/orders')} style={{
          display:'flex', alignItems:'center', gap:6,
          background:'none', border:'none', cursor:'pointer',
          color:'#6b7280', fontSize:13, fontWeight:600, marginBottom:20, padding:0,
        }}>
          ← Back to Orders
        </button>

        {/* Status banner */}
        <div style={{
          background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}11)`,
          border: `1.5px solid ${cfg.color}44`,
          borderRadius:20, padding: isMobile ? '20px 18px' : '24px 28px',
          marginBottom:20, display:'flex', alignItems:'center',
          justifyContent:'space-between', flexWrap:'wrap', gap:12,
        }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <span style={{ fontSize:28 }}>{cfg.icon}</span>
              <span style={{ fontSize: isMobile ? 18 : 22, fontWeight:800, color:'#111827' }}>{cfg.label}</span>
            </div>
            <div style={{ fontSize:13, color:'#6b7280' }}>{cfg.desc}</div>
          </div>
          <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <div style={{ fontSize:11, color:'#9ca3af', marginBottom:3 }}>Order ID</div>
            <div style={{ fontSize:20, fontWeight:900, color:'#111827', fontFamily:'monospace', letterSpacing:'0.08em' }}>#{shortId}</div>
            <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>
              {new Date(order.created_at).toLocaleDateString('en-US', { day:'numeric', month:'long', year:'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:16, flexDirection: isMobile ? 'column' : 'row', alignItems:'flex-start' }}>

          {/* LEFT */}
          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:14 }}>

            {/* Tracking timeline */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f3f4f6', padding: isMobile ? 16 : 20 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'#111827', marginBottom:20 }}>📍 Order Timeline</h3>
              {TIMELINE.map((step, i) => (
                <div key={step.key} style={{ display:'flex', gap:14, marginBottom: i < TIMELINE.length-1 ? 0 : 0 }}>
                  {/* Dot + line */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:36, flexShrink:0 }}>
                    <div style={{
                      width:36, height:36, borderRadius:'50%',
                      background: step.done ? '#2563eb' : '#f3f4f6',
                      border: `2px solid ${step.done ? '#2563eb' : '#e5e7eb'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:16, flexShrink:0,
                    }}>
                      {step.done ? <span style={{ color:'#fff', fontSize:14, fontWeight:700 }}>✓</span>
                                 : <span style={{ color:'#9ca3af', fontSize:14 }}>{step.icon}</span>}
                    </div>
                    {i < TIMELINE.length - 1 && (
                      <div style={{ width:2, flex:1, minHeight:24, background: step.done ? '#2563eb' : '#e5e7eb', margin:'4px 0' }}/>
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ paddingBottom: i < TIMELINE.length-1 ? 20 : 0, flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color: step.done ? '#111827' : '#9ca3af' }}>{step.label}</div>
                    <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>{step.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Items */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f3f4f6', padding: isMobile ? 16 : 20 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'#111827', marginBottom:16 }}>🛍️ Items ({items.length})</h3>
              {items.map((item, i) => (
                <div key={i} style={{ display:'flex', gap:12, alignItems:'center', paddingBottom:12, borderBottom: i < items.length-1 ? '1px solid #f9fafb' : 'none', marginBottom: i < items.length-1 ? 12 : 0 }}>
                  <img
                    src={item.image_url || `https://picsum.photos/seed/${item.product_id || i}/70/70`}
                    onError={e => { e.target.src=`https://picsum.photos/seed/${i+20}/70/70` }}
                    style={{ width:64, height:64, borderRadius:12, objectFit:'cover', border:'1px solid #f3f4f6', flexShrink:0 }}
                    alt={item.name}
                  />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'#111827', marginBottom:2 }}>{item.name}</div>
                    <div style={{ fontSize:12, color:'#9ca3af' }}>Quantity: {item.quantity}</div>
                    <div style={{ fontSize:12, color:'#9ca3af' }}>Unit price: {fmt(item.price)}</div>
                  </div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#111827', flexShrink:0 }}>
                    {fmt(parseFloat(item.price) * parseInt(item.quantity))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ width: isMobile ? '100%' : 300, flexShrink:0, display:'flex', flexDirection:'column', gap:14 }}>

            {/* Price breakdown */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f3f4f6', padding: isMobile ? 16 : 20 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'#111827', marginBottom:16 }}>💰 Price Summary</h3>
              {[
                { label:'Subtotal',   value: fmt(order.subtotal || order.total_amount) },
                { label:'Shipping',   value: parseFloat(order.shipping_amount || 0) === 0 ? '🆓 Free' : fmt(order.shipping_amount) },
                ...(parseFloat(order.discount_amount || 0) > 0 ? [{ label:`Discount ${order.coupon_code ? `(${order.coupon_code})` : ''}`, value:`-${fmt(order.discount_amount)}`, green:true }] : []),
              ].map(({ label, value, green }) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:10, fontSize:13 }}>
                  <span style={{ color:'#6b7280' }}>{label}</span>
                  <span style={{ fontWeight: green ? 700 : 500, color: green ? '#16a34a' : '#111827' }}>{value}</span>
                </div>
              ))}
              <div style={{ borderTop:'2px solid #f3f4f6', paddingTop:12, marginTop:4, display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:15, fontWeight:800, color:'#111827' }}>Total</span>
                <span style={{ fontSize:17, fontWeight:800, color:'#111827' }}>{fmt(order.total_amount)}</span>
              </div>
            </div>

            {/* Payment info */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f3f4f6', padding: isMobile ? 16 : 20 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'#111827', marginBottom:14 }}>💳 Payment</h3>
              {[
                { label:'Method',  value: ({ cod:'💵 Cash on Delivery', upi:'📱 UPI', card:'💳 Card', netbank:'🏦 Net Banking' }[order.payment_method]) || order.payment_method },
                { label:'Status',  value: order.payment_status === 'paid' ? '✅ Paid' : order.payment_status === 'pending' ? '⏳ Pending (Pay on delivery)' : order.payment_status },
                ...(order.tracking_number ? [{ label:'Tracking', value: order.tracking_number }] : []),
              ].map(({ label, value }) => (
                <div key={label} style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2, fontWeight:600 }}>{label}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#111827' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Delivery address */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f3f4f6', padding: isMobile ? 16 : 20 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'#111827', marginBottom:14 }}>📍 Delivery Address</h3>
              <div style={{ fontSize:14, fontWeight:600, color:'#111827', marginBottom:4 }}>{addr.full_name}</div>
              <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.6 }}>
                {addr.address_line}<br/>
                {addr.city}, {addr.state} — {addr.pincode}<br/>
                {addr.country}<br/>
                📞 {addr.phone}
              </div>
            </div>

            {/* Estimated delivery */}
            <div style={{ background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:16, padding: isMobile ? 16 : 20, textAlign:'center' }}>
              <div style={{ fontSize:13, color:'#6b7280', marginBottom:4 }}>Estimated Delivery</div>
              <div style={{ fontSize:16, fontWeight:800, color:'#1d4ed8' }}>
                📅 {order.status === 'delivered' ? '✅ Delivered!' : estDelivery.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
              </div>
            </div>

            {/* Action buttons */}
            <button onClick={() => navigate('/orders')} style={{
              width:'100%', background:'#fff',
              border:'1.5px solid #e5e7eb', borderRadius:12,
              padding:'12px', fontSize:14, fontWeight:600,
              color:'#374151', cursor:'pointer',
            }}>
              ← All Orders
            </button>
            {(order.status === 'confirmed' || order.status === 'pending') && (
              <button
                onClick={cancelOrder}
                style={{
                  width:'100%',
                  background: '#fef2f2', color: '#dc2626',
                  border: '1.5px solid #fecaca', borderRadius: 12,
                  padding: '12px', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}>
                ❌ Cancel Order
              </button>
            )}
            <button onClick={() => navigate('/products')} style={{
              width:'100%', background:'#2563eb', color:'#fff',
              border:'none', borderRadius:12, padding:'12px',
              fontSize:14, fontWeight:700, cursor:'pointer',
            }}>
              🛒 Shop Again
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
