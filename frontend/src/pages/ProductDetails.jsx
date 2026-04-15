import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Share2, ChevronRight, Minus, Plus, Truck, ShopCheck, RefreshCw } from 'lucide-react';

const ProductDetails = ({ addToCart, user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');

  // Mock product data
  const mockProducts = {
    1: { id: 1, name: 'Samsung Galaxy S24 Ultra 5G', brand: 'Samsung', category: 'Electronics', price: 129999, originalPrice: 149999, discount: 13, rating: 4.8, reviews: 1247, images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600', 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600'], description: 'Experience the future with Samsung Galaxy S24 Ultra. Featuring a stunning 6.8-inch Dynamic AMOLED 2X display, 200MP camera system, and the powerful Snapdragon 8 Gen 3 processor. With S Pen support and all-day battery life, this is the ultimate smartphone for power users.', specs: { 'Display': '6.8" Dynamic AMOLED 2X', 'Processor': 'Snapdragon 8 Gen 3', 'RAM': '12GB', 'Storage': '256GB', 'Camera': '200MP Main + 50MP Telephoto', 'Battery': '5000mAh' } },
    2: { id: 2, name: 'Sony WH-1000XM5 Wireless Headphones', brand: 'Sony', category: 'Electronics', price: 24999, originalPrice: 34999, discount: 29, rating: 4.7, reviews: 892, images: ['https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600'], description: 'Industry-leading noise cancellation with two processors controlling eight microphones. Crystal clear hands-free calling and speak-to-chat feature automatically pauses playback when you start talking.', specs: { 'Type': 'Over-ear Wireless', 'Driver': '30mm', 'Battery': '30 hours', 'Weight': '250g', 'Connectivity': 'Bluetooth 5.2', 'Features': 'ANC, Transparency Mode' } },
    3: { id: 3, name: 'Apple MacBook Air M2', brand: 'Apple', category: 'Electronics', price: 99900, originalPrice: 119900, discount: 17, rating: 4.9, reviews: 2156, images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=600', 'https://images.unsplash.com/photo-1541807084-5c52b6b92c46?w=600'], description: 'Supercharged by M2 chip. Strikingly thin and fast so you can work, play, or create just about anything — anywhere. With up to 18 hours of battery life and a stunning Liquid Retina display.', specs: { 'Chip': 'Apple M2', 'Display': '13.6" Liquid Retina', 'Memory': '8GB Unified', 'Storage': '256GB SSD', 'Battery': 'Up to 18 hours', 'Weight': '1.24 kg' } },
    4: { id: 4, name: 'Nike Air Max 270 Running Shoes', brand: 'Nike', category: 'Fashion', price: 7499, originalPrice: 12999, discount: 42, rating: 4.6, reviews: 563, images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600'], description: 'The Nike Air Max 270 delivers visible cushioning under every step. Updated for modern comfort, it features a large Max Air unit in the heel for all-day comfort and style.', specs: { 'Upper': 'Mesh & Synthetic', 'Sole': 'Rubber', 'Closure': 'Lace-up', 'Weight': 'Lightweight', 'Fit': 'True to size', 'Best For': 'Running & Casual' } },
    5: { id: 5, name: 'iPhone 15 Pro Max 256GB', brand: 'Apple', category: 'Electronics', price: 159900, originalPrice: 179900, discount: 11, rating: 4.9, reviews: 3421, images: ['https://images.unsplash.com/photo-1696446701796-da61225697cc?w=600', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600'], description: 'The most advanced iPhone ever. Forged in titanium with the groundbreaking A17 Pro chip, a customizable Action button, and the most powerful iPhone camera system ever.', specs: { 'Display': '6.7" Super Retina XDR', 'Chip': 'A17 Pro', 'Camera': '48MP Main + 5x Telephoto', 'Material': 'Titanium', 'Storage': '256GB', 'Battery': 'All-day' } },
  };

  // Related products
  const relatedProducts = [
    { id: 6, name: 'LG 55" OLED Smart TV', brand: 'LG', price: 89999, originalPrice: 129999, discount: 31, rating: 4.8, reviews: 892, image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400' },
    { id: 7, name: 'Canon EOS R6 Camera', brand: 'Canon', price: 215999, originalPrice: 249999, discount: 14, rating: 4.7, reviews: 445, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400' },
    { id: 8, name: 'Adidas Ultraboost 22', brand: 'Adidas', price: 8999, originalPrice: 15999, discount: 44, rating: 4.6, reviews: 1234, image: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=400' },
    { id: 9, name: 'Dyson V15 Vacuum', brand: 'Dyson', price: 54900, originalPrice: 64900, discount: 15, rating: 4.8, reviews: 678, image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400' },
  ];

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const foundProduct = mockProducts[id] || Object.values(mockProducts)[0];
      setProduct(foundProduct);
      setLoading(false);
    }, 500);
  }, [id]);

  const handleBuyNow = () => {
    addToCart({ ...product, quantity });
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f3f6] py-8">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-[#f1f3f6] py-4">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-600 mb-4">
          <Link to="/" className="hover:text-[#2874F0]">Home</Link>
          <span className="mx-2">›</span>
          <Link to={`/products?category=${product.category}`} className="hover:text-[#2874F0]">{product.category}</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={product.images?.[selectedImage] || product.images?.[0]}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              </div>
              {product.images?.length > 1 && (
                <div className="flex gap-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${selectedImage === idx ? 'border-[#2874F0]' : 'border-gray-200'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">{product.brand}</p>
                <h1 className="text-2xl lg:text-3xl font-medium text-gray-900">{product.name}</h1>
                
                <div className="flex items-center gap-3 mt-3">
                  <span className="bg-green-500 text-white text-sm px-2 py-0.5 rounded font-medium flex items-center gap-1">
                    {product.rating} <Star className="w-3 h-3 fill-white" />
                  </span>
                  <span className="text-gray-500">{product.rating.toFixed(1)} out of 5</span>
                  <span className="text-[#2874F0]">{product.reviews.toLocaleString()} Ratings & Reviews</span>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
                <span className="text-lg text-gray-500 line-through">₹{product.originalPrice.toLocaleString()}</span>
                <span className="text-green-600 font-medium">{product.discount}% off</span>
              </div>

              {/* Offers */}
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Special Price:</span> Get extra 10% off with bank offers
                </p>
              </div>

              {/* Highlights */}
              <div className="flex flex-wrap gap-4 py-4 border-y">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Truck className="w-5 h-5 text-green-600" />
                  Free Delivery
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ShopCheck className="w-5 h-5 text-blue-600" />
                  1 Year Warranty
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <RefreshCw className="w-5 h-5 text-purple-600" />
                  7 Day Replacement
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-4">
                <span className="font-medium text-gray-900">Quantity:</span>
                <div className="flex items-center border border-gray-300 rounded">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 hover:bg-gray-100"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2 hover:bg-gray-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => addToCart(product)}
                  className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-[#ff9f00] text-white font-semibold rounded shadow hover:bg-[#e68a00] transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex-1 px-8 py-4 bg-[#fb641b] text-white font-semibold rounded shadow hover:bg-[#e55a17] transition-colors"
                >
                  Buy Now
                </button>
              </div>

              {/* Wishlist & Share */}
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors">
                  <Heart className="w-5 h-5" />
                  Add to Wishlist
                </button>
                <button className="flex items-center gap-2 text-gray-600 hover:text-[#2874F0] transition-colors">
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-6 bg-white rounded-lg shadow-sm">
          <div className="border-b">
            <div className="flex">
              {['description', 'specifications', 'reviews'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-medium capitalize ${activeTab === tab ? 'text-[#2874F0] border-b-2 border-[#2874F0]' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'description' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Description</h3>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h3>
                <table className="w-full max-w-2xl">
                  <tbody className="divide-y">
                    {Object.entries(product.specs || {}).map(([key, value]) => (
                      <tr key={key}>
                        <td className="py-3 text-gray-500 w-1/3">{key}</td>
                        <td className="py-3 text-gray-900 font-medium">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ratings & Reviews</h3>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900">{product.rating}</div>
                    <div className="flex items-center justify-center gap-1 my-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <p className="text-gray-500">{product.reviews.toLocaleString()} reviews</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="w-8 text-sm text-gray-600">{rating} ★</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.random() * 60 + 20}%` }}></div>
                        </div>
                        <span className="w-12 text-sm text-gray-500 text-right">{Math.floor(Math.random() * 1000)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Similar Products */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Similar Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((p) => (
              <Link key={p.id} to={`/product/${p.id}`} className="group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-[#2874F0]">{p.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-gray-900">₹{p.price.toLocaleString()}</span>
                  <span className="text-sm text-gray-500 line-through">₹{p.originalPrice.toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
