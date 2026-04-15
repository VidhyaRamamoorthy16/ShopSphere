import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../config/api'
import { toast } from '../components/Toast'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('orders')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [profile, setProfile] = useState({ name: '', phone: '' })
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!api.isLoggedIn()) { navigate('/login'); return }
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const u = api.getUser()
      setUser(u)
      setProfile({ name: u?.name || '', phone: u?.phone || '' })
      const data = await api.get('/api/orders')
      setOrders(data.orders || [])
    } catch (e) {} finally { setLoading(false) }
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const data = await api.put('/api/auth/profile', profile)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      toast.success('Profile updated successfully')
    } catch (e) { toast.error('Failed to update profile') }
    finally { setSaving(false) }
  }

  const changePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match')
      return
    }
    setSaving(true)
    try {
      await api.put('/api/auth/password', { current_password: passwords.current, new_password: passwords.new })
      toast.success('Password updated successfully')
      setPasswords({ current: '', new: '', confirm: '' })
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to update password') }
    finally { setSaving(false) }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  const totalSpent = orders.reduce((s, o) => s + o.total_amount, 0)

  const s = {
    page: { background: 'var(--bg)', minHeight: '100vh' },
    layout: { display: 'grid', gridTemplateColumns: '260px 1fr', gap: 0 },
    input: { width: '100%', padding: 12, fontSize: 13, border: '1px solid var(--faint)', background: 'var(--card)', marginBottom: 16 },
    btn: { padding: '12px 24px', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', background: 'var(--ink)', color: 'var(--bg)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 },
    section: { background: 'var(--card)', border: '1px solid var(--faint)', padding: 24, marginBottom: 24 },
    sectionTitle: { fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 20 },
    label: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8, display: 'block' },
    sidebar: { background: 'var(--surface)', borderRight: '1px solid var(--faint)', padding: '32px 24px', minHeight: 'calc(100vh - 120px)' },
    avatar: { width: 60, height: 60, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', marginBottom: 12 },
    name: { fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 400, marginBottom: 4 },
    email: { fontSize: 11, color: 'var(--muted)', marginBottom: 24 },
    statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 },
    statCard: { background: 'var(--card)', border: '1px solid var(--faint)', padding: 16 },
    statNum: { fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 300, color: 'var(--ink)' },
    statLabel: { fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginTop: 4 },
    navItem: (active) => ({ padding: '10px 0', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: active ? 'var(--gold)' : 'var(--muted)', borderLeft: active ? '2px solid var(--gold)' : '2px solid transparent', paddingLeft: 12, cursor: 'pointer', marginBottom: 4 }),
    logout: { padding: '10px 0', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent2)', cursor: 'pointer', marginTop: 24 },
    main: { padding: '32px 40px' },
    title: { fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 300, marginBottom: 24 },
    orderCard: { background: 'var(--card)', border: '1px solid var(--faint)', padding: 20, marginBottom: 16 },
    orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, cursor: 'pointer' },
    orderId: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--ink)' },
    status: (status) => ({ fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', padding: '4px 10px', background: status === 'delivered' ? '#e8f5e9' : status === 'cancelled' ? '#ffebee' : 'var(--gold-pale)', color: status === 'delivered' ? 'var(--accent)' : status === 'cancelled' ? 'var(--accent2)' : 'var(--gold)' }),
    orderRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginTop: 8 },
    items: { borderTop: '1px solid var(--faint)', paddingTop: 16, marginTop: 16 },
    item: { display: 'flex', gap: 12, marginBottom: 12 },
    itemImg: { width: 40, height: 40, background: 'var(--gold-pale)' },
    itemName: { fontSize: 12, color: 'var(--ink)' },
    empty: { textAlign: 'center', padding: '60px', color: 'var(--muted)' }
  }

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.layout}>
        <div style={s.sidebar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={s.avatar}>{user?.name?.charAt(0) || 'U'}</div>
            <div>
              <div style={s.name}>{user?.name}</div>
              <div style={s.email}>{user?.email}</div>
            </div>
          </div>
          <div style={s.statGrid}>
            <div style={s.statCard}>
              <div style={s.statNum}>{orders.length}</div>
              <div style={s.statLabel}>Orders</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statNum}>₹{(totalSpent / 1000).toFixed(1)}k</div>
              <div style={s.statLabel}>Total Spent</div>
            </div>
          </div>
          <div style={s.navItem(activeTab === 'orders')} onClick={() => setActiveTab('orders')}>My Orders</div>
          <div style={s.navItem(activeTab === 'addresses')} onClick={() => setActiveTab('addresses')}>Addresses</div>
          <div style={s.navItem(activeTab === 'profile')} onClick={() => setActiveTab('profile')}>Profile</div>
          <div style={s.logout} onClick={logout}>Sign Out</div>
        </div>
        <div style={s.main}>
          <div style={s.title}>{activeTab === 'orders' ? 'Your Orders' : activeTab === 'addresses' ? 'Saved Addresses' : 'Profile'}</div>
          {activeTab === 'orders' && (
            orders.length === 0 ? (
              <div style={s.empty}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 12 }}>No orders yet</div>
                <div>Explore our curated collection</div>
                <button style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '12px 28px', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', border: 'none', marginTop: 20, cursor: 'pointer' }} onClick={() => navigate('/products')}>Explore</button>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} style={s.orderCard}>
                  <div style={s.orderHeader} onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                    <div>
                      <div style={s.orderId}>#{order.id}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{new Date(order.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={s.status(order.status)}>{order.status}</div>
                  </div>
                  <div style={s.orderRow}><span>{order.items?.length || 0} items</span><span>₹{order.total_amount?.toLocaleString()}</span></div>
                  <div style={{ marginTop: 12 }}>
                    <button onClick={() => navigate(`/orders/${order.id}/track`)} style={{ padding: '8px 16px', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', background: 'var(--gold)', color: '#fff', border: 'none', cursor: 'pointer' }}>Track Order</button>
                  </div>
                  {expandedOrder === order.id && (
                    <div style={s.items}>
                      {order.items?.map(item => (
                        <div key={item.id} style={s.item}>
                          <div style={s.itemImg}>
                            <img src={item.product?.image_url} alt={item.product?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
                          </div>
                          <div>
                            <div style={s.itemName}>{item.product?.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Qty: {item.quantity} • ₹{item.price?.toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                      <div style={{ background: 'var(--surface)', padding: 12, marginTop: 12 }}>
                        <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Shipping Address</div>
                        <div style={{ fontSize: 12, color: 'var(--ink)' }}>{order.shipping_address?.line1}, {order.shipping_address?.city}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )
          )}
          {activeTab === 'addresses' && <div style={{ color: 'var(--muted)' }}>Address management coming soon.</div>}
          {activeTab === 'profile' && (
            <>
              <div style={s.section}>
                <div style={s.sectionTitle}>Profile Information</div>
                <label style={s.label}>Full Name</label>
                <input style={s.input} value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
                <label style={s.label}>Phone Number</label>
                <input style={s.input} value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
                <button style={s.btn} onClick={saveProfile} disabled={saving}>Save Changes</button>
              </div>
              <div style={s.section}>
                <div style={s.sectionTitle}>Change Password</div>
                <label style={s.label}>Current Password</label>
                <input type="password" style={s.input} value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} />
                <label style={s.label}>New Password</label>
                <input type="password" style={s.input} value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} />
                <label style={s.label}>Confirm New Password</label>
                <input type="password" style={s.input} value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} />
                <button style={s.btn} onClick={changePassword} disabled={saving}>Update Password</button>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
