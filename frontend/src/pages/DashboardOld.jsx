import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, MapPin, Package, Settings, LogOut } from 'lucide-react';
import Loader from '../components/Loader';

const Dashboard = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);

  // Fetch real order history from the modular backend
  useEffect(() => {
    const fetchOrders = async () => {
      if (isAuthenticated) {
        try {
          const res = await api.get('/orders');
          setOrders(res.data || []);
        } catch (err) {
          console.error("Failed to fetch order history:", err);
        }
      }
    };
    fetchOrders();
  }, [isAuthenticated]);

  if (loading) return <Loader fullScreen text="Loading profile..." />;
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="bg-[#fdfdfd] min-h-screen py-10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0 animate-blob"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Profile Header */}
        <div className="glass-card rounded-[2rem] p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden z-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-100 rounded-full blur-3xl opacity-30 -mr-20 -mt-20"></div>
          
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center text-4xl font-bold shadow-lg shadow-indigo-600/30 relative z-10">
            {user?.name?.charAt(0) || 'U'}
          </div>
          
          <div className="text-center md:text-left relative z-10 flex-grow">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1">{user?.name || 'Valued User'}</h1>
            <p className="text-gray-500 mb-4">{user?.email || 'user@example.com'}</p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active Member
              </span>
            </div>
          </div>

          <button 
            onClick={logout}
            className="md:hidden mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Menu */}
          <div className="md:w-64 flex-shrink-0 relative z-10">
            <div className="glass-card rounded-[2rem] p-4 sticky top-24">
              <nav className="space-y-1">
                {[
                  { id: 'orders', label: 'Order History', icon: <Package size={20} /> },
                  { id: 'profile', label: 'Profile Settings', icon: <User size={20} /> },
                  { id: 'addresses', label: 'Saved Addresses', icon: <MapPin size={20} /> },
                  { id: 'settings', label: 'Account Settings', icon: <Settings size={20} /> }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left ${
                      activeTab === item.id 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className={activeTab === item.id ? 'text-primary-600' : 'text-gray-400'}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="mt-8 pt-6 border-t border-gray-100 px-4 hidden md:block">
                <button 
                  onClick={logout}
                  className="flex items-center gap-2 text-red-500 font-medium hover:text-red-700 transition-colors"
                >
                  <LogOut size={18} /> Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-grow relative z-10">
            {activeTab === 'orders' && (
              <div className="glass-card rounded-[2rem] p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100 text-left">Order History</h2>
                
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="mx-auto text-gray-300 mb-4" size={48} />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                    <p className="text-gray-500">You haven't placed any orders yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border border-gray-200 rounded-2xl p-5 hover:border-primary-300 hover:shadow-md transition-all text-left">
                        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Order Number</p>
                            <p className="text-sm font-extrabold text-gray-900">{order.id.split('-')[0].toUpperCase()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Date Placed</p>
                            <p className="text-sm font-medium text-gray-700">{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Total Amount</p>
                            <p className="text-sm font-extrabold text-gray-900">${parseFloat(order.total_amount).toFixed(2)}</p>
                          </div>
                          <div>
                             <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${
                               order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                             }`}>
                               {order.status}
                             </span>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                          <p className="text-sm text-gray-600">ID: {order.id}</p>
                          <button 
                            onClick={() => navigate(`/orders/${order.id}`)}
                            className="text-sm font-bold text-primary-600 hover:text-primary-700 hover:underline"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab !== 'orders' && (
              <div className="glass-card rounded-[2rem] p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center text-gray-500">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                    <Settings size={28} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Coming Soon</h3>
                  <p>This section is under development.</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
