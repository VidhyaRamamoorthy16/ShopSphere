import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../config/api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Admin() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [activeTab, setActiveTab] = useState('products')
  const [form, setForm] = useState({ name: '', description: '', price: '', original_price: '', category: 'Electronics', stock: '', image_url: '' })

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) { navigate('/'); return }
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const data = await api.get('/api/products?limit=100')
      setProducts(data.products || [])
    } catch (e) {} finally { setLoading(false) }
  }

  const saveProduct = async () => {
    try {
      const payload = { ...form, price: Number(form.price), original_price: Number(form.original_price), stock: Number(form.stock) }
      if (editing) {
        await api.put(`/api/products/${editing}`, payload)
      } else {
        await api.post('/api/products', payload)
      }
      setEditing(null)
      setForm({ name: '', description: '', price: '', original_price: '', category: 'Electronics', stock: '', image_url: '' })
      fetchProducts()
    } catch (e) {}
  }

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return
    try { await api.delete(`/api/products/${id}`); fetchProducts() } catch (e) {}
  }

  const s = {
    page: { background: 'var(--bg)', minHeight: '100vh' },
    layout: { display: 'grid', gridTemplateColumns: '240px 1fr', gap: 0 },
    sidebar: { background: 'var(--ink)', padding: '32px 24px', minHeight: 'calc(100vh - 120px)' },
    logo: { fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--gold-light)', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 32 },
    navItem: (active) => ({ padding: '10px 0', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: active ? 'var(--gold)' : 'rgba(255,255,255,0.4)', cursor: 'pointer', marginBottom: 4 }),
    main: { padding: '32px 40px' },
    title: { fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 300, marginBottom: 24 },
    stats: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 32 },
    statCard: { background: 'var(--card)', borderTop: '3px solid var(--gold)', padding: 24 },
    statNum: { fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 300, color: 'var(--ink)' },
    statLabel: { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginTop: 4 },
    card: { background: 'var(--card)', border: '1px solid var(--faint)', padding: 24, marginBottom: 24 },
    cardTitle: { fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 300, marginBottom: 20 },
    input: { width: '100%', border: 'none', borderBottom: '1px solid var(--faint)', padding: '10px 0', fontSize: 12, background: 'transparent', outline: 'none', color: 'var(--ink)', marginBottom: 16 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
    btn: { background: 'var(--ink)', color: 'var(--bg)', padding: '12px 24px', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', border: 'none', cursor: 'pointer' },
    btnSec: { background: 'none', color: 'var(--muted)', padding: '11px 24px', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', border: '1px solid var(--faint)', cursor: 'pointer', marginLeft: 12 },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', borderBottom: '1px solid var(--faint)' },
    td: { padding: '12px', fontSize: 12, borderBottom: '1px solid var(--faint)', color: 'var(--ink)' },
    action: { color: 'var(--gold)', cursor: 'pointer', marginRight: 12, fontSize: 10 },
    del: { color: 'var(--accent2)', cursor: 'pointer', fontSize: 10 }
  }

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.layout}>
        <div style={s.sidebar}>
          <div style={s.logo}>ShopSphere</div>
          <div style={s.navItem(activeTab === 'products')} onClick={() => setActiveTab('products')}>Products</div>
          <div style={s.navItem(activeTab === 'orders')} onClick={() => setActiveTab('orders')}>Orders</div>
          <div style={s.navItem(activeTab === 'users')} onClick={() => setActiveTab('users')}>Users</div>
          <div style={s.navItem(false)} onClick={() => navigate('/')}>Exit Admin</div>
        </div>
        <div style={s.main}>
          <div style={s.title}>Admin Dashboard</div>
          <div style={s.stats}>
            <div style={s.statCard}>
              <div style={s.statNum}>{products.length}</div>
              <div style={s.statLabel}>Products</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statNum}>1.2k</div>
              <div style={s.statLabel}>Orders</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statNum}>850</div>
              <div style={s.statLabel}>Customers</div>
            </div>
          </div>

          {activeTab === 'products' && (
            <>
              <div style={s.card}>
                <div style={s.cardTitle}>{editing ? 'Edit Product' : 'Add New Product'}</div>
                <div style={s.grid2}>
                  <input style={s.input} placeholder="Product Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  <input style={s.input} placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                </div>
                <input style={s.input} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                <div style={s.grid3}>
                  <input style={s.input} placeholder="Price ₹" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                  <input style={s.input} placeholder="Original Price ₹" type="number" value={form.original_price} onChange={e => setForm({ ...form, original_price: e.target.value })} />
                  <input style={s.input} placeholder="Stock" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                </div>
                <input style={s.input} placeholder="Image URL" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
                <div style={{ marginTop: 16 }}>
                  <button style={s.btn} onClick={saveProduct}>{editing ? 'Update' : 'Add'} Product</button>
                  {editing && <button style={s.btnSec} onClick={() => { setEditing(null); setForm({ name: '', description: '', price: '', original_price: '', category: 'Electronics', stock: '', image_url: '' }); }}>Cancel</button>}
                </div>
              </div>

              <div style={s.card}>
                <div style={s.cardTitle}>All Products</div>
                {loading ? <div>Loading...</div> : (
                  <table style={s.table}>
                    <thead>
                      <tr><th style={s.th}>Name</th><th style={s.th}>Category</th><th style={s.th}>Price</th><th style={s.th}>Stock</th><th style={s.th}>Actions</th></tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td style={s.td}>{p.name}</td>
                          <td style={s.td}>{p.category}</td>
                          <td style={s.td}>₹{p.price?.toLocaleString()}</td>
                          <td style={s.td}>{p.stock}</td>
                          <td style={s.td}>
                            <span style={s.action} onClick={() => { setEditing(p.id); setForm(p); }}>Edit</span>
                            <span style={s.del} onClick={() => deleteProduct(p.id)}>Delete</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
          {activeTab === 'orders' && <div style={s.card}><div style={s.cardTitle}>Orders Management</div><div style={{ color: 'var(--muted)' }}>Orders view coming soon.</div></div>}
          {activeTab === 'users' && <div style={s.card}><div style={s.cardTitle}>User Management</div><div style={{ color: 'var(--muted)' }}>Users view coming soon.</div></div>}
        </div>
      </div>
      <Footer />
    </div>
  )
}
