import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../config/api'
import { toast } from '../components/Toast'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const sendReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setSent(true)
      toast.success('Reset link sent — check your email')
    } catch (err) { toast.error('Failed to send reset email') }
    finally { setLoading(false) }
  }

  const resetPass = async (e) => {
    e.preventDefault()
    if (newPassword !== confirm) return toast.error('Passwords do not match')
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', { token, new_password: newPassword })
      toast.success('Password reset! Please login.')
      navigate('/login')
    } catch (err) { toast.error('Reset failed — link may have expired') }
    finally { setLoading(false) }
  }

  const s = {
    page: { background:'var(--bg)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' },
    card: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, padding:48, width:'100%', maxWidth:420 },
    logo: { fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:'var(--text)', marginBottom:28, textAlign:'center' },
    logoSpan: { color:'var(--violet)' },
    title: { fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, marginBottom:8, letterSpacing:'-0.02em' },
    sub: { fontSize:14, color:'var(--text2)', marginBottom:28, lineHeight:1.6 },
    label: { fontSize:12, fontWeight:500, color:'var(--text2)', marginBottom:6, display:'block', textTransform:'uppercase', letterSpacing:'0.06em' },
    input: { width:'100%', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:'13px 16px', fontSize:14, color:'var(--text)', outline:'none', marginBottom:16, fontFamily:"'Inter',sans-serif" },
    btn: { width:'100%', background:'var(--violet)', color:'#fff', border:'none', padding:'14px', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:"'Syne',sans-serif", letterSpacing:'0.02em' },
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Shop<span style={s.logoSpan}>Sphere</span></div>
        {token ? (
          <>
            <div style={s.title}>Set New Password</div>
            <div style={s.sub}>Enter your new password below.</div>
            <form onSubmit={resetPass}>
              <label style={s.label}>New Password</label>
              <input style={s.input} type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Min 6 characters" required />
              <label style={s.label}>Confirm Password</label>
              <input style={s.input} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat password" required />
              <button style={s.btn} type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
            </form>
          </>
        ) : sent ? (
          <>
            <div style={{ fontSize:48, textAlign:'center', marginBottom:16 }}>📧</div>
            <div style={{ ...s.title, textAlign:'center' }}>Check your email</div>
            <div style={{ ...s.sub, textAlign:'center' }}>We sent a reset link to <strong>{email}</strong></div>
            <button style={s.btn} onClick={() => navigate('/login')}>Back to Login</button>
          </>
        ) : (
          <>
            <div style={s.title}>Forgot Password?</div>
            <div style={s.sub}>Enter your email and we'll send you a reset link.</div>
            <form onSubmit={sendReset}>
              <label style={s.label}>Email Address</label>
              <input style={s.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" required />
              <button style={s.btn} type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
            </form>
            <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text2)' }}>
              <span style={{ color:'var(--violet)', cursor:'pointer' }} onClick={() => navigate('/login')}>← Back to Login</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
