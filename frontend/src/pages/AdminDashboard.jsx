import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  TrendingUp, 
  Package, 
  CheckCircle, 
  Clock, 
  XCircle,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import Loader from '../components/Loader';

const AdminDashboard = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, pendingOrders: 0 });
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      if (isAuthenticated && user?.role === 'admin') {
        try {
          const [statsRes, ordersRes, productsRes] = await Promise.all([
            api.get('/orders/admin/stats'),
            api.get('/orders/admin/all'),
            api.get('/products?limit=100') // Fetch many for management
          ]);
          setStats(statsRes.data);
          setOrders(ordersRes.data);
          setProducts(productsRes.data.products || []);
        } catch (err) {
          console.error("Failed to fetch admin data:", err);
          toast.error("Error loading administration data.");
        } finally {
          setIsStatsLoading(false);
        }
      }
    };
    fetchAdminData();
  }, [isAuthenticated, user]);

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/admin/${orderId}/status`, { status });
      toast.success(`Order marked as ${status}`);
      // Refresh orders
      const res = await api.get('/orders/admin/all');
      setOrders(res.data);
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await api.delete(`/products/${id}`);
        toast.success("Product deleted.");
        setProducts(products.filter(p => p.id !== id));
      } catch (err) {
        toast.error("Failed to delete product.");
      }
    }
  };

  if (loading) return <Loader fullScreen text="Verifying admin access..." />;
  if (!isAuthenticated || user?.role !== 'admin') return <Navigate to="/" replace />;
  if (isStatsLoading) return <Loader fullScreen text="Loading dashboard..." />;

  const StatCard = ({ title, value, icon, color }) => (
    <div className="glass-card p-6 rounded-3xl flex items-center gap-4 border border-gray-100 shadow-sm">
      <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-extrabold text-gray-900">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="bg-[#f8f9fa] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin Console</h1>
            <p className="text-gray-500">Welcome back, {user.name}. Manage your store here.</p>
          </div>
          <div className="flex gap-3">
             <button className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-black/20">
               <Plus size={18} /> Add Product
             </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard 
            title="Total Revenue" 
            value={`$${stats.totalRevenue.toLocaleString()}`} 
            icon={<TrendingUp size={24} />} 
            color="bg-emerald-100" 
          />
          <StatCard 
            title="Total Orders" 
            value={stats.totalOrders} 
            icon={<ShoppingBag size={24} />} 
            color="bg-indigo-100" 
          />
          <StatCard 
            title="Pending Fulfillment" 
            value={stats.pendingOrders} 
            icon={<Clock size={24} />} 
            color="bg-amber-100" 
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto no-scrollbar">
           {['overview', 'orders', 'products'].map(tab => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-6 py-4 text-sm font-bold capitalize transition-all whitespace-nowrap border-b-2 ${
                 activeTab === tab 
                 ? 'border-indigo-600 text-indigo-600' 
                 : 'border-transparent text-gray-500 hover:text-gray-800'
               }`}
             >
               {tab}
             </button>
           ))}
        </div>

        {/* Content */}
        <div className="glass-card rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm bg-white">
          
          {activeTab === 'overview' && (
             <div className="p-8">
               <h2 className="text-xl font-bold mb-6">Store Performance</h2>
               <div className="bg-gray-50 h-64 rounded-2xl flex items-center justify-center border border-dashed border-gray-300">
                  <p className="text-gray-400 italic">Analytics Chart Visualization Coming Soon...</p>
               </div>
             </div>
          )}

          {activeTab === 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm">{order.id.split('-')[0].toUpperCase()}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{order.user?.name}</div>
                        <div className="text-xs text-gray-500">{order.user?.email}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">${parseFloat(order.total_amount).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          order.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                          order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                           {order.status === 'pending' && (
                             <button 
                               onClick={() => handleUpdateStatus(order.id, 'shipped')}
                               className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                             >
                               Mark Shipped
                             </button>
                           )}
                           {order.status === 'shipped' && (
                             <button 
                               onClick={() => handleUpdateStatus(order.id, 'delivered')}
                               className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                             >
                               Mark Delivered
                             </button>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          <div className="text-sm font-bold text-gray-900 line-clamp-1">{product.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 capitalize">{product.category}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">${product.price}</td>
                      <td className="px-6 py-4">
                         <span className={`font-medium ${product.stock < 10 ? 'text-red-500' : 'text-gray-700'}`}>
                           {product.stock} units
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"><Edit size={18} /></button>
                          <button 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
