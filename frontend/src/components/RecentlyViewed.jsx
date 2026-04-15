import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export const recentlyViewed = {
  add: (product) => {
    const key = 'sm_recently_viewed'
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    const filtered = existing.filter(p => p.id !== product.id)
    const updated = [product, ...filtered].slice(0, 8)
    localStorage.setItem(key, JSON.stringify(updated))
  },
  get: () => {
    try { return JSON.parse(localStorage.getItem('sm_recently_viewed') || '[]') } catch { return [] }
  },
  clear: () => localStorage.removeItem('sm_recently_viewed')
}

export default function RecentlyViewed() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])

  useEffect(() => {
    setProducts(recentlyViewed.get())
  }, [])

  if (products.length === 0) return null

  const s = {
    section: { padding: '40px 48px', borderTop: '1px solid var(--faint)' },
    title: { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 300, marginBottom: 24 },
    scroll: { display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 },
    card: { minWidth: 180, background: 'var(--card)', cursor: 'pointer' },
    img: { width: 180, height: 180, objectFit: 'cover', background: 'var(--gold-pale)' },
    content: { padding: 12 },
    name: { fontSize: 12, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 },
    price: { fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500, color: 'var(--gold)' }
  }

  return (
    <div style={s.section}>
      <div style={s.title}>Recently Viewed</div>
      <div style={s.scroll}>
        {products.map(p => (
          <div key={p.id} style={s.card} onClick={() => navigate(`/products/${p.id}`)}>
            <img src={p.image_url} alt={p.name} style={s.img} onError={e => e.target.style.display = 'none'} />
            <div style={s.content}>
              <div style={s.name}>{p.name}</div>
              <div style={s.price}>₹{p.price?.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
