import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { API_BASE } from '../config/api'

export default function Navbar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { cartCount, wishlistCount } = useCart()
  const [user,        setUser]        = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [scrolled,    setScrolled]    = useState(false)
  const [menuOpen,    setMenuOpen]    = useState(false)   // mobile menu
  const [mobileSearch,setMobileSearch]= useState(false)   // mobile search bar
  const [dropOpen,    setDropOpen]    = useState(false)   // user dropdown
  const menuRef = useRef(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) { try { setUser(JSON.parse(stored)) } catch(e) {} }
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); setMobileSearch(false) }, [location])

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setMobileSearch(false)
      setMenuOpen(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setMenuOpen(false)
    navigate('/')
  }

  const navLinks = [
    { label: 'Home',     path: '/' },
    { label: 'Products', path: '/products' },
    { label: 'Contact',  path: '/contact' },
  ]

  const CATEGORIES = ['Electronics','Mobiles','Fashion','Books','Sports','Beauty','Toys','Home & Kitchen']

  const isActive = (path) => location.pathname === path

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 1000,
        background: scrolled ? 'rgba(255,255,255,0.97)' : '#fff',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f3f4f6',
        boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.3s',
      }}>

        {/* ── MAIN NAV BAR ── */}
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          padding: '0 16px',
          height: 60,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>

          {/* Logo */}
          <div
            onClick={() => navigate('/')}
            style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', flexShrink:0 }}>
            <div style={{
              width:34, height:34, background:'#2563eb',
              borderRadius:9, display:'flex', alignItems:'center',
              justifyContent:'center', color:'#fff', fontWeight:900, fontSize:16,
            }}>S</div>
            <span style={{
              fontSize:18, fontWeight:800, color:'#111827',
              letterSpacing:'-0.02em',
            }}>ShopSphere</span>
          </div>

          {/* Desktop nav links — hidden on mobile */}
          <div className="desktop-nav" style={{ display:'flex', gap:4 }}>
            {navLinks.map(link => (
              <button key={link.path} onClick={() => navigate(link.path)} style={{
                background: isActive(link.path) ? '#eff6ff' : 'none',
                color: isActive(link.path) ? '#2563eb' : '#4b5563',
                border:'none', borderRadius:8,
                padding:'7px 14px', fontSize:14, fontWeight:500,
                cursor:'pointer', transition:'all 0.15s',
                whiteSpace:'nowrap',
              }}>
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop search — hidden on mobile */}
          <form onSubmit={handleSearch} className="desktop-search" style={{ flex:1, maxWidth:400 }}>
            <div style={{ position:'relative' }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products, brands..."
                style={{
                  width:'100%', padding:'9px 16px 9px 40px',
                  border:'1.5px solid #e5e7eb', borderRadius:12,
                  fontSize:14, background:'#f9fafb', outline:'none',
                  transition:'all 0.2s', boxSizing:'border-box',
                }}
                onFocus={e => { e.target.style.borderColor='#2563eb'; e.target.style.background='#fff' }}
                onBlur={e => { e.target.style.borderColor='#e5e7eb'; e.target.style.background='#f9fafb' }}
              />
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'#9ca3af' }}>🔍</span>
            </div>
          </form>

          {/* Spacer pushes icons right on mobile */}
          <div style={{ flex:1 }} />

          {/* Mobile search icon */}
          <button
            className="mobile-only"
            onClick={() => setMobileSearch(s => !s)}
            style={{
              background:'none', border:'none', padding:8, cursor:'pointer',
              fontSize:20, color:'#374151', display:'none',
            }}>
            🔍
          </button>

          {/* Wishlist */}
          <button onClick={() => navigate('/wishlist')} style={{
            position:'relative', background:'none', border:'none',
            width:38, height:38, borderRadius:9, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'background 0.15s', flexShrink:0,
          }}
          onMouseEnter={e => e.currentTarget.style.background='#f3f4f6'}
          onMouseLeave={e => e.currentTarget.style.background='none'}>
            <span style={{ fontSize:20 }}>🤍</span>
            {wishlistCount > 0 && (
              <span style={{
                position:'absolute', top:3, right:3,
                background:'#ef4444', color:'#fff',
                width:16, height:16, borderRadius:'50%',
                fontSize:9, fontWeight:700,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>{wishlistCount > 9 ? '9+' : wishlistCount}</span>
            )}
          </button>

          {/* Cart */}
          <button onClick={() => navigate('/cart')} style={{
            position:'relative', background:'none', border:'none',
            width:38, height:38, borderRadius:9, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'background 0.15s', flexShrink:0,
          }}
          onMouseEnter={e => e.currentTarget.style.background='#f3f4f6'}
          onMouseLeave={e => e.currentTarget.style.background='none'}>
            <span style={{ fontSize:20 }}>🛒</span>
            {cartCount > 0 && (
              <span style={{
                position:'absolute', top:3, right:3,
                background:'#2563eb', color:'#fff',
                width:16, height:16, borderRadius:'50%',
                fontSize:9, fontWeight:700,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>{cartCount > 9 ? '9+' : cartCount}</span>
            )}
          </button>

          {/* User — desktop only */}
          <div className="desktop-nav" style={{ position:'relative' }}
            onMouseEnter={() => setDropOpen(true)}
            onMouseLeave={() => setDropOpen(false)}>
            {user ? (
              <>
                <button style={{
                  display:'flex', alignItems:'center', gap:7,
                  background:'#eff6ff', border:'none', borderRadius:10,
                  padding:'7px 12px', cursor:'pointer', flexShrink:0,
                }}>
                  <div style={{
                    width:24, height:24, borderRadius:'50%',
                    background:'#2563eb', color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:700,
                  }}>
                    {(user.name || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize:13, fontWeight:600, color:'#1d4ed8', maxWidth:70, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {user.name?.split(' ')[0] || 'Account'}
                  </span>
                </button>
                {dropOpen && (
                  <div style={{
                    position:'absolute', right:0, top:'100%',
                    background:'#fff', border:'1px solid #f3f4f6',
                    borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.12)',
                    minWidth:180, overflow:'hidden', zIndex:999,
                  }}>
                    {[
                      { label:'👤 My Profile', path:'/dashboard' },
                      { label:'📦 My Orders',  path:'/orders' },
                      { label:'🤍 Wishlist',   path:'/wishlist' },
                      { label:'🛒 Cart',       path:'/cart' },
                    ].map(item => (
                      <button key={item.path} onClick={() => { navigate(item.path); setDropOpen(false) }} style={{
                        display:'block', width:'100%', textAlign:'left',
                        padding:'11px 16px', border:'none', background:'none',
                        fontSize:13, cursor:'pointer', color:'#374151',
                        transition:'background 0.15s',
                      }}
                      onMouseEnter={e => e.target.style.background='#f9fafb'}
                      onMouseLeave={e => e.target.style.background='none'}>
                        {item.label}
                      </button>
                    ))}
                    <div style={{ height:1, background:'#f3f4f6' }} />
                    <button onClick={logout} style={{
                      display:'block', width:'100%', textAlign:'left',
                      padding:'11px 16px', border:'none', background:'none',
                      fontSize:13, cursor:'pointer', color:'#ef4444',
                    }}
                    onMouseEnter={e => e.target.style.background='#fef2f2'}
                    onMouseLeave={e => e.target.style.background='none'}>
                      🚪 Logout
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => navigate('/login')} style={{
                  background:'none', border:'1.5px solid #e5e7eb',
                  borderRadius:9, padding:'7px 14px',
                  fontSize:13, fontWeight:600, color:'#374151', cursor:'pointer',
                }}>Login</button>
                <button onClick={() => navigate('/register')} style={{
                  background:'#2563eb', border:'none',
                  borderRadius:9, padding:'7px 14px',
                  fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer',
                }}>Sign Up</button>
              </div>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            ref={menuRef}
            className="mobile-only"
            onClick={() => setMenuOpen(s => !s)}
            style={{
              background:'none', border:'1.5px solid #e5e7eb', borderRadius:8,
              width:38, height:38, cursor:'pointer', fontSize:18,
              display:'none', alignItems:'center', justifyContent:'center',
              color:'#374151', flexShrink:0,
            }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* ── MOBILE SEARCH BAR — slides down ── */}
        {mobileSearch && (
          <div className="mobile-only" style={{
            padding:'8px 16px 12px',
            borderTop:'1px solid #f3f4f6',
            display:'block',
          }}>
            <form onSubmit={handleSearch}>
              <div style={{ position:'relative' }}>
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products, brands..."
                  style={{
                    width:'100%', padding:'10px 16px 10px 42px',
                    border:'1.5px solid #2563eb', borderRadius:12,
                    fontSize:15, background:'#fff', outline:'none',
                    boxSizing:'border-box',
                  }}
                />
                <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:18, color:'#9ca3af' }}>🔍</span>
              </div>
            </form>
          </div>
        )}

        {/* ── CATEGORY BAR — desktop only ── */}
        <div className="desktop-nav" style={{ borderTop:'1px solid #f9fafb', padding:'8px 40px', overflowX:'auto' }}>
          <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', gap:4 }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => navigate(`/products?category=${cat}`)} style={{
                background:'none', border:'none', borderRadius:8,
                padding:'5px 12px', fontSize:13, color:'#6b7280',
                cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s',
              }}
              onMouseEnter={e => { e.target.style.background='#eff6ff'; e.target.style.color='#2563eb' }}
              onMouseLeave={e => { e.target.style.background='none'; e.target.style.color='#6b7280' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── MOBILE SIDE DRAWER ── */}
      {menuOpen && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:2000,
          background:'rgba(0,0,0,0.5)',
        }} onClick={() => setMenuOpen(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position:'absolute', top:0, left:0, bottom:0,
              width:'80%', maxWidth:300,
              background:'#fff', boxShadow:'4px 0 30px rgba(0,0,0,0.15)',
              overflowY:'auto',
              animation:'slideInLeft 0.25s ease',
            }}>

            {/* Drawer header */}
            <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid #f3f4f6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:32, height:32, background:'#2563eb', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:15 }}>S</div>
                <span style={{ fontSize:17, fontWeight:800, color:'#111827' }}>ShopSphere</span>
              </div>
              <button onClick={() => setMenuOpen(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#9ca3af' }}>✕</button>
            </div>

            {/* User info */}
            {user && (
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #f3f4f6', background:'#f9fafb' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:'#2563eb', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700 }}>
                    {(user.name || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:'#111827' }}>{user.name || 'User'}</div>
                    <div style={{ fontSize:12, color:'#9ca3af' }}>{user.email}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Nav links */}
            <div style={{ padding:'8px 0' }}>
              {[
                { label:'🏠 Home',       path:'/' },
                { label:'📦 Products',   path:'/products' },
                { label:'📞 Contact',    path:'/contact' },
              ].map(item => (
                <button key={item.path} onClick={() => { navigate(item.path); setMenuOpen(false) }} style={{
                  display:'block', width:'100%', textAlign:'left',
                  padding:'13px 20px', border:'none',
                  background: isActive(item.path) ? '#eff6ff' : 'none',
                  color: isActive(item.path) ? '#2563eb' : '#374151',
                  fontSize:15, fontWeight: isActive(item.path) ? 600 : 400,
                  cursor:'pointer', borderLeft: isActive(item.path) ? '3px solid #2563eb' : '3px solid transparent',
                }}>
                  {item.label}
                </button>
              ))}
            </div>

            {/* Categories */}
            <div style={{ padding:'4px 0', borderTop:'1px solid #f3f4f6' }}>
              <div style={{ padding:'10px 20px 6px', fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em' }}>Categories</div>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => { navigate(`/products?category=${cat}`); setMenuOpen(false) }} style={{
                  display:'block', width:'100%', textAlign:'left',
                  padding:'11px 20px', border:'none', background:'none',
                  color:'#4b5563', fontSize:14, cursor:'pointer',
                }}
                onMouseEnter={e => e.target.style.background='#f9fafb'}
                onMouseLeave={e => e.target.style.background='none'}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Account */}
            <div style={{ padding:'4px 0', borderTop:'1px solid #f3f4f6' }}>
              <div style={{ padding:'10px 20px 6px', fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em' }}>Account</div>
              {user ? (
                <>
                  {[
                    { label:'👤 My Profile', path:'/dashboard' },
                    { label:'📦 My Orders',  path:'/orders' },
                    { label:'🤍 Wishlist',   path:'/wishlist' },
                    { label:'🛒 Cart',       path:'/cart' },
                  ].map(item => (
                    <button key={item.path} onClick={() => { navigate(item.path); setMenuOpen(false) }} style={{
                      display:'block', width:'100%', textAlign:'left',
                      padding:'11px 20px', border:'none', background:'none',
                      color:'#4b5563', fontSize:14, cursor:'pointer',
                    }}>
                      {item.label}
                    </button>
                  ))}
                  <button onClick={logout} style={{
                    display:'block', width:'100%', textAlign:'left',
                    padding:'11px 20px', border:'none', background:'none',
                    color:'#ef4444', fontSize:14, cursor:'pointer', fontWeight:600,
                  }}>
                    🚪 Logout
                  </button>
                </>
              ) : (
                <div style={{ padding:'12px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                  <button onClick={() => { navigate('/login'); setMenuOpen(false) }} style={{
                    background:'none', border:'1.5px solid #e5e7eb', borderRadius:10,
                    padding:'11px', fontSize:14, fontWeight:600, color:'#374151', cursor:'pointer',
                  }}>Login</button>
                  <button onClick={() => { navigate('/register'); setMenuOpen(false) }} style={{
                    background:'#2563eb', border:'none', borderRadius:10,
                    padding:'11px', fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer',
                  }}>Sign Up</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS for mobile breakpoints */}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%) }
          to   { transform: translateX(0) }
        }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .desktop-search { display: none !important; }
          .mobile-only { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
          .desktop-nav { display: flex !important; }
          .desktop-search { display: block !important; }
        }
      `}</style>
    </>
  )
}
