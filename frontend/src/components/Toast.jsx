import React, { useState, useEffect } from 'react'

let addToast = null

export const toast = {
  success: (msg) => addToast?.({ type: 'success', msg }),
  error: (msg) => addToast?.({ type: 'error', msg }),
  info: (msg) => addToast?.({ type: 'info', msg }),
  warning: (msg) => addToast?.({ type: 'warning', msg }),
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    addToast = ({ type, msg }) => {
      const id = Date.now() + Math.random()
      setToasts(prev => [...prev, { id, type, msg }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 2500)
    }
    return () => { addToast = null }
  }, [])

  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' }
  const colors = {
    success: { border: '#22c55e', icon: '#16a34a', bg: '#f0fdf4' },
    error:   { border: '#ef4444', icon: '#dc2626', bg: '#fef2f2' },
    info:    { border: '#2563eb', icon: '#1d4ed8', bg: '#eff6ff' },
    warning: { border: '#f59e0b', icon: '#d97706', bg: '#fffbeb' },
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
      {toasts.map(t => {
        const c = colors[t.type] || colors.info
        return (
          <div key={t.id} style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderLeft: `4px solid ${c.border}`,
            borderRadius: 12,
            padding: '13px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            animation: 'slideIn 0.3s ease',
            minWidth: 260,
            maxWidth: 360,
            pointerEvents: 'auto',
          }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: c.icon, flexShrink: 0 }}>
              {icons[t.type]}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#111827', flex: 1, lineHeight: 1.4 }}>{t.msg}</span>
          </div>
        )
      })}
    </div>
  )
}
