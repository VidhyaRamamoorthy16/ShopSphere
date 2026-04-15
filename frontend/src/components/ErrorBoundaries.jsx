import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// Base Error Boundary Class
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    this.logError(error, errorInfo);
  }

  logError = (error, errorInfo) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, LogRocket, or custom endpoint
      try {
        // fetch('/api/errors', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     error: error.toString(),
        //     stack: error.stack,
        //     componentStack: errorInfo.componentStack,
        //     timestamp: new Date().toISOString(),
        //     userAgent: navigator.userAgent,
        //     url: window.location.href
        //   })
        // });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }
  };

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { 
      children, 
      fallback, 
      showRetry = true, 
      maxRetries = 3,
      customMessage,
      onError
    } = this.props;

    if (hasError) {
      // Call custom error handler if provided
      if (onError) {
        onError(error, errorInfo);
      }

      // Use custom fallback if provided
      if (fallback) {
        return fallback({ error, errorInfo, retry: this.handleRetry, reset: this.handleReset });
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {customMessage || 'Something went wrong'}
            </h2>
            
            <p className="text-gray-600 mb-6">
              {retryCount > 0 
                ? `We're having trouble loading this. This is attempt ${retryCount + 1} of ${maxRetries}.`
                : 'An unexpected error occurred. Please try again or contact support if the problem persists.'
              }
            </p>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-left">
                  <div className="mb-2">
                    <strong>Error:</strong> {error.toString()}
                  </div>
                  {error.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                    </div>
                  )}
                  {errorInfo && (
                    <div className="mt-2">
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">{errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {showRetry && retryCount < maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>
              )}
              
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <Home size={16} />
                Go to Homepage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Cart-specific Error Boundary
export const CartErrorBoundary = ({ children }) => {
  const cartFallback = ({ error, retry, reset }) => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 m-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-yellow-600 mt-1" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-800 mb-2">
            Cart Loading Issue
          </h3>
          <p className="text-yellow-700 text-sm mb-4">
            We're having trouble loading your cart. This might be due to a connection issue or temporary server problem.
          </p>
          <div className="flex gap-2">
            <button
              onClick={retry}
              className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700 transition-colors"
            >
              Retry Loading Cart
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded text-sm hover:bg-yellow-200 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      fallback={cartFallback}
      maxRetries={3}
      customMessage="Cart loading failed"
      onError={(error) => {
        // Track cart-specific errors
        console.error('Cart Error Boundary:', error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

// Checkout-specific Error Boundary
export const CheckoutErrorBoundary = ({ children }) => {
  const checkoutFallback = ({ error, retry, reset }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-red-600 mt-1" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-red-800 mb-2">
            Checkout Process Interrupted
          </h3>
          <p className="text-red-700 text-sm mb-4">
            There was an issue with the checkout process. Your cart items are safe, but we need to restart the checkout.
          </p>
          <div className="bg-white rounded p-3 mb-4">
            <p className="text-xs text-gray-600">
              <strong>What to do:</strong>
            </p>
            <ul className="text-xs text-gray-600 mt-1 space-y-1">
              <li>• Your cart items have been saved</li>
              <li>• No payment has been processed</li>
              <li>• You can safely retry the checkout</li>
            </ul>
          </div>
          <div className="flex gap-2">
            <button
              onClick={retry}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
            >
              Restart Checkout
            </button>
            <button
              onClick={() => window.location.href = '/cart'}
              className="bg-red-100 text-red-800 px-4 py-2 rounded text-sm hover:bg-red-200 transition-colors"
            >
              Back to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      fallback={checkoutFallback}
      maxRetries={2}
      customMessage="Checkout process failed"
      onError={(error) => {
        // Track checkout-specific errors (critical for business)
        console.error('Checkout Error Boundary:', error);
        // In production, send immediate alert to monitoring
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

// Product-specific Error Boundary
export const ProductErrorBoundary = ({ children }) => {
  const productFallback = ({ error, retry }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <div className="bg-gray-200 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="text-gray-600" size={24} />
      </div>
      <h3 className="font-semibold text-gray-800 mb-2">
        Product Unavailable
      </h3>
      <p className="text-gray-600 text-sm mb-4">
        We couldn't load this product. It might be temporarily unavailable or has been removed.
      </p>
      <div className="flex gap-2 justify-center">
        <button
          onClick={retry}
          className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.href = '/products'}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300 transition-colors"
        >
          Browse Products
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      fallback={productFallback}
      maxRetries={2}
      customMessage="Product loading failed"
    >
      {children}
    </ErrorBoundary>
  );
};

// Async Error Boundary for API calls
export const AsyncErrorBoundary = ({ children }) => {
  const asyncFallback = ({ error, retry }) => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 m-2">
      <div className="flex items-center gap-3">
        <AlertTriangle className="text-blue-600" size={16} />
        <div className="flex-1">
          <p className="text-blue-800 text-sm font-medium">
            Connection Issue
          </p>
          <p className="text-blue-700 text-xs">
            Having trouble connecting to the server.
          </p>
        </div>
        <button
          onClick={retry}
          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      fallback={asyncFallback}
      maxRetries={5}
      customMessage="Connection failed"
    >
      {children}
    </ErrorBoundary>
  );
};

// Hook for handling async errors in components
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error) => {
    console.error('Async error captured:', error);
    setError(error);
  }, []);

  // Throw error to be caught by ErrorBoundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

export default ErrorBoundary;
