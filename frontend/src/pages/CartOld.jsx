import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="bg-gray-100 p-6 rounded-full text-gray-400 mb-6">
          <ShoppingBag size={64} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8 text-center max-w-md">
          Looks like you haven't added anything to your cart yet. Discover our premium collection and find something you love.
        </p>
        <Link 
          to="/products"
          className="btn-gradient px-8 py-4 text-lg"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#fdfdfd] min-h-screen py-12 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0 animate-blob"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Cart Items */}
          <div className="lg:w-2/3">
            <div className="glass-card rounded-[2rem] overflow-hidden">
              <ul className="divide-y divide-gray-100">
                {cart.map((item) => (
                  <li key={item._id} className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6">
                    {/* Item Image */}
                    <Link to={`/product/${item._id}`} className="sm:w-32 sm:h-32 flex-shrink-0 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                      <img 
                        src={item.image || `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80`} 
                        alt={item.name} 
                        className="w-full h-full object-cover mix-blend-multiply hover:scale-110 transition-transform"
                      />
                    </Link>

                    {/* Item Details */}
                    <div className="flex-grow flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <Link to={`/product/${item._id}`} className="text-lg font-bold text-gray-900 hover:text-primary-600 transition-colors line-clamp-2">
                            {item.name}
                          </Link>
                          <p className="text-gray-500 text-sm mt-1 capitalize">{item.category}</p>
                        </div>
                        <p className="font-extrabold text-gray-900 border-l border-gray-100 pl-4 w-24 text-right">
                          ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                        </p>
                      </div>

                      <div className="flex justify-between items-end mt-4">
                        {/* Quantity Control */}
                        <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 h-10 w-28">
                          <button 
                            onClick={() => updateQuantity(item._id, item.quantity - 1)}
                            className="w-1/3 flex items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-l-lg transition-colors font-medium"
                          >
                            -
                          </button>
                          <span className="w-1/3 text-center font-bold text-gray-900 text-sm">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item._id, item.quantity + 1)}
                            className="w-1/3 flex items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-r-lg transition-colors font-medium"
                          >
                            +
                          </button>
                        </div>

                        {/* Remove Action */}
                        <button 
                          onClick={() => removeFromCart(item._id)}
                          className="flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} /> <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:w-1/3">
            <div className="glass-card rounded-[2rem] p-6 sm:p-8 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
              
              <div className="space-y-4 text-sm text-gray-600 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping estimate</span>
                  <span className="font-medium text-gray-900">${cartTotal > 99 ? '0.00' : '15.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax estimate</span>
                  <span className="font-medium text-gray-900">${(cartTotal * 0.08).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6 mb-8 flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Order total</span>
                <span className="text-2xl font-extrabold text-gray-900">
                  ${(cartTotal + (cartTotal > 99 ? 0 : 15) + (cartTotal * 0.08)).toFixed(2)}
                </span>
              </div>

              <button 
                onClick={() => navigate('/checkout')}
                className="w-full flex items-center justify-center gap-2 btn-gradient py-4 text-lg"
              >
                Proceed to Checkout <ArrowRight size={20} />
              </button>

              <div className="mt-6 text-center">
                <Link to="/products" className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline">
                  or Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
