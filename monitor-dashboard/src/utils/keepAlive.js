const MONITOR_URL = import.meta.env.VITE_MONITOR_URL || 'http://localhost:3000'
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:5001'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const PING_INTERVAL = 4 * 60 * 1000 // 4 minutes

const ping = async (url) => {
  try {
    await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
  } catch {}
}

const pingAll = () => {
  ping(MONITOR_URL)
  ping(GATEWAY_URL)
  ping(BACKEND_URL)
}

export const startKeepAlive = () => {
  pingAll() // immediate first ping
  const id = setInterval(pingAll, PING_INTERVAL)
  return () => clearInterval(id) // return cleanup function
}
