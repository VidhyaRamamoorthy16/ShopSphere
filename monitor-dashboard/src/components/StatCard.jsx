import React from 'react'

const StatCard = ({ title, value, icon: Icon, color }) => {
  const colors = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500'
  }

  return (
    <div className="card">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colors[color]} bg-opacity-20`}>
          <Icon className={`w-6 h-6 text-${color}-400`} style={{ color: color === 'blue' ? '#60a5fa' : color === 'red' ? '#f87171' : color === 'orange' ? '#fb923c' : color === 'green' ? '#4ade80' : color === 'purple' ? '#c084fc' : '#facc15' }} />
        </div>
        <div className="ml-4">
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-sm text-gray-400">{title}</div>
        </div>
      </div>
    </div>
  )
}

export default StatCard
