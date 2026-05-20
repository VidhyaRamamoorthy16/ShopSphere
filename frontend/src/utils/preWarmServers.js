const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

let warmed = false

export const preWarmServers = async () => {
  if (warmed) return
  warmed = true
  try {
    // Fire and forget — don't block the UI
    fetch(`${API_BASE}/health`, { cache: 'no-store', signal: AbortSignal.timeout(10000) }).catch(() => {})
    fetch(`${API_BASE}/api/products?limit=1`, { cache: 'no-store', signal: AbortSignal.timeout(10000) }).catch(() => {})
  } catch {}
}

// Keep servers warm every 4 minutes
export const startFrontendKeepAlive = () => {
  const id = setInterval(() => {
    fetch(`${API_BASE}/health`, { cache: 'no-store', signal: AbortSignal.timeout(5000) }).catch(() => {})
  }, 4 * 60 * 1000)
  return () => clearInterval(id)
}
