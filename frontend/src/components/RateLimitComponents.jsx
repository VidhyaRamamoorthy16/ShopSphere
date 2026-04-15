import React, { useState, useEffect } from 'react';
import { useRateLimitHandler } from '../hooks/useRateLimit';
import toast, { Toaster } from 'react-hot-toast';

// Toast notification component for rate limits
export const RateLimitToast = () => {
  const [toastQueue, setToastQueue] = useState([]);

  useEffect(() => {
    const handleRateLimitEvent = (event) => {
      const { retryAfter, message } = event.detail;
      
      const toastId = toast.error(message, {
        duration: retryAfter * 1000,
        icon: '⏱️',
        style: {
          border: '2px solid #ef4444',
          padding: '16px',
          color: '#ef4444',
          backgroundColor: '#fef2f2',
        },
      });

      setToastQueue(prev => [...prev, toastId]);
    };

    window.addEventListener('rateLimitExceeded', handleRateLimitEvent);
    
    return () => {
      window.removeEventListener('rateLimitExceeded', handleRateLimitEvent);
      toastQueue.forEach(id => toast.dismiss(id));
    };
  }, []);

  return <Toaster position="top-right" />;
};

// Rate limit aware button component
export const RateLimitButton = ({ 
  children, 
  onClick, 
  disabled = false, 
  className = '', 
  showCountdown = true,
  ...props 
}) => {
  const { isRateLimited, countdown, formatCountdown } = useRateLimitHandler();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e) => {
    if (isRateLimited || isLoading) return;
    
    setIsLoading(true);
    try {
      await onClick(e);
    } catch (error) {
      // Error is handled by the useRateLimitHandler hook
      console.error('Button click error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = disabled || isRateLimited || isLoading;

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        relative px-4 py-2 rounded-lg font-medium transition-all duration-200
        ${isDisabled 
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
          : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
        }
        ${className}
      `}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      <span className={isLoading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
      
      {isRateLimited && showCountdown && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Wait {formatCountdown(countdown)}
        </div>
      )}
    </button>
  );
};

// Login form with rate limit handling
export const RateLimitLoginForm = ({ onSubmit, loading = false }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { isRateLimited, countdown, message, formatCountdown } = useRateLimitHandler();
  const [loginLoading, setLoginLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRateLimited || loginLoading) return;

    setLoginLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is done by parent component
      console.error('Login error:', error);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
      
      {isRateLimited && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center text-red-800">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Account Temporarily Locked</span>
          </div>
          <p className="text-red-700 mt-1 text-sm">
            {message}
          </p>
          <p className="text-red-600 mt-2 text-sm font-medium">
            Try again in {formatCountdown(countdown)}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isRateLimited || loginLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isRateLimited || loginLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        <RateLimitButton
          type="submit"
          disabled={isRateLimited || loginLoading}
          className="w-full"
          showCountdown={true}
        >
          {loginLoading ? 'Signing in...' : 'Sign in'}
        </RateLimitButton>
      </form>
    </div>
  );
};

// Search input with rate limit handling
export const RateLimitSearchInput = ({ 
  onSearch, 
  placeholder = "Search...", 
  debounceMs = 300 
}) => {
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const { isRateLimited, countdown, message, formatCountdown } = useRateLimitHandler();
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Don't search if rate limited or query is empty
    if (isRateLimited || !value.trim()) {
      return;
    }

    // Debounce search
    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      try {
        await onSearch(value);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearchLoading(false);
      }
    }, debounceMs);

    setSearchTimeout(timeout);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={isRateLimited}
          className={`
            w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
            ${isRateLimited 
              ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-500' 
              : 'border-gray-300'
            }
          `}
        />
        
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          {searchLoading ? (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {isRateLimited && (
        <div className="absolute z-10 w-full mt-1 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {message}
          </div>
          <div className="text-xs mt-1">
            Wait {formatCountdown(countdown)} to search again
          </div>
        </div>
      )}
    </div>
  );
};

// Cart operations with rate limit handling
export const RateLimitCartButton = ({ 
  children, 
  onCartAction, 
  action = "add", 
  className = '' 
}) => {
  const { isRateLimited, countdown, formatCountdown } = useRateLimitHandler();
  const [actionLoading, setActionLoading] = useState(false);

  const handleCartAction = async () => {
    if (isRateLimited || actionLoading) return;

    setActionLoading(true);
    try {
      await onCartAction();
    } catch (error) {
      console.error('Cart action error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getActionText = () => {
    if (actionLoading) return 'Processing...';
    if (isRateLimited) return `Wait ${formatCountdown(countdown)}`;
    return children;
  };

  return (
    <button
      onClick={handleCartAction}
      disabled={isRateLimited || actionLoading}
      className={`
        relative px-4 py-2 rounded-lg font-medium transition-all duration-200
        ${isRateLimited || actionLoading
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
        }
        ${className}
      `}
    >
      <div className="flex items-center justify-center">
        {actionLoading && (
          <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        
        {isRateLimited && (
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )}
        
        {getActionText()}
      </div>
    </button>
  );
};

// Order placement with rate limit handling
export const RateLimitCheckoutButton = ({ 
  onCheckout, 
  cartItems, 
  totalAmount, 
  disabled = false 
}) => {
  const { isRateLimited, countdown, message, formatCountdown } = useRateLimitHandler();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleCheckout = async () => {
    if (isRateLimited || checkoutLoading || disabled) return;

    setCheckoutLoading(true);
    try {
      await onCheckout();
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const isDisabled = disabled || isRateLimited || checkoutLoading || cartItems.length === 0;

  return (
    <div className="border-t pt-4">
      {isRateLimited && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center text-yellow-800">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Order Processing Delay</span>
          </div>
          <p className="text-yellow-700 mt-1 text-sm">
            {message || 'Please wait before placing another order.'}
          </p>
          <p className="text-yellow-600 mt-2 text-sm font-medium">
            You can place another order in {formatCountdown(countdown)}
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <span className="text-lg font-semibold">Total:</span>
        <span className="text-2xl font-bold text-green-600">
          ${totalAmount.toFixed(2)}
        </span>
      </div>

      <button
        onClick={handleCheckout}
        disabled={isDisabled}
        className={`
          w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200
          ${isDisabled
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 active:scale-95'
          }
        `}
      >
        {checkoutLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing Order...
          </div>
        ) : isRateLimited ? (
          <div className="flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Wait {formatCountdown(countdown)}
          </div>
        ) : cartItems.length === 0 ? (
          'Add items to cart'
        ) : (
          'Place Order'
        )}
      </button>
    </div>
  );
};

// Rate limit status indicator
export const RateLimitStatusIndicator = () => {
  const [status, setStatus] = useState({
    remaining: null,
    limit: null,
    percentage: 0
  });

  useEffect(() => {
    const updateStatus = () => {
      // This would typically come from your last API response
      const remaining = parseInt(sessionStorage.getItem('rateLimitRemaining') || '100');
      const limit = parseInt(sessionStorage.getItem('rateLimitLimit') || '100');
      
      setStatus({
        remaining,
        limit,
        percentage: limit > 0 ? ((limit - remaining) / limit) * 100 : 0
      });
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (status.percentage > 80) return 'bg-red-500';
    if (status.percentage > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (status.remaining === null) return null;

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className="flex items-center">
        <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor()}`} />
        <span className="text-gray-600">
          API Limit: {status.remaining}/{status.limit}
        </span>
      </div>
      
      {status.percentage > 60 && (
        <div className="w-20 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
            style={{ width: `${status.percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};
