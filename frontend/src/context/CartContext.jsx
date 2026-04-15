import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../config/api';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  const refreshCart = async () => {
    if (!api.isLoggedIn()) {
      const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartCount(savedCart.reduce((sum, item) => sum + item.quantity, 0));
      return;
    }
    try {
      const data = await api.get('/api/cart');
      const cart = data.cart || [];
      setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
    } catch (e) {
      setCartCount(0);
    }
  };

  const refreshWishlist = async () => {
    if (!api.isLoggedIn()) { setWishlistCount(0); return; }
    try {
      const data = await api.get('/api/wishlist');
      setWishlistCount((data.wishlist || []).length);
    } catch (e) { setWishlistCount(0); }
  };

  useEffect(() => {
    refreshCart();
    refreshWishlist();
  }, []);

  const value = {
    cartCount,
    wishlistCount,
    refreshCart,
    refreshWishlist
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
