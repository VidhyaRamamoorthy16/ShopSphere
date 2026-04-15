import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../config/api'
import { useCart } from '../context/CartContext'
import { toast } from '../components/Toast'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Checkout() {
  const navigate = useNavigate()
  const { refreshCart } = useCart()
  const [step, setStep] = useState(1)
  const [placing, setPlacing] = useState(false)
  const [done, setDone] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    address: '', city: '', state: '', pincode: '',
    payment: 'card'
  })

  const placeOrder = async () => {
    setPlacing(true)
    try {
      const data = await api.post('/api/orders', { shipping_address: form })
      setOrderId(data.order.id)
      setDone(true)
      refreshCart()
    } catch (e) { toast.error('Failed to place order') }
    finally { setPlacing(false) }
  }

  const steps = ['Shipping', 'Payment', 'Review']

  const s = {
    page: { background: 'var(--bg)', minHeight: '100vh' },
    container: { maxWidth: 900, margin: '0 auto', padding: '32px' },
    steps: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
    stepWrap: { display: 'flex', alignItems: 'center' },
    stepCircle: (active, completed) => ({
      width: 40, height: 40, borderRadius: '50%',
      background: completed ? 'var(--violet)' : active ? 'var(--bg)' : 'var(--surface2)',
      border: active ? '2px solid var(--violet)' : '1px solid var(--border2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: completed ? '#fff' : active ? 'var(--violet)' : 'var(--text3)',
      fontSize: 14, fontWeight: 600,
      boxShadow: active ? '0 0 0 4px var(--violet-dim)' : 'none'
    }),
    stepLine: { width: 60, height: 2, background: 'var(--border2)', margin: '0 12px' },
    stepLabel: { fontSize: 11, fontWeight: 500, color: 'var(--text2)', marginTop: 8, textAlign: 'center' },
    card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, marginBottom: 24 },
    cardTitle: { fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 24 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    inputWrap: { marginBottom: 16 },
    label: { fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'block' },
    input: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '13px 16px', fontSize: 14, color: 'var(--text)', outline: 'none' },
    paymentOption: { display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12, cursor: 'pointer' },
    paymentActive: { borderColor: 'var(--violet)', background: 'var(--violet-dim)' },
    radio: (active) => ({ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'var(--violet)' : 'transparent' }),
    btnRow: { display: 'flex', gap: 12, justifyContent: 'flex-end' },
    btnSecondary: { background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', padding: '12px 24px', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
    btnPrimary: { background: 'var(--violet)', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    success: { textAlign: 'center', padding: '60px 20px' },
    successIcon: { width: 80, height: 80, background: 'var(--emerald-dim)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--emerald)' },
    successTitle: { fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 700, marginBottom: 12 },
    orderId: { fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'var(--text2)', marginBottom: 24 },
  }

  if (done) return (
    <div style={s.page}>
      <Navbar />
      <div style={s.container}>
        <div style={s.success}>
          <div style={s.successIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={s.successTitle}>Order Placed!</div>
          <div style={s.orderId}>Order ID: {orderId}</div>
          <button style={s.btnPrimary} onClick={() => navigate('/dashboard')}>View Orders</button>
        </div>
      </div>
      <Footer />
    </div>
  )

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.container}>
        <div style={s.steps}>
          {steps.map((st, i) => (
            <div key={st} style={s.stepWrap}>
              <div>
                <div style={s.stepCircle(step === i + 1, step > i + 1)}>{step > i + 1 ? '✓' : i + 1}</div>
                <div style={s.stepLabel}>{st}</div>
              </div>
              {i < 2 && <div style={s.stepLine} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div style={s.card}>
            <div style={s.cardTitle}>Shipping Information</div>
            <div style={s.grid2}>
              {['name', 'email'].map(f => (
                <div key={f} style={s.inputWrap}>
                  <label style={s.label}>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                  <input style={s.input} value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} />
                </div>
              ))}
            </div>
            <div style={s.inputWrap}>
              <label style={s.label}>Phone</label>
              <input style={s.input} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div style={s.inputWrap}>
              <label style={s.label}>Address</label>
              <input style={s.input} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div style={s.grid2}>
              {['city', 'state', 'pincode'].map(f => (
                <div key={f} style={s.inputWrap}>
                  <label style={s.label}>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                  <input style={s.input} value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} />
                </div>
              ))}
            </div>
            <div style={s.btnRow}>
              <button style={s.btnPrimary} onClick={() => setStep(2)}>Continue</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={s.card}>
            <div style={s.cardTitle}>Payment Method</div>
            {['card', 'upi', 'cod'].map(p => (
              <div key={p} style={{ ...s.paymentOption, ...(form.payment === p ? s.paymentActive : {}) }} onClick={() => setForm({ ...form, payment: p })}>
                <div style={s.radio(form.payment === p)}>
                  {form.payment === p && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                    {p === 'card' ? 'Credit/Debit Card' : p === 'upi' ? 'UPI Payment' : 'Cash on Delivery'}
                  </div>
                </div>
              </div>
            ))}
            <div style={s.btnRow}>
              <button style={s.btnSecondary} onClick={() => setStep(1)}>Back</button>
              <button style={s.btnPrimary} onClick={() => setStep(3)}>Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={s.card}>
            <div style={s.cardTitle}>Review & Place Order</div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8 }}>Shipping to:</div>
              <div style={{ fontSize: 14, color: 'var(--text)' }}>{form.name}, {form.address}, {form.city}</div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8 }}>Payment:</div>
              <div style={{ fontSize: 14, color: 'var(--text)', textTransform: 'uppercase' }}>{form.payment}</div>
            </div>
            <div style={s.btnRow}>
              <button style={s.btnSecondary} onClick={() => setStep(2)}>Back</button>
              <button style={s.btnPrimary} onClick={placeOrder} disabled={placing}>
                {placing ? 'Placing...' : 'Place Order'}
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
