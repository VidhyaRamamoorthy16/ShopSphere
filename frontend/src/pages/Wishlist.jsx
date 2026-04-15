import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../config/api'
import { useCart } from '../context/CartContext'
import { toast } from '../components/Toast'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'

export default function Wishlist() {
  const navigate = useNavigate()
  const { refreshWishlist } = useCart()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchWishlist() }, [])

  const fetchWishlist = async () => {
    if (!api.isLoggedIn()) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await api.get('/api/wishlist')
      setItems(data.items || [])
    } catch (e) {} finally { setLoading(false) }
  }

  const removeItem = async (id) => {
    try {
      await api.post('/api/wishlist', { product_id: id })
      setItems(items.filter(i => i.product_id !== id))
      refreshWishlist()
      toast.success('Removed from wishlist')
    } catch (e) {}
  }

  const s = {
    page: { background: 'var(--bg)', minHeight: '100vh' },
    container: { maxWidth: 1400, margin: '0 auto', padding: '32px' },
    title: { fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 700, marginBottom: 8 },
    count: { fontSize: 14, color: 'var(--text2)', marginBottom: 24 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 },
    empty: { textAlign: 'center', padding: '80px 20px' },
    emptyTitle: { fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 12 },
    emptySub: { fontSize: 14, color: 'var(--text2)', marginBottom: 24 },
    emptyBtn: { background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  }

  if (!api.isLoggedIn()) return (
    <div style={s.page}>
      <Navbar />
      <div style={s.empty}>
        <div style={s.emptyTitle}>Please sign in</div>
        <div style={s.emptySub}>Sign in to view your wishlist</div>
        <button style={s.emptyBtn} onClick={() => navigate('/login')}>Sign In</button>
      </div>
    </div>
  )

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.container}>
        <div style={s.title}>My Wishlist</div>
        <div style={s.count}>{items.length} items saved</div>

        {loading ? (
          <div style={s.grid}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ borderRadius: 12, height: 320 }} />)}
          </div>
        ) : items.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyTitle}>Your wishlist is empty</div>
            <div style={s.emptySub}>Save items you love for later</div>
            <button style={s.emptyBtn} onClick={() => navigate('/products')}>Browse Products</button>
          </div>
        ) : (
          <div style={s.grid}>
            {items.map(item => (
              <div key={item.product_id} style={{ position: 'relative' }}>
                <ProductCard product={item.product} />
                <button onClick={() => removeItem(item.product_id)} style={{ position: 'absolute', top: 8, right: 8, background: 'var(--rose)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
