import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Activity, Globe, Shield, Zap, AlertTriangle, Server } from 'lucide-react'

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false)

  const menuItems = [
    { path: '/', icon: Activity, label: 'Overview' },
    { path: '/requests', icon: Globe, label: 'Requests' },
    { path: '/rate-limits', icon: Shield, label: 'Rate Limits' },
    { path: '/throttling', icon: Zap, label: 'Throttling' },
    { path: '/threats', icon: AlertTriangle, label: 'Threats' },
    { path: '/health', icon: Server, label: 'System Health' }
  ]

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-gray-800 border-r border-gray-700 flex-shrink-0 transition-all duration-300`}>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-white">🔒 Gateway Monitor</h1>
              <p className="text-xs text-gray-400">Port 3000</p>
            </div>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-gray-400 hover:text-white"
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      <nav className="p-2 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {!collapsed && <span className="ml-3">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
