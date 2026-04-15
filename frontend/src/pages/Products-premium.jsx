import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Star, Heart, ShoppingCart, Filter, ChevronDown, Grid, List } from 'lucide-react';

const Products = ({ addToCart }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('relevance');
  
  const searchQuery = searchParams.get('search') || '';
  const categoryFilter = searchParams.get('category') || '';

  // Mock products data
  const mockProducts = [
    { id: 1, name: 'Samsung Galaxy S24 Ultra 5G', brand: 'Samsung', category: 'Electronics', price: 129999, originalPrice: 149999, discount: 13, rating: 4.8, reviews: 1247, image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400' },
    { id: 2, name: 'Sony WH-1000XM5 Wireless Headphones', brand: 'Sony', category: 'Electronics', price: 24999, originalPrice: 34999, discount: 29, rating: 4.7, reviews: 892, image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400' },
    { id: 3, name: 'Apple MacBook Air M2', brand: 'Apple', category: 'Electronics', price: 99900, originalPrice: 119900, discount: 17, rating: 4.9, reviews: 2156, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=400' },
    { id: 4, name: 'Nike Air Max 270 Running Shoes', brand: 'Nike', category: 'Fashion', price: 7499, originalPrice: 12999, discount: 42, rating: 4.6, reviews: 563, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
    { id: 5, name: 'iPhone 15 Pro Max 256GB', brand: 'Apple', category: 'Electronics', price: 159900, originalPrice: 179900, discount: 11, rating: 4.9, reviews: 3421, image: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=400' },
    { id: 6, name: 'LG 55 inch OLED Smart TV', brand: 'LG', category: 'Electronics', price: 89999, originalPrice: 129999, discount: 31, rating: 4.8, reviews: 892, image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400' },
    { id: 7, name: 'Canon EOS R6 Mirrorless Camera', brand: 'Canon', category: 'Electronics', price: 215999, originalPrice: 249999, discount: 14, rating: 4.7, reviews: 445, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400' },
    { id: 8, name: 'Adidas Ultraboost 22 Shoes', brand: 'Adidas', category: 'Fashion', price: 8999, originalPrice: 15999, discount: 44, rating: 4.6, reviews: 1234, image: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=400' },
    { id: 9, name: 'Dyson V15 Detect Vacuum', brand: 'Dyson', category: 'Home & Kitchen', price: 54900, originalPrice: 64900, discount: 15, rating: 4.8, reviews: 678, image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400' },
    { id: 10, name: 'Samsung Odyssey G9 Monitor', brand: 'Samsung', category: 'Electronics', price: 89999, originalPrice: 119999, discount: 25, rating: 4.7, reviews: 334, image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400' },
    { id: 11, name: 'Kindle Paperwhite 11th Gen', brand: 'Amazon', category: 'Electronics', price: 10999, originalPrice: 14999, discount: 27, rating: 4.8, reviews: 5678, image: 'https://images.unsplash.com/photo-1592496001020-d31bd830651f?w=400' },
    { id: 12, name: 'Apple Watch Series 9', brand: 'Apple', category: 'Electronics', price: 41900, originalPrice: 45900, discount: 9, rating: 4.8, reviews: 2134, image: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400' },
    { id: 13, name: 'Nike Sportswear T-Shirt', brand: 'Nike', category: 'Fashion', price: 1499, originalPrice: 2499, discount: 40, rating: 4.5, reviews: 892, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
    { id: 14, name: 'HP Pavilion Laptop 15', brand: 'HP', category: 'Electronics', price: 54999, originalPrice: 69999, discount: 21, rating: 4.6, reviews: 1567, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400' },
    { id: 15, name: 'Sony PlayStation 5 Console', brand: 'Sony', category: 'Electronics', price: 49990, originalPrice: 59990, discount: 17, rating: 4.9, reviews: 3421, image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400' },
    { id: 16, name: 'KitchenAid Stand Mixer', brand: 'KitchenAid', category: 'Home & Kitchen', price: 42999, originalPrice: 52999, discount: 19, rating: 4.8, reviews: 892, image: 'https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?w=400' },
    { id: 17, name: 'Ray-Ban Aviator Sunglasses', brand: 'Ray-Ban', category: 'Fashion', price: 8990, originalPrice: 12990, discount: 31, rating: 4.7, reviews: 2234, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400' },
    { id: 18, name: 'Bose SoundLink Speaker', brand: 'Bose', category: 'Electronics', price: 16900, originalPrice: 21900, discount: 23, rating: 4.8, reviews: 1234, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400' },
    { id: 19, name: 'Puma Running Shoes', brand: 'Puma', category: 'Fashion', price: 3999, originalPrice: 6999, discount: 43, rating: 4.5, reviews: 667, image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400' },
    { id: 20, name: 'Instant Pot Duo 7-in-1', brand: 'Instant Pot', category: 'Home & Kitchen', price: 7999, originalPrice: 11999, discount: 33, rating: 4.7, reviews: 4456, image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400' },
  ];

  useEffect(() => {
    setLoading(true);
    // Simulate API fetch
    setTimeout(() => {
      let filtered = [...mockProducts];
      
      if (searchQuery) {
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.brand.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      if (categoryFilter) {
        filtered = filtered.filter(p => p.category === categoryFilter);
      }

      // Sort products
      switch (sortBy) {
        case 'price-low':
          filtered.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          filtered.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          filtered.sort((a, b) => b.rating - a.rating);
          break;
        case 'discount':
          filtered.sort((a, b) => b.discount - a.discount);
          break;
        default:
          // relevance - keep default order
      }

      setProducts(filtered);
      setLoading(false);
    }, 500);
  }, [searchQuery, categoryFilter, sortBy]);

  const filters = [
    { name: 'Category', options: ['Electronics', 'Fashion', 'Home & Kitchen', 'Books', 'Sports', 'Beauty'] },
    { name: 'Price', options: ['Under ₹1000', '₹1000 - ₹5000', '₹5000 - ₹10000', '₹10000 - ₹50000', 'Above ₹50000'] },
    { name: 'Brand', options: ['Samsung', 'Apple', 'Sony', 'Nike', 'Adidas', 'HP', 'Canon'] },
    { name: 'Rating', options: ['4★ & above', '3★ & above'] },
    { name: 'Discount', options: ['50% or more', '40% or more', '30% or more', '20% or more'] },
  ];

  return (
    <div className="min-h-screen bg-[#f1f3f6] py-4">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-600 mb-4">
          <Link to="/" className="hover:text-[#2874F0]">Home</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-900">
            {searchQuery ? `Search: "${searchQuery}"` : categoryFilter || 'All Products'}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sidebar Filters */}
          <aside className="lg:w-60 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm sticky top-20">
              <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="font-semibold">Filters</span>
                </div>
              </div>
              
              {filters.map((filter) => (
                <div key={filter.name} className="border-b last:border-0">
                  <div className="p-4">
                    <h3 className="font-medium text-sm mb-3">{filter.name}</h3>
                    <div className="space-y-2">
                      {filter.options.map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer hover:text-[#2874F0]">
                          <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#2874F0] focus:ring-[#2874F0]" />
                          <span className="text-sm text-gray-600">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {searchQuery ? `Search Results for "${searchQuery}"` : categoryFilter || 'All Products'}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {loading ? 'Loading...' : `${products.length} results found`}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sort By:</span>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="appearance-none bg-white border border-gray-300 rounded px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#2874F0]"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="rating">Rating</option>
                        <option value="discount">Discount</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* View Mode */}
                  <div className="hidden sm:flex items-center border border-gray-300 rounded">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 ${viewMode === 'grid' ? 'bg-[#2874F0] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 ${viewMode === 'list' ? 'bg-[#2874F0] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Products */}
            {loading ? (
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm p-4">
                    <div className="aspect-square bg-gray-200 rounded animate-pulse mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-lg text-gray-600">No products found</p>
                <p className="text-sm text-gray-500 mt-2">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} addToCart={addToCart} viewMode={viewMode} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductCard = ({ product, addToCart, viewMode }) => {
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex gap-4">
          <Link to={`/product/${product.id}`} className="w-32 h-32 flex-shrink-0">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
            <Link to={`/product/${product.id}`}>
              <h3 className="font-medium text-gray-900 mb-2 hover:text-[#2874F0] transition-colors">{product.name}</h3>
            </Link>
            <div className="flex items-center gap-1 mb-2">
              <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">{product.rating}★</span>
              <span className="text-xs text-gray-500">({product.reviews.toLocaleString()})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
              <span className="text-sm text-gray-500 line-through">₹{product.originalPrice.toLocaleString()}</span>
              <span className="text-sm text-green-600 font-medium">{product.discount}% off</span>
            </div>
          </div>
          <button
            onClick={() => addToCart(product)}
            className="px-6 py-2 bg-[#2874F0] text-white font-medium rounded hover:bg-[#1c5fd1] transition-colors flex-shrink-0"
          >
            Add to Cart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Discount Badge */}
      <div className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
        {product.discount}% off
      </div>

      {/* Wishlist */}
      <button className="absolute top-2 right-2 z-10 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500">
        <Heart className="w-4 h-4" />
      </button>

      <Link to={`/product/${product.id}`} className="block relative overflow-hidden rounded-t-lg">
        <div className="aspect-square bg-gray-100">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </Link>

      <div className="p-3">
        <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
        <Link to={`/product/${product.id}`}>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 hover:text-[#2874F0] transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1 mb-2">
          <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">{product.rating}★</span>
          <span className="text-xs text-gray-500">({product.reviews.toLocaleString()})</span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
          <span className="text-sm text-gray-500 line-through">₹{product.originalPrice.toLocaleString()}</span>
        </div>

        <button
          onClick={() => addToCart(product)}
          className="w-full py-2 bg-[#2874F0] text-white text-sm font-medium rounded opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[#1c5fd1] flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-4 h-4" />
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default Products;
