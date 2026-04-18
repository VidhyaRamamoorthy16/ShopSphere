import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../config/api'
import { useCart } from '../context/CartContext'
import { toast } from '../components/Toast'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'

const formatPrice = (price) => {
  if (!price && price !== 0) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price)
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { refreshCart } = useCart()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [activeTab, setActiveTab] = useState('description')

  useEffect(() => { fetchProduct() }, [id])

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const p = await api.get(`/api/products/${id}`)
      setProduct(p)
      const rel = await api.get(`/api/products?category=${p.category}&limit=4`)
      setRelated((rel.products || []).filter(x => x.id !== p.id).slice(0, 4))
    } catch (e) {} finally { setLoading(false) }
  }

  const addToCart = async () => {
    if (!api.isLoggedIn()) return navigate('/login')
    setAdding(true)
    try {
      await api.post('/api/cart', { product_id: product.id, quantity: qty })
      refreshCart()
      toast.success('Added to your bag')
    } catch (e) { toast.error('Failed to add to cart') }
    finally { setAdding(false) }
  }

  if (loading || !product) return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
        <div className="skeleton" style={{ borderRadius: 16, height: 500 }} />
        <div>
          <div className="skeleton" style={{ borderRadius: 8, height: 24, width: 120, marginBottom: 16 }} />
          <div className="skeleton" style={{ borderRadius: 8, height: 40, width: '80%', marginBottom: 24 }} />
          <div className="skeleton" style={{ borderRadius: 8, height: 100, marginBottom: 24 }} />
        </div>
      </div>
    </div>
  )

  const s = {
    page: { background: 'var(--bg)', minHeight: '100vh' },
    container: { maxWidth: 1400, margin: '0 auto', padding: '32px' },
    breadcrumb: { fontSize: 11, color: 'var(--text3)', marginBottom: 24 },
    layout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 },
    imageArea: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    image: { maxWidth: '100%', maxHeight: 420, objectFit: 'contain' },
    category: { display: 'inline-block', background: 'var(--violet-dim)', border: '1px solid var(--violet)', color: 'var(--violet)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 20, marginBottom: 16 },
    title: { fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 8 },
    brand: { fontSize: 13, color: 'var(--text2)', marginBottom: 16 },
    rating: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 },
    ratingBadge: { background: 'var(--emerald-dim)', color: 'var(--emerald)', border: '1px solid rgba(0,229,160,0.2)', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
    priceRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
    price: { fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 500, color: 'var(--text)' },
    originalPrice: { fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: 'var(--text3)', textDecoration: 'line-through' },
    discount: { background: 'var(--amber)', color: '#000', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 },
    stock: { fontSize: 13, color: product.stock > 0 ? 'var(--emerald)' : 'var(--rose)', marginBottom: 24, fontWeight: 500 },
    qtyRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
    qtyBtn: { width: 40, height: 40, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 18, color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    qtyVal: { fontFamily: "'JetBrains Mono', monospace", fontSize: 16, minWidth: 40, textAlign: 'center' },
    actions: { display: 'flex', gap: 12, marginBottom: 24 },
    addBtn: { flex: 1, background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    buyBtn: { flex: 1, background: 'var(--cyan)', color: '#000', border: 'none', borderRadius: 10, padding: '14px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    assured: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--violet-dim)', color: 'var(--violet)', border: '1px solid var(--violet)', fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 20 },
    tabs: { display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginTop: 40, marginBottom: 24 },
    tab: (active) => ({ padding: '12px 24px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: active ? 'var(--violet)' : 'var(--text2)', borderBottom: active ? '2px solid var(--violet)' : 'none', cursor: 'pointer' }),
    desc: { fontSize: 14, color: 'var(--text2)', lineHeight: 1.8 },
    specTable: { width: '100%', borderCollapse: 'collapse' },
    specRow: { borderBottom: '1px solid var(--border)' },
    specCell: { padding: '12px 0', fontSize: 13 },
    related: { marginTop: 64 },
    relatedTitle: { fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 24 },
  }

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.container}>
        <div style={s.breadcrumb}>
          <span style={{ color: 'var(--violet)', cursor: 'pointer' }} onClick={() => navigate('/')}>Home</span>
          {' / '}
          <span style={{ color: 'var(--violet)', cursor: 'pointer' }} onClick={() => navigate(`/products?category=${product.category}`)}>{product.category}</span>
          {' / '}
          <span style={{ color: 'var(--text3)' }}>{product.name}</span>
        </div>

        <div style={s.layout}>
          <div style={s.imageArea}>
            <img src={product.image_url} alt={product.name} style={s.image} onError={e => e.target.src = `https://picsum.photos/seed/${product.id}/400/300`} />
          </div>

          <div>
            <div style={s.category}>{product.category}</div>
            <h1 style={s.title}>{product.name}</h1>
            <div style={s.brand}>{product.brand}</div>

            <div style={s.rating}>
              <span style={s.ratingBadge}>★ {product.rating}</span>
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>({product.review_count?.toLocaleString()} reviews)</span>
            </div>

            <div style={s.priceRow}>
              <span style={s.price}>{formatPrice(product.price)}</span>
              {product.original_price > product.price && <span style={s.originalPrice}>{formatPrice(product.original_price)}</span>}
              {product.discount_percent > 0 && <span style={s.discount}>{product.discount_percent}% OFF</span>}
            </div>

            <div style={s.stock}>{product.stock > 0 ? '✓ In Stock' : '✗ Out of Stock'}</div>

            <div style={s.qtyRow}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Quantity:</span>
              <button style={s.qtyBtn} onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <span style={s.qtyVal}>{qty}</span>
              <button style={s.qtyBtn} onClick={() => setQty(qty + 1)}>+</button>
            </div>

            <div style={s.actions}>
              <button style={s.addBtn} onClick={addToCart} disabled={adding || product.stock <= 0}>
                {adding ? 'Adding...' : 'Add to Cart'}
              </button>
              <button style={s.buyBtn} onClick={() => { addToCart(); navigate('/cart') }} disabled={product.stock <= 0}>
                Buy Now
              </button>
            </div>

            {product.is_assured && (
              <div style={s.assured}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                ShopSphere Assured
              </div>
            )}
          </div>
        </div>

        <div style={s.tabs}>
          {['description', 'specifications', 'reviews'].map(tab => (
            <div key={tab} style={s.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </div>
          ))}
        </div>

        {activeTab === 'description' && <div style={s.desc}>{product.description || 'No description available.'}</div>}

        {activeTab === 'specifications' && (
          <table style={s.specTable}>
            <tbody>
              {Object.entries(product.specifications || { Brand: product.brand, Category: product.category, Warranty: '1 Year' }).map(([k, v]) => (
                <tr key={k} style={s.specRow}>
                  <td style={{ ...s.specCell, color: 'var(--text3)', width: 200 }}>{k}</td>
                  <td style={{ ...s.specCell, color: 'var(--text)' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'reviews' && <div style={s.desc}>Reviews coming soon.</div>}

        <div style={s.related}>
          <h2 style={s.relatedTitle}>Related Products</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
