import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Heart, ShoppingCart, Zap } from 'lucide-react';

const Home = ({ addToCart }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 32, seconds: 15 });

  // Hero carousel slides
  const heroSlides = [
    {
      id: 1,
      title: "Big Billion Days Sale",
      subtitle: "Up to 80% Off on Electronics",
      cta: "Shop Now",
      bg: "https://images.unsplash.com/photo-1607082348824-92a827f6e61f?w=1200",
      color: "from-orange-500 to-red-600"
    },
    {
      id: 2,
      title: "Fashion Fiesta",
      subtitle: "Latest Trends at Best Prices",
      cta: "Explore",
      bg: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200",
      color: "from-pink-500 to-purple-600"
    },
    {
      id: 3,
      title: "Home Essentials",
      subtitle: "Upgrade Your Living Space",
      cta: "Discover",
      bg: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200",
      color: "from-teal-500 to-blue-600"
    }
  ];

  // Categories with icons
  const categories = [
    { name: 'Electronics', icon: '📱', color: 'bg-blue-100', count: '2,500+' },
    { name: 'Fashion', icon: '👕', color: 'bg-pink-100', count: '15,000+' },
    { name: 'Home & Kitchen', icon: '🏠', color: 'bg-green-100', count: '8,000+' },
    { name: 'Books', icon: '📚', color: 'bg-yellow-100', count: '50,000+' },
    { name: 'Sports', icon: '⚽', color: 'bg-orange-100', count: '3,000+' },
    { name: 'Beauty', icon: '💄', color: 'bg-purple-100', count: '12,000+' },
    { name: 'Toys', icon: '🧸', color: 'bg-red-100', count: '5,000+' },
    { name: 'Grocery', icon: '🛒', color: 'bg-teal-100', count: '10,000+' },
  ];

  // Brand logos
  const brands = [
    { name: 'Nike', logo: '👟' },
    { name: 'Apple', logo: '🍎' },
    { name: 'Samsung', logo: '📱' },
    { name: 'Sony', logo: '🎧' },
    { name: 'Adidas', logo: '👕' },
    { name: 'LG', logo: '📺' },
    { name: 'HP', logo: '💻' },
    { name: 'Canon', logo: '📷' },
  ];

  // Product data
  const dealProducts = [
    { id: 1, name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', price: 129999, originalPrice: 149999, discount: 13, rating: 4.8, reviews: 1247, image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400', badge: 'Deal of the Day' },
    { id: 2, name: 'Sony WH-1000XM5 Headphones', brand: 'Sony', price: 24999, originalPrice: 34999, discount: 29, rating: 4.7, reviews: 892, image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400', badge: 'Deal of the Day' },
    { id: 3, name: 'MacBook Air M2', brand: 'Apple', price: 99900, originalPrice: 119900, discount: 17, rating: 4.9, reviews: 2156, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=400', badge: 'Deal of the Day' },
    { id: 4, name: 'Nike Air Max 270', brand: 'Nike', price: 7499, originalPrice: 12999, discount: 42, rating: 4.6, reviews: 563, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', badge: 'Deal of the Day' },
  ];

  const trendingProducts = [
    { id: 5, name: 'iPhone 15 Pro Max', brand: 'Apple', price: 159900, originalPrice: 179900, discount: 11, rating: 4.9, reviews: 3421, image: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=400' },
    { id: 6, name: 'LG 55" OLED TV', brand: 'LG', price: 89999, originalPrice: 129999, discount: 31, rating: 4.8, reviews: 892, image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400' },
    { id: 7, name: 'Canon EOS R6', brand: 'Canon', price: 215999, originalPrice: 249999, discount: 14, rating: 4.7, reviews: 445, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400' },
    { id: 8, name: 'Adidas Ultraboost 22', brand: 'Adidas', price: 8999, originalPrice: 15999, discount: 44, rating: 4.6, reviews: 1234, image: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=400' },
    { id: 9, name: 'Dyson V15 Vacuum', brand: 'Dyson', price: 54900, originalPrice: 64900, discount: 15, rating: 4.8, reviews: 678, image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400' },
    { id: 10, name: 'Samsung 49" Monitor', brand: 'Samsung', price: 89999, originalPrice: 119999, discount: 25, rating: 4.7, reviews: 334, image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400' },
    { id: 11, name: 'Kindle Paperwhite', brand: 'Amazon', price: 10999, originalPrice: 14999, discount: 27, rating: 4.8, reviews: 5678, image: 'https://images.unsplash.com/photo-1592496001020-d31bd830651f?w=400' },
    { id: 12, name: 'Apple Watch Series 9', brand: 'Apple', price: 41900, originalPrice: 45900, discount: 9, rating: 4.8, reviews: 2134, image: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400' },
  ];

  // Auto-rotate carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 4, minutes: 32, seconds: 15 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  return (
    <div className="min-h-screen bg-[#f1f3f6]">
      {/* Hero Carousel */}
      <section className="relative h-[300px] md:h-[400px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${heroSlides[currentSlide].color} opacity-90`} />
            <img
              src={heroSlides[currentSlide].bg}
              alt=""
              className="w-full h-full object-cover mix-blend-overlay"
            />
            <div className="absolute inset-0 flex items-center">
              <div className="container mx-auto px-4">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="max-w-xl text-white"
                >
                  <h1 className="text-3xl md:text-5xl font-bold mb-4">{heroSlides[currentSlide].title}</h1>
                  <p className="text-lg md:text-xl mb-6 opacity-90">{heroSlides[currentSlide].subtitle}</p>
                  <Link
                    to="/products"
                    className="inline-block px-8 py-3 bg-white text-gray-900 font-semibold rounded hover:bg-gray-100 transition-colors"
                  >
                    {heroSlides[currentSlide].cta}
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Controls */}
        <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-colors">
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {heroSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${currentSlide === idx ? 'bg-white' : 'bg-white/50'}`}
            />
          ))}
        </div>
      </section>

      {/* Category Strip */}
      <section className="py-6 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={`/products?category=${encodeURIComponent(cat.name)}`}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-16 h-16 ${cat.color} rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm`}>
                  {cat.icon}
                </div>
                <span className="text-xs md:text-sm font-medium text-gray-700 text-center group-hover:text-[#2874F0]">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Deal of the Day */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900">Deal of the Day</h2>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="text-gray-600">Ends in:</span>
                  <div className="flex items-center gap-1">
                    <span className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-mono">{String(timeLeft.hours).padStart(2, '0')}</span>
                    <span className="text-gray-400">:</span>
                    <span className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-mono">{String(timeLeft.minutes).padStart(2, '0')}</span>
                    <span className="text-gray-400">:</span>
                    <span className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-mono">{String(timeLeft.seconds).padStart(2, '0')}</span>
                  </div>
                </div>
              </div>
              <Link to="/products" className="text-[#2874F0] font-medium hover:underline">View All</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
              {dealProducts.map((product) => (
                <ProductCard key={product.id} product={product} addToCart={addToCart} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trending Now */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Trending Now</h2>
              <Link to="/products" className="text-[#2874F0] font-medium hover:underline">View All</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
              {trendingProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} addToCart={addToCart} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Brand Logos */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Top Brands</h2>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {brands.map((brand) => (
                <div key={brand.name} className="flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl group-hover:bg-gray-200 transition-colors">
                    {brand.logo}
                  </div>
                  <span className="text-sm font-medium text-gray-600">{brand.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* More Products Grid */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Recommended For You</h2>
              <Link to="/products" className="text-[#2874F0] font-medium hover:underline">View All</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
              {trendingProducts.slice(4).map((product) => (
                <ProductCard key={product.id} product={product} addToCart={addToCart} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product, addToCart }) => {
  return (
    <div className="group relative bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-300">
      {/* Discount Badge */}
      <div className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
        {product.discount}% off
      </div>

      {/* Wishlist */}
      <button className="absolute top-2 right-2 z-10 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500">
        <Heart className="w-4 h-4" />
      </button>

      {/* Image */}
      <Link to={`/product/${product.id}`} className="block relative overflow-hidden rounded-t-lg">
        <div className="aspect-square bg-gray-100">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </Link>

      {/* Content */}
      <div className="p-3">
        <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
        <Link to={`/product/${product.id}`}>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 hover:text-[#2874F0] transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex items-center bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
            <span className="font-medium">{product.rating}</span>
            <Star className="w-3 h-3 fill-white ml-0.5" />
          </div>
          <span className="text-xs text-gray-500">({product.reviews.toLocaleString()})</span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
          <span className="text-sm text-gray-500 line-through">₹{product.originalPrice.toLocaleString()}</span>
        </div>

        {/* Add to Cart Button - appears on hover */}
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

export default Home;
