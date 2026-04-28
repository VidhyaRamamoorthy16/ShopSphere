const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'
const MONITOR_BASE = import.meta.env.VITE_MONITOR_URL || 'http://localhost:3000'

export const api = {
  get: async (endpoint) => {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  post: async (endpoint, body) => {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || err.error || `HTTP ${res.status}`)
    }
    return res.json()
  },
  put: async (endpoint, body) => {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  delete: async (endpoint) => {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  isLoggedIn: () => !!localStorage.getItem('token'),
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => localStorage.setItem('token', token),
  clearToken: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  }
}

export { API_BASE, MONITOR_BASE }
export default api
