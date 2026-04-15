import asyncio
import time
import logging
from typing import Dict, Optional, Any
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
import httpx

from middleware.advanced_rate_limiter import rate_limiter, RateLimitResult
from middleware.throttler import throttler, ThrottleResult

logger = logging.getLogger("RateLimitMiddleware")

class RateLimitMiddleware:
    def __init__(self, app):
        self.app = app
        self.backend_url = "http://localhost:8000"  # Node.js backend
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        try:
            # Check rate limiting
            rate_limit_result = await rate_limiter.check_rate_limit(request)
            
            # Get endpoint configuration for throttling
            path = request.url.path
            method = request.method
            endpoint_config = rate_limiter.get_endpoint_config(path, method)
            
            # Check throttling
            throttle_result = await throttler.should_throttle(
                request, rate_limit_result, endpoint_config
            )
            
            # Handle blocking scenarios
            if not rate_limit_result.allowed:
                await self._handle_rate_limit_exceeded(request, rate_limit_result)
                return
            
            if throttle_result.should_block:
                await self._handle_throttle_block(request, throttle_result)
                return
            
            # Apply throttling delay if needed
            if throttle_result.should_delay:
                await throttler.apply_delay(throttle_result.delay_seconds)
            
            # Add rate limit headers to response
            response = await self._proxy_request(request)
            
            # Add rate limit headers
            self._add_rate_limit_headers(response, rate_limit_result)
            
            # Add throttle headers if applicable
            if throttle_result.should_delay:
                throttle_headers = throttler.get_throttle_headers(throttle_result)
                for key, value in throttle_headers.items():
                    response.headers[key] = value
            
            # Add warning headers if approaching limit
            if hasattr(rate_limit_result, 'warning_level') and rate_limit_result.warning_level > 0.7:
                response.headers["X-RateLimit-Warning"] = str(rate_limit_result.warning_level)
            
            await self._send_response(response, send)
            
        except HTTPException as e:
            await self._handle_http_exception(e, send)
        except Exception as e:
            logger.error(f"Rate limit middleware error: {e}")
            await self._handle_internal_error(send)
    
    async def _proxy_request(self, request: Request) -> Response:
        """Proxy request to backend with rate limiting context"""
        try:
            # Prepare headers for backend
            headers = dict(request.headers)
            
            # Add rate limit info to headers for backend logging
            headers["X-RateLimit-ClientIP"] = rate_limiter.get_client_ip(request)
            
            # Get user tier info
            user_tier, user_id = rate_limiter.extract_user_tier(request)
            headers["X-RateLimit-UserTier"] = user_tier.value
            if user_id:
                headers["X-RateLimit-UserID"] = user_id
            
            # Make request to backend
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Read request body
                body = await request.body()
                
                # Make the request
                response = await client.request(
                    method=request.method,
                    url=f"{self.backend_url}{request.url.path}{request.url.query}",
                    headers=headers,
                    content=body if body else None
                )
                
                # Convert to FastAPI Response
                fastapi_response = Response(
                    content=response.content,
                    status_code=response.status_code,
                    headers=dict(response.headers)
                )
                
                # Handle authentication failures for rate limiting
                if response.status_code == 401 and "/api/auth/login" in request.url.path:
                    await throttler.record_failure(
                        rate_limiter.get_client_ip(request),
                        "login"
                    )
                elif response.status_code == 200 and "/api/auth/login" in request.url.path:
                    # Clear failures on successful login
                    await throttler.clear_failures(
                        rate_limiter.get_client_ip(request),
                        "login"
                    )
                
                return fastapi_response
                
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Backend request timeout"
            )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Backend service unavailable"
            )
        except Exception as e:
            logger.error(f"Proxy request error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal proxy error"
            )
    
    async def _handle_rate_limit_exceeded(self, request: Request, result: RateLimitResult):
        """Handle rate limit exceeded scenario"""
        client_ip = rate_limiter.get_client_ip(request)
        logger.warning(f"Rate limit exceeded for {client_ip} on {request.url.path}")
        
        # Prepare error response
        error_response = JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "Rate limit exceeded",
                "message": self._get_rate_limit_message(request.url.path),
                "retry_after": result.retry_after,
                "limit": result.limit,
                "strategy": result.strategy,
                "reset_time": result.reset_time
            }
        )
        
        # Add rate limit headers
        self._add_rate_limit_headers(error_response, result)
        
        # Add retry-after header
        if result.retry_after:
            error_response.headers["Retry-After"] = str(result.retry_after)
        
        # Send response
        scope = request.scope
        receive = request.receive
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                message["headers"].extend([
                    (k.encode(), v.encode()) for k, v in error_response.headers.items()
                ])
            await send(message)
        
        await error_response(scope, receive, send_wrapper)
    
    async def _handle_throttle_block(self, request: Request, result: ThrottleResult):
        """Handle throttle block scenario"""
        client_ip = rate_limiter.get_client_ip(request)
        logger.warning(f"Throttle block for {client_ip}: {result.block_reason}")
        
        error_response = JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "Request throttled",
                "message": result.block_reason,
                "reason": "throttle_block"
            }
        )
        
        # Add throttle headers
        throttle_headers = throttler.get_throttle_headers(result)
        for key, value in throttle_headers.items():
            error_response.headers[key] = value
        
        # Send response
        scope = request.scope
        receive = request.receive
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                message["headers"].extend([
                    (k.encode(), v.encode()) for k, v in error_response.headers.items()
                ])
            await send(message)
        
        await error_response(scope, receive, send_wrapper)
    
    def _add_rate_limit_headers(self, response: Response, result: RateLimitResult):
        """Add rate limit headers to response"""
        response.headers["X-RateLimit-Limit"] = str(result.limit)
        response.headers["X-RateLimit-Remaining"] = str(result.remaining)
        response.headers["X-RateLimit-Reset"] = str(result.reset_time)
        response.headers["X-RateLimit-Strategy"] = result.strategy
        
        if result.retry_after:
            response.headers["Retry-After"] = str(result.retry_after)
    
    def _get_rate_limit_message(self, path: str) -> str:
        """Get appropriate rate limit message based on endpoint"""
        if "/api/auth/login" in path:
            return "Too many login attempts. Please wait before trying again."
        elif "/api/auth/register" in path:
            return "Too many registration attempts. Please try again later."
        elif "/api/products/search" in path:
            return "Too many search requests. Please slow down your searches."
        elif "/api/cart" in path:
            return "Too many cart operations. Please wait before continuing."
        elif "/api/orders" in path:
            return "Too many order attempts. Please wait before placing another order."
        else:
            return "Rate limit exceeded. Please try again later."
    
    async def _send_response(self, response: Response, send):
        """Send response to client"""
        await send({
            "type": "http.response.start",
            "status": response.status_code,
            "headers": [
                (k.encode(), v.encode()) for k, v in response.headers.items()
            ],
        })
        
        if hasattr(response, 'body'):
            await send({
                "type": "http.response.body",
                "body": response.body,
            })
        elif hasattr(response, 'content'):
            await send({
                "type": "http.response.body",
                "body": response.content,
            })
    
    async def _handle_http_exception(self, exception: HTTPException, send):
        """Handle HTTP exceptions"""
        response = JSONResponse(
            status_code=exception.status_code,
            content={"error": exception.detail}
        )
        await self._send_response(response, send)
    
    async def _handle_internal_error(self, send):
        """Handle internal errors"""
        response = JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Internal server error"}
        )
        await self._send_response(response, send)

# Rate limiting middleware factory
def add_rate_limit_middleware(app):
    """Add rate limiting middleware to FastAPI app"""
    return RateLimitMiddleware(app)
