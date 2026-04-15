import axios from 'axios'

const MONITOR = import.meta.env.VITE_MONITOR_URL || 'http://localhost:3000'
const GATEWAY = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:5001'
const API_BASE = `${MONITOR}/monitor`
const GATEWAY_URL = GATEWAY

// Mock data generators
const generateMockRequests = (count = 50) => {
  const methods = ['GET', 'POST', 'PUT', 'DELETE']
  const endpoints = ['/api/products', '/api/auth/login', '/api/cart', '/api/orders', '/api/users', '/api/search']
  const statuses = ['allowed', 'allowed', 'allowed', 'allowed', 'flagged', 'blocked']
  const ips = ['192.168.1.100', '10.0.0.50', '172.16.0.20', '203.0.113.45', '198.51.100.25', '192.168.1.105', '10.0.0.75']
  
  return Array.from({ length: count }, (_, i) => ({
    id: `req-${Date.now()}-${i}`,
    timestamp: new Date(Date.now() - i * 2000).toISOString(),
    ip: ips[Math.floor(Math.random() * ips.length)],
    method: methods[Math.floor(Math.random() * methods.length)],
    endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    responseTime: Math.floor(Math.random() * 400) + 20,
    userAgent: 'Mozilla/5.0'
  }))
}

const generateMockThreats = () => [
  { id: 1, type: 'SQL Injection', severity: 'critical', sourceIP: '192.168.1.100', target: '/api/auth/login', timestamp: new Date().toISOString(), payload: "' OR 1=1 --" },
  { id: 2, type: 'DDoS', severity: 'high', sourceIP: '10.0.0.50', target: '/api/products', timestamp: new Date(Date.now() - 30000).toISOString(), payload: 'High volume: 1000 req/s' },
  { id: 3, type: 'Brute Force', severity: 'high', sourceIP: '172.16.0.20', target: '/api/auth/login', timestamp: new Date(Date.now() - 60000).toISOString(), payload: '20 failed attempts' },
  { id: 4, type: 'XSS', severity: 'medium', sourceIP: '203.0.113.45', target: '/api/search', timestamp: new Date(Date.now() - 90000).toISOString(), payload: '<script>alert(1)</script>' },
  { id: 5, type: 'Bot', severity: 'medium', sourceIP: '198.51.100.25', target: '/api/products', timestamp: new Date(Date.now() - 120000).toISOString(), payload: 'Automated scraping detected' }
]

const generateMockRateLimits = () => [
  { ip: '192.168.1.105', current: 85, limit: 100, window: '1m', percentage: 85 },
  { ip: '10.0.0.75', current: 45, limit: 100, window: '1m', percentage: 45 },
  { ip: '172.16.0.30', current: 92, limit: 100, window: '1m', percentage: 92 },
  { ip: '203.0.113.60', current: 30, limit: 60, window: '5m', percentage: 50 }
]

const generateMockBlocked = () => [
  { ip: '192.168.1.200', reason: 'Rate limit exceeded', timestamp: new Date(Date.now() - 3600000).toISOString(), duration: '1 hour', expiresIn: 1800 },
  { ip: '10.0.0.99', reason: 'Suspicious activity', timestamp: new Date(Date.now() - 7200000).toISOString(), duration: '24 hours', expiresIn: 72000 },
  { ip: '172.16.0.55', reason: 'Multiple failed auth', timestamp: new Date(Date.now() - 1800000).toISOString(), duration: '30 min', expiresIn: 0 }
]

const generateMockOverview = () => ({
  totalRequests: 15420,
  blockedRequests: 1243,
  activeRateLimits: 8,
  threatScore: 23,
  requestsPerMinute: Array.from({ length: 60 }, (_, i) => ({
    minute: i,
    count: Math.floor(Math.random() * 50) + 20,
    blocked: Math.floor(Math.random() * 10)
  })),
  breakdown: { safe: 12500, flagged: 1677, blocked: 1243 },
  recentlyBlocked: generateMockBlocked().slice(0, 3),
  topEndpoints: [
    { endpoint: '/api/products', count: 5200 },
    { endpoint: '/api/auth/login', count: 3100 },
    { endpoint: '/api/cart', count: 2400 },
    { endpoint: '/api/orders', count: 1800 },
    { endpoint: '/api/search', count: 1200 }
  ]
})

// Enhanced API with fallback
const fetchWithFallback = async (axiosCall, fallbackData) => {
  try {
    const response = await axiosCall()
    return response.data
  } catch (error) {
    console.log('API error, using mock data:', error.message)
    return fallbackData
  }
}

export const api = {
  // Overview
  getOverview: () => fetchWithFallback(
    () => axios.get(`${API_BASE}/overview`),
    generateMockOverview()
  ),
  
  // Requests
  getLiveRequests: (limit = 50) => fetchWithFallback(
    () => axios.get(`${API_BASE}/requests/live?limit=${limit}`),
    generateMockRequests(limit)
  ),
  getRequestStats: () => fetchWithFallback(
    () => axios.get(`${API_BASE}/requests/stats`),
    { total: 15420, allowed: 12500, flagged: 1677, blocked: 1243 }
  ),
  getEndpoints: () => fetchWithFallback(
    () => axios.get(`${API_BASE}/requests/endpoints`),
    [
      { endpoint: '/api/products', count: 5200 },
      { endpoint: '/api/auth/login', count: 3100 },
      { endpoint: '/api/cart', count: 2400 }
    ]
  ),
  
  // Rate Limits
  getActiveRateLimits: () => fetchWithFallback(
    () => axios.get(`${API_BASE}/rate-limits/active`),
    generateMockRateLimits()
  ),
  getBlockedIPs: () => fetchWithFallback(
    () => axios.get(`${API_BASE}/rate-limits/blocked`),
    generateMockBlocked()
  ),
  getTempBanned: () => fetchWithFallback(
    () => axios.get(`${API_BASE}/rate-limits/temp-banned`),
    generateMockBlocked()
  ),
  
  // Throttling
  getThrottlingTiers: () => fetchWithFallback(
    () => axios.get(`${API_BASE}/throttling/tiers`),
    [
      { tier: 'low', limit: 60, window: '1m' },
      { tier: 'medium', limit: 30, window: '1m' },
      { tier: 'high', limit: 10, window: '1m' }
    ]
  ),
  getRiskScores: () => fetchWithFallback(
    () => axios.get(`${API_BASE}/throttling/risk-scores`),
    [
      { ip: '192.168.1.100', score: 85 },
      { ip: '10.0.0.50', score: 72 },
      { ip: '172.16.0.20', score: 45 }
    ]
  ),
  
  // Threats
  getLiveThreats: (limit = 20) => fetchWithFallback(
    () => axios.get(`${API_BASE}/threats/live?limit=${limit}`),
    { threats: generateMockThreats() }
  ),
  getThreatBreakdown: () => fetchWithFallback(
    () => axios.get(`${API_BASE}/threats/breakdown`),
    {
      accuracy: 94.2,
      falsePositiveRate: 2.1,
      detectedToday: 47,
      lastUpdated: new Date().toISOString()
    }
  ),
  getThreatTimeline: () => fetchWithFallback(
    () => axios.get(`${API_BASE}/threats/timeline`),
    Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: Math.floor(Math.random() * 10)
    }))
  ),
  getTopAttackers: () => fetchWithFallback(
    () => axios.get(`${API_BASE}/threats/top-attackers`),
    [
      { ip: '192.168.1.100', count: 156, type: 'Brute Force' },
      { ip: '10.0.0.50', count: 89, type: 'DDoS' },
      { ip: '172.16.0.20', count: 67, type: 'SQL Injection' }
    ]
  ),
  
  // Health
  getHealth: () => fetchWithFallback(
    () => axios.get(`${API_BASE}/health`),
    {
      gateway: { status: 'online', port: 5001, uptime: '99.9%', responseTime: 45 },
      backend: { status: 'online', port: 8000, uptime: '99.8%', responseTime: 120 },
      monitorApi: { status: 'online', port: 3000, uptime: '99.9%', responseTime: 30 },
      redis: { status: 'online', port: 6379, uptime: '100%', responseTime: 5 },
      supabase: { status: 'online', port: 5432, uptime: '99.5%', responseTime: 80 }
    }
  ),
  
  // Gateway
  getGatewayStatus: () => fetchWithFallback(
    () => axios.get(`${GATEWAY_URL}/health`),
    { status: 'online', service: 'API-Gateway' }
  ),
  
  // Actions
  unbanIP: (ip) => axios.post(`${API_BASE}/actions/unban`, { ip }).then(r => r.data),
  exportThreats: () => axios.get(`${API_BASE}/actions/export-threats`, { responseType: 'blob' }),
  retrainModel: () => axios.post(`${API_BASE}/actions/retrain`).then(r => r.data),
  
  // WebSocket
  connectWebSocket: (onMessage) => {
    try {
      const ws = new WebSocket(`${MONITOR.replace('http', 'ws')}/ws`)
      
      ws.onopen = () => console.log('WebSocket connected')
      ws.onmessage = (event) => onMessage(JSON.parse(event.data))
      ws.onerror = () => console.log('WebSocket error, using polling')
      
      return ws
    } catch (error) {
      console.log('WebSocket failed, using polling fallback')
      return null
    }
  }
}
