import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Footer() {
  const navigate = useNavigate()

  return (
    <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', marginTop: 80 }}>
      {/* Trust bar */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[
            { icon: '🚀', label: 'Free Delivery', sub: 'Orders above ₹999', color: 'var(--cyan)' },
            { icon: '🛡', label: 'Genuine Products', sub: 'Verified & certified', color: 'var(--violet)' },
            { icon: '↩', label: 'Easy Returns', sub: '30-day return policy', color: 'var(--emerald)' },
          ].map((t, i) => (
            <div key={t.label} style={{ padding: '26px 20px', borderRight: i < 3 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, background: t.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{t.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{t.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main footer */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 40px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, background: 'var(--primary)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 800 }}>S</div>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>ShopSphere</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.8, maxWidth: 260, marginBottom: 20 }}>
              A modern marketplace with intelligent API gateway security. Fast, genuine, protected.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['𝕏', 'in', 'ig'].map(s => (
                <div key={s} style={{ width: 34, height: 34, background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>{s}</div>
              ))}
            </div>
          </div>
          {[
            { title: 'Shop', links: ['Electronics', 'Fashion', 'Home & Kitchen', 'Books', 'Sports', 'Beauty'] },
            { title: 'Account', links: ['Login', 'Register', 'My Orders', 'Wishlist', 'Dashboard'] },
            { title: 'Company', links: ['About Us', 'Careers', 'Privacy Policy', 'Terms of Use', 'Contact'] },
          ].map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 16 }}>{col.title}</div>
              {col.links.map(l => (
                <div key={l} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10, cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}>{l}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text3)' }}>
          <span> 2026 ShopSphere. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 16 }}>
            {[' SSL Secured', ' Genuine Products', ' Fast Delivery'].map(t => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
