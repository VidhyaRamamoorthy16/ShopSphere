import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../config/api'

export default function NotificationBell() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const bellRef = useRef(null)

  useEffect(() => {
    if (!api.isLoggedIn()) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const fetchNotifications = async () => {
    try {
      const data = await api.get('/api/notifications')
      setNotifications(data.notifications || [])
      setUnread(data.unread || 0)
    } catch (e) {}
  }

  const markRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`)
      fetchNotifications()
    } catch (e) {}
  }

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all')
      fetchNotifications()
    } catch (e) {}
  }

  const handleClick = (n) => {
    if (!n.read) markRead(n.id)
    if (n.link) navigate(n.link)
    setOpen(false)
  }

  if (!api.isLoggedIn()) return null

  const s = {
    bell: { position: 'relative', cursor: 'pointer', padding: 8 },
    icon: { fontSize: 20 },
    badge: { position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, background: 'var(--gold)', color: '#fff', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    dropdown: { position: 'absolute', top: 40, right: 0, width: 340, maxHeight: 400, overflow: 'auto', background: 'var(--card)', border: '1px solid var(--faint)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 1000 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottom: '1px solid var(--faint)' },
    headerTitle: { fontFamily: "'Playfair Display', serif", fontSize: 14 },
    markAll: { fontSize: 10, color: 'var(--gold)', cursor: 'pointer', letterSpacing: 1 },
    item: { padding: 16, borderBottom: '1px solid var(--faint)', cursor: 'pointer', display: 'flex', gap: 12 },
    unread: { background: 'var(--surface)' },
    dot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', marginTop: 4 },
    dotRead: { background: 'var(--faint)' },
    content: { flex: 1 },
    title: { fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 },
    msg: { fontSize: 11, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 4 },
    time: { fontSize: 9, color: 'var(--faint)' },
    empty: { padding: 24, textAlign: 'center', color: 'var(--muted)' },
    typeColors: { success: 'var(--gold)', info: 'var(--muted)', warning: 'var(--accent2)' }
  }

  return (
    <div ref={bellRef} style={s.bell} onClick={() => setOpen(!open)}>
      <span style={s.icon}>🔔</span>
      {unread > 0 && <span style={s.badge}>{unread}</span>}
      {open && (
        <div style={s.dropdown}>
          <div style={s.header}>
            <div style={s.headerTitle}>Notifications</div>
            {notifications.some(n => !n.read) && (
              <div style={s.markAll} onClick={(e) => { e.stopPropagation(); markAllRead() }}>Mark all read</div>
            )}
          </div>
          {notifications.length === 0 ? (
            <div style={s.empty}>No notifications yet</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} style={{ ...s.item, ...(!n.read ? s.unread : {}) }} onClick={() => handleClick(n)}>
                <div style={{ ...s.dot, ...(!n.read ? {} : s.dotRead), background: s.typeColors[n.type] || s.typeColors.info }} />
                <div style={s.content}>
                  <div style={s.title}>{n.title}</div>
                  <div style={s.msg}>{n.message}</div>
                  <div style={s.time}>{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
