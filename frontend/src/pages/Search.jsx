import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../config/api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'

export default function Search() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('search') || ''
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => { if (query) fetchResults() }, [query])

  const fetchResults = async () => {
    setLoading(true)
    try {
      const data = await api.get(`/api/products?search=${query}&limit=20`)
      setProducts(data.products || [])
      setTotal(data.total || 0)
    } catch (e) {} finally { setLoading(false) }
  }

  const s = {
    page: { background: 'var(--bg)', minHeight: '100vh' },
    main: { padding: '40px 48px' },
    header: { marginBottom: 32 },
    title: { fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 300, color: 'var(--ink)' },
    highlight: { color: 'var(--gold)', fontStyle: 'italic' },
    count: { fontSize: 13, color: 'var(--muted)', marginTop: 8 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--faint)' },
    skeleton: { background: 'var(--gold-pale)', height: 320 },
    empty: { textAlign: 'center', padding: '80px', color: 'var(--muted)' },
    emptyTitle: { fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 300, marginBottom: 16 },
    shopBtn: { background: 'var(--ink)', color: 'var(--bg)', padding: '12px 28px', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', border: 'none', cursor: 'pointer', marginTop: 20 }
  }

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.main}>
        <div style={s.header}>
          <div style={s.title}>Showing {total} results for <span style={s.highlight}>'{query}'</span></div>
        </div>
        {loading ? (
          <div style={s.grid}>{[...Array(8)].map((_, i) => <div key={i} style={s.skeleton} />)}</div>
        ) : products.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyTitle}>No results found</div>
            <div>Try a different search term or browse our collections</div>
            <button style={s.shopBtn} onClick={() => navigate('/products')}>Explore Collection</button>
          </div>
        ) : (
          <div style={s.grid}>
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
