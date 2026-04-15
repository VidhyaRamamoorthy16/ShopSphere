import React from 'react'
import { useNavigate } from 'react-router-dom'
import { compareList } from '../pages/Compare'

export default function CompareBar() {
  const navigate = useNavigate()
  const items = compareList.get()

  if (items.length === 0) return null

  return (
    <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {items.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px' }}>
            <img src={p.image_url} alt={p.name} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} onError={e => e.target.src = `https://picsum.photos/seed/${p.id}/40/40`} />
            <span style={{ fontSize: 12, color: 'var(--text)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            <button onClick={() => { compareList.remove(p.id); navigate(0) }} style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/compare')} style={{ background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        Compare ({items.length})
      </button>
    </div>
  )
}
