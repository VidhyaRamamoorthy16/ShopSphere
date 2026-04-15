import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import api from '../services/api';

// BroadcastChannel name for cart synchronization
const CART_CHANNEL = 'ecommerce_cart_sync';

// Action types
const CART_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_CART: 'SET_CART',
  ADD_ITEM: 'ADD_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  CLEAR_CART: 'CLEAR_CART',
  SET_ERROR: 'SET_ERROR',
  SYNC_FROM_TAB: 'SYNC_FROM_TAB'
};

// Initial state
const initialState = {
  items: [],
  total: 0,
  itemCount: 0,
  isLoading: false,
  error: null,
  lastSync: null
};

// Reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    case CART_ACTIONS.SET_CART:
      return {
        ...state,
        items: action.payload.items,
        total: action.payload.total,
        itemCount: action.payload.itemCount,
        isLoading: false,
        lastSync: Date.now()
      };
    
    case CART_ACTIONS.ADD_ITEM:
      return {
        ...state,
        items: [...state.items, action.payload],
        total: calculateTotal([...state.items, action.payload]),
        itemCount: calculateItemCount([...state.items, action.payload]),
        lastSync: Date.now()
      };
    
    case CART_ACTIONS.UPDATE_ITEM:
      return {
        ...state,
        items: state.items.map(item =>
          item.product.id === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
        total: calculateTotal(state.items.map(item =>
          item.product.id === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        )),
        itemCount: calculateItemCount(state.items.map(item =>
          item.product.id === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        )),
        lastSync: Date.now()
      };
    
    case CART_ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        items: state.items.filter(item => item.product.id !== action.payload),
        total: calculateTotal(state.items.filter(item => item.product.id !== action.payload)),
        itemCount: calculateItemCount(state.items.filter(item => item.product.id !== action.payload)),
        lastSync: Date.now()
      };
    
    case CART_ACTIONS.CLEAR_CART:
      return {
        ...state,
        items: [],
        total: 0,
        itemCount: 0,
        lastSync: Date.now()
      };
    
    case CART_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    
    case CART_ACTIONS.SYNC_FROM_TAB:
      return {
        ...state,
        items: action.payload.items,
        total: action.payload.total,
        itemCount: action.payload.itemCount,
        lastSync: Date.now()
      };
    
    default:
      return state;
  }
};

// Helper functions
const calculateTotal = (items) => {
  return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
};

const calculateItemCount = (items) => {
  return items.reduce((count, item) => count + item.quantity, 0);
};

// Create context
const CartContext = createContext();

// Provider component
export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const broadcastChannel = useRef(null);
  const isUpdatingFromServer = useRef(false);
  const tabId = useRef(Math.random().toString(36).substr(2, 9));

  // Initialize BroadcastChannel
  useEffect(() => {
    try {
      broadcastChannel.current = new BroadcastChannel(CART_CHANNEL);
      
      // Listen for messages from other tabs
      broadcastChannel.current.onmessage = (event) => {
        const { type, data, senderTabId } = event.data;
        
        // Ignore messages from this tab
        if (senderTabId === tabId.current) {
          return;
        }
        
        switch (type) {
          case 'CART_UPDATED':
            // Sync cart from another tab
            dispatch({
              type: CART_ACTIONS.SYNC_FROM_TAB,
              payload: data
            });
            break;
            
          case 'CART_CLEARED':
            dispatch({ type: CART_ACTIONS.CLEAR_CART });
            break;
            
          default:
            break;
        }
      };
      
      // Notify other tabs when this tab becomes visible
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          // Request latest cart data from server
          fetchCart();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        if (broadcastChannel.current) {
          broadcastChannel.current.close();
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } catch (error) {
      console.warn('BroadcastChannel not supported:', error);
    }
  }, []);

  // Broadcast cart changes to other tabs
  const broadcastCartChange = (type, data) => {
    if (broadcastChannel.current) {
      try {
        broadcastChannel.current.postMessage({
          type,
          data,
          senderTabId: tabId.current,
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn('Failed to broadcast cart change:', error);
      }
    }
  };

  // Fetch cart from server
  const fetchCart = async () => {
    if (isUpdatingFromServer.current) return;
    
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      
      const response = await api.get('/cart');
      const cartData = response.data;
      
      const items = cartData.items || [];
      const total = calculateTotal(items);
      const itemCount = calculateItemCount(items);
      
      dispatch({
        type: CART_ACTIONS.SET_CART,
        payload: { items, total, itemCount }
      });
      
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      dispatch({
        type: CART_ACTIONS.SET_ERROR,
        payload: 'Failed to load cart'
      });
    }
  };

  // Add item to cart
  const addToCart = async (product, quantity = 1) => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      
      const response = await api.post('/cart', {
        productId: product.id,
        quantity
      });
      
      const cartItem = {
        product,
        quantity,
        id: response.data.id
      };
      
      dispatch({
        type: CART_ACTIONS.ADD_ITEM,
        payload: cartItem
      });
      
      // Broadcast to other tabs
      broadcastCartChange('CART_UPDATED', {
        items: [...state.items, cartItem],
        total: calculateTotal([...state.items, cartItem]),
        itemCount: calculateItemCount([...state.items, cartItem])
      });
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to add item to cart';
      dispatch({
        type: CART_ACTIONS.SET_ERROR,
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  // Update item quantity
  const updateQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }
    
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      
      // Find the cart item
      const cartItem = state.items.find(item => item.product.id === productId);
      if (!cartItem) {
        throw new Error('Item not found in cart');
      }
      
      await api.put(`/cart/${cartItem.id}`, { quantity });
      
      dispatch({
        type: CART_ACTIONS.UPDATE_ITEM,
        payload: { productId, quantity }
      });
      
      // Broadcast to other tabs
      const updatedItems = state.items.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      );
      
      broadcastCartChange('CART_UPDATED', {
        items: updatedItems,
        total: calculateTotal(updatedItems),
        itemCount: calculateItemCount(updatedItems)
      });
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update item';
      dispatch({
        type: CART_ACTIONS.SET_ERROR,
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      
      // Find the cart item
      const cartItem = state.items.find(item => item.product.id === productId);
      if (!cartItem) {
        throw new Error('Item not found in cart');
      }
      
      await api.delete(`/cart/${cartItem.id}`);
      
      dispatch({
        type: CART_ACTIONS.REMOVE_ITEM,
        payload: productId
      });
      
      // Broadcast to other tabs
      const updatedItems = state.items.filter(item => item.product.id !== productId);
      
      broadcastCartChange('CART_UPDATED', {
        items: updatedItems,
        total: calculateTotal(updatedItems),
        itemCount: calculateItemCount(updatedItems)
      });
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to remove item';
      dispatch({
        type: CART_ACTIONS.SET_ERROR,
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      
      await api.delete('/cart');
      
      dispatch({ type: CART_ACTIONS.CLEAR_CART });
      
      // Broadcast to other tabs
      broadcastCartChange('CART_CLEARED');
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to clear cart';
      dispatch({
        type: CART_ACTIONS.SET_ERROR,
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  // Sync cart with server (useful when coming back to the tab)
  const syncCart = async () => {
    await fetchCart();
  };

  // Fetch cart on mount
  useEffect(() => {
    fetchCart();
  }, []);

  // Periodic sync for long-running tabs
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (!document.hidden) {
        fetchCart();
      }
    }, 30000); // Sync every 30 seconds when tab is visible

    return () => clearInterval(syncInterval);
  }, []);

  const value = {
    ...state,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    syncCart,
    refetch: fetchCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
