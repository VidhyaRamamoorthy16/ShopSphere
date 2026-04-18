import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import ToastContainer from './components/Toast'

// Lazy load pages for faster initial load
const Home        = lazy(() => import('./pages/Home'))
const Products    = lazy(() => import('./pages/Products'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Cart        = lazy(() => import('./pages/Cart'))
const Wishlist    = lazy(() => import('./pages/Wishlist'))
const Login       = lazy(() => import('./pages/Login'))
const Register    = lazy(() => import('./pages/Register'))
const Dashboard   = lazy(() => import('./pages/Dashboard'))
const Contact     = lazy(() => import('./pages/Contact'))
const OrderTracking = lazy(() => import('./pages/OrderTracking'))

const NotFound = () => (
  <div style={{textAlign:'center',padding:'4rem'}}>
    <h1 style={{fontSize:'4rem',color:'#2563eb'}}>404</h1>
    <p style={{fontSize:'1.2rem',color:'#6b7280',marginBottom:'2rem'}}>Page not found</p>
    <a href="/" style={{color:'#2563eb',textDecoration:'none',fontWeight:600}}>Go Home →</a>
  </div>
)

const Loader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#f9fafb',
  }}>
    <div style={{
      width: 48, height: 48, border: '4px solid #e5e7eb',
      borderTop: '4px solid #2563eb', borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
)

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <CartProvider>
      <Router>
        <ToastContainer />
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/"                element={<Home />} />
            <Route path="/products"        element={<Products />} />
            <Route path="/products/:id"    element={<ProductDetail />} />
            <Route path="/categories"      element={<Products />} />
            <Route path="/contact"         element={<Contact />} />
            <Route path="/login"           element={<Login />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/cart"            element={<PrivateRoute><Cart /></PrivateRoute>} />
            <Route path="/wishlist"        element={<PrivateRoute><Wishlist /></PrivateRoute>} />
            <Route path="/dashboard"       element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/orders/:id/track" element={<PrivateRoute><OrderTracking /></PrivateRoute>} />
            <Route path="*"               element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </CartProvider>
  )
}
