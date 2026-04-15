import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../config/api'
import { toast } from '../components/Toast'
import { useCart } from '../context/CartContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export const compareList = {
  add: (product) => {
    const existing = JSON.parse(localStorage.getItem('sm_compare') || '[]')
    if (existing.length >= 3 || existing.find(p => p.id === product.id)) return false
    localStorage.setItem('sm_compare', JSON.stringify([...existing, product]))
    return true
  },
  remove: (id) => {
    const existing = JSON.parse(localStorage.getItem('sm_compare') || '[]')
    localStorage.setItem('sm_compare', JSON.stringify(existing.filter(p => p.id !== id)))
  },
  get: () => { try { return JSON.parse(localStorage.getItem('sm_compare') || '[]') } catch { return [] } },
  clear: () => localStorage.removeItem('sm_compare')
}

export default function Compare() {
  const navigate = useNavigate()
  const { refreshCart } = useCart()
  const [products, setProducts] = useState([])

  useEffect(() => {
    setProducts(compareList.get())
  }, [])

  const removeProduct = (id) => {
    compareList.remove(id)
    setProducts(compareList.get())
  }

  const addToCart = async (product) => {
    try {
      await api.post('/api/cart', { product_id: product.id, quantity: 1 })
      refreshCart()
      toast.success('Added to your bag')
    } catch (e) {
      toast.error('Failed to add')
    }
  }

  const specs = [
    { key: 'name', label: 'Product', render: p => <strong>{p.name}</strong> },
    { key: 'brand', label: 'Brand' },
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price', render: p => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--ink)', fontWeight: 500 }}>₹{p.price?.toLocaleString()}</span> },
    { key: 'original_price', label: 'Original', render: p => <span style={{ textDecoration: 'line-through', color: 'var(--muted)' }}>₹{p.original_price?.toLocaleString()}</span> },
    { key: 'discount', label: 'Discount', render: p => <span style={{ color: 'var(--accent)' }}>{p.discount_percent}% OFF</span> },
    { key: 'rating', label: 'Rating', render: p => <span style={{ color: 'var(--gold)' }}>★ {p.rating}</span> },
    { key: 'stock', label: 'Stock', render: p => <span style={{ color: p.stock > 0 ? 'var(--accent)' : 'var(--accent2)' }}>{p.stock > 0 ? `In Stock (${p.stock})` : 'Out of Stock'}</span> },
    { key: 'assured', label: 'ShopSphere Assured', render: p => p.is_assured ? <span style={{ color: 'var(--gold)' }}>✓ Assured</span> : <span style={{ color: 'var(--muted)' }}>—</span> }
  ]

  const s = {
    page: { background: 'var(--bg)', minHeight: '100vh' },
    main: { padding: '40px 48px' },
    title: { fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 300, marginBottom: 32 },
    empty: { textAlign: 'center', padding: '80px' },
    emptyTitle: { fontFamily: "'Playfair Display', serif", fontSize: 24, marginBottom: 16 },
    table: { width: '100%', background: 'var(--card)', border: '1px solid var(--faint)', borderCollapse: 'separate', borderSpacing: 0 },
    th: { padding: 20, textAlign: 'left', borderBottom: '1px solid var(--faint)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', background: 'var(--surface)' },
    td: { padding: 20, borderBottom: '1px solid var(--faint)', borderRight: '1px solid var(--faint)', verticalAlign: 'top' },
    productHeader: { textAlign: 'center' },
    productImg: { width: 120, height: 120, objectFit: 'cover', marginBottom: 12, background: 'var(--gold-pale)' },
    removeBtn: { padding: '6px 12px', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', border: '1px solid var(--faint)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' },
    addBtn: { padding: '12px 24px', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', border: 'none', background: 'var(--ink)', color: 'var(--bg)', cursor: 'pointer', marginTop: 12 },
    labelCell: { padding: 16, borderBottom: '1px solid var(--faint)', borderRight: '1px solid var(--faint)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', background: 'var(--surface)' }
  }

  if (products.length === 0) {
    return (
      <div style={s.page}>
        <Navbar />
        <div style={s.main}>
          <div style={s.title}>Compare Products</div>
          <div style={s.empty}>
            <div style={s.emptyTitle}>Select products to compare</div>
            <div style={{ color: 'var(--muted)', marginBottom: 24 }}>Add up to 3 products from the collection to compare side by side</div>
            <button style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '12px 28px', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/products')}>Browse Collection</button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.main}>
        <div style={s.title}>Compare Products ({products.length}/3)</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Feature</th>
              {products.map(p => (
                <th key={p.id} style={{ ...s.th, ...s.productHeader }}>
                  <img src={p.image_url} alt={p.name} style={s.productImg} onError={e => e.target.style.display = 'none'} />
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, marginBottom: 8 }}>{p.name}</div>
                  <button style={s.removeBtn} onClick={() => removeProduct(p.id)}>Remove</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {specs.map(spec => (
              <tr key={spec.key}>
                <td style={s.labelCell}>{spec.label}</td>
                {products.map(p => (
                  <td key={p.id} style={s.td}>
                    {spec.render ? spec.render(p) : p[spec.key]}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td style={s.labelCell}>Action</td>
              {products.map(p => (
                <td key={p.id} style={{ ...s.td, textAlign: 'center' }}>
                  <button style={s.addBtn} onClick={() => addToCart(p)}>Add to Cart</button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <Footer />
    </div>
  )
}
