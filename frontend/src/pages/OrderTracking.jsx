import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../config/api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function OrderTracking() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchOrder() }, [id])

  const fetchOrder = async () => {
    if (!api.isLoggedIn()) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await api.get(`/api/orders/${id}`)
      setOrder(data.order)
    } catch (e) {} finally { setLoading(false) }
  }

  const s = {
    page: { background: 'var(--bg)', minHeight: '100vh' },
    container: { maxWidth: 900, margin: '0 auto', padding: '32px' },
    card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    title: { fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700 },
    orderId: { fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'var(--text2)' },
    status: (s) => ({ display: 'inline-flex', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s === 'delivered' ? 'var(--emerald-dim)' : s === 'cancelled' ? 'var(--rose-dim)' : 'var(--amber-dim)', color: s === 'delivered' ? 'var(--emerald)' : s === 'cancelled' ? 'var(--rose)' : 'var(--amber)' }),
    timeline: { marginTop: 32 },
    tlItem: { display: 'flex', gap: 16, marginBottom: 24 },
    tlDot: (completed) => ({ width: 16, height: 16, borderRadius: '50%', background: completed ? 'var(--emerald)' : 'var(--border2)', flexShrink: 0, marginTop: 2 }),
    tlLine: { width: 2, background: 'var(--border)', marginLeft: 7, marginTop: -16, marginBottom: -8 },
    tlContent: { flex: 1 },
    tlTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 },
    tlDate: { fontSize: 12, color: 'var(--text3)' },
    items: { marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' },
    item: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' },
  }

  const tlSteps = [
    { title: 'Order Placed', key: 'placed' },
    { title: 'Payment Confirmed', key: 'paid' },
    { title: 'Processing', key: 'processing' },
    { title: 'Shipped', key: 'shipped' },
    { title: 'Delivered', key: 'delivered' },
  ]

  if (!api.isLoggedIn()) return (
    <div style={s.page}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={s.title}>Please sign in to track orders</div>
      </div>
    </div>
  )

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.container}>
        {loading ? (
          <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
        ) : !order ? (
          <div style={{ textAlign: 'center', padding: 80 }}>Order not found</div>
        ) : (
          <div style={s.card}>
            <div style={s.header}>
              <div>
                <div style={s.title}>Track Order</div>
                <div style={s.orderId}>#{order.id}</div>
              </div>
              <span style={s.status(order.status)}>{order.status}</span>
            </div>

            <div style={s.timeline}>
              {tlSteps.map((step, i) => (
                <div key={step.key} style={s.tlItem}>
                  <div>
                    <div style={s.tlDot(i < 4)} />
                    {i < 4 && <div style={s.tlLine} />}
                  </div>
                  <div style={s.tlContent}>
                    <div style={s.tlTitle}>{step.title}</div>
                    <div style={s.tlDate}>{i < 4 ? 'Completed' : 'Pending'}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={s.items}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Items</div>
              {order.items?.map((item, i) => (
                <div key={i} style={s.item}>
                  <span style={{ color: 'var(--text)' }}>{item.product?.name} × {item.quantity}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text2)' }}>₹{item.price}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600 }}>Total</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>₹{order.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
