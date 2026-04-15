#!/usr/bin/env python3
"""
Comprehensive test script for rate limiting and throttling system
Tests all endpoints, strategies, and edge cases
"""

import asyncio
import aiohttp
import time
import json
import logging
from typing import List, Dict, Any
from datetime import datetime
import random
import string

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(name)s | %(levelname)s | %(message)s'
)
logger = logging.getLogger("RateLimitTest")

class RateLimitTester:
    def __init__(self, base_url: str = "http://localhost:5001"):
        self.base_url = base_url
        self.session = None
        self.test_results = []
        
        # Test configurations
        self.test_endpoints = {
            "login": {
                "url": "/api/auth/login",
                "method": "POST",
                "data": {"email": "test@example.com", "password": "wrongpassword"},
                "expected_limit": 5,
                "window": 900,  # 15 minutes
                "strategy": "fixed"
            },
            "register": {
                "url": "/api/auth/register",
                "method": "POST",
                "data": {"email": "newuser@example.com", "password": "password123"},
                "expected_limit": 3,
                "window": 3600,  # 1 hour
                "strategy": "fixed"
            },
            "products": {
                "url": "/api/products",
                "method": "GET",
                "expected_limit": 60,
                "window": 60,  # 1 minute
                "strategy": "sliding"
            },
            "search": {
                "url": "/api/products?q=test",
                "method": "GET",
                "expected_limit": 20,
                "window": 60,  # 1 minute
                "strategy": "sliding"
            },
            "cart": {
                "url": "/api/cart",
                "method": "POST",
                "data": {"product_id": "123", "quantity": 1},
                "expected_limit": 30,
                "window": 60,  # 1 minute
                "strategy": "bucket"
            },
            "orders": {
                "url": "/api/orders",
                "method": "POST",
                "data": {"items": [{"product_id": "123", "quantity": 1}]},
                "expected_limit": 5,
                "window": 60,  # 1 minute
                "strategy": "sliding"
            }
        }
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            base_url=self.base_url,
            timeout=aiohttp.ClientTimeout(total=30)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_endpoint(self, endpoint_name: str, test_config: Dict[str, Any]) -> Dict[str, Any]:
        """Test a specific endpoint for rate limiting"""
        logger.info(f"Testing {endpoint_name} endpoint...")
        
        results = {
            "endpoint": endpoint_name,
            "strategy": test_config["strategy"],
            "expected_limit": test_config["expected_limit"],
            "requests_made": 0,
            "requests_blocked": 0,
            "requests_allowed": 0,
            "first_block_time": None,
            "rate_limit_headers": [],
            "throttle_delays": [],
            "errors": []
        }
        
        start_time = time.time()
        
        # Make requests until we hit the limit
        for i in range(test_config["expected_limit"] + 5):  # Go 5 over the limit
            try:
                request_start = time.time()
                
                # Prepare request
                kwargs = {"method": test_config["method"]}
                if test_config["method"] in ["POST", "PUT"]:
                    kwargs["json"] = test_config["data"]
                
                # Add unique identifier for register tests
                if endpoint_name == "register":
                    kwargs["json"]["email"] = f"test{i}_{int(time.time())}@example.com"
                
                # Make request
                async with self.session.request(test_config["url"], **kwargs) as response:
                    request_time = time.time() - request_start
                    
                    results["requests_made"] += 1
                    
                    # Collect headers
                    headers = dict(response.headers)
                    results["rate_limit_headers"].append({
                        "request": i + 1,
                        "status": response.status,
                        "x-ratelimit-limit": headers.get("x-ratelimit-limit"),
                        "x-ratelimit-remaining": headers.get("x-ratelimit-remaining"),
                        "x-ratelimit-reset": headers.get("x-ratelimit-reset"),
                        "x-ratelimit-strategy": headers.get("x-ratelimit-strategy"),
                        "retry-after": headers.get("retry-after"),
                        "x-throttle-delay": headers.get("x-throttle-delay"),
                        "request_time": request_time
                    })
                    
                    if response.status == 429:
                        results["requests_blocked"] += 1
                        if not results["first_block_time"]:
                            results["first_block_time"] = time.time() - start_time
                        
                        # Parse error response
                        error_data = await response.json()
                        results["errors"].append({
                            "request": i + 1,
                            "error": error_data.get("error"),
                            "message": error_data.get("message"),
                            "retry_after": error_data.get("retry_after")
                        })
                        
                        logger.info(f"Request {i+1} blocked: {error_data.get('message')}")
                        
                    else:
                        results["requests_allowed"] += 1
                        
                        # Check for throttle delay
                        throttle_delay = headers.get("x-throttle-delay")
                        if throttle_delay:
                            results["throttle_delays"].append({
                                "request": i + 1,
                                "delay": float(throttle_delay)
                            })
                            logger.info(f"Request {i+1} throttled with {throttle_delay}s delay")
                    
                    # Small delay between requests
                    await asyncio.sleep(0.1)
                    
            except Exception as e:
                logger.error(f"Request {i+1} failed: {e}")
                results["errors"].append({
                    "request": i + 1,
                    "error": str(e)
                })
        
        results["total_time"] = time.time() - start_time
        
        return results
    
    async def test_login_failure_throttling(self):
        """Test login failure throttling specifically"""
        logger.info("Testing login failure throttling...")
        
        results = {
            "test": "login_failure_throttling",
            "attempts": [],
            "throttle_delays": [],
            "blocked": False
        }
        
        # Make 6 failed login attempts to test all thresholds
        for i in range(6):
            try:
                start_time = time.time()
                
                async with self.session.post(
                    "/api/auth/login",
                    json={"email": "test@example.com", "password": f"wrong{i}"}
                ) as response:
                    request_time = time.time() - start_time
                    
                    headers = dict(response.headers)
                    
                    attempt_result = {
                        "attempt": i + 1,
                        "status": response.status,
                        "request_time": request_time,
                        "throttle_delay": headers.get("x-throttle-delay"),
                        "throttle_block": headers.get("x-throttle-block")
                    }
                    
                    if response.status == 429:
                        error_data = await response.json()
                        attempt_result["error"] = error_data.get("message")
                        results["blocked"] = True
                    
                    results["attempts"].append(attempt_result)
                    
                    if headers.get("x-throttle-delay"):
                        delay = float(headers["x-throttle-delay"])
                        results["throttle_delays"].append(delay)
                        logger.info(f"Login attempt {i+1}: {delay}s throttle delay")
                    
            except Exception as e:
                logger.error(f"Login attempt {i+1} failed: {e}")
                results["attempts"].append({
                    "attempt": i + 1,
                    "error": str(e)
                })
        
        return results
    
    async def test_sliding_window_accuracy(self):
        """Test sliding window accuracy over time"""
        logger.info("Testing sliding window accuracy...")
        
        results = {
            "test": "sliding_window_accuracy",
            "bursts": []
        }
        
        # Test multiple bursts within the window
        for burst in range(3):
            logger.info(f"Testing burst {burst + 1}/3")
            
            burst_results = {
                "burst": burst + 1,
                "requests": [],
                "start_time": time.time()
            }
            
            # Make rapid requests
            for i in range(10):
                try:
                    start_time = time.time()
                    
                    async with self.session.get("/api/products") as response:
                        request_time = time.time() - start_time
                        
                        headers = dict(response.headers)
                        
                        burst_results["requests"].append({
                            "request": i + 1,
                            "status": response.status,
                            "remaining": headers.get("x-ratelimit-remaining"),
                            "request_time": request_time
                        })
                        
                        if response.status == 429:
                            logger.info(f"Burst {burst + 1}, request {i + 1} blocked")
                            break
                
                except Exception as e:
                    logger.error(f"Burst {burst + 1}, request {i + 1} failed: {e}")
            
            burst_results["end_time"] = time.time()
            burst_results["duration"] = burst_results["end_time"] - burst_results["start_time"]
            results["bursts"].append(burst_results)
            
            # Wait between bursts
            await asyncio.sleep(20)
        
        return results
    
    async def test_token_bucket_burst(self):
        """Test token bucket burst capacity"""
        logger.info("Testing token bucket burst capacity...")
        
        results = {
            "test": "token_bucket_burst",
            "burst_requests": [],
            "refill_test": []
        }
        
        # Test burst capacity (make rapid requests)
        for i in range(15):  # Should exceed burst capacity
            try:
                start_time = time.time()
                
                async with self.session.post(
                    "/api/cart",
                    json={"product_id": f"product_{i}", "quantity": 1}
                ) as response:
                    request_time = time.time() - start_time
                    
                    headers = dict(response.headers)
                    
                    results["burst_requests"].append({
                        "request": i + 1,
                        "status": response.status,
                        "remaining": headers.get("x-ratelimit-remaining"),
                        "request_time": request_time
                    })
                    
                    if response.status == 429:
                        logger.info(f"Token bucket burst exhausted at request {i + 1}")
                        break
                
            except Exception as e:
                logger.error(f"Burst request {i + 1} failed: {e}")
        
        # Test refill (wait and make another request)
        await asyncio.sleep(5)  # Wait for tokens to refill
        
        try:
            start_time = time.time()
            
            async with self.session.post(
                "/api/cart",
                json={"product_id": "refill_test", "quantity": 1}
            ) as response:
                request_time = time.time() - start_time
                
                headers = dict(response.headers)
                
                results["refill_test"].append({
                    "status": response.status,
                    "remaining": headers.get("x-ratelimit-remaining"),
                    "request_time": request_time
                })
                
                logger.info(f"Refill test request: {response.status}")
        
        except Exception as e:
            logger.error(f"Refill test failed: {e}")
        
        return results
    
    async def test_concurrent_requests(self):
        """Test rate limiting under concurrent load"""
        logger.info("Testing concurrent requests...")
        
        results = {
            "test": "concurrent_requests",
            "concurrent_results": []
        }
        
        # Make 20 concurrent requests
        tasks = []
        for i in range(20):
            task = self._make_concurrent_request(i)
            tasks.append(task)
        
        concurrent_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, result in enumerate(concurrent_results):
            if isinstance(result, Exception):
                results["concurrent_results"].append({
                    "request": i + 1,
                    "error": str(result)
                })
            else:
                results["concurrent_results"].append(result)
        
        # Count successful vs blocked
        blocked_count = sum(1 for r in results["concurrent_results"] if r.get("status") == 429)
        logger.info(f"Concurrent test: {blocked_count}/20 requests blocked")
        
        return results
    
    async def _make_concurrent_request(self, request_id: int) -> Dict[str, Any]:
        """Make a single request for concurrent testing"""
        try:
            start_time = time.time()
            
            async with self.session.get("/api/products") as response:
                request_time = time.time() - start_time
                
                headers = dict(response.headers)
                
                return {
                    "request": request_id + 1,
                    "status": response.status,
                    "remaining": headers.get("x-ratelimit-remaining"),
                    "request_time": request_time
                }
        
        except Exception as e:
            return {
                "request": request_id + 1,
                "error": str(e)
            }
    
    async def run_all_tests(self):
        """Run all rate limiting tests"""
        logger.info("Starting comprehensive rate limiting tests...")
        
        all_results = {
            "test_suite": "rate_limiting_and_throttling",
            "timestamp": datetime.now().isoformat(),
            "endpoint_tests": {},
            "special_tests": {},
            "summary": {}
        }
        
        # Test each endpoint
        for endpoint_name, config in self.test_endpoints.items():
            try:
                result = await self.test_endpoint(endpoint_name, config)
                all_results["endpoint_tests"][endpoint_name] = result
                
                # Wait between endpoint tests
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"Endpoint test {endpoint_name} failed: {e}")
                all_results["endpoint_tests"][endpoint_name] = {"error": str(e)}
        
        # Special tests
        try:
            all_results["special_tests"]["login_failure_throttling"] = await self.test_login_failure_throttling()
            await asyncio.sleep(2)
        except Exception as e:
            logger.error(f"Login throttling test failed: {e}")
        
        try:
            all_results["special_tests"]["sliding_window_accuracy"] = await self.test_sliding_window_accuracy()
        except Exception as e:
            logger.error(f"Sliding window test failed: {e}")
        
        try:
            all_results["special_tests"]["token_bucket_burst"] = await self.test_token_bucket_burst()
        except Exception as e:
            logger.error(f"Token bucket test failed: {e}")
        
        try:
            all_results["special_tests"]["concurrent_requests"] = await self.test_concurrent_requests()
        except Exception as e:
            logger.error(f"Concurrent test failed: {e}")
        
        # Generate summary
        all_results["summary"] = self._generate_summary(all_results)
        
        return all_results
    
    def _generate_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate test summary"""
        summary = {
            "total_endpoints_tested": len(results["endpoint_tests"]),
            "endpoints_passed": 0,
            "endpoints_failed": 0,
            "special_tests_run": len(results["special_tests"]),
            "key_findings": []
        }
        
        # Check endpoint tests
        for endpoint_name, result in results["endpoint_tests"].items():
            if "error" in result:
                summary["endpoints_failed"] += 1
                summary["key_findings"].append(f"{endpoint_name}: FAILED - {result['error']}")
            else:
                expected_limit = result["expected_limit"]
                actual_blocked = result["requests_blocked"]
                
                if actual_blocked > 0:
                    summary["endpoints_passed"] += 1
                    summary["key_findings"].append(
                        f"{endpoint_name}: PASSED - Blocked {actual_blocked} requests (limit: {expected_limit})"
                    )
                else:
                    summary["endpoints_failed"] += 1
                    summary["key_findings"].append(
                        f"{endpoint_name}: FAILED - No requests blocked (expected limit: {expected_limit})"
                    )
        
        # Check special tests
        for test_name, result in results["special_tests"].items():
            if "error" in result:
                summary["key_findings"].append(f"{test_name}: FAILED - {result['error']}")
            else:
                summary["key_findings"].append(f"{test_name}: PASSED")
        
        return summary
    
    def print_results(self, results: Dict[str, Any]):
        """Print test results in a readable format"""
        print("\n" + "="*80)
        print("RATE LIMITING AND THROTTLING TEST RESULTS")
        print("="*80)
        print(f"Test Suite: {results['test_suite']}")
        print(f"Timestamp: {results['timestamp']}")
        print()
        
        # Endpoint tests
        print("ENDPOINT TESTS:")
        print("-" * 40)
        for endpoint_name, result in results["endpoint_tests"].items():
            print(f"\n{endpoint_name.upper()}:")
            
            if "error" in result:
                print(f"  ❌ FAILED: {result['error']}")
            else:
                print(f"  ✅ Strategy: {result['strategy']}")
                print(f"  ✅ Expected Limit: {result['expected_limit']}")
                print(f"  ✅ Requests Made: {result['requests_made']}")
                print(f"  ✅ Requests Allowed: {result['requests_allowed']}")
                print(f"  ✅ Requests Blocked: {result['requests_blocked']}")
                print(f"  ✅ First Block Time: {result['first_block_time']:.2f}s" if result['first_block_time'] else "  ✅ No blocking occurred")
                
                if result['throttle_delays']:
                    avg_delay = sum(d['delay'] for d in result['throttle_delays']) / len(result['throttle_delays'])
                    print(f"  ✅ Average Throttle Delay: {avg_delay:.2f}s")
        
        # Special tests
        print("\nSPECIAL TESTS:")
        print("-" * 40)
        for test_name, result in results["special_tests"].items():
            print(f"\n{test_name.upper().replace('_', ' ')}:")
            
            if "error" in result:
                print(f"  ❌ FAILED: {result['error']}")
            else:
                print(f"  ✅ PASSED")
                
                # Add specific test details
                if test_name == "login_failure_throttling":
                    delays = result.get("throttle_delays", [])
                    if delays:
                        print(f"  ✅ Throttle Delays: {delays}")
                    print(f"  ✅ Blocked: {result['blocked']}")
                
                elif test_name == "concurrent_requests":
                    blocked = sum(1 for r in result["concurrent_results"] if r.get("status") == 429)
                    total = len(result["concurrent_results"])
                    print(f"  ✅ Concurrent Requests: {blocked}/{total} blocked")
        
        # Summary
        print("\nSUMMARY:")
        print("-" * 40)
        summary = results["summary"]
        print(f"Total Endpoints Tested: {summary['total_endpoints_tested']}")
        print(f"Endpoints Passed: {summary['endpoints_passed']}")
        print(f"Endpoints Failed: {summary['endpoints_failed']}")
        print(f"Special Tests Run: {summary['special_tests_run']}")
        
        print("\nKEY FINDINGS:")
        for finding in summary["key_findings"]:
            print(f"  • {finding}")
        
        print("\n" + "="*80)

async def main():
    """Main test runner"""
    print("🚀 Starting Rate Limiting and Throttling Test Suite")
    print("Make sure your API gateway is running on http://localhost:5001")
    print()
    
    async with RateLimitTester() as tester:
        results = await tester.run_all_tests()
        tester.print_results(results)
        
        # Save results to file
        with open("rate_limit_test_results.json", "w") as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n📊 Detailed results saved to: rate_limit_test_results.json")

if __name__ == "__main__":
    asyncio.run(main())
