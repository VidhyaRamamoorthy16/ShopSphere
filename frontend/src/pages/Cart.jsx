import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../config/api'
import { useCart } from '../context/CartContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const formatPrice = (price) => {
  if (!price && price !== 0) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price)
}

export default function Cart() {
  const navigate = useNavigate()
  const { refreshCart } = useCart()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [couponError, setCouponError] = useState('')
  const [validating, setValidating] = useState(false)

  useEffect(() => { fetchCart() }, [])

  const fetchCart = async () => {
    if (!api.isLoggedIn()) { setLoading(false); return }
    try {
      const data = await api.get('/api/cart')
      setItems(data.cart || data.items || [])
    } catch (e) {} finally { setLoading(false) }
  }

  const updateQty = async (itemId, delta) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const newQty = Math.max(1, item.quantity + delta)
    try {
      await api.put(`/api/cart/${itemId}`, { quantity: newQty })
      setItems(items.map(i => i.id === itemId ? { ...i, quantity: newQty } : i))
    } catch (e) {}
  }

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/api/cart/${itemId}`)
      setItems(items.filter(i => i.id !== itemId))
      refreshCart()
      toast.success('Item removed')
    } catch (e) { toast.error('Failed to remove item') }
  }

  const validateCoupon = async () => {
    if (!couponCode.trim()) return
    setValidating(true)
    setCouponError('')
    try {
      const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
      const data = await api.post('/api/coupons/validate', { code: couponCode, order_total: subtotal })
      if (data.valid) {
        setCoupon(data.coupon)
        setDiscount(data.discount)
        toast.success(data.message)
      }
    } catch (e) {
      setCouponError(e.response?.data?.error || 'Invalid coupon code')
    } finally {
      setValidating(false)
    }
  }

  const removeCoupon = () => {
    setCoupon(null)
    setDiscount(0)
    setCouponCode('')
    setCouponError('')
  }

  const subtotal = items.reduce((sum, i) => sum + (i.products?.price || 0) * i.quantity, 0)
  const savings = items.reduce((sum, i) => sum + ((i.products?.original_price || i.products?.price || 0) - (i.products?.price || 0)) * i.quantity, 0)
  const total = subtotal - discount

  const s = {
    page: { background: 'var(--bg)', minHeight: '100vh' },
    layout: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40, padding: '40px 48px' },
    left: {},
    title: { fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 300, marginBottom: 28, color: 'var(--ink)' },
    item: { display: 'flex', gap: 20, background: 'var(--card)', border: '1px solid var(--faint)', padding: 20, marginBottom: 16 },
    img: { width: 80, height: 80, background: 'var(--gold-pale)', flexShrink: 0 },
    details: { flex: 1 },
    name: { fontFamily: "'Playfair Display', serif", fontSize: 14, color: 'var(--ink)', marginBottom: 6 },
    seller: { fontSize: 10, color: 'var(--muted)', marginBottom: 8 },
    price: { fontSize: 14, color: 'var(--ink)', fontWeight: 500 },
    orig: { fontSize: 11, color: 'var(--muted)', textDecoration: 'line-through', marginLeft: 6 },
    qtyRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 },
    qtyBtn: { width: 24, height: 24, background: 'var(--ink)', border: 'none', color: 'var(--bg)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    qtyVal: { fontSize: 12, color: 'var(--ink)', padding: '0 8px' },
    remove: { fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', cursor: 'pointer', marginLeft: 16 },
    right: { background: 'var(--surface)', padding: 24, border: '1px solid var(--faint)', height: 'fit-content', position: 'sticky', top: 80 },
    sumTitle: { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 300, marginBottom: 24 },
    sumRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 12 },
    sumTotal: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--faint)', paddingTop: 16, marginTop: 16, fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--ink)' },
    placeBtn: { width: '100%', background: 'var(--ink)', color: 'var(--bg)', padding: '14px', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', border: 'none', marginTop: 20, fontFamily: "'DM Sans', sans-serif" },
    empty: { textAlign: 'center', padding: '100px 48px', color: 'var(--muted)' },
    emptyTitle: { fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 300, marginBottom: 16 },
    shopBtn: { background: 'var(--ink)', color: 'var(--bg)', padding: '12px 28px', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', border: 'none', marginTop: 20 }
  }

  if (!api.isLoggedIn()) return (
    <div style={s.page}>
      <Navbar />
      <div style={s.empty}>
        <div style={s.emptyTitle}>Your Bag Awaits</div>
        <div>Please sign in to view your curated selections</div>
        <button style={s.shopBtn} onClick={() => navigate('/login')}>Sign In</button>
      </div>
      <Footer />
    </div>
  )

  if (items.length === 0) return (
    <div style={s.page}>
      <Navbar />
      <div style={s.empty}>
        <div style={s.emptyTitle}>Your Bag is Empty</div>
        <div>Discover our curated collection of exceptional pieces</div>
        <button style={s.shopBtn} onClick={() => navigate('/products')}>Explore Collection</button>
      </div>
      <Footer />
    </div>
  )

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.layout}>
        <div style={s.left}>
          <div style={s.title}>Your Bag ({items.length})</div>
          {items.map(item => (
            <div key={item.id} style={s.item}>
              <div style={s.img}>
                <img src={item.products?.image_url} alt={item.products?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => e.target.src = `https://picsum.photos/seed/${item.products?.id || item.id}/80/80`} />
              </div>
              <div style={s.details}>
                <div style={s.name}>{item.products?.name || 'Product'}</div>
                <div style={s.seller}>{item.products?.brand || 'ShopSphere'}</div>
                <div>
                  <span style={s.price}>{formatPrice((item.products?.price || 0) * item.quantity)}</span>
                  {(item.products?.original_price || 0) > (item.products?.price || 0) && (
                    <span style={s.orig}>{formatPrice(item.products.original_price * item.quantity)}</span>
                  )}
                </div>
                <div style={s.qtyRow}>
                  <button style={s.qtyBtn} onClick={() => updateQty(item.id, -1)}>−</button>
                  <span style={s.qtyVal}>{item.quantity}</span>
                  <button style={s.qtyBtn} onClick={() => updateQty(item.id, 1)}>+</button>
                  <span style={s.remove} onClick={() => removeItem(item.id)}>Remove</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={s.right}>
          <div style={s.sumTitle}>Order Summary</div>
          
          {items.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {coupon ? (
                <div style={{ background: 'var(--accent)', color: '#fff', padding: 12, fontSize: 11, letterSpacing: 0.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{coupon.code} applied</span>
                    <button onClick={removeCoupon} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 10 }}>Remove</button>
                  </div>
                  <div>You save {formatPrice(discount)}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    placeholder="Coupon code"
                    style={{ flex: 1, padding: '10px 12px', fontSize: 11, border: '1px solid var(--faint)', background: 'var(--card)' }}
                  />
                  <button
                    onClick={validateCoupon}
                    disabled={validating}
                    style={{ padding: '10px 16px', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', background: 'var(--ink)', color: 'var(--bg)', border: 'none', cursor: validating ? 'not-allowed' : 'pointer', opacity: validating ? 0.6 : 1 }}
                  >
                    {validating ? '...' : 'Apply'}
                  </button>
                </div>
              )}
              {couponError && <div style={{ fontSize: 10, color: 'var(--accent2)', marginTop: 6 }}>{couponError}</div>}
              {!coupon && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>Try SHIELD10 for 10% off</div>}
            </div>
          )}
          
          <div style={s.sumRow}><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <div style={s.sumRow}><span>Shipping</span><span>Free</span></div>
          <div style={s.sumRow}><span>Savings</span><span style={{ color: 'var(--accent)' }}>− {formatPrice(savings)}</span></div>
          {discount > 0 && <div style={s.sumRow}><span>Coupon Discount</span><span style={{ color: 'var(--accent)' }}>− {formatPrice(discount)}</span></div>}
          <div style={s.sumTotal}><span>Total</span><span>{formatPrice(total)}</span></div>
          <button style={s.placeBtn} onClick={() => navigate('/checkout')}>Place Order</button>
        </div>
      </div>
      <Footer />
    </div>
  )
}
