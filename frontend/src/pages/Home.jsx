import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../config/api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'

const CATEGORIES = [
  { name: 'Electronics', icon: '💻', bg: '#eff6ff' },
  { name: 'Mobiles', icon: '📱', bg: '#eff6ff' },
  { name: 'Fashion', icon: '👗', bg: '#fdf4ff' },
  { name: 'Books', icon: '📚', bg: '#f0fdf4' },
  { name: 'Sports', icon: '⚽', bg: '#f0fdf4' },
  { name: 'Beauty', icon: '💄', bg: '#fdf4ff' },
  { name: 'Toys', icon: '🧸', bg: '#fffbeb' },
  { name: 'Home & Kitchen', icon: '🏠', bg: '#fffbeb' },
]

export default function Home() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [timer, setTimer] = useState({ h: '05', m: '59', s: '47' })

  useEffect(() => {
    fetchProducts()
    let secs = 5 * 3600 + 59 * 47
    const t = setInterval(() => {
      secs = Math.max(0, secs - 1)
      setTimer({ h: String(Math.floor(secs / 3600)).padStart(2, '0'), m: String(Math.floor((secs % 3600) / 60)).padStart(2, '0'), s: String(secs % 60).padStart(2, '0') })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const fetchProducts = async () => {
    try {
      const data = await api.get('/api/products?limit=20')
      const all = data.products || []
      setProducts(all.slice(0, 4))
      setDeals(all.slice(4, 9))
    } catch (e) {} finally { setLoading(false) }
  }

  const c = { maxWidth: 1280, margin: '0 auto', padding: '0 40px' }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      {/* Hero */}
      <section style={{ background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #eff6ff 0%, #f9fafb 50%, #fdf4ff 100%)' }} />
        <div style={{ ...c, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center', padding: '72px 40px', position: 'relative' }}>
          <div style={{ animation: 'fadeUp 0.5s ease' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid var(--border2)', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 20 }}>
              <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%' }} />
              Premium Quality Products
            </div>
            <h1 style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.04em', color: 'var(--text)', marginBottom: 8 }}>
              Discover Amazing<br />
              <span style={{ color: 'var(--primary)' }}>Products</span>
            </h1>
            <p style={{ fontSize: 17, color: 'var(--text2)', lineHeight: 1.7, maxWidth: 460, marginBottom: 36, marginTop: 16 }}>
              Shop our curated collection of premium products. Experience quality, style, and exceptional service — all secured by our intelligent API gateway.
            </p>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 40 }}>
              <button onClick={() => navigate('/products')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--primary)', color: '#fff', border: 'none', padding: '14px 30px', borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-dark)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-blue)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                Shop Now →
              </button>
              <button onClick={() => navigate('/products')}
                style={{ background: '#fff', color: 'var(--text)', border: '1.5px solid var(--border2)', padding: '13px 26px', borderRadius: 13, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)' }}>
                View Categories
              </button>
            </div>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: 32 }}>
              {[{ num: '15+', label: 'Products' }, { num: '98%', label: 'Satisfaction' }, { num: '24/7', label: 'Support' }].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{s.num}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--shadow-xl)' }}>
              <img src="https://picsum.photos/seed/premshop/700/440" alt="Shop" style={{ width: '100%', height: 380, objectFit: 'cover', display: 'block' }} />
            </div>
            {/* Float badge */}
            <div style={{ position: 'absolute', bottom: 20, right: 20, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 18px', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, background: '#dcfce7', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📈</div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, marginBottom: 2 }}>This Week</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>25% OFF</div>
              </div>
            </div>
            {/* Trust badge */}
            <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 14px', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🛡</span>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Gateway Secured</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ ...c, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
          {[
            { icon: '🚚', label: 'Free Shipping', sub: 'On orders over $999' },
            { icon: '🛡', label: 'Secure Payment', sub: '100% secure transactions' },
            { icon: '↩', label: 'Easy Returns', sub: '30-day return policy' },
          ].map((t, i) => (
            <div key={t.label} style={{ padding: '28px 20px', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 52, height: 52, background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>{t.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{t.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>{t.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <section style={{ ...c, padding: '64px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 8 }}>Shop by Category</h2>
          <div style={{ fontSize: 16, color: 'var(--text3)' }}>Find exactly what you're looking for</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {CATEGORIES.map(cat => (
            <div key={cat.name} onClick={() => navigate(`/products?category=${cat.name}`)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 20px', cursor: 'pointer', transition: 'all 0.25s', display: 'flex', alignItems: 'center', gap: 14 }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}>
              <div style={{ width: 48, height: 48, background: cat.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{cat.icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{cat.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Browse →</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section style={{ background: 'var(--surface)', padding: '64px 0' }}>
        <div style={c}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 8 }}>Featured Products</h2>
            <div style={{ fontSize: 16, color: 'var(--text3)' }}>Handpicked items just for you</div>
          </div>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 340 }} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <button onClick={() => navigate('/products')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--primary)', color: '#fff', border: 'none', padding: '13px 32px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              View All Products →
            </button>
          </div>
        </div>
      </section>

      {/* Deal of the day */}
      <section style={{ ...c, padding: '64px 40px' }}>
        <div style={{ background: 'linear-gradient(135deg,#eff6ff,#fdf4ff)', border: '1px solid var(--border2)', borderRadius: 20, padding: '32px 32px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Deal of the Day</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid var(--border2)', borderRadius: 10, padding: '8px 14px', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.04em' }}>ENDS IN</span>
              {[timer.h, timer.m, timer.s].map((v, i) => (
                <React.Fragment key={i}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>{v}</span>
                  {i < 2 && <span style={{ color: 'var(--text3)' }}>:</span>}
                </React.Fragment>
              ))}
            </div>
            <button onClick={() => navigate('/products')} style={{ fontSize: 13, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginLeft: 'auto' }}>View all →</button>
          </div>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 280 }} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
              {deals.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Promo banners */}
      <section style={{ ...c, padding: '0 40px 64px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb,#7c3aed)', borderRadius: 20, padding: '36px 40px', minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Members Only</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Founding Member Privileges Await</div>
          <button onClick={() => navigate('/register')} style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', width: 'fit-content', marginTop: 4 }}>
            Join Now →
          </button>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 20, padding: '36px 40px', minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>Free Shipping</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Orders Above <span style={{ color: 'var(--primary)' }}>$999</span> Ship Free
          </div>
          <button onClick={() => navigate('/products')} style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: '1.5px solid var(--primary-mid)', padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', width: 'fit-content', marginTop: 4 }}>
            Shop Now →
          </button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
