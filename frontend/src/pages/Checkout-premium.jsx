import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Truck, MapPin, ChevronRight, Check, ShopCheck } from 'lucide-react';

const Checkout = ({ cart, setCart, user }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [shippingInfo, setShippingInfo] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('cod');

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = cart.reduce((sum, item) => sum + (item.originalPrice - item.price) * item.quantity, 0);
  const delivery = subtotal > 50000 ? 0 : 99;
  const total = subtotal + delivery;

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setCart([]);
    localStorage.removeItem('cart');
    
    alert('Order placed successfully! Thank you for shopping with ShopSphere.');
    navigate('/dashboard');
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#f1f3f6] py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
        <button onClick={() => navigate('/products')} className="px-8 py-4 bg-[#2874F0] text-white font-semibold rounded hover:bg-[#1c5fd1]">
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f3f6] py-4">
      <div className="container mx-auto px-4">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Checkout</h1>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-center">
            <div className={`flex items-center ${step >= 1 ? 'text-[#2874F0]' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-[#2874F0] text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Delivery</span>
            </div>
            <div className="w-16 h-1 mx-2 bg-gray-200">
              <div className={`h-full bg-[#2874F0] transition-all ${step >= 2 ? 'w-full' : 'w-0'}`}></div>
            </div>
            <div className={`flex items-center ${step >= 2 ? 'text-[#2874F0]' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-[#2874F0] text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Payment</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Main Form */}
          <div className="lg:col-span-2">
            {step === 1 ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Delivery Address</h2>
                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.fullName}
                        onChange={(e) => setShippingInfo({...shippingInfo, fullName: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#2874F0] focus:border-[#2874F0]"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={shippingInfo.phone}
                        onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#2874F0]"
                        placeholder="10-digit mobile number"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address (House No, Building, Street, Area) *</label>
                    <textarea
                      required
                      rows="3"
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#2874F0]"
                      placeholder="Enter complete address"
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#2874F0]"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.state}
                        onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#2874F0]"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.pincode}
                        onChange={(e) => setShippingInfo({...shippingInfo, pincode: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#2874F0]"
                        placeholder="6-digit pincode"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-4 bg-[#fb641b] text-white font-semibold rounded hover:bg-[#e55a17] transition-colors"
                  >
                    Save and Continue
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Payment Options</h2>
                
                <div className="space-y-3 mb-6">
                  {[
                    { id: 'cod', name: 'Cash on Delivery', icon: Truck },
                    { id: 'card', name: 'Credit/Debit Card', icon: CreditCard },
                    { id: 'upi', name: 'UPI', icon: ShopCheck },
                  ].map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === method.id ? 'border-[#2874F0] bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.id}
                        checked={paymentMethod === method.id}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4 text-[#2874F0]"
                      />
                      <method.icon className="w-6 h-6 text-gray-600" />
                      <span className="font-medium text-gray-900">{method.name}</span>
                      {paymentMethod === method.id && <Check className="w-5 h-5 text-[#2874F0] ml-auto" />}
                    </label>
                  ))}
                </div>

                <form onSubmit={handlePaymentSubmit}>
                  {paymentMethod === 'card' && (
                    <div className="space-y-4 mb-6">
                      <input type="text" placeholder="Card Number" className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#2874F0]" />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="MM/YY" className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#2874F0]" />
                        <input type="text" placeholder="CVV" className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#2874F0]" />
                      </div>
                      <input type="text" placeholder="Name on Card" className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#2874F0]" />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-[#fb641b] text-white font-semibold rounded hover:bg-[#e55a17] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : `Pay ₹${total.toLocaleString()}`}
                  </button>
                </form>

                <button
                  onClick={() => setStep(1)}
                  className="w-full mt-4 py-3 border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50"
                >
                  Back to Address
                </button>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm sticky top-20">
              <div className="p-4 border-b">
                <h2 className="font-bold text-gray-900">Price Details</h2>
              </div>
              
              <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                      <img src={item.image || item.images?.[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      <p className="text-sm font-medium text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t p-4 space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>- ₹{discount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span>{delivery === 0 ? 'FREE' : `₹${delivery}`}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-gray-900">₹{total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
