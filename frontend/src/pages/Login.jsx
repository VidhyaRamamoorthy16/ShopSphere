import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../config/api'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/auth/login', form)
      localStorage.setItem('token', res.token)
      localStorage.setItem('shieldmart_token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      navigate('/')
    } catch (e) { setError(e.message || 'Login failed') }
    finally { setLoading(false) }
  }

  const s = {
    page: { background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
    card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 48, width: '100%', maxWidth: 420 },
    logo: { fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 28, textAlign: 'center' },
    logoSpan: { color: 'var(--primary)' },
    title: { fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em', color: 'var(--text)' },
    sub: { fontSize: 14, color: 'var(--text2)', marginBottom: 28, lineHeight: 1.6 },
    label: { fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' },
    input: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 16px', fontSize: 14, color: 'var(--text)', outline: 'none', marginBottom: 16, fontFamily: "'Inter',sans-serif" },
    forgot: { textAlign: 'right', marginBottom: 16, fontSize: 12, color: 'var(--primary)', cursor: 'pointer' },
    btn: { width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', padding: '14px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne',sans-serif", letterSpacing: '0.02em' },
    link: { textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text2)' },
    linkSpan: { color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 },
    error: { background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)', color: '#FF4D6D', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13 }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Shop<span style={s.logoSpan}>Sphere</span></div>
        <div style={s.title}>Welcome Back</div>
        <div style={s.sub}>Sign in to access your account and orders</div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Email Address</label>
          <input style={s.input} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" required />
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
          <div style={s.forgot} onClick={() => navigate('/forgot-password')}>Forgot password?</div>
          <button style={s.btn} type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>
        <div style={s.link}>
          New here? <span style={s.linkSpan} onClick={() => navigate('/register')}>Create an account →</span>
        </div>
      </div>
    </div>
  )
}
