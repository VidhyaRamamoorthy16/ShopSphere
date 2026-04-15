import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, ChevronDown } from 'lucide-react';

const Navbar = ({ user, cart }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  const cartCount = cart?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const categories = [
    'Electronics',
    'Fashion',
    'Home & Living',
    'Books',
    'Sports',
    'Beauty'
  ];

  return (
    <header>
      {/* Main Navbar */}
      <nav className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-md' : 'border-b border-gray-200'}`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-gray-900">ShopSphere</span>
              </div>
            </Link>

            {/* Search Bar - Hidden on mobile */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearch} className="w-full">
                <div className={`relative flex items-center bg-gray-100 rounded-lg transition-all duration-200 ${isSearchFocused ? 'ring-2 ring-blue-500 bg-white' : ''}`}>
                  <input
                    type="text"
                    placeholder="Search for products, brands and more..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className="w-full py-2.5 pl-4 pr-12 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 p-2 text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 lg:gap-6">
              {/* Mobile Search */}
              <button
                onClick={() => navigate('/products')}
                className="md:hidden p-2 text-gray-600 hover:text-blue-600"
              >
                <Search className="w-6 h-6" />
              </button>

              {/* Account */}
              {user ? (
                <Link
                  to="/dashboard"
                  className="hidden sm:flex items-center gap-2 p-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <User className="w-6 h-6" />
                  <span className="hidden lg:block text-sm font-medium">{user.name || 'Account'}</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 p-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <User className="w-6 h-6" />
                  <span className="hidden lg:block text-sm font-medium">Login</span>
                </Link>
              )}

              {/* Cart */}
              <Link
                to="/cart"
                className="relative flex items-center gap-2 p-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <div className="relative">
                  <ShoppingCart className="w-6 h-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </div>
                <span className="hidden lg:block text-sm font-medium">Cart</span>
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-blue-600"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Category Navigation - Desktop */}
        <div className="hidden lg:block border-t border-gray-200 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-8 h-12">
              <Link to="/products" className="flex items-center gap-1 text-gray-700 hover:text-blue-600 font-medium">
                All Categories
                <ChevronDown className="w-4 h-4" />
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  to={`/products?category=${encodeURIComponent(cat)}`}
                  className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
            <div className="container mx-auto px-4 py-4">
              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative flex items-center bg-gray-100 rounded-lg">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-3 pl-4 pr-12 bg-transparent border-none outline-none"
                  />
                  <button type="submit" className="absolute right-2 p-2 text-gray-500">
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </form>

              {/* Mobile Categories */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900 mb-2">Categories</p>
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    to={`/products?category=${encodeURIComponent(cat)}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-2 text-gray-600 hover:text-blue-600"
                  >
                    {cat}
                  </Link>
                ))}
              </div>

              {/* Mobile Account Links */}
              <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
                {user ? (
                  <>
                    <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block py-2 text-gray-600 hover:text-blue-600">
                      My Account
                    </Link>
                    <Link to="/orders" onClick={() => setIsMenuOpen(false)} className="block py-2 text-gray-600 hover:text-blue-600">
                      My Orders
                    </Link>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block py-2 text-gray-600 hover:text-blue-600">
                    Login / Register
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
