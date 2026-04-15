import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Activity,
  Shield,
  AlertTriangle,
  Server,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState({ status: 'online' });
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Overview' },
    { path: '/requests', icon: Activity, label: 'Live Requests' },
    { path: '/rate-limits', icon: Shield, label: 'Rate Limits' },
    { path: '/threats', icon: AlertTriangle, label: 'Threat Detection' },
    { path: '/health', icon: Server, label: 'System Health' },
  ];

  useEffect(() => {
    const checkGateway = async () => {
      try {
        const status = await api.getGatewayStatus();
        setGatewayStatus(status);
      } catch (error) {
        console.log('Gateway check error');
      }
    };
    checkGateway();
    const interval = setInterval(checkGateway, 30000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-[#1A1A2E] border-r border-[#2D2D4E] z-50 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#2D2D4E]">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#6C63FF] to-[#9C88FF] rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm bg-gradient-to-r from-[#6C63FF] to-[#9C88FF] bg-clip-text text-transparent">Gateway</span>
              <span className="font-bold text-sm text-[#EAEAF5]">Monitor</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 mx-auto bg-gradient-to-br from-[#6C63FF] to-[#9C88FF] rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg hover:bg-[#2D2D4E] transition-colors ${collapsed ? 'mx-auto' : ''}`}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-[#8888AA]" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-[#8888AA]" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
              isActive(item.path)
                ? 'bg-gradient-to-r from-[#6C63FF]/20 to-transparent border-l-2 border-[#6C63FF] text-[#6C63FF]'
                : 'text-[#8888AA] hover:bg-[#2D2D4E]/50 hover:text-[#EAEAF5]'
            }`}
          >
            <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-[#6C63FF]' : ''}`} />
            {!collapsed && (
              <span className="font-medium text-sm">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Gateway Status */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#2D2D4E]">
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${gatewayStatus.status === 'online' ? 'bg-[#00D4AA]' : 'bg-[#FF4757]'}`} />
            {gatewayStatus.status === 'online' && (
              <div className="absolute inset-0 w-2.5 h-2.5 bg-[#00D4AA] rounded-full animate-ping opacity-75" />
            )}
          </div>
          {!collapsed && (
            <div>
              <span className="text-xs text-[#8888AA]">Gateway {gatewayStatus.status === 'online' ? 'Online' : 'Offline'}</span>
              <span className="block text-[10px] text-[#6C63FF]">v2.0.1</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
