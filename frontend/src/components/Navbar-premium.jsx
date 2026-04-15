import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, ChevronDown, Menu, X } from 'lucide-react';

const Navbar = ({ user, cart }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  const cartCount = cart?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
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
    'Electronics', 'Fashion', 'Home & Kitchen', 'Books', 'Sports', 'Beauty', 'Toys', 'Grocery'
  ];

  return (
    <>
      {/* Main Navbar */}
      <nav className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-md' : ''}`}>
        <div className="bg-[#2874F0]">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14 lg:h-16 gap-4">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-1 flex-shrink-0">
                <span className="text-white font-bold text-xl italic tracking-tight">ShopSphere</span>
                <span className="text-[#FFE11B] text-xs font-medium hidden sm:block">Plus</span>
              </Link>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl">
                <div className="relative w-full flex">
                  <input
                    type="text"
                    placeholder="Search for products, brands and more..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2.5 pl-4 pr-24 bg-white text-gray-800 placeholder-gray-400 rounded-sm text-sm focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="absolute right-0 top-0 h-full px-4 text-[#2874F0] hover:bg-gray-100 rounded-r-sm transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </form>

              {/* Right Actions */}
              <div className="flex items-center gap-1 lg:gap-4">
                {/* Login */}
                {user ? (
                  <Link to="/dashboard" className="flex items-center gap-1 px-3 py-2 text-white hover:bg-white/10 rounded-sm transition-colors">
                    <span className="font-medium text-sm">{user.name?.split(' ')[0] || 'Account'}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link to="/login" className="flex items-center gap-1 px-4 py-2 bg-white text-[#2874F0] font-medium text-sm rounded-sm hover:bg-gray-100 transition-colors">
                    Login
                  </Link>
                )}

                {/* Cart */}
                <Link to="/cart" className="flex items-center gap-1 px-3 py-2 text-white hover:bg-white/10 rounded-sm transition-colors">
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#FF6161] text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-sm hidden lg:block">Cart</span>
                </Link>

                {/* Mobile Menu */}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="lg:hidden p-2 text-white hover:bg-white/10 rounded-sm"
                >
                  {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Category Menu */}
        <div className="hidden lg:block bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-10 text-sm">
              {categories.map((cat) => (
                <Link
                  key={cat}
                  to={`/products?category=${encodeURIComponent(cat)}`}
                  className="flex items-center gap-1 text-gray-700 hover:text-[#2874F0] font-medium transition-colors px-2"
                >
                  {cat}
                  <ChevronDown className="w-3 h-3" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg">
            <div className="container mx-auto px-4 py-4">
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-3 pl-4 pr-12 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2874F0]"
                  />
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2874F0]">
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </form>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    to={`/products?category=${encodeURIComponent(cat)}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
