import React, { useState, useEffect, useCallback } from 'react';
import { 
  Line, 
  Pie, 
  Bar, 
  Doughnut 
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import axios from 'axios';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Dashboard main component
const SecurityDashboard = () => {
  const [stats, setStats] = useState({
    total_requests: 0,
    blocked_count: 0,
    flagged_count: 0,
    safe_count: 0,
    requests_per_minute: [],
    attack_breakdown: { sqli: 0, xss: 0, bruteforce: 0 },
    top_ips: [],
    avg_response_ms: 0,
    detection_accuracy: 0.92,
    false_positive_rate: 0.08
  });
  
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  
  // Fetch dashboard data every 5 seconds (as per paper requirements)
  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await axios.get('/admin/dashboard/stats');
      setStats(response.data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      setError('Failed to fetch dashboard data');
    }
  }, []);
  
  useEffect(() => {
    // Initial fetch
    fetchDashboardStats();
    
    // Poll every 5 seconds (paper requirement)
    const interval = setInterval(fetchDashboardStats, 5000);
    
    return () => clearInterval(interval);
  }, [fetchDashboardStats]);
  
  // Chart data configurations
  const requestsPerMinuteData = {
    labels: stats.requests_per_minute.map((_, index) => {
      const minutesAgo = 30 - index;
      return `${minutesAgo}m ago`;
    }),
    datasets: [
      {
        label: 'Requests per Minute',
        data: stats.requests_per_minute,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'rgb(255, 255, 255)',
        pointRadius: 3,
        pointHoverRadius: 6
      }
    ]
  };
  
  const requestsPerMinuteOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Requests per Minute (Last 30 Minutes)',
        font: { size: 16, weight: 'bold' }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      },
      x: {
        grid: { display: false }
      }
    }
  };
  
  const threatBreakdownData = {
    labels: ['Safe', 'Flagged', 'Blocked'],
    datasets: [
      {
        data: [stats.safe_count, stats.flagged_count, stats.blocked_count],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // Green for safe
          'rgba(251, 191, 36, 0.8)',   // Yellow for flagged
          'rgba(239, 68, 68, 0.8)'     // Red for blocked
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 2
      }
    ]
  };
  
  const threatBreakdownOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      title: {
        display: true,
        text: 'Request Classification',
        font: { size: 16, weight: 'bold' }
      }
    }
  };
  
  const attackTypeData = {
    labels: ['SQL Injection', 'XSS', 'Brute Force'],
    datasets: [
      {
        label: 'Attack Attempts',
        data: [
          stats.attack_breakdown.sqli,
          stats.attack_breakdown.xss,
          stats.attack_breakdown.bruteforce
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(59, 130, 246, 0.8)'
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(168, 85, 247)',
          'rgb(59, 130, 246)'
        ],
        borderWidth: 2
      }
    ]
  };
  
  const attackTypeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Attack Type Breakdown',
        font: { size: 16, weight: 'bold' }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      },
      x: {
        grid: { display: false }
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🔒 Security Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time threat detection and rate limiting metrics
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Loading...'}
            </div>
            <div className="text-xs text-gray-400">
              Updates every 5 seconds
            </div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Detection Accuracy */}
        <MetricCard
          title="Detection Accuracy"
          value={`${(stats.detection_accuracy * 100).toFixed(1)}%`}
          subtitle="Target: 92%"
          color="green"
          icon="🎯"
        />
        
        {/* False Positive Rate */}
        <MetricCard
          title="False Positive Rate"
          value={`${(stats.false_positive_rate * 100).toFixed(1)}%`}
          subtitle="Target: <8%"
          color={stats.false_positive_rate < 0.08 ? "green" : "red"}
          icon="⚠️"
        />
        
        {/* Average Response Time */}
        <MetricCard
          title="Avg Response Time"
          value={`${stats.avg_response_ms.toFixed(0)}ms`}
          subtitle="Target: <200ms"
          color={stats.avg_response_ms < 200 ? "green" : "yellow"}
          icon="⚡"
        />
        
        {/* Total Requests */}
        <MetricCard
          title="Total Requests"
          value={stats.total_requests.toLocaleString()}
          subtitle="Today"
          color="blue"
          icon="📊"
        />
      </div>
      
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Requests per Minute Line Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-80">
            <Line data={requestsPerMinuteData} options={requestsPerMinuteOptions} />
          </div>
        </div>
        
        {/* Threat Classification Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-80">
            <Pie data={threatBreakdownData} options={threatBreakdownOptions} />
          </div>
        </div>
      </div>
      
      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Attack Type Breakdown Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-80">
            <Bar data={attackTypeData} options={attackTypeOptions} />
          </div>
        </div>
        
        {/* Top IPs Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🌐 Top 10 IPs by Request Count
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Requests</th>
                  <th className="px-4 py-3">Risk Score</th>
                  <th className="px-4 py-3">Tier</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_ips.map((ip, index) => (
                  <tr key={ip.ip} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {index + 1}. {ip.ip}
                    </td>
                    <td className="px-4 py-3">{ip.requests.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <RiskScoreBadge score={ip.risk_score} />
                    </td>
                    <td className="px-4 py-3">
                      <TierBadge tier={ip.tier} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Intelligent API Gateway | Conference Paper Implementation | 
          Model: RandomForest + LogisticRegression Hybrid
        </p>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, subtitle, color, icon }) => {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800'
  };
  
  return (
    <div className={`${colorClasses[color]} border rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
};

// Risk Score Badge Component
const RiskScoreBadge = ({ score }) => {
  let colorClass = 'bg-green-100 text-green-800';
  let label = 'Low';
  
  if (score >= 70) {
    colorClass = 'bg-red-100 text-red-800';
    label = 'High';
  } else if (score >= 30) {
    colorClass = 'bg-yellow-100 text-yellow-800';
    label = 'Medium';
  }
  
  return (
    <div className="flex items-center">
      <span className={`${colorClass} text-xs font-medium px-2.5 py-0.5 rounded`}>
        {label}
      </span>
      <span className="ml-2 text-xs text-gray-500">({score.toFixed(1)})</span>
    </div>
  );
};

// Tier Badge Component
const TierBadge = ({ tier }) => {
  const tierClasses = {
    normal: 'bg-green-100 text-green-800',
    restricted: 'bg-yellow-100 text-yellow-800',
    blocked: 'bg-red-100 text-red-800'
  };
  
  const tierLabels = {
    normal: 'Normal (100/min)',
    restricted: 'Restricted (30/min)',
    blocked: 'Blocked (0/min)'
  };
  
  return (
    <span className={`${tierClasses[tier] || 'bg-gray-100 text-gray-800'} text-xs font-medium px-2.5 py-0.5 rounded`}>
      {tierLabels[tier] || tier}
    </span>
  );
};

export default SecurityDashboard;
