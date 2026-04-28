import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const CartContext = createContext({
  cartCount: 0,
  wishlistCount: 0,
  refreshCart: () => {},
  refreshWishlist: () => {},
})

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0)
  const [wishlistCount, setWishlistCount] = useState(0)

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(localStorage.getItem('token') && {
      'Authorization': `Bearer ${localStorage.getItem('token')}` 
    })
  })

  const isLoggedIn = () => !!localStorage.getItem('token')

  const refreshCart = useCallback(async () => {
    if (!isLoggedIn()) {
      setCartCount(0)
      return
    }
    try {
      const res = await fetch(`${API_BASE}/api/cart`, { headers: getHeaders() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const items = data.cart || data.items || []
      const total = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0)
      setCartCount(total)
    } catch (err) {
      console.error('Cart refresh error:', err)
      setCartCount(0)
    }
  }, [])

  const refreshWishlist = useCallback(async () => {
    if (!isLoggedIn()) {
      setWishlistCount(0)
      return
    }
    try {
      const res = await fetch(`${API_BASE}/api/wishlist`, { headers: getHeaders() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setWishlistCount((data.wishlist || []).length)
    } catch (err) {
      console.error('Wishlist refresh error:', err)
      setWishlistCount(0)
    }
  }, [])

  useEffect(() => {
    refreshCart()
    refreshWishlist()
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      refreshCart()
      refreshWishlist()
    }, 30000)
    return () => clearInterval(interval)
  }, [refreshCart, refreshWishlist])

  return (
    <CartContext.Provider value={{ cartCount, wishlistCount, refreshCart, refreshWishlist }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
export default CartContext
