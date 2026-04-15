import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { CheckCircle, ShopCheck } from 'lucide-react';

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'United States',
    cardNumber: '',
    expiry: '',
    cvv: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // If cart empty, maybe redirect
  if (cart.length === 0 && !orderComplete) {
    navigate('/cart');
    return null;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const shipping = cartTotal > 99 ? 0 : 15;
  const tax = cartTotal * 0.08;
  const total = cartTotal + shipping + tax;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.warning("Please login to place an order.");
      return navigate('/login');
    }

    setIsProcessing(true);
    
    try {
      // Call the new modular backend via Gateway
      const res = await api.post('/orders');
      
      setIsProcessing(false);
      setOrderComplete(true);
      clearCart();
      toast.success(res.data.message || "Order placed successfully!");
    } catch (err) {
      console.error("Checkout failed:", err);
      toast.error(err.response?.data?.error || "Checkout failed. Please try again.");
      setIsProcessing(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-gray-50">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="animate-[bounce_0.5s_ease-out]" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Order Confirmed!</h2>
          <p className="text-gray-500 mb-8">
            Thank you for your purchase. We've received your order and will begin processing it shortly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/products')}
              className="px-6 py-3 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              Continue Shopping
            </button>
            {isAuthenticated && (
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-lg hover:shadow-primary-600/30"
              >
                View Orders
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fdfdfd] min-h-screen py-12 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0 animate-blob"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-pink-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0 animate-blob animation-delay-2000"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8 mt-4">Checkout</h1>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Checkout Form */}
          <div className="lg:w-2/3">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Shipping Information */}
              <div className="glass-card p-8 rounded-[2rem]">
                <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Shipping Address</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input required type="text" name="firstName" onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="John" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input required type="text" name="lastName" onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Doe" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input required type="text" name="address" onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="123 Main St" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input required type="text" name="city" onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="New York" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                    <input required type="text" name="postalCode" onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="10001" />
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="glass-card p-8 rounded-[2rem]">
                 <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                   <span>Payment Method</span>
                   <ShopCheck className="text-emerald-500" />
                 </h2>
                 <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Number (Mock)</label>
                    <input required type="text" name="cardNumber" onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono" placeholder="0000 0000 0000 0000" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                      <input required type="text" name="expiry" onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono" placeholder="MM/YY" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                      <input required type="text" name="cvv" onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono" placeholder="123" />
                    </div>
                  </div>
                 </div>
              </div>

              {/* Submit Button (Mobile) */}
              <div className="lg:hidden mt-8">
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  className="w-full btn-gradient py-4 text-lg flex justify-center disabled:opacity-75"
                >
                  {isProcessing ? <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin"></div> : `Pay $${total.toFixed(2)}`}
                </button>
              </div>
            </form>
          </div>

          {/* Order Summary Sticky */}
          <div className="lg:w-1/3 order-first lg:order-last">
            <div className="glass-card p-6 sm:p-8 rounded-[2rem] sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Order Items</h2>
              
              <ul className="space-y-4 mb-6">
                {cart.map(item => (
                  <li key={item._id} className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                       <img src={item.image || `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80`} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="space-y-3 text-sm text-gray-600 mb-6 border-t border-gray-100 pt-6">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-medium text-gray-900">${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes (8%)</span>
                  <span className="font-medium text-gray-900">${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6 flex justify-between items-center mb-6">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-2xl font-extrabold text-primary-600">
                  ${total.toFixed(2)}
                </span>
              </div>

               {/* Submit Button (Desktop) */}
               <button 
                  onClick={handleSubmit} 
                  disabled={isProcessing}
                  className="hidden lg:flex w-full items-center justify-center bg-gray-900 hover:bg-black text-white py-4 rounded-xl font-bold text-lg transition-all shadow-xl hover:shadow-black/20 disabled:opacity-75"
                >
                  {isProcessing ? <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin"></div> : 'Confirm Order'}
                </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Checkout;
