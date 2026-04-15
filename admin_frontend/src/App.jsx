import React, { useState, useEffect, useContext, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {jwtDecode} from 'jwt-expire';

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenExpiryTime, setTokenExpiryTime] = useState(null);

  // Axios instance for admin API
  const api = axios.create({
    baseURL: 'http://localhost:3000/admin',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor to handle token expiry
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        await logout();
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  // Check token validity on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        if (decoded.exp > currentTime) {
          setUser({ username: decoded.sub });
          setTokenExpiryTime(decoded.exp * 1000);
        } else {
          localStorage.removeItem('adminToken');
        }
      } catch (error) {
        localStorage.removeItem('adminToken');
      }
    }
    setLoading(false);
  }, []);

  // Session timeout warning
  useEffect(() => {
    if (!tokenExpiryTime) return;

    const warningTime = tokenExpiryTime - (2 * 60 * 1000); // 2 minutes before expiry
    const currentTime = Date.now();

    if (currentTime < warningTime) {
      const timeout = setTimeout(() => {
        alert('Your session will expire in 2 minutes. Please save your work.');
      }, warningTime - currentTime);

      return () => clearTimeout(timeout);
    }
  }, [tokenExpiryTime]);

  // Auto logout when token expires
  useEffect(() => {
    if (!tokenExpiryTime) return;

    const timeout = setTimeout(() => {
      logout();
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
    }, tokenExpiryTime - Date.now());

    return () => clearTimeout(timeout);
  }, [tokenExpiryTime]);

  const login = async (username, password) => {
    try {
      const response = await api.post('/login', { username, password });
      const { access_token, expires_in } = response.data;
      
      localStorage.setItem('adminToken', access_token);
      
      const decoded = jwtDecode(access_token);
      setUser({ username: decoded.sub });
      setTokenExpiryTime(decoded.exp * 1000);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('adminToken');
      setUser(null);
      setTokenExpiryTime(null);
    }
  };

  const refreshToken = async () => {
    try {
      const response = await api.post('/refresh');
      const { access_token, expires_in } = response.data;
      
      localStorage.setItem('adminToken', access_token);
      
      const decoded = jwtDecode(access_token);
      setTokenExpiryTime(decoded.exp * 1000);
      
      return true;
    } catch (error) {
      await logout();
      return false;
    }
  };

  const value = {
    user,
    loading,
    api,
    login,
    logout,
    refreshToken,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Login Component
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-400">Intelligent API Gateway Control</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Layout Component
const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Rate Limits', href: '/rate-limits', icon: '⚡' },
    { name: 'Blocklist', href: '/blocklist', icon: '🚫' },
    { name: 'ML Model', href: '/ml-model', icon: '🤖' },
    { name: 'Logs', href: '/logs', icon: '📝' },
    { name: 'Middleware', href: '/middleware', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 min-h-screen">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white">Admin Panel</h2>
          <p className="text-gray-400 text-sm mt-1">{user?.username}</p>
        </div>
        
        <nav className="mt-6">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                location.pathname === item.href
                  ? 'bg-gray-900 text-white border-r-4 border-blue-500'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </a>
          ))}
        </nav>

        <div className="absolute bottom-0 w-64 p-6">
          <button
            onClick={logout}
            className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 shadow-sm">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-semibold text-white">
              {navigation.find(item => item.href === location.pathname)?.name || 'Admin Panel'}
            </h1>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { api } = useAuth();
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthResponse, statsResponse] = await Promise.all([
          api.get('/system/health'),
          api.get('/traffic/stats?timeframe=1h'),
        ]);
        
        setHealth(healthResponse.data);
        setStats(statsResponse.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, [api]);

  if (loading) {
    return <div className="text-white">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-2">System Status</h3>
          <p className={`text-2xl font-bold ${
            health?.status === 'healthy' ? 'text-green-400' : 'text-red-400'
          }`}>
            {health?.status || 'Unknown'}
          </p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-2">Requests/sec</h3>
          <p className="text-2xl font-bold text-blue-400">
            {stats?.requests_per_second?.toFixed(2) || '0'}
          </p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-2">Blocked Requests</h3>
          <p className="text-2xl font-bold text-red-400">
            {stats?.blocked_requests || '0'}
          </p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-2">Avg Threat Score</h3>
          <p className="text-2xl font-bold text-yellow-400">
            {(stats?.threat_score_avg || 0).toFixed(3)}
          </p>
        </div>
      </div>

      {/* System Metrics */}
      {health && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">System Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-400">CPU Usage</p>
              <p className="text-xl font-semibold text-white">{health.system?.cpu_percent}%</p>
            </div>
            <div>
              <p className="text-gray-400">Memory Usage</p>
              <p className="text-xl font-semibold text-white">{health.system?.memory_percent}%</p>
            </div>
            <div>
              <p className="text-gray-400">Disk Usage</p>
              <p className="text-xl font-semibold text-white">{health.system?.disk_percent}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Top IPs */}
      {stats?.top_ips && Object.keys(stats.top_ips).length > 0 && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Top IPs by Request Count</h3>
          <div className="space-y-2">
            {Object.entries(stats.top_ips).slice(0, 5).map(([ip, count]) => (
              <div key={ip} className="flex justify-between text-white">
                <span>{ip}</span>
                <span>{count} requests</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Rate Limits Component
const RateLimits = () => {
  const { api } = useAuth();
  const [configs, setConfigs] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [api]);

  const fetchData = async () => {
    try {
      const [configsResponse, statsResponse] = await Promise.all([
        api.get('/rate-limits'),
        api.get('/rate-limits/stats'),
      ]);
      
      setConfigs(configsResponse.data.configs);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Failed to fetch rate limits data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (tier, newConfig) => {
    try {
      await api.put('/rate-limits', {
        tier,
        ...newConfig
      });
      
      setEditing(null);
      fetchData(); // Refresh data
    } catch (error) {
      alert('Failed to update rate limits: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleResetIP = async (ip) => {
    if (!confirm(`Reset rate limit counter for IP ${ip}?`)) return;
    
    try {
      await api.post(`/rate-limits/reset/${ip}`);
      fetchData();
    } catch (error) {
      alert('Failed to reset IP: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return <div className="text-white">Loading rate limits...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Rate Limit Configuration</h3>
        <div className="space-y-4">
          {Object.entries(configs).map(([tier, config]) => (
            <div key={tier} className="border border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-white font-medium capitalize">{tier}</h4>
                <button
                  onClick={() => setEditing(editing === tier ? null : tier)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  {editing === tier ? 'Cancel' : 'Edit'}
                </button>
              </div>
              
              {editing === tier ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-gray-400 text-sm">Requests per window</label>
                    <input
                      type="number"
                      value={config.requests_per_window}
                      onChange={(e) => setConfigs({
                        ...configs,
                        [tier]: { ...config, requests_per_window: parseInt(e.target.value) }
                      })}
                      className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Window seconds</label>
                    <input
                      type="number"
                      value={config.window_seconds}
                      onChange={(e) => setConfigs({
                        ...configs,
                        [tier]: { ...config, window_seconds: parseInt(e.target.value) }
                      })}
                      className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <button
                    onClick={() => handleUpdate(tier, config)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="text-gray-300">
                  <p>Requests: {config.requests_per_window} per {config.window_seconds}s</p>
                  <p>Burst capacity: {config.burst_capacity}</p>
                  <p>Refill rate: {config.refill_rate}/s</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {stats?.top_ips && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Top IPs Hitting Limits</h3>
          <div className="space-y-2">
            {stats.top_ips.map((ip, index) => (
              <div key={index} className="flex justify-between items-center text-white">
                <div>
                  <span>{ip.ip}</span>
                  <span className="ml-3 text-gray-400">Tier: {ip.tier}</span>
                  <span className="ml-3 text-red-400">Blocked: {ip.blocked_count}</span>
                </div>
                <button
                  onClick={() => handleResetIP(ip.ip)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Reset
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Blocklist Component
const Blocklist = () => {
  const { api } = useAuth();
  const [blocklist, setBlocklist] = useState({ banned_ips: [], whitelisted_ips: [] });
  const [loading, setLoading] = useState(true);
  const [showBanForm, setShowBanForm] = useState(false);
  const [showWhitelistForm, setShowWhitelistForm] = useState(false);

  useEffect(() => {
    fetchBlocklist();
    const interval = setInterval(fetchBlocklist, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [api]);

  const fetchBlocklist = async () => {
    try {
      const response = await api.get('/blocklist');
      setBlocklist(response.data);
    } catch (error) {
      console.error('Failed to fetch blocklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (ip, duration, reason) => {
    try {
      await api.post('/blocklist/ban', { ip, duration_hours: duration, reason });
      setShowBanForm(false);
      fetchBlocklist();
    } catch (error) {
      alert('Failed to ban IP: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleUnban = async (ip) => {
    if (!confirm(`Unban IP ${ip}?`)) return;
    
    try {
      await api.delete(`/blocklist/ban/${ip}`);
      fetchBlocklist();
    } catch (error) {
      alert('Failed to unban IP: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleWhitelist = async (ip, reason) => {
    try {
      await api.post('/blocklist/whitelist', { ip, reason });
      setShowWhitelistForm(false);
      fetchBlocklist();
    } catch (error) {
      alert('Failed to whitelist IP: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleRemoveWhitelist = async (ip) => {
    if (!confirm(`Remove ${ip} from whitelist?`)) return;
    
    try {
      await api.delete(`/blocklist/whitelist/${ip}`);
      fetchBlocklist();
    } catch (error) {
      alert('Failed to remove from whitelist: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return <div className="text-white">Loading blocklist...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Ban Form */}
      {showBanForm && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Ban IP</h3>
          <BanForm onSubmit={handleBan} onCancel={() => setShowBanForm(false)} />
        </div>
      )}

      {/* Whitelist Form */}
      {showWhitelistForm && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Whitelist IP</h3>
          <WhitelistForm onSubmit={handleWhitelist} onCancel={() => setShowWhitelistForm(false)} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => setShowBanForm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Ban IP
        </button>
        <button
          onClick={() => setShowWhitelistForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Whitelist IP
        </button>
      </div>

      {/* Banned IPs */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">
          Banned IPs ({blocklist.total_banned})
        </h3>
        <div className="space-y-2">
          {blocklist.banned_ips.map((ban) => (
            <div key={ban.ip} className="flex justify-between items-center text-white p-3 border border-gray-700 rounded">
              <div>
                <p className="font-medium">{ban.ip}</p>
                <p className="text-sm text-gray-400">Reason: {ban.reason}</p>
                <p className="text-sm text-gray-400">Banned: {new Date(ban.banned_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => handleUnban(ban.ip)}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                Unban
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Whitelisted IPs */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">
          Whitelisted IPs ({blocklist.total_whitelisted})
        </h3>
        <div className="space-y-2">
          {blocklist.whitelisted_ips.map((whitelist) => (
            <div key={whitelist.ip} className="flex justify-between items-center text-white p-3 border border-gray-700 rounded">
              <div>
                <p className="font-medium">{whitelist.ip}</p>
                <p className="text-sm text-gray-400">Reason: {whitelist.reason}</p>
                <p className="text-sm text-gray-400">Added: {new Date(whitelist.added_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => handleRemoveWhitelist(whitelist.ip)}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Ban Form Component
const BanForm = ({ onSubmit, onCancel }) => {
  const [ip, setIp] = useState('');
  const [duration, setDuration] = useState(1);
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(ip, duration, reason);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">IP Address</label>
        <input
          type="text"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Duration (hours)</label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
          min="1"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          rows="3"
          required
        />
      </div>
      <div className="flex gap-4">
        <button
          type="submit"
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Ban IP
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// Whitelist Form Component
const WhitelistForm = ({ onSubmit, onCancel }) => {
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(ip, reason);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">IP Address or CIDR</label>
        <input
          type="text"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          placeholder="192.168.1.1 or 192.168.1.0/24"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Reason (optional)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          rows="3"
        />
      </div>
      <div className="flex gap-4">
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Whitelist IP
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// Placeholder components for other routes
const MLModel = () => {
  const { api } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ml/status').then(response => {
      setStatus(response.data);
      setLoading(false);
    }).catch(error => {
      console.error('Failed to fetch ML status:', error);
      setLoading(false);
    });
  }, [api]);

  if (loading) return <div className="text-white">Loading ML status...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">ML Model Status</h3>
        <div className="space-y-2 text-white">
          <p>Model Loaded: {status?.model_loaded ? 'Yes' : 'No'}</p>
          <p>Model Version: {status?.model_version}</p>
          <p>Total Predictions: {status?.total_predictions}</p>
          <p>Threats Detected: {status?.threats_detected}</p>
          <p>Detection Rate: {(status?.detection_rate * 100).toFixed(2)}%</p>
        </div>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Actions</h3>
        <div className="space-y-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Retrain Model
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            View Recent Predictions
          </button>
        </div>
      </div>
    </div>
  );
};

const Logs = () => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-lg font-medium text-white mb-4">Request Logs</h3>
      <p className="text-gray-400">Log viewer component would be implemented here with filtering and pagination.</p>
    </div>
  );
};

const Middleware = () => {
  const { api } = useAuth();
  const [modules, setModules] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/middleware/status').then(response => {
      setModules(response.data.modules);
      setLoading(false);
    }).catch(error => {
      console.error('Failed to fetch middleware status:', error);
      setLoading(false);
    });
  }, [api]);

  const toggleModule = async (moduleName, enabled) => {
    try {
      await api.put('/middleware/toggle', { module: moduleName, enabled });
      setModules({ ...modules, [moduleName]: enabled });
    } catch (error) {
      alert('Failed to toggle module: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) return <div className="text-white">Loading middleware status...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Middleware Modules</h3>
        <div className="space-y-4">
          {Object.entries(modules).map(([module, enabled]) => (
            <div key={module} className="flex justify-between items-center text-white">
              <span className="capitalize">{module.replace('_', ' ')}</span>
              <button
                onClick={() => toggleModule(module, !enabled)}
                className={`px-4 py-2 rounded ${
                  enabled 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/rate-limits" element={<RateLimits />} />
                  <Route path="/blocklist" element={<Blocklist />} />
                  <Route path="/ml-model" element={<MLModel />} />
                  <Route path="/logs" element={<Logs />} />
                  <Route path="/middleware" element={<Middleware />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
