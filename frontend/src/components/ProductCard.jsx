import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { toast } from './Toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const getToken  = () => localStorage.getItem('token')
const isLoggedIn = () => {
  const t = getToken()
  if (!t) return false
  try { const p = JSON.parse(atob(t.split('.')[1])); return p.exp * 1000 > Date.now() }
  catch { return false }
}

const fmt = (n) => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(n||0)

export default function ProductCard({ product: p, isMobile: isMobileProp }) {
  const navigate = useNavigate()
  const { refreshCart, refreshWishlist } = useCart()

  const [hovered,  setHovered]  = useState(false)
  const [adding,   setAdding]   = useState(false)
  const [added,    setAdded]    = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [wlLoading,  setWlLoading] = useState(false)
  const [isMobile,   setIsMobile]  = useState(isMobileProp ?? window.innerWidth <= 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  if (!p || !p.id) return null

  const price    = parseFloat(p.price)          || 0
  const origPrice= parseFloat(p.original_price) || 0
  const savings  = origPrice > price ? origPrice - price : 0
  const stars    = Math.round(parseFloat(p.rating) || 0)

  // Check wishlist on mount
  useEffect(() => {
    if (!isLoggedIn()) return
    fetch(`${API_BASE}/api/wishlist`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    }).then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        const items = d.wishlist || []
        setWishlisted(items.some(i => String(i.product_id) === String(p.id)))
      }).catch(() => {})
  }, [p.id])

  const addToCart = async (e) => {
    e.stopPropagation()
    if (!isLoggedIn()) { toast.info('Please login'); navigate('/login'); return }
    if (adding || added) return
    setAdding(true)
    try {
      const res = await fetch(`${API_BASE}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${getToken()}` },
        body: JSON.stringify({ product_id: String(p.id), quantity: 1 }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      setAdded(true)
      toast.success('✓ Added to cart!')
      refreshCart()
      setTimeout(() => setAdded(false), 2500)
    } catch (err) {
      toast.error(err.message)
    } finally { setAdding(false) }
  }

  const toggleWishlist = async (e) => {
    e.stopPropagation()
    if (!isLoggedIn()) { toast.info('Please login'); navigate('/login'); return }
    if (wlLoading) return
    setWlLoading(true)
    const prev = wishlisted
    setWishlisted(!prev)
    try {
      const res = await fetch(`${API_BASE}/api/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${getToken()}` },
        body: JSON.stringify({ product_id: String(p.id) }),
      })
      if (!res.ok) throw new Error('Failed')
      const d = await res.json()
      const now = d.action === 'added' || d.wishlisted === true
      setWishlisted(now)
      toast.success(now ? '❤️ Added to wishlist' : 'Removed from wishlist')
      refreshWishlist()
    } catch {
      setWishlisted(prev)
      toast.error('Something went wrong')
    } finally { setWlLoading(false) }
  }

  // ── size tokens based on mobile/desktop ──
  const imgH        = isMobile ? 160 : 210
  const nameSz      = isMobile ? 12  : 14
  const priceSz     = isMobile ? 15  : 18
  const saveSz      = isMobile ? 10  : 11
  const reviewSz    = isMobile ? 10  : 11
  const starSz      = isMobile ? 11  : 12
  const cardPad     = isMobile ? '10px 10px 12px' : '14px 16px 16px'
  const catSz       = isMobile ? 9   : 10
  const brandSz     = isMobile ? 10  : 11
  const btnSize     = isMobile ? 34  : 40
  const heartSize   = isMobile ? 30  : 36
  const badgeSz     = isMobile ? 9   : 11

  return (
    <div
      onClick={() => navigate(`/products/${p.id}`)}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      style={{
        background:'#fff',
        border:`1.5px solid ${hovered ? '#2563eb' : '#e5e7eb'}`,
        borderRadius: isMobile ? 12 : 16,
        overflow:'hidden',
        cursor:'pointer',
        transition:'all 0.22s ease',
        boxShadow: hovered ? '0 8px 30px rgba(37,99,235,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        display:'flex', flexDirection:'column',
        height:'100%', position:'relative',
      }}>

      {/* IMAGE */}
      <div style={{
        position:'relative', width:'100%', height:imgH,
        overflow:'hidden', background:'#f9fafb', flexShrink:0,
      }}>
        <img
          src={p.image_url || `https://picsum.photos/seed/${p.id}/400/300`}
          alt={p.name || 'Product'}
          loading="lazy"
          onError={e => { e.target.onerror=null; e.target.src=`https://picsum.photos/seed/${p.id}/400/300` }}
          style={{
            width:'100%', height:'100%', objectFit:'cover',
            transition:'transform 0.4s',
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
          }}
        />

        {/* Badges */}
        <div style={{ position:'absolute', top:6, left:6, display:'flex', flexDirection:'column', gap:3 }}>
          {p.discount_percent > 0 && (
            <span style={{
              background:'#ef4444', color:'#fff',
              fontSize:badgeSz, fontWeight:700,
              padding: isMobile ? '2px 5px' : '3px 8px',
              borderRadius:20,
            }}>-{p.discount_percent}%</span>
          )}
          {p.is_assured && (
            <span style={{
              background:'#2563eb', color:'#fff',
              fontSize:badgeSz, fontWeight:700,
              padding: isMobile ? '2px 5px' : '3px 8px',
              borderRadius:20,
            }}>✓ Assured</span>
          )}
        </div>

        {/* Wishlist heart */}
        <button
          onClick={toggleWishlist}
          style={{
            position:'absolute', top:6, right:6,
            width:heartSize, height:heartSize, borderRadius:'50%',
            background:'rgba(255,255,255,0.95)',
            border:`1.5px solid ${wishlisted ? '#ef4444' : '#e5e7eb'}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer',
            boxShadow:'0 1px 6px rgba(0,0,0,0.10)',
            transition:'all 0.2s',
            opacity: wlLoading ? 0.6 : 1,
            padding:0,
          }}>
          <svg
            width={isMobile ? 13 : 16}
            height={isMobile ? 13 : 16}
            viewBox="0 0 24 24"
            fill={wishlisted ? '#ef4444' : 'none'}
            stroke={wishlisted ? '#ef4444' : '#9ca3af'}
            strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l8.84 8.84 8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      {/* BODY */}
      <div style={{
        padding: cardPad,
        display:'flex', flexDirection:'column', flex:1,
      }}>

        {/* Category */}
        <div style={{
          fontSize:catSz, fontWeight:700, color:'#9ca3af',
          textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3,
        }}>
          {p.category}
        </div>

        {/* Name — 2 line clamp */}
        <div style={{
          fontSize:nameSz, fontWeight:700, color:'#111827',
          lineHeight:1.3, marginBottom:3,
          display:'-webkit-box', WebkitLineClamp:2,
          WebkitBoxOrient:'vertical', overflow:'hidden',
          minHeight: isMobile ? 30 : 38,
        }}>
          {p.name}
        </div>

        {/* Brand */}
        <div style={{ fontSize:brandSz, color:'#9ca3af', marginBottom: isMobile ? 6 : 8 }}>
          {p.brand}
        </div>

        {/* Stars */}
        <div style={{ display:'flex', alignItems:'center', gap:3, marginBottom: isMobile ? 8 : 12 }}>
          {[1,2,3,4,5].map(i => (
            <span key={i} style={{ fontSize:starSz, color: i<=stars ? '#f59e0b' : '#e5e7eb' }}>★</span>
          ))}
          <span style={{ fontSize:reviewSz, color:'#9ca3af' }}>
            ({(p.review_count||0).toLocaleString()})
          </span>
        </div>

        {/* Price + Cart button */}
        <div style={{
          marginTop:'auto',
          display:'flex', alignItems:'flex-end',
          justifyContent:'space-between', gap:6,
        }}>
          <div style={{ minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:4, flexWrap:'wrap' }}>
              <span style={{ fontSize:priceSz, fontWeight:800, color:'#111827', lineHeight:1 }}>
                {fmt(price)}
              </span>
              {origPrice > price && (
                <span style={{ fontSize: isMobile ? 10 : 12, color:'#d1d5db', textDecoration:'line-through' }}>
                  {fmt(origPrice)}
                </span>
              )}
            </div>
            {savings > 0 && (
              <div style={{ fontSize:saveSz, color:'#16a34a', fontWeight:600, marginTop:1 }}>
                Save {fmt(savings)}
              </div>
            )}
          </div>

          {/* Add to cart button */}
          <button
            onClick={addToCart}
            disabled={p.stock === 0 || adding}
            style={{
              width:btnSize, height:btnSize, flexShrink:0,
              background: p.stock===0 ? '#e5e7eb' : added ? '#16a34a' : '#2563eb',
              border:'none', borderRadius: isMobile ? 8 : 10,
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor: p.stock===0 ? 'not-allowed' : 'pointer',
              transition:'all 0.2s',
              transform: adding ? 'scale(0.9)' : 'scale(1)',
            }}>
            {added ? (
              <svg width={isMobile?14:18} height={isMobile?14:18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width={isMobile?14:18} height={isMobile?14:18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
