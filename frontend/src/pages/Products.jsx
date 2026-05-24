import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const CATEGORIES = ['Electronics','Mobiles','Fashion','Books','Sports','Beauty','Toys','Home & Kitchen']
const SORT_OPTIONS = [
  { value:'newest',    label:'Newest First' },
  { value:'price_asc', label:'Price: Low to High' },
  { value:'price_desc',label:'Price: High to Low' },
  { value:'rating',    label:'Top Rated' },
  { value:'discount',  label:'Best Discount' },
]

export default function Products() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products,  setProducts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [total,     setTotal]     = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [isMobile,  setIsMobile]  = useState(window.innerWidth <= 768)

  const [filters, setFilters] = useState({
    category:  searchParams.get('category') || '',
    search:    searchParams.get('search')   || '',
    sort:      'newest',
    min_price: '',
    max_price: '',
    min_rating:'',
    in_stock:  false,
  })

  // Track window width
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Sync URL params to filters
  useEffect(() => {
    setFilters(f => ({
      ...f,
      category: searchParams.get('category') || '',
      search:   searchParams.get('search')   || '',
    }))
  }, [searchParams])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (filters.category)  p.set('category',  filters.category)
      if (filters.search)    p.set('search',    filters.search)
      if (filters.sort)      p.set('sort',      filters.sort)
      if (filters.min_price) p.set('min_price', filters.min_price)
      if (filters.max_price) p.set('max_price', filters.max_price)
      if (filters.min_rating)p.set('min_rating',filters.min_rating)
      if (filters.in_stock)  p.set('in_stock',  'true')
      p.set('limit', '50')

      let data = null
      try {
        const res = await fetch(`${API_BASE}/api/products?${p}`, {
          headers: { 'Content-Type': 'application/json' }
        })
        if (res.ok) data = await res.json()
      } catch {
        const res = await fetch(`http://localhost:8000/api/products?${p}`)
        if (res.ok) data = await res.json()
      }

      if (data) {
        const list = data.products || data || []
        setProducts(Array.isArray(list) ? list : [])
        setTotal(data.total || list.length)
      }
    } catch (e) {
      console.error(e)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const upd = (key, val) => setFilters(f => ({ ...f, [key]: val }))

  const clearAll = () => setFilters({
    category:'', search:'', sort:'newest',
    min_price:'', max_price:'', min_rating:'', in_stock:false,
  })

  const hasActive = filters.category || filters.min_price ||
                    filters.max_price || filters.min_rating || filters.in_stock

  // ── Sidebar component (reused for both mobile and desktop) ──────────────
  const SidebarContent = () => (
    <div>
      {/* Header row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <span style={{ fontSize:15, fontWeight:700, color:'#111827' }}>Filters</span>
        {hasActive && (
          <button onClick={clearAll} style={{
            fontSize:12, color:'#2563eb', background:'none',
            border:'none', cursor:'pointer', fontWeight:600,
          }}>Clear all</button>
        )}
      </div>

      {/* Category */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'#9ca3af', marginBottom:8 }}>Category</div>
        {['', ...CATEGORIES].map(cat => (
          <div key={cat} onClick={() => { upd('category', cat); if(isMobile) setShowFilters(false) }}
            style={{
              padding:'8px 10px', borderRadius:8, fontSize:13, cursor:'pointer',
              fontWeight: filters.category === cat ? 600 : 400,
              color:      filters.category === cat ? '#2563eb' : '#4b5563',
              background: filters.category === cat ? '#eff6ff' : 'transparent',
              borderLeft: filters.category === cat ? '3px solid #2563eb' : '3px solid transparent',
              marginBottom:2, transition:'all 0.12s',
            }}>
            {cat || 'All Products'}
          </div>
        ))}
      </div>

      {/* Price range */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'#9ca3af', marginBottom:8 }}>Price Range</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <input type="number" placeholder="Min $" value={filters.min_price}
            onChange={e => upd('min_price', e.target.value)}
            style={{ border:'1.5px solid #e5e7eb', borderRadius:8, padding:'8px 10px', fontSize:13, color:'#111827', outline:'none', width:'100%', boxSizing:'border-box' }}
          />
          <input type="number" placeholder="Max $" value={filters.max_price}
            onChange={e => upd('max_price', e.target.value)}
            style={{ border:'1.5px solid #e5e7eb', borderRadius:8, padding:'8px 10px', fontSize:13, color:'#111827', outline:'none', width:'100%', boxSizing:'border-box' }}
          />
        </div>
      </div>

      {/* Rating */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'#9ca3af', marginBottom:8 }}>Min Rating</div>
        {[4,3,2].map(r => (
          <div key={r} onClick={() => upd('min_rating', filters.min_rating == r ? '' : r)}
            style={{
              padding:'7px 10px', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:6,
              background: filters.min_rating == r ? '#eff6ff' : 'transparent', marginBottom:2,
            }}>
            {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize:13, color: i<=r ? '#f59e0b' : '#e5e7eb' }}>★</span>)}
            <span style={{ fontSize:12, color:'#4b5563' }}>& up</span>
          </div>
        ))}
      </div>

      {/* In stock */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'#9ca3af', marginBottom:8 }}>Options</div>
        <div onClick={() => upd('in_stock', !filters.in_stock)}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 4px', cursor:'pointer' }}>
          <div style={{
            width:18, height:18,
            border:`2px solid ${filters.in_stock ? '#2563eb' : '#d1d5db'}`,
            borderRadius:4,
            background: filters.in_stock ? '#2563eb' : 'transparent',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all 0.15s', flexShrink:0,
          }}>
            {filters.in_stock && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          <span style={{ fontSize:13, color:'#4b5563', fontWeight:500 }}>In Stock Only</span>
        </div>
      </div>
    </div>
  )

  // ── Skeleton cards ──────────────────────────────────────────────────────
  const SkeletonCard = () => (
    <div style={{
      background:'#fff', borderRadius:16, overflow:'hidden',
      border:'1px solid #f3f4f6',
    }}>
      <div style={{ height: isMobile ? 160 : 210, background:'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }}/>
      <div style={{ padding:isMobile ? '10px 12px' : '14px 16px' }}>
        <div style={{ height:10, background:'#f0f0f0', borderRadius:4, marginBottom:8, width:'60%' }}/>
        <div style={{ height:14, background:'#f0f0f0', borderRadius:4, marginBottom:6, width:'90%' }}/>
        <div style={{ height:12, background:'#f0f0f0', borderRadius:4, marginBottom:12, width:'40%' }}/>
        <div style={{ height:18, background:'#f0f0f0', borderRadius:4, width:'50%' }}/>
      </div>
    </div>
  )

  const colCount = isMobile ? 2 : 4

  return (
    <div style={{ background:'#f9fafb', minHeight:'100vh' }}>
      <Navbar/>

      {/* Mobile filter bottom sheet overlay */}
      {isMobile && showFilters && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:900 }}
          onClick={() => setShowFilters(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position:'absolute', bottom:0, left:0, right:0,
              background:'#fff', borderRadius:'20px 20px 0 0',
              padding:'20px 20px 32px',
              maxHeight:'80vh', overflowY:'auto',
              animation:'slideUp 0.25s ease',
            }}>
            {/* Handle */}
            <div style={{ width:40, height:4, background:'#e5e7eb', borderRadius:2, margin:'0 auto 16px' }}/>
            <SidebarContent/>
          </div>
        </div>
      )}

      <div style={{
        maxWidth: 1280,
        margin:'0 auto',
        padding: isMobile ? '16px 12px' : '32px 40px',
        display:'flex',
        gap: isMobile ? 0 : 24,
        alignItems:'flex-start',
      }}>

        {/* Desktop sidebar */}
        {!isMobile && (
          <aside style={{
            width:240, flexShrink:0,
            position:'sticky', top:120,
            background:'#fff', border:'1px solid #f3f4f6',
            borderRadius:16, padding:20,
          }}>
            <SidebarContent/>
          </aside>
        )}

        {/* Main content */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* Top bar */}
          <div style={{
            display:'flex', alignItems:'center',
            justifyContent:'space-between',
            marginBottom:14, flexWrap:'wrap', gap:10,
          }}>
            <div>
              <h1 style={{
                fontSize: isMobile ? 18 : 22,
                fontWeight:800, color:'#111827',
                letterSpacing:'-0.02em', marginBottom:2,
              }}>
                {filters.category || (filters.search ? `"${filters.search}"` : 'All Products')}
              </h1>
              <div style={{ fontSize:13, color:'#9ca3af' }}>{total} products</div>
            </div>

            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {/* Mobile filter button */}
              {isMobile && (
                <button onClick={() => setShowFilters(true)} style={{
                  display:'flex', alignItems:'center', gap:6,
                  background: hasActive ? '#eff6ff' : '#fff',
                  border:`1.5px solid ${hasActive ? '#2563eb' : '#e5e7eb'}`,
                  borderRadius:10, padding:'8px 14px',
                  fontSize:13, fontWeight:600,
                  color: hasActive ? '#2563eb' : '#374151',
                  cursor:'pointer',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="6" x2="20" y2="6"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                    <line x1="11" y1="18" x2="13" y2="18"/>
                  </svg>
                  Filters {hasActive ? '•' : ''}
                </button>
              )}

              {/* Sort */}
              <select value={filters.sort} onChange={e => upd('sort', e.target.value)}
                style={{
                  border:'1.5px solid #e5e7eb', borderRadius:10,
                  padding: isMobile ? '8px 10px' : '9px 14px',
                  fontSize: isMobile ? 12 : 13,
                  color:'#374151', background:'#fff', outline:'none',
                  cursor:'pointer', fontFamily:'inherit', fontWeight:500,
                  maxWidth: isMobile ? 150 : 'none',
                }}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActive && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              {filters.category && (
                <span style={{
                  background:'#eff6ff', color:'#2563eb',
                  border:'1px solid #bfdbfe', borderRadius:20,
                  padding:'4px 10px', fontSize:12, fontWeight:600,
                  display:'flex', alignItems:'center', gap:4,
                }}>
                  {filters.category}
                  <span onClick={() => upd('category','')} style={{ cursor:'pointer', fontSize:14, lineHeight:1 }}>×</span>
                </span>
              )}
              {filters.in_stock && (
                <span style={{
                  background:'#f0fdf4', color:'#16a34a',
                  border:'1px solid #bbf7d0', borderRadius:20,
                  padding:'4px 10px', fontSize:12, fontWeight:600,
                  display:'flex', alignItems:'center', gap:4,
                }}>
                  In Stock
                  <span onClick={() => upd('in_stock',false)} style={{ cursor:'pointer', fontSize:14, lineHeight:1 }}>×</span>
                </span>
              )}
            </div>
          )}

          {/* Product grid */}
          {loading ? (
            <div style={{
              display:'grid',
              gridTemplateColumns:`repeat(${colCount}, minmax(0, 1fr))`,
              gap: isMobile ? 10 : 18,
            }}>
              {[...Array(isMobile ? 6 : 12)].map((_,i) => <SkeletonCard key={i}/>)}
            </div>
          ) : products.length === 0 ? (
            <div style={{
              textAlign:'center',
              padding: isMobile ? '40px 16px' : '80px 40px',
              background:'#fff', borderRadius:16, border:'1px solid #f3f4f6',
            }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
              <div style={{ fontSize:20, fontWeight:700, color:'#111827', marginBottom:8 }}>No products found</div>
              <div style={{ fontSize:14, color:'#9ca3af', marginBottom:20 }}>Try adjusting your filters</div>
              <button onClick={clearAll} style={{
                background:'#2563eb', color:'#fff', border:'none',
                padding:'10px 24px', borderRadius:10,
                fontSize:14, fontWeight:600, cursor:'pointer',
              }}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div style={{
              display:'grid',
              gridTemplateColumns:`repeat(${colCount}, minmax(0, 1fr))`,
              gap: isMobile ? 10 : 18,
            }}>
              {products.map(p => (
                <ProductCard key={p.id} product={p} isMobile={isMobile}/>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer/>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0 }
          100% { background-position: 200% 0 }
        }
        @keyframes slideUp {
          from { transform: translateY(100%) }
          to   { transform: translateY(0) }
        }
      `}</style>
    </div>
  )
}
