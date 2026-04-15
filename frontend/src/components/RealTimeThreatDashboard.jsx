import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Shop, AlertTriangle, Activity, Globe, Ban, TrendingUp,
  Clock, Users, Cpu, Wifi, AlertCircle, CheckCircle, XCircle
} from 'lucide-react';

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#8b5cf6',
  dark: '#1f2937'
};

const THREAT_LEVEL_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444'
};

const RealTimeThreatDashboard = () => {
  // WebSocket connection
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  
  // Dashboard state
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [systemStatus, setSystemStatus] = useState('online');
  
  // Real-time metrics
  const [metrics, setMetrics] = useState({
    requestsPerSecond: 0,
    blockedRequests: 0,
    allowedRequests: 0,
    activeConnections: 0,
    threatScore: 0
  });
  
  // Time series data
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [maxDataPoints] = useState(60); // Keep last 60 data points
  
  // Attack data
  const [topAttackingIPs, setTopAttackingIPs] = useState([]);
  const [attackTypeBreakdown, setAttackTypeBreakdown] = useState([]);
  const [rateLimitHits, setRateLimitHits] = useState([]);
  const [anomalyDistribution, setAnomalyDistribution] = useState([]);
  
  // Alerts
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(true);
  
  // Initialize WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5001/ws/dashboard';
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setSystemStatus('online');
        
        // Clear any pending reconnect timeout
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setSystemStatus('offline');
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectWebSocket();
        }, 5000);
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setSystemStatus('error');
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setSystemStatus('error');
    }
  }, []);
  
  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((data) => {
    setLastUpdate(new Date());
    
    switch (data.type) {
      case 'metrics':
        setMetrics(prev => ({
          ...prev,
          ...data.metrics
        }));
        break;
        
      case 'time_series':
        setTimeSeriesData(prev => {
          const newData = [...prev, {
            timestamp: data.timestamp,
            ...data.data
          }];
          return newData.slice(-maxDataPoints);
        });
        break;
        
      case 'top_ips':
        setTopAttackingIPs(data.ips);
        break;
        
      case 'attack_types':
        setAttackTypeBreakdown(data.types);
        break;
        
      case 'rate_limits':
        setRateLimitHits(data.hits);
        break;
        
      case 'anomaly_distribution':
        setAnomalyDistribution(data.distribution);
        break;
        
      case 'alert':
        setAlerts(prev => [data.alert, ...prev].slice(0, 50)); // Keep last 50 alerts
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  }, [maxDataPoints]);
  
  // Initialize WebSocket connection on mount
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [connectWebSocket]);
  
  // Format time for charts
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Get threat level color
  const getThreatLevelColor = (level) => {
    return THREAT_LEVEL_COLORS[level] || COLORS.info;
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{`Time: ${formatTime(label)}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shop className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Threat Detection Dashboard</h1>
              <p className="text-sm text-gray-500">Real-time security monitoring</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {systemStatus === 'online' ? 'Connected' : 
                 systemStatus === 'offline' ? 'Disconnected' : 'Error'}
              </span>
            </div>
            
            {/* Last Update */}
            {lastUpdate && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard
          title="Requests/sec"
          value={metrics.requestsPerSecond.toFixed(1)}
          icon={Activity}
          color={COLORS.primary}
          trend={null}
        />
        <MetricCard
          title="Blocked"
          value={metrics.blockedRequests}
          icon={Ban}
          color={COLORS.danger}
          trend={null}
        />
        <MetricCard
          title="Allowed"
          value={metrics.allowedRequests}
          icon={CheckCircle}
          color={COLORS.success}
          trend={null}
        />
        <MetricCard
          title="Connections"
          value={metrics.activeConnections}
          icon={Users}
          color={COLORS.info}
          trend={null}
        />
        <MetricCard
          title="Threat Score"
          value={(metrics.threatScore * 100).toFixed(1)}
          icon={AlertTriangle}
          color={getThreatLevelColor(
            metrics.threatScore > 0.8 ? 'critical' :
            metrics.threatScore > 0.6 ? 'high' :
            metrics.threatScore > 0.3 ? 'medium' : 'low'
          )}
          trend={null}
          suffix="%"
        />
      </div>
      
      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Requests Per Second Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Requests Per Second</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime}
                interval="preserveStartEnd"
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="requestsPerSecond"
                stroke={COLORS.primary}
                fill={COLORS.primary}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Blocked vs Allowed Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Blocked vs Allowed Requests</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime}
                interval="preserveStartEnd"
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="blockedRequests"
                stroke={COLORS.danger}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="allowedRequests"
                stroke={COLORS.success}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Top Attacking IPs */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Attacking IPs</h3>
          <div className="space-y-3">
            {topAttackingIPs.slice(0, 10).map((ip, index) => (
              <div key={ip.ip} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{ip.ip}</div>
                    <div className="text-xs text-gray-500">{ip.country || 'Unknown'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{ip.requests}</div>
                  <div className="text-xs" style={{ color: getThreatLevelColor(ip.threatLevel) }}>
                    {(ip.threatScore * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Attack Type Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attack Types</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={attackTypeBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="type" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill={COLORS.danger} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Anomaly Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Threat Level Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={anomalyDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {anomalyDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getThreatLevelColor(entry.level)} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Rate Limit Hits */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Limit Hits</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={rateLimitHits}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tier" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="hits" fill={COLORS.warning} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Alerts Panel */}
      {showAlerts && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Security Alerts</h3>
            <button
              onClick={() => setShowAlerts(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Hide
            </button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>No security alerts</p>
              </div>
            ) : (
              alerts.map((alert, index) => (
                <AlertItem key={index} alert={alert} />
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Hidden Alerts Toggle */}
      {!showAlerts && alerts.length > 0 && (
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setShowAlerts(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            {alerts.length} New Alerts
          </button>
        </div>
      )}
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, icon: Icon, color, trend, suffix = '' }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value}{suffix}
          </p>
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );
};

// Alert Item Component
const AlertItem = ({ alert }) => {
  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'medium':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
    }
  };
  
  const getAlertColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'high':
        return 'border-orange-200 bg-orange-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };
  
  return (
    <div className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}>
      <div className="flex items-start gap-3">
        {getAlertIcon(alert.severity)}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900">{alert.title}</p>
            <p className="text-xs text-gray-500">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
          {alert.ip && (
            <p className="text-xs text-gray-500 mt-1">IP: {alert.ip}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTimeThreatDashboard;
