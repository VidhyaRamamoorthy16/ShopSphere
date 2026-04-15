import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, ShoppingBag, Heart, MapPin, CreditCard, LogOut, ChevronRight, Package } from 'lucide-react';

const Dashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Mock orders
    setOrders([
      { id: 'ORD-001', date: '2024-04-01', status: 'Delivered', total: 129999, items: [{ name: 'Samsung Galaxy S24 Ultra', qty: 1, price: 129999 }] },
      { id: 'ORD-002', date: '2024-03-28', status: 'Shipped', total: 24999, items: [{ name: 'Sony WH-1000XM5', qty: 1, price: 24999 }] },
    ]);
    setLoading(false);
  }, [user, navigate]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/');
  };

  const sidebarItems = [
    { id: 'orders', label: 'My Orders', icon: ShoppingBag },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'addresses', label: 'Manage Addresses', icon: MapPin },
    { id: 'payment', label: 'Payment Methods', icon: CreditCard },
    { id: 'profile', label: 'Profile Information', icon: User },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f1f3f6] py-4">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-4 gap-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-20">
              <div className="p-4 bg-[#2874F0] text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold">{user.name || 'User'}</p>
                    <p className="text-sm text-blue-100">{user.email}</p>
                  </div>
                </div>
              </div>

              <nav className="p-2">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded text-left transition-colors ${
                      activeTab === item.id ? 'bg-blue-50 text-[#2874F0]' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}

                <div className="border-t my-2"></div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded text-left text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'orders' && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-bold text-gray-900">My Orders</h2>
                </div>
                
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-[#2874F0] border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="p-8 text-center">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                    <Link to="/products" className="text-[#2874F0] font-medium hover:underline">
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y">
                    {orders.map((order) => (
                      <div key={order.id} className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Order ID: {order.id}</p>
                            <p className="text-sm text-gray-500">Placed on {new Date(order.date).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded text-sm font-medium ${
                              order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                              order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {order.status}
                            </span>
                            <span className="font-bold text-gray-900">₹{order.total.toLocaleString()}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-700">{item.name} (x{item.qty})</span>
                              <span className="font-medium">₹{item.price.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-3 mt-4">
                          <button className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Track Order
                          </button>
                          <button className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Invoice
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Your wishlist is empty</h3>
                <Link to="/products" className="text-[#2874F0] font-medium hover:underline">
                  Explore Products
                </Link>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Manage Addresses</h2>
                  <button className="px-4 py-2 bg-[#2874F0] text-white rounded text-sm font-medium hover:bg-[#1c5fd1]">
                    + Add New Address
                  </button>
                </div>
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No saved addresses</p>
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Payment Methods</h2>
                  <button className="px-4 py-2 bg-[#2874F0] text-white rounded text-sm font-medium hover:bg-[#1c5fd1]">
                    + Add Payment Method
                  </button>
                </div>
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No saved payment methods</p>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Profile Information</h2>
                <form className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input type="text" defaultValue={user.name} className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#2874F0]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" defaultValue={user.email} className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#2874F0]" />
                  </div>
                  <button type="submit" className="px-6 py-3 bg-[#2874F0] text-white font-medium rounded hover:bg-[#1c5fd1]">
                    Save Changes
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
