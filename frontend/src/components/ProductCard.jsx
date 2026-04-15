import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../config/api'
import { useCart } from '../context/CartContext'
import { toast } from './Toast'

export default function ProductCard({ product: p, size = 'normal' }) {
  const navigate = useNavigate()
  const { refreshCart, refreshWishlist } = useCart()
  const [hovered, setHovered] = useState(false)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  // Check wishlist status on mount
  useEffect(() => {
    const checkWishlist = async () => {
      if (!api.isLoggedIn()) return
      try {
        const data = await api.get('/api/wishlist')
        const items = data.wishlist || []
        setWishlisted(items.some(item => item.product_id === p.id))
      } catch (e) {}
    }
    checkWishlist()
  }, [p.id])

  const addToCart = async (e) => {
    e.stopPropagation()
    console.log('addToCart clicked, product:', p.id, 'loggedIn:', api.isLoggedIn())
    if (!api.isLoggedIn()) {
      toast.info('Please login to add items to cart')
      navigate('/login')
      return
    }
    if (adding || added) return
    setAdding(true)
    try {
      console.log('Calling API: POST /api/cart', { product_id: p.id, quantity: 1 })
      const result = await api.post('/api/cart', { product_id: p.id, quantity: 1 })
      console.log('Add to cart result:', result)
      setAdded(true)
      toast.success(`${p.name.slice(0, 30)}... added to cart!`)
      refreshCart()
      setTimeout(() => setAdded(false), 2000)
    } catch (err) {
      console.error('Add to cart error:', err)
      toast.error('Failed to add to cart: ' + (err.message || 'Unknown error'))
    } finally {
      setAdding(false)
    }
  }

  const toggleWishlist = async (e) => {
    e.stopPropagation()
    console.log('toggleWishlist clicked, product:', p.id, 'loggedIn:', api.isLoggedIn())
    if (!api.isLoggedIn()) {
      toast.info('Please login to save items')
      navigate('/login')
      return
    }
    if (wishlistLoading) return
    setWishlistLoading(true)
    const wasWishlisted = wishlisted
    setWishlisted(!wasWishlisted)
    try {
      console.log('Calling API: POST /api/wishlist', { product_id: p.id })
      const data = await api.post('/api/wishlist', { product_id: p.id })
      console.log('Wishlist toggle result:', data)
      const isNowAdded = data.action === 'added'
      setWishlisted(isNowAdded)
      toast.success(isNowAdded ? '❤️ Saved to wishlist' : 'Removed from wishlist')
      refreshWishlist()
    } catch (err) {
      console.error('Wishlist toggle error:', err)
      setWishlisted(wasWishlisted)
      toast.error('Something went wrong')
    } finally {
      setWishlistLoading(false)
    }
  }

  const imgH = size === 'large' ? 280 : size === 'featured' ? 300 : size === 'small' ? 160 : 210
  const stars = Math.min(5, Math.max(0, Math.round(p.rating || 0)))
  const savings = (p.original_price || 0) - (p.price || 0)

  return (
    <div
      onClick={() => navigate(`/products/${p.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#ffffff',
        border: `1px solid ${hovered ? '#d1d5db' : '#f3f4f6'}`,
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}>

      {/* Image container — fixed height, no layout shift */}
      <div style={{ position: 'relative', width: '100%', height: imgH, flexShrink: 0, overflow: 'hidden', background: '#f9fafb' }}>
        <img
          src={p.image_url}
          alt={p.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.45s ease', transform: hovered ? 'scale(1.07)' : 'scale(1)', display: 'block' }}
          onError={e => { e.target.onerror = null; e.target.src = `https://picsum.photos/seed/${p.id}/400/280` }}
        />

        {/* Badges — top left */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {p.discount_percent > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, letterSpacing: '0.03em', lineHeight: 1.4 }}>
              -{p.discount_percent}%
            </span>
          )}
          {p.is_assured && (
            <span style={{ background: '#2563eb', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, letterSpacing: '0.03em', lineHeight: 1.4 }}>
              Assured
            </span>
          )}
          {p.stock === 0 && (
            <span style={{ background: '#6b7280', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, lineHeight: 1.4 }}>
              Out of Stock
            </span>
          )}
        </div>

        {/* Wishlist — top right */}
        <button
          onClick={toggleWishlist}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #e5e7eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: wishlistLoading ? 'default' : 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.2s',
            opacity: wishlistLoading ? 0.6 : 1,
          }}>
          <svg width="15" height="15" viewBox="0 0 24 24"
            fill={wishlisted ? '#ef4444' : 'none'}
            stroke={wishlisted ? '#ef4444' : '#9ca3af'}
            strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l8.84 8.84 8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      {/* Card body — flex grow fills remaining space */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Category */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 5 }}>{p.category}</div>

        {/* Product name — always 2 lines */}
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.35,
          marginBottom: 8,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '38px',
        }}>{p.name}</div>

        {/* Brand */}
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, fontWeight: 500, letterSpacing: '0.01em' }}>{p.brand}</div>

        {/* Stars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 1 }}>
            {[1,2,3,4,5].map(i => (
              <svg key={i} width="12" height="12" viewBox="0 0 24 24"
                fill={i <= stars ? '#f59e0b' : '#e5e7eb'} stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            ))}
          </div>
          <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{p.rating} ({p.review_count?.toLocaleString() || 0})</span>
        </div>

        {/* Price row — pinned to bottom */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1 }}>₹{(p.price || 0).toLocaleString()}</span>
              {p.original_price > p.price && (
                <span style={{ fontSize: 12, color: '#d1d5db', textDecoration: 'line-through', fontWeight: 400 }}>₹{(p.original_price || 0).toLocaleString()}</span>
              )}
            </div>
            {savings > 0 && (
              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>Save ₹{savings.toLocaleString()}</div>
            )}
          </div>

          {/* Add to cart button */}
          <button onClick={addToCart}
            disabled={p.stock === 0}
            style={{
              width: 38, height: 38, flexShrink: 0,
              background: p.stock === 0 ? '#e5e7eb' : added ? '#16a34a' : '#2563eb',
              border: 'none',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: p.stock === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              transform: adding ? 'scale(0.92)' : 'scale(1)',
            }}>
            {added ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
