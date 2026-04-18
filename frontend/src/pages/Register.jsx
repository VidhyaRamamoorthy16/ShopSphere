import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../config/api'
import { toast } from '../components/Toast'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const register = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/auth/register', form)
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (e) {
      setError(e.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  const s = {
    page: { background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 48, width: '100%', maxWidth: 440 },
    logo: { fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, textAlign: 'center', marginBottom: 8 },
    logoSpan: { color: 'var(--primary)' },
    title: { fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 14, color: 'var(--text2)', textAlign: 'center', marginBottom: 32 },
    inputWrap: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 8, display: 'block' },
    input: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 16px', fontSize: 14, color: 'var(--text)', outline: 'none' },
    error: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 20 },
    btn: { width: '100%', background: 'var(--primary)', border: 'none', borderRadius: 10, padding: '15px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer', marginTop: 8 },
    footer: { textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text2)' },
    link: { color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 },
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Shop<span style={s.logoSpan}>Sphere</span></div>
        <div style={s.title}>Create Account</div>
        <div style={s.subtitle}>Join ShopSphere for exclusive deals</div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={register}>
          <div style={s.inputWrap}>
            <label style={s.label}>Full Name</label>
            <input style={s.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" required />
          </div>
          <div style={s.inputWrap}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
          </div>
          <div style={s.inputWrap}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
          </div>
          <button style={s.btn} type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
        </form>

        <div style={s.footer}>
          Already have an account? <span style={s.link} onClick={() => navigate('/login')}>Sign in</span>
        </div>
      </div>
    </div>
  )
}
