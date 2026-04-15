import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../config/api'
import { useCart } from '../context/CartContext'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { cartCount, wishlistCount } = useCart()
  const [searchVal, setSearchVal] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSug, setShowSug] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const searchRef = useRef()
  const userRef = useRef()
  const u = api.getUser()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    const handler = e => {
      if (!searchRef.current?.contains(e.target)) setShowSug(false)
      if (!userRef.current?.contains(e.target)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => { window.removeEventListener('scroll', onScroll); document.removeEventListener('mousedown', handler) }
  }, [])

  const fetchSug = async (q) => {
    if (q.length < 2) { setSuggestions([]); setShowSug(false); return }
    try {
      const data = await api.get(`/api/products?search=${q}&limit=6`)
      setSuggestions(data.products || [])
      setShowSug(true)
    } catch (e) {}
  }

  const isActive = (path) => location.pathname === path

  const NAV_LINKS = [
    { label: 'Home', path: '/' },
    { label: 'Products', path: '/products' },
    { label: 'Categories', path: '/products' },
    { label: 'About', path: '/' },
  ]

  const s = {
    announce: { background: 'var(--primary)', color: '#fff', textAlign: 'center', padding: '10px 40px', fontSize: 13, fontWeight: 500 },
    nav: {
      position: 'sticky', top: 0, zIndex: 200,
      background: scrolled ? 'rgba(255,255,255,0.9)' : '#fff',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: '1px solid var(--border)',
      boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
      transition: 'all 0.3s ease',
    },
    inner: { maxWidth: 1280, margin: '0 auto', padding: '0 40px', display: 'flex', alignItems: 'center', gap: 32, height: 68 },
    logoWrap: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 },
    logoIcon: { width: 36, height: 36, background: 'var(--primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 17, fontWeight: 800 },
    logoText: { fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' },
    links: { display: 'flex', gap: 4, alignItems: 'center' },
    link: (active) => ({
      padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500,
      color: active ? 'var(--primary)' : 'var(--text2)', cursor: 'pointer', background: 'none', border: 'none',
      fontFamily: "'Inter',sans-serif", transition: 'all 0.15s',
    }),
    searchWrap: { flex: 1, maxWidth: 440, position: 'relative' },
    searchBox: { display: 'flex', alignItems: 'center', background: 'var(--bg)', border: '1.5px solid var(--border2)', borderRadius: 'var(--radius-md)', overflow: 'hidden', transition: 'border-color 0.2s' },
    searchInput: { flex: 1, background: 'transparent', border: 'none', padding: '10px 14px', fontSize: 14, color: 'var(--text)', outline: 'none', fontFamily: "'Inter',sans-serif" },
    searchBtn: { padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' },
    sugBox: { position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', zIndex: 300, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' },
    sugItem: { padding: '12px 14px', fontSize: 14, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' },
    icons: { display: 'flex', alignItems: 'center', gap: 4 },
    iconBtn: { width: 40, height: 40, background: 'none', border: 'none', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)', fontSize: 17, position: 'relative', transition: 'background 0.15s' },
    badge: { position: 'absolute', top: 4, right: 4, width: 17, height: 17, background: 'var(--danger)', borderRadius: '50%', fontSize: 9, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
    cartBtn: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--primary)', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
    userMenu: { position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', minWidth: 180, zIndex: 300, overflow: 'hidden' },
    userMenuItem: { padding: '11px 16px', fontSize: 14, cursor: 'pointer', color: 'var(--text)', borderBottom: '1px solid var(--border)', display: 'block' },
  }

  return (
    <>
      <div style={s.announce}>
        🎉 Free shipping on orders over ₹999! Use code: <strong>FREESHIP</strong>
      </div>
      <nav style={s.nav}>
        <div style={s.inner}>
          <div style={s.logoWrap} onClick={() => navigate('/')}>
            <div style={s.logoIcon}>S</div>
            <div style={s.logoText}>ShopSphere</div>
          </div>

          <div style={s.links}>
            {NAV_LINKS.map(l => (
              <button key={l.label} style={s.link(isActive(l.path) && l.path !== '/' || (l.path === '/' && isActive('/')))}
                onClick={() => navigate(l.path)}
                onMouseEnter={e => { if (!isActive(l.path)) e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--primary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = isActive(l.path) ? 'var(--primary)' : 'var(--text2)' }}>
                {l.label}
              </button>
            ))}
          </div>

          <div ref={searchRef} style={s.searchWrap}>
            <div style={s.searchBox}>
              <input style={s.searchInput} placeholder="Search products, brands..." value={searchVal}
                onChange={e => { setSearchVal(e.target.value); fetchSug(e.target.value) }}
                onFocus={e => e.currentTarget.parentElement.style.borderColor = 'var(--primary)'}
                onBlur={e => e.currentTarget.parentElement.style.borderColor = 'var(--border2)'}
                onKeyDown={e => { if (e.key === 'Enter' && searchVal.trim()) { navigate(`/search?search=${searchVal.trim()}`); setShowSug(false) } }} />
              <button style={s.searchBtn} onClick={() => searchVal.trim() && navigate(`/search?search=${searchVal.trim()}`)}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </button>
            </div>
            {showSug && suggestions.length > 0 && (
              <div style={s.sugBox}>
                {suggestions.map(p => (
                  <div key={p.id} style={s.sugItem}
                    onClick={() => { navigate(`/products/${p.id}`); setShowSug(false); setSearchVal('') }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.category}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>₹{p.price?.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={s.icons}>
            <button style={s.iconBtn} onClick={() => navigate('/wishlist')}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--danger)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text2)' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l8.84 8.84 8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {wishlistCount > 0 && <span style={s.badge}>{wishlistCount}</span>}
            </button>

            <button style={s.iconBtn} onClick={() => navigate('/cart')}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              {cartCount > 0 && <span style={s.badge}>{cartCount}</span>}
            </button>

            <div ref={userRef} style={{ position: 'relative' }}>
              <button style={{ ...s.iconBtn, gap: 6, padding: '6px 10px', width: 'auto' }}
                onClick={() => api.isLoggedIn() ? setShowUserMenu(p => !p) : navigate('/login')}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {api.isLoggedIn() && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{u?.name?.split(' ')[0]}</span>}
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>▾</span>
              </button>
              {showUserMenu && api.isLoggedIn() && (
                <div style={s.userMenu}>
                  <div style={s.userMenuItem} onClick={() => { navigate('/dashboard'); setShowUserMenu(false) }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    👤 My Account
                  </div>
                  <div style={s.userMenuItem} onClick={() => { navigate('/dashboard'); setShowUserMenu(false) }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    📦 My Orders
                  </div>
                  <div style={s.userMenuItem} onClick={() => { navigate('/wishlist'); setShowUserMenu(false) }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    ♡ Wishlist
                  </div>
                  <div style={{ ...s.userMenuItem, color: 'var(--danger)', borderBottom: 'none' }}
                    onClick={() => { api.clearToken(); navigate('/'); setShowUserMenu(false) }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    🚪 Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category strip */}
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', display: 'flex', overflowX: 'auto' }}>
            {['Electronics', 'Mobiles', 'Fashion', 'Books', 'Sports', 'Beauty', 'Toys', 'Home & Kitchen'].map(c => (
              <button key={c} onClick={() => navigate(`/products?category=${c}`)}
                style={{ padding: '10px 16px', fontSize: 12, fontWeight: 500, letterSpacing: '0.02em', color: 'var(--text2)', cursor: 'pointer', whiteSpace: 'nowrap', background: 'none', border: 'none', fontFamily: "'Inter',sans-serif", transition: 'color 0.15s', borderBottom: '2px solid transparent' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderBottomColor = 'var(--primary)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.borderBottomColor = 'transparent' }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </>
  )
}
