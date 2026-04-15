import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShopCheck, Truck, RefreshCw } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader';
import api from '../services/api';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        // Fetch real items from our new modular backend (limit 4 for trending)
        const res = await api.get('/products?limit=4&sortBy=price&order=desc');
        const productsArray = res.data.products || [];
        setFeaturedProducts(productsArray);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-page">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32 lg:pt-36 lg:pb-40">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-transparent to-pink-500/8"></div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-400/15 rounded-full filter blur-3xl opacity-60 animate-blob -z-10"></div>
          <div className="absolute top-20 right-10 w-72 h-72 bg-pink-400/15 rounded-full filter blur-3xl opacity-60 animate-blob animation-delay-2000 -z-10"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-block py-1 px-3 rounded-full border text-indigo-500 text-sm font-bold tracking-wide mb-6 bg-indigo-50/50 border-indigo-100">
            Official Summer Collection 2024
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight text-slate-900">
            Future of <span className="text-indigo-600">Shopping</span>.<br className="hidden md:block" />
            Designed for You.
          </h1>
          <p className="mt-4 text-xl max-w-2xl mx-auto mb-10 leading-relaxed text-slate-500">
            Elevate your lifestyle with our curated collection of high-end electronics, stunning fashion, and beautifully crafted accessories.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/products" className="bg-indigo-600 text-white px-8 py-4 rounded-full font-bold text-lg flex justify-center items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 group">
              Shop Now <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 -mt-10 mb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center p-8 rounded-3xl bg-white/50 backdrop-blur-xl border border-white/20 shadow-sm">
                <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full mb-4"><Truck size={28} /></div>
                <h3 className="font-bold text-xl">Free Shipping</h3>
                <p className="text-slate-500 text-sm">On all orders over $150</p>
            </div>
            <div className="flex flex-col items-center p-8 rounded-3xl bg-white/50 backdrop-blur-xl border border-white/20 shadow-sm">
                <div className="p-4 bg-purple-100 text-purple-600 rounded-full mb-4"><ShopCheck size={28} /></div>
                <h3 className="font-bold text-xl">Secure Payment</h3>
                <p className="text-slate-500 text-sm">Direct SSL encrypted gateway</p>
            </div>
            <div className="flex flex-col items-center p-8 rounded-3xl bg-white/50 backdrop-blur-xl border border-white/20 shadow-sm">
                <div className="p-4 bg-pink-100 text-pink-600 rounded-full mb-4"><RefreshCw size={28} /></div>
                <h3 className="font-bold text-xl">Easy Returns</h3>
                <p className="text-slate-500 text-sm">30 days money-back policy</p>
            </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-24 bg-white/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Trending Now</h2>
              <p className="mt-2 text-slate-500">Discover the most sought-after pieces this week.</p>
            </div>
            <Link to="/products" className="hidden sm:flex items-center gap-2 text-indigo-600 font-bold hover:gap-3 transition-all">
              View All <ArrowRight size={20} />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative rounded-3xl overflow-hidden group h-80 shadow-md">
              <img src="https://images.unsplash.com/photo-1550029402-226115b7c579?w=800" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Tech" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-8">
                <h3 className="text-2xl font-bold text-white mb-2">Modern Electronics</h3>
                <Link to="/products?category=Electronics" className="text-indigo-300 font-bold hover:text-white transition-colors">Explore Category &rarr;</Link>
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden group h-80 shadow-md">
               <img src="https://images.unsplash.com/photo-1445205170230-053b83016050?w=600" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Fashion" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
               <div className="absolute bottom-0 left-0 p-8">
                <h3 className="text-2xl font-bold text-white mb-2">Winter Fashion</h3>
                <Link to="/products?category=Fashion" className="text-indigo-300 font-bold hover:text-white transition-colors">Shop Style &rarr;</Link>
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden group h-80 shadow-md">
               <img src="https://images.unsplash.com/photo-1553062407-98eeb94c6a62?w=600" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Acc" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
               <div className="absolute bottom-0 left-0 p-8">
                <h3 className="text-2xl font-bold text-white mb-2">Premium Gear</h3>
                <Link to="/products?category=Accessories" className="text-indigo-300 font-bold hover:text-white transition-colors">Upgrade Toolkit &rarr;</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;