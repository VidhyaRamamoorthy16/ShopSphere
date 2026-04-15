import { useEffect, useRef, useState, useCallback } from 'react'

const MONITOR = import.meta.env.VITE_MONITOR_URL || 'http://localhost:3000'

export const useMonitorWS = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [stats, setStats] = useState(null)
  const [lastThreat, setLastThreat] = useState(null)
  const ws = useRef(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(`${MONITOR.replace('http', 'ws')}/monitor/ws/live`)
      
      ws.current.onopen = () => {
        setIsConnected(true)
        reconnectAttempts.current = 0
      }
      
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.type === 'stats_update') {
          setStats(data.data)
        } else if (data.type === 'threat_detected') {
          setLastThreat(data)
        }
      }
      
      ws.current.onclose = () => {
        setIsConnected(false)
        if (reconnectAttempts.current < maxReconnectAttempts) {
          setTimeout(() => {
            reconnectAttempts.current += 1
            connect()
          }, 3000 * reconnectAttempts.current)
        }
      }
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to connect:', error)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (ws.current) ws.current.close()
    }
  }, [connect])

  return { isConnected, stats, lastThreat }
}

export const usePolling = (fetchFn, interval = 5000) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchFn()
        setData(result)
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const timer = setInterval(fetchData, interval)
    return () => clearInterval(timer)
  }, [fetchFn, interval])

  return { data, loading, error, refetch: () => fetchFn() }
}

export const useOverview = () => {
  return usePolling(() => 
    fetch(`${MONITOR}/monitor/overview`).then(r => r.json()), 
    5000
  )
}
