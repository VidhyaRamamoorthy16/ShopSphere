import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Menu, X, ShoppingBag, Sun, Moon, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { cartCount } = useCart();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: 'About', path: '/about' },
    { name: 'Blog', path: '/blog' },
    { name: 'Careers', path: '/careers' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav className="glass-nav sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <ShoppingBag size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight transition-colors" style={{ color: 'var(--text-primary)' }}>
              LuxeCart
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="nav-link"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="relative w-[52px] h-7 rounded-full flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, #6d28d9, #7c3aed)'
                    : '#e5e7eb',
                  boxShadow: isDark ? '0 0 12px rgba(139,92,246,0.4)' : 'none',
                }}
              >
                {/* Icons inside track */}
                <span className="absolute left-[5px] top-1/2 -translate-y-1/2 text-[11px] select-none pointer-events-none">
                  🌙
                </span>
                <span className="absolute right-[5px] top-1/2 -translate-y-1/2 text-[11px] select-none pointer-events-none">
                  ☀️
                </span>
                {/* Thumb */}
                <span
                  className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-md flex items-center justify-center transition-all duration-300"
                  style={{
                    left: isDark ? 'calc(100% - 25px)' : '3px',
                  }}
                >
                  {isDark
                    ? <Moon size={12} className="text-indigo-600" />
                    : <Sun size={12} className="text-amber-500" />
                  }
                </span>
              </button>

              <Link to="/cart" className="relative p-2 transition-colors group" style={{ color: 'var(--text-muted)' }}>
                <ShoppingCart size={24} className="group-hover:scale-110 transition-transform hover:text-indigo-500" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
                    {cartCount}
                  </span>
                )}
              </Link>

              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  {user?.role === 'admin' ? (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      <LayoutDashboard size={18} />
                      <span className="font-bold text-sm">Admin</span>
                    </Link>
                  ) : (
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2 transition-colors hover:text-indigo-500"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <User size={20} />
                      <span className="font-medium hidden lg:block">{user?.name}</span>
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="p-2 transition-colors hover:text-red-500"
                    style={{ color: 'var(--text-faint)' }}
                    title="Logout"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="nav-link">
                    Login
                  </Link>
                  <Link to="/register" className="btn-gradient px-6 py-2">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: cart + theme toggle + hamburger */}
          <div className="md:hidden flex items-center gap-3">
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-xl transition-all hover:scale-110"
              style={{
                background: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.05)',
                color: isDark ? '#a78bfa' : '#f59e0b',
              }}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <Link to="/cart" className="relative p-2" style={{ color: 'var(--text-muted)' }}>
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="transition-colors hover:text-indigo-500"
              style={{ color: 'var(--text-muted)' }}
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {isMenuOpen && (
        <div
          className="md:hidden border-t px-4 pt-2 pb-4 space-y-1 shadow-lg"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-default)',
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="block px-3 py-3 rounded-md text-base font-medium transition-colors hover:text-indigo-500"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <div className="border-t my-2 pt-2" style={{ borderColor: 'var(--border-default)' }}>
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="block px-3 py-3 rounded-md text-base font-medium transition-colors hover:text-indigo-500"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard ({user?.name})
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-3 rounded-md text-base font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                <Link
                  to="/login"
                  className="block text-center border-2 border-indigo-500 text-indigo-500 px-4 py-2 rounded-lg font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-gradient px-4 py-2 text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
