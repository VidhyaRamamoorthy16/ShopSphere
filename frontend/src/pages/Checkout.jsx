import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { toast } from '../components/Toast'
import { useCart } from '../context/CartContext'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'
const getToken  = () => localStorage.getItem('token')
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`
})

const COUPONS = {
  SHIELD10:  { type: 'percent', value: 10,  min: 0,   label: '10% off' },
  SAVE500:   { type: 'fixed',   value: 50,  min: 200, label: '$50 off' },
  LUXURY20:  { type: 'percent', value: 20,  min: 500, label: '20% off' },
  WELCOME15: { type: 'percent', value: 15,  min: 0,   label: '15% off' },
  FIRST50:   { type: 'percent', value: 50,  min: 100, label: '50% off' },
  FREESHIP:  { type: 'ship',    value: 10,  min: 99,  label: 'Free shipping' },
}

export default function Checkout() {
  const navigate = useNavigate()
  const { refreshCart } = useCart()

  const [cart,       setCart]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [placing,    setPlacing]    = useState(false)
  const [step,       setStep]       = useState(1) // 1=address 2=payment 3=review
  const [couponCode, setCouponCode] = useState('')
  const [coupon,     setCoupon]     = useState(null)
  const [couponErr,  setCouponErr]  = useState('')
  const [payMethod,  setPayMethod]  = useState('cod')
  const [isMobile,   setIsMobile]   = useState(window.innerWidth <= 768)

  const [address, setAddress] = useState({
    full_name: '', phone: '', address_line: '',
    city: '', state: '', pincode: '', country: 'India',
  })

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    if (!getToken()) { navigate('/login'); return }
    fetchCart()
    // Pre-fill name from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.name) setAddress(a => ({ ...a, full_name: user.name }))
  }, [])

  const fetchCart = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cart`, { headers: getHeaders() })
      const data = await res.json()
      const items = data.cart || data.items || []
      if (items.length === 0) { navigate('/cart'); return }
      setCart(items)
    } catch { toast.error('Failed to load cart') }
    finally { setLoading(false) }
  }

  // ── Price calculations ──────────────────────────────────────────────────
  const subtotal  = cart.reduce((s, i) => s + (parseFloat(i.products?.price || i.price || 0) * (i.quantity || 1)), 0)
  const shipping  = subtotal >= 99 ? 0 : 9.99
  const discount  = coupon
    ? coupon.type === 'percent' ? subtotal * (coupon.value / 100)
    : coupon.type === 'fixed'   ? Math.min(coupon.value, subtotal)
    : coupon.type === 'ship'    ? shipping : 0
    : 0
  const finalShip = coupon?.type === 'ship' ? 0 : shipping
  const total     = Math.max(0, subtotal - (coupon?.type === 'percent' || coupon?.type === 'fixed' ? discount : 0) + finalShip)

  const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`

  // ── Coupon apply ────────────────────────────────────────────────────────
  const applyCoupon = () => {
    const c = COUPONS[couponCode.toUpperCase()]
    if (!c) { setCouponErr('Invalid coupon code'); return }
    if (subtotal < c.min) { setCouponErr(`Minimum order $${c.min} required`); return }
    setCoupon({ ...c, code: couponCode.toUpperCase() })
    setCouponErr('')
    toast.success(`✓ Coupon applied — ${c.label}`)
  }

  // ── Address validation ──────────────────────────────────────────────────
  const validateAddress = () => {
    const { full_name, phone, address_line, city, state, pincode } = address
    if (!full_name.trim()) { toast.error('Enter your full name'); return false }
    if (!phone.trim() || phone.length < 10) { toast.error('Enter a valid phone number'); return false }
    if (!address_line.trim()) { toast.error('Enter your address'); return false }
    if (!city.trim()) { toast.error('Enter your city'); return false }
    if (!state.trim()) { toast.error('Enter your state'); return false }
    if (!pincode.trim()) { toast.error('Enter your pincode'); return false }
    return true
  }

  // ── Place order ─────────────────────────────────────────────────────────
  const placeOrder = async () => {
    if (!validateAddress()) return
    setPlacing(true)

    try {
      const orderPayload = {
        items: cart.map(i => ({
          product_id: i.product_id || i.products?.id,
          quantity:   i.quantity,
          price:      parseFloat(i.products?.price || i.price || 0),
          name:       i.products?.name || i.name,
        })),
        total_amount:    total,
        subtotal:        subtotal,
        shipping_amount: finalShip,
        discount_amount: discount,
        coupon_code:     coupon?.code || null,
        payment_method:  payMethod,
        payment_status:  payMethod === 'cod' ? 'pending' : 'paid',
        shipping_address: JSON.stringify(address),
        status: 'confirmed',
      }

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(orderPayload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || err.message || 'Order failed')
      }

      const data = await res.json()
      const orderId = data.order?.id || data.id || data.order_id

      // Clear cart
      try {
        await fetch(`${API_BASE}/api/cart`, { method: 'DELETE', headers: getHeaders() })
      } catch {}
      refreshCart()

      // Navigate to success page
      navigate('/order-success', {
        state: {
          orderId,
          total,
          payMethod,
          address,
          items: cart,
          coupon,
        }
      })

    } catch (err) {
      console.error('Order error:', err)
      toast.error(`Order failed: ${err.message}`)
    } finally {
      setPlacing(false)
    }
  }

  const inp = (extra = {}) => ({
    width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10,
    padding: '11px 14px', fontSize: 14, color: '#111827', outline: 'none',
    fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box',
    transition: 'border-color 0.2s', ...extra,
  })

  const steps = ['Delivery Address', 'Payment Method', 'Review & Place Order']

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#6b7280' }}>Loading checkout...</div>
    </div>
  )

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px 12px' : '32px 40px' }}>

        {/* Page title */}
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: '#111827', marginBottom: 24, letterSpacing: '-0.02em' }}>
          Checkout
        </h1>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, gap: 0 }}>
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: i + 1 <= step ? '#2563eb' : '#e5e7eb',
                  color: i + 1 <= step ? '#fff' : '#9ca3af',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, transition: 'all 0.3s',
                }}>
                  {i + 1 < step ? '✓' : i + 1}
                </div>
                {!isMobile && (
                  <span style={{ fontSize: 11, color: i + 1 <= step ? '#2563eb' : '#9ca3af', fontWeight: i + 1 === step ? 600 : 400, textAlign: 'center' }}>
                    {s}
                  </span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i + 1 < step ? '#2563eb' : '#e5e7eb', transition: 'background 0.3s', marginBottom: isMobile ? 0 : 20 }} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 24, flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start' }}>

          {/* ── LEFT — Steps ── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* STEP 1 — Address */}
            {step === 1 && (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: isMobile ? 16 : 24 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 20 }}>📍 Delivery Address</h2>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                  {[
                    { key: 'full_name',    label: 'Full Name *',    placeholder: 'John Doe',           col: 2 },
                    { key: 'phone',        label: 'Phone Number *', placeholder: '+91 9876543210',     col: 2 },
                    { key: 'address_line', label: 'Address Line *', placeholder: '123, Street, Area',  col: 2 },
                    { key: 'city',         label: 'City *',         placeholder: 'Bangalore' },
                    { key: 'state',        label: 'State *',        placeholder: 'Karnataka' },
                    { key: 'pincode',      label: 'Pincode *',      placeholder: '560001' },
                    { key: 'country',      label: 'Country',        placeholder: 'India' },
                  ].map(field => (
                    <div key={field.key} style={{ gridColumn: isMobile ? 1 : (field.col === 2 ? 'span 2' : 'span 1') }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5, letterSpacing: '0.02em' }}>
                        {field.label}
                      </label>
                      <input
                        style={inp()}
                        placeholder={field.placeholder}
                        value={address[field.key]}
                        onChange={e => setAddress(a => ({ ...a, [field.key]: e.target.value }))}
                        onFocus={e => e.target.style.borderColor = '#2563eb'}
                        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { if (validateAddress()) setStep(2) }}
                  style={{
                    marginTop: 20, width: '100%',
                    background: '#2563eb', color: '#fff', border: 'none',
                    borderRadius: 12, padding: '13px', fontSize: 15,
                    fontWeight: 700, cursor: 'pointer',
                  }}>
                  Continue to Payment →
                </button>
              </div>
            )}

            {/* STEP 2 — Payment */}
            {step === 2 && (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: isMobile ? 16 : 24 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 20 }}>💳 Payment Method</h2>

                {[
                  { id: 'cod',      icon: '💵', label: 'Cash on Delivery',    sub: 'Pay when your order arrives' },
                  { id: 'upi',      icon: '📱', label: 'UPI Payment',          sub: 'GPay, PhonePe, Paytm, BHIM' },
                  { id: 'card',     icon: '💳', label: 'Credit / Debit Card',  sub: 'Visa, Mastercard, Amex' },
                  { id: 'netbank',  icon: '🏦', label: 'Net Banking',           sub: 'All major banks supported' },
                ].map(m => (
                  <div key={m.id} onClick={() => setPayMethod(m.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 12, marginBottom: 10,
                    border: `2px solid ${payMethod === m.id ? '#2563eb' : '#e5e7eb'}`,
                    background: payMethod === m.id ? '#eff6ff' : '#fff',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{m.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: payMethod === m.id ? '#1d4ed8' : '#111827' }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{m.sub}</div>
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: `2px solid ${payMethod === m.id ? '#2563eb' : '#d1d5db'}`,
                      background: payMethod === m.id ? '#2563eb' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {payMethod === m.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }}/>}
                    </div>
                  </div>
                ))}

                {/* COD note */}
                {payMethod === 'cod' && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginTop: 4, fontSize: 13, color: '#92400e' }}>
                    ⚠️ Cash on Delivery: Please keep exact change ready at delivery time.
                  </div>
                )}

                {/* UPI / Card demo note */}
                {(payMethod === 'upi' || payMethod === 'card' || payMethod === 'netbank') && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginTop: 4, fontSize: 13, color: '#1d4ed8' }}>
                    ℹ️ Demo mode: Payment will be marked as completed. In production, Razorpay handles secure payment processing.
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button onClick={() => setStep(1)} style={{
                    flex: 1, background: '#f9fafb', color: '#374151',
                    border: '1.5px solid #e5e7eb', borderRadius: 12,
                    padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>← Back</button>
                  <button onClick={() => setStep(3)} style={{
                    flex: 2, background: '#2563eb', color: '#fff',
                    border: 'none', borderRadius: 12,
                    padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  }}>Review Order →</button>
                </div>
              </div>
            )}

            {/* STEP 3 — Review */}
            {step === 3 && (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: isMobile ? 16 : 24 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 20 }}>✅ Review Your Order</h2>

                {/* Address summary */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Delivery to</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{address.full_name} • {address.phone}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                    {address.address_line}, {address.city}, {address.state} — {address.pincode}
                  </div>
                  <button onClick={() => setStep(1)} style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, fontWeight: 600 }}>
                    Edit address
                  </button>
                </div>

                {/* Payment summary */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Payment</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                    {{ cod:'💵 Cash on Delivery', upi:'📱 UPI Payment', card:'💳 Card Payment', netbank:'🏦 Net Banking' }[payMethod]}
                  </div>
                  <button onClick={() => setStep(2)} style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, fontWeight: 600 }}>
                    Change
                  </button>
                </div>

                {/* Items */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Items ({cart.length})
                  </div>
                  {cart.map((item, i) => {
                    const product = item.products || item
                    const price   = parseFloat(product.price || 0)
                    return (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #f3f4f6', marginBottom: 10 }}>
                        <img
                          src={product.image_url || `https://picsum.photos/seed/${product.id}/60/60`}
                          onError={e => { e.target.src = `https://picsum.photos/seed/${i}/60/60` }}
                          style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                          alt={product.name}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>Qty: {item.quantity}</div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', flexShrink: 0 }}>
                          ${(price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(2)} style={{
                    flex: 1, background: '#f9fafb', color: '#374151',
                    border: '1.5px solid #e5e7eb', borderRadius: 12,
                    padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>← Back</button>
                  <button
                    onClick={placeOrder}
                    disabled={placing}
                    style={{
                      flex: 2,
                      background: placing ? '#93c5fd' : '#16a34a',
                      color: '#fff', border: 'none', borderRadius: 12,
                      padding: '13px', fontSize: 15, fontWeight: 700,
                      cursor: placing ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                    {placing ? (
                      <>
                        <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
                        Placing Order...
                      </>
                    ) : `🛍️ Place Order • ${fmt(total)}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT — Order Summary ── */}
          <div style={{ width: isMobile ? '100%' : 340, flexShrink: 0 }}>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: isMobile ? 16 : 20, position: isMobile ? 'static' : 'sticky', top: 100 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Order Summary</h3>

              {/* Cart items mini */}
              <div style={{ marginBottom: 16, maxHeight: 200, overflowY: 'auto' }}>
                {cart.map((item, i) => {
                  const product = item.products || item
                  const price   = parseFloat(product.price || 0)
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        <img src={product.image_url} onError={e => { e.target.src=`https://picsum.photos/seed/${i}/40/40`}} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} alt="" />
                        <div style={{ overflow: 'hidden', minWidth: 0 }}>
                          <div style={{ fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                          <div style={{ color: '#9ca3af', fontSize: 11 }}>×{item.quantity}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 600, color: '#111827', flexShrink: 0, marginLeft: 8 }}>${(price * item.quantity).toFixed(2)}</div>
                    </div>
                  )
                })}
              </div>

              {/* Coupon input */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Coupon Code</div>
                {coupon ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 12px' }}>
                    <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ {coupon.code} — {coupon.label}</span>
                    <button onClick={() => { setCoupon(null); setCouponCode('') }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={couponCode}
                      onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponErr('') }}
                      onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                      placeholder="Enter coupon code"
                      style={{ ...inp(), flex: 1, fontSize: 13, padding: '9px 12px' }}
                    />
                    <button onClick={applyCoupon} style={{
                      background: '#2563eb', color: '#fff', border: 'none',
                      borderRadius: 10, padding: '9px 14px', fontSize: 13,
                      fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>Apply</button>
                  </div>
                )}
                {couponErr && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{couponErr}</div>}

                {/* Coupon hints */}
                {!coupon && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                    {['SHIELD10','SAVE500','WELCOME15'].map(code => (
                      <button key={code} onClick={() => { setCouponCode(code); setCouponErr('') }} style={{
                        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20,
                        padding: '3px 8px', fontSize: 10, color: '#1d4ed8',
                        cursor: 'pointer', fontWeight: 500,
                      }}>{code}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Price breakdown */}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
                {[
                  { label: 'Subtotal',  value: fmt(subtotal) },
                  { label: 'Shipping',  value: finalShip === 0 ? '🆓 Free' : fmt(finalShip) },
                  ...(coupon && discount > 0 ? [{ label: `Discount (${coupon.code})`, value: `-${fmt(discount)}`, green: true }] : []),
                ].map(({ label, value, green }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: '#6b7280' }}>{label}</span>
                    <span style={{ color: green ? '#16a34a' : '#111827', fontWeight: green ? 600 : 400 }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '2px solid #f3f4f6', marginTop: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>Total</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{fmt(total)}</span>
                </div>
              </div>

              {/* Security badge */}
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <span style={{ fontSize: 14 }}>🔒</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>Secured by ShopSphere AI Gateway</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
