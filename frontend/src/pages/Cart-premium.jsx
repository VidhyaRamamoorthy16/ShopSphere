import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Truck, ShopCheck } from 'lucide-react';

const Cart = ({ cart, setCart }) => {
  const navigate = useNavigate();

  const updateQuantity = (id, change) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + change;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeItem = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = cart.reduce((sum, item) => sum + (item.originalPrice - item.price) * item.quantity, 0);
  const delivery = subtotal > 50000 ? 0 : 99;
  const total = subtotal + delivery;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#f1f3f6] py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Looks like you haven't added anything to your cart yet.</p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#2874F0] text-white font-semibold rounded hover:bg-[#1c5fd1] transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f3f6] py-4">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h1 className="text-xl font-bold text-gray-900">Shopping Cart ({cart.length} items)</h1>
              </div>
              
              <div className="divide-y">
                {cart.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex gap-4">
                      <Link to={`/product/${item.id}`} className="w-24 h-24 flex-shrink-0">
                        <img
                          src={item.image || item.images?.[0]}
                          alt={item.name}
                          className="w-full h-full object-cover rounded"
                        />
                      </Link>
                      
                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${item.id}`}>
                          <h3 className="font-medium text-gray-900 mb-1 hover:text-[#2874F0] transition-colors line-clamp-2">
                            {item.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-500 mb-2">{item.brand}</p>
                        
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-lg font-bold text-gray-900">₹{item.price.toLocaleString()}</span>
                          <span className="text-sm text-gray-500 line-through">₹{item.originalPrice?.toLocaleString()}</span>
                          <span className="text-sm text-green-600">{item.discount}% off</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center border border-gray-300 rounded">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              disabled={item.quantity <= 1}
                              className="px-3 py-1 hover:bg-gray-100 disabled:opacity-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="px-3 py-1 hover:bg-gray-100"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t">
                <Link to="/products" className="text-[#2874F0] font-medium hover:underline flex items-center gap-1">
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm sticky top-20">
              <div className="p-4 border-b">
                <h2 className="text-lg font-bold text-gray-900">Price Details</h2>
              </div>
              
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Price ({cart.reduce((sum, i) => sum + i.quantity, 0)} items)</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>- ₹{discount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Charges</span>
                  <span className={delivery === 0 ? 'text-green-600' : ''}>
                    {delivery === 0 ? 'FREE' : `₹${delivery}`}
                  </span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total Amount</span>
                    <span className="text-xl font-bold text-gray-900">₹{total.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">You will save ₹{discount.toLocaleString()} on this order</p>
                </div>
              </div>
              
              <div className="p-4 border-t">
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full py-4 bg-[#fb641b] text-white font-semibold rounded shadow hover:bg-[#e55a17] transition-colors"
                >
                  Place Order
                </button>
              </div>
              
              <div className="p-4 border-t space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ShopCheck className="w-4 h-4 text-green-600" />
                  <span>Safe & Secure Payments</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>Free delivery on orders above ₹50,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
