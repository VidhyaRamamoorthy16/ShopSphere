import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { API_BASE } from '../config/api'

const CartContext = createContext({
  cartCount: 0,
  wishlistCount: 0,
  refreshCart: () => {},
  refreshWishlist: () => {},
})

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0)
  const [wishlistCount, setWishlistCount] = useState(0)

  const getToken = () => localStorage.getItem('token') || localStorage.getItem('shieldmart_token')
  const isLoggedIn = () => !!getToken()
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(getToken() && { 'Authorization': `Bearer ${getToken()}` })
  })

  const refreshCart = useCallback(async () => {
    if (!isLoggedIn()) { setCartCount(0); return }
    try {
      const res = await fetch(`${API_BASE}/api/cart`, { headers: getHeaders() })
      const data = await res.json()
      const items = data.cart || data.items || []
      const count = items.reduce((sum, item) => sum + (item.quantity || 1), 0)
      setCartCount(count)
    } catch (e) { setCartCount(0) }
  }, [])

  const refreshWishlist = useCallback(async () => {
    if (!isLoggedIn()) { setWishlistCount(0); return }
    try {
      const res = await fetch(`${API_BASE}/api/wishlist`, { headers: getHeaders() })
      const data = await res.json()
      const items = data.wishlist || []
      setWishlistCount(items.length)
    } catch (e) { setWishlistCount(0) }
  }, [])

  useEffect(() => {
    refreshCart()
    refreshWishlist()
    // Refresh every 30 seconds to keep counts accurate
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
