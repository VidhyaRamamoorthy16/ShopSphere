const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const getToken = () => localStorage.getItem('shieldmart_token')

const buildHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Client': 'shieldmart-frontend',
  ...(getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {})
})

export const api = {
  get: async (path) => {
    const res = await fetch(`${API_BASE}${path}`, { headers: buildHeaders() })
    return res.json()
  },
  post: async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body)
    })
    return res.json()
  },
  put: async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(body)
    })
    return res.json()
  },
  delete: async (path) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: buildHeaders()
    })
    return res.json()
  },
  setToken: (token) => localStorage.setItem('shieldmart_token', token),
  clearToken: () => localStorage.removeItem('shieldmart_token'),
  getToken,
  isLoggedIn: () => !!getToken(),
  getUser: () => {
    const token = getToken()
    if (!token) return null
    try {
      return JSON.parse(atob(token.split('.')[1]))
    } catch { return null }
  }
}

export default API_BASE
