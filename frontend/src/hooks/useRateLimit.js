import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Rate limit hook for handling 429 responses
export const useRateLimitHandler = (axiosError = null) => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (axiosError && axiosError.response?.status === 429) {
      handleRateLimitError(axiosError.response);
    }
  }, [axiosError]);

  useEffect(() => {
    let interval;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setIsRateLimited(false);
            setRetryAfter(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleRateLimitError = useCallback((response) => {
    const retryAfter = response.headers['retry-after'] || response.data?.retry_after || 60;
    const message = response.data?.message || 'Too many requests. Please try again later.';
    const limit = response.headers['x-ratelimit-limit'];
    const strategy = response.headers['x-ratelimit-strategy'];

    setIsRateLimited(true);
    setRetryAfter(parseInt(retryAfter));
    setCountdown(parseInt(retryAfter));
    setMessage(message);

    // Log rate limit info for debugging
    console.warn('Rate limit exceeded:', {
      retryAfter,
      limit,
      strategy,
      message
    });
  }, []);

  const reset = useCallback(() => {
    setIsRateLimited(false);
    setRetryAfter(0);
    setCountdown(0);
    setMessage('');
  }, []);

  const formatCountdown = useCallback((seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }, []);

  return {
    isRateLimited,
    retryAfter,
    countdown,
    message,
    formatCountdown,
    reset,
    handleRateLimitError
  };
};

// Rate limit context for global state
import { createContext, useContext } from 'react';

const RateLimitContext = createContext();

export const RateLimitProvider = ({ children }) => {
  const [globalRateLimit, setGlobalRateLimit] = useState({
    isLimited: false,
    message: '',
    retryAfter: 0
  });

  const setGlobalLimit = useCallback((isLimited, message, retryAfter) => {
    setGlobalRateLimit({
      isLimited,
      message,
      retryAfter
    });
  }, []);

  return (
    <RateLimitContext.Provider value={{ globalRateLimit, setGlobalLimit }}>
      {children}
    </RateLimitContext.Provider>
  );
};

export const useGlobalRateLimit = () => {
  const context = useContext(RateLimitContext);
  if (!context) {
    throw new Error('useGlobalRateLimit must be used within RateLimitProvider');
  }
  return context;
};

// Enhanced axios with rate limit handling
export const createRateLimitAwareAxios = (baseURL) => {
  const instance = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for rate limit headers
  instance.interceptors.request.use(
    (config) => {
      // Add client timestamp for debugging
      config.headers['X-Client-Timestamp'] = new Date().toISOString();
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for rate limit handling
  instance.interceptors.response.use(
    (response) => {
      // Check for rate limit warning headers
      const warningHeader = response.headers['x-ratelimit-warning'];
      const remainingHeader = response.headers['x-ratelimit-remaining'];
      const limitHeader = response.headers['x-ratelimit-limit'];

      if (warningHeader) {
        const warningLevel = parseFloat(warningHeader);
        console.warn(`Rate limit warning: ${(warningLevel * 100).toFixed(0)}% used`);
        
        // Optionally show warning to user
        if (warningLevel > 0.8) {
          // You could dispatch a toast here
          console.warn('Approaching rate limit');
        }
      }

      // Log rate limit info for debugging
      if (remainingHeader && limitHeader) {
        console.debug(`Rate limit: ${remainingHeader}/${limitHeader} remaining`);
      }

      return response;
    },
    (error) => {
      if (error.response?.status === 429) {
        // Handle rate limit error
        const response = error.response;
        const retryAfter = response.headers['retry-after'] || response.data?.retry_after || 60;
        const message = response.data?.message || 'Too many requests. Please try again later.';
        
        // Store rate limit info for components to use
        error.rateLimitInfo = {
          retryAfter: parseInt(retryAfter),
          message,
          limit: response.headers['x-ratelimit-limit'],
          remaining: response.headers['x-ratelimit-remaining'],
          strategy: response.headers['x-ratelimit-strategy'],
          resetTime: response.headers['x-ratelimit-reset']
        };

        // Emit custom event for global handling
        window.dispatchEvent(new CustomEvent('rateLimitExceeded', {
          detail: error.rateLimitInfo
        }));
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// Retry mechanism for rate-limited requests
export const retryWithBackoff = async (requestFn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      if (error.response?.status === 429 && attempt < maxRetries) {
        const retryAfter = error.rateLimitInfo?.retryAfter || baseDelay;
        const delay = Math.min(retryAfter * 1000, baseDelay * Math.pow(2, attempt));
        
        console.warn(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      break;
    }
  }
  
  throw lastError;
};

// Rate limit aware API service
export class RateLimitAwareAPI {
  constructor(baseURL) {
    this.axios = createRateLimitAwareAxios(baseURL);
    this.requestQueue = new Map();
  }

  async request(config) {
    const key = `${config.method || 'GET'}-${config.url}`;
    
    // Check if there's a pending request for the same endpoint
    if (this.requestQueue.has(key)) {
      console.warn(`Request to ${key} is already in progress, queuing...`);
      return this.requestQueue.get(key);
    }

    const requestPromise = retryWithBackoff(() => this.axios.request(config))
      .finally(() => {
        this.requestQueue.delete(key);
      });

    this.requestQueue.set(key, requestPromise);
    return requestPromise;
  }

  // Convenience methods
  get(url, config) {
    return this.request({ ...config, method: 'GET', url });
  }

  post(url, data, config) {
    return this.request({ ...config, method: 'POST', url, data });
  }

  put(url, data, config) {
    return this.request({ ...config, method: 'PUT', url, data });
  }

  delete(url, config) {
    return this.request({ ...config, method: 'DELETE', url });
  }
}

// Custom hook for API calls with rate limit handling
export const useRateLimitAPI = (baseURL) => {
  const [api] = useState(() => new RateLimitAwareAPI(baseURL));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { handleRateLimitError } = useRateLimitHandler();

  const executeRequest = useCallback(async (requestFn) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await requestFn();
      return result;
    } catch (err) {
      setError(err);
      
      if (err.response?.status === 429) {
        handleRateLimitError(err.response);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleRateLimitError]);

  return {
    api,
    loading,
    error,
    executeRequest
  };
};

// Rate limit status monitor hook
export const useRateLimitMonitor = () => {
  const [status, setStatus] = useState({
    remaining: null,
    limit: null,
    resetTime: null,
    warning: null
  });

  useEffect(() => {
    const handleRateLimitEvent = (event) => {
      const { retryAfter, limit, remaining, resetTime } = event.detail;
      
      setStatus({
        remaining,
        limit,
        resetTime,
        warning: remaining && limit ? (limit - remaining) / limit : null
      });
    };

    window.addEventListener('rateLimitExceeded', handleRateLimitEvent);
    
    return () => {
      window.removeEventListener('rateLimitExceeded', handleRateLimitEvent);
    };
  }, []);

  const getStatusColor = useCallback(() => {
    if (!status.warning) return 'green';
    if (status.warning > 0.8) return 'red';
    if (status.warning > 0.6) return 'orange';
    return 'yellow';
  }, [status.warning]);

  return {
    status,
    getStatusColor
  };
};

// Debounced request hook to prevent rate limiting
export const useDebouncedRequest = (delay = 300) => {
  const [pendingRequest, setPendingRequest] = useState(null);

  const debouncedExecute = useCallback(
    (requestFn) => {
      if (pendingRequest) {
        clearTimeout(pendingRequest);
      }

      const newPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(async () => {
          try {
            const result = await requestFn();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            setPendingRequest(null);
          }
        }, delay);

        setPendingRequest(timeoutId);
      });

      return newPromise;
    },
    [delay, pendingRequest]
  );

  const cancel = useCallback(() => {
    if (pendingRequest) {
      clearTimeout(pendingRequest);
      setPendingRequest(null);
    }
  }, [pendingRequest]);

  return { debouncedExecute, cancel };
};
