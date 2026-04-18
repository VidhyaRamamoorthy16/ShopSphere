import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, API_BASE } from '../config/api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'

export default function Products() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    min_price: '', max_price: '', sort: 'created_at'
  })

  const CATEGORIES = ['Electronics','Mobiles','Fashion','Books','Sports','Beauty','Toys','Home & Kitchen']

  useEffect(() => { fetchProducts() }, [filters])

  const fetchProducts = async () => {
  setLoading(true)
  setError(null)
  try {
    const params = new URLSearchParams()
    if (filters.category && filters.category !== '') params.set('category', filters.category)
    if (filters.search) params.set('search', filters.search)
    if (filters.brand) params.set('brand', filters.brand)
    if (filters.min_price) params.set('min_price', filters.min_price)
    if (filters.max_price) params.set('max_price', filters.max_price)
    if (filters.sort) params.set('sort', filters.sort)
    if (filters.min_rating) params.set('min_rating', filters.min_rating)
    params.set('limit', '50')
    params.set('page', '1')

    const response = await fetch(`${API_BASE}/api/products?${params}`, {
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()
    setProducts(data.products || data || [])
    setTotal(data.total || (data.products || data || []).length)
  } catch (err) {
    console.error('Products fetch error:', err)
    setError('Failed to load products. Please refresh.')
    setProducts([])
  } finally {
    setLoading(false)
  }
}

  const s = {
    page: { background: 'var(--bg)', minHeight: '100vh' },
    layout: { display: 'flex', gap: 0, maxWidth: '100%' },
    sidebar: { width: 260, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '32px 24px', minHeight: 'calc(100vh - 120px)' },
    sideTitle: { fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 28, color: 'var(--text)' },
    filterSection: { marginBottom: 28 },
    filterLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12, display: 'block', fontFamily: "'Inter', sans-serif" },
    filterItem: (active) => ({ padding: '10px 0', fontSize: 13, cursor: 'pointer', color: active ? 'var(--violet)' : 'var(--text2)', borderLeft: active ? '3px solid var(--violet)' : '3px solid transparent', paddingLeft: 12, marginBottom: 2, fontWeight: 500, background: active ? 'var(--violet-dim)' : 'transparent', borderRadius: '0 6px 6px 0' }),
    priceInput: { width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, background: 'var(--surface2)', outline: 'none', color: 'var(--text)', marginBottom: 10, fontFamily: "'Inter', sans-serif" },
    main: { flex: 1, padding: '32px 40px' },
    topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border)' },
    resCount: { fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--text)' },
    sortSelect: { border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, background: 'var(--surface)', color: 'var(--text)', fontFamily: "'Inter', sans-serif" },
    pGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 },
    empty: { textAlign: 'center', padding: '60px', fontSize: 13, color: 'var(--text2)' },
    emptyTitle: { fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 300, marginBottom: 12 },
    skeleton: { background: 'var(--gold-pale)', height: 320 },
    clearBtn: { background: 'var(--ink)', color: 'var(--bg)', padding: '11px 28px', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', border: 'none', fontFamily: "'DM Sans', sans-serif" }
  }

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.layout}>
        <div style={s.sidebar}>
          <div style={s.sideTitle}>Refine</div>
          <div style={s.filterSection}>
            <span style={s.filterLabel}>Category</span>
            <div style={s.filterItem(!filters.category)} onClick={() => setFilters(f => ({ ...f, category: '' }))}>All Products</div>
            {CATEGORIES.map(c => (
              <div key={c} style={s.filterItem(filters.category === c)} onClick={() => setFilters(f => ({ ...f, category: f.category === c ? '' : c }))}>{c}</div>
            ))}
          </div>
          <div style={s.filterSection}>
            <span style={s.filterLabel}>Price Range</span>
            <input style={s.priceInput} placeholder="Min $" type="number" value={filters.min_price} onChange={e => setFilters(f => ({ ...f, min_price: e.target.value }))} />
            <input style={s.priceInput} placeholder="Max $" type="number" value={filters.max_price} onChange={e => setFilters(f => ({ ...f, max_price: e.target.value }))} />
          </div>
          <div style={s.filterSection}>
            <span style={s.filterLabel}>Sort By</span>
            {[['created_at','Latest'],['price_asc','Price: Low to High'],['price_desc','Price: High to Low'],['rating','Top Rated']].map(([val, lbl]) => (
              <div key={val} style={s.filterItem(filters.sort === val)} onClick={() => setFilters(f => ({ ...f, sort: val }))}>{lbl}</div>
            ))}
          </div>
        </div>
        <div style={s.main}>
          <div style={s.topBar}>
            <div style={s.resultText}>
              {filters.category || 'All Products'}
              <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: "'DM Sans', sans-serif", fontWeight: 300, marginLeft: 12 }}>{total} pieces</span>
            </div>
          </div>
          {loading ? (
            <div style={s.grid}>{[...Array(8)].map((_, i) => <div key={i} style={s.skeleton} />)}</div>
          ) : products.length === 0 ? (
            <div style={s.empty}>
              <div style={s.emptyTitle}>No pieces found</div>
              <div style={{ fontSize: 13, marginBottom: 24 }}>Try adjusting your filters or browse all collections</div>
              <button style={s.clearBtn} onClick={() => setFilters({ category: '', search: '', min_price: '', max_price: '', sort: 'created_at' })}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 18, alignItems: 'stretch' }}>
              {products.map(p => (
                <div key={p.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
