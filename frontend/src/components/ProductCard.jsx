import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, API_BASE } from '../config/api'
import { useCart } from '../context/CartContext'
import { toast } from './Toast'

export default function ProductCard({ product: p }) {
  const navigate = useNavigate()
  const { refreshCart, refreshWishlist } = useCart()
  const [hovered, setHovered] = useState(false)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  useEffect(() => {
    const checkWishlist = async () => {
      if (!api.isLoggedIn()) return
      try {
        const data = await api.get('/api/wishlist')
        const items = data.wishlist || data || []
        setWishlisted(items.some(item =>
          item.product_id === p.id || item.products?.id === p.id
        ))
      } catch (e) { console.log('wishlist check failed', e) }
    }
    checkWishlist()
  }, [p.id])

  const addToCart = async (e) => {
    e.stopPropagation()
    if (!api.isLoggedIn()) {
      toast.info('Please login to add items to cart')
      navigate('/login')
      return
    }
    if (adding || added) return
    setAdding(true)
    try {
      await api.post('/api/cart', { product_id: p.id, quantity: 1 })
      setAdded(true)
      toast.success(`${p.name.substring(0, 25)}... added to cart!`)
      refreshCart()
      setTimeout(() => setAdded(false), 2500)
    } catch (err) {
      toast.error('Failed to add to cart. Please try again.')
      console.error('Cart error:', err)
    } finally {
      setAdding(false)
    }
  }

  const toggleWishlist = async (e) => {
    e.stopPropagation()
    if (!api.isLoggedIn()) {
      toast.info('Please login to save items')
      navigate('/login')
      return
    }
    if (wishlistLoading) return
    setWishlistLoading(true)
    const prev = wishlisted
    setWishlisted(!prev)
    try {
      const data = await api.post('/api/wishlist/toggle', { product_id: p.id })
      const isNowAdded = data.action === 'added' || data.wishlisted === true
      setWishlisted(isNowAdded)
      toast.success(isNowAdded ? '❤️ Added to wishlist' : 'Removed from wishlist')
      refreshWishlist()
    } catch (err) {
      setWishlisted(prev)
      // Try alternate endpoint
      try {
        const data2 = await api.post('/api/wishlist', { product_id: p.id })
        const isNow = data2.action === 'added' || data2.wishlisted === true
        setWishlisted(isNow)
        toast.success(isNow ? '❤️ Added to wishlist' : 'Removed from wishlist')
        refreshWishlist()
      } catch (err2) {
        setWishlisted(prev)
        toast.error('Failed to update wishlist')
      }
    } finally {
      setWishlistLoading(false)
    }
  }

  // Format price in USD
  const formatPrice = (price) => {
    if (!price && price !== 0) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price)
  }

  const savings = (p.original_price || 0) - (p.price || 0)
  const stars = Math.round(p.rating || 0)

  return (
    <div
      onClick={() => navigate(`/products/${p.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#ffffff',
        border: `1.5px solid ${hovered ? '#2563eb' : '#e5e7eb'}`,
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        boxShadow: hovered ? '0 8px 30px rgba(37,99,235,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}>

      {/* Image */}
      <div style={{ position: 'relative', width: '100%', height: 210, overflow: 'hidden', background: '#f9fafb', flexShrink: 0 }}>
        <img
          src={p.image_url}
          alt={p.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s', transform: hovered ? 'scale(1.06)' : 'scale(1)' }}
          onError={e => { e.target.onerror = null; e.target.src = `https://picsum.photos/seed/${p.id || Math.random()}/400/300` }}
        />

        {/* Badges */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {p.discount_percent > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
              -{p.discount_percent}%
            </span>
          )}
          {p.is_assured && (
            <span style={{ background: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
              ✓ Assured
            </span>
          )}
          {p.stock === 0 && (
            <span style={{ background: '#6b7280', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
              Out of Stock
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={toggleWishlist}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)',
            border: `1.5px solid ${wishlisted ? '#ef4444' : '#e5e7eb'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.2s', opacity: wishlistLoading ? 0.6 : 1,
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24"
            fill={wishlisted ? '#ef4444' : 'none'}
            stroke={wishlisted ? '#ef4444' : '#9ca3af'} strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l8.84 8.84 8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{p.category}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.35, marginBottom: 4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 38 }}>
          {p.name}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>{p.brand}</div>

        {/* Stars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 1 }}>
            {[1,2,3,4,5].map(i => (
              <span key={i} style={{ fontSize: 12, color: i <= stars ? '#f59e0b' : '#e5e7eb' }}>★</span>
            ))}
          </div>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>({(p.review_count || 0).toLocaleString()})</span>
        </div>

        {/* Price + Cart button */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{formatPrice(p.price)}</span>
              {p.original_price > p.price && (
                <span style={{ fontSize: 12, color: '#d1d5db', textDecoration: 'line-through' }}>{formatPrice(p.original_price)}</span>
              )}
            </div>
            {savings > 0 && (
              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Save {formatPrice(savings)}</div>
            )}
          </div>

          <button
            onClick={addToCart}
            disabled={p.stock === 0 || adding}
            style={{
              width: 40, height: 40, flexShrink: 0,
              background: p.stock === 0 ? '#e5e7eb' : added ? '#16a34a' : '#2563eb',
              border: 'none', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: p.stock === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              transform: adding ? 'scale(0.9)' : 'scale(1)',
            }}>
            {added ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
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
