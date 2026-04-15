#!/usr/bin/env python3
"""
ShopSphere Gateway — Performance Benchmark
Measures latency overhead added by the gateway vs direct backend
"""

import requests
import time
import statistics
import json

GATEWAY  = "http://localhost:5001"
BACKEND  = "http://localhost:8000"
MONITOR  = "http://localhost:3000"
RUNS     = 50

GREEN  = "\033[92m"
BLUE   = "\033[94m"
PURPLE = "\033[95m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def measure(url, runs=RUNS):
    times = []
    errors = 0
    for _ in range(runs):
        try:
            t = time.time()
            r = requests.get(url, timeout=10)
            ms = (time.time() - t) * 1000
            if r.status_code < 500:
                times.append(ms)
            else:
                errors += 1
        except:
            errors += 1
        time.sleep(0.05)
    return {
        "min":    round(min(times), 2) if times else 0,
        "max":    round(max(times), 2) if times else 0,
        "mean":   round(statistics.mean(times), 2) if times else 0,
        "median": round(statistics.median(times), 2) if times else 0,
        "p95":    round(sorted(times)[int(len(times)*0.95)], 2) if len(times) > 5 else 0,
        "errors": errors,
        "samples": len(times),
    }

print(f"\n{PURPLE}{BOLD}ShopSphere Gateway — Performance Benchmark{RESET}")
print(f"Running {RUNS} requests per endpoint...\n")

print(f"{BLUE}Measuring direct backend (port 8000)...{RESET}")
direct = measure(f"{BACKEND}/products")

print(f"{BLUE}Measuring through gateway (port 5001)...{RESET}")
gateway = measure(f"{GATEWAY}/products")

overhead = round(gateway["mean"] - direct["mean"], 2)
overhead_pct = round((overhead / max(direct["mean"], 1)) * 100, 1)

print(f"""
{BOLD}{'─'*50}{RESET}
{BOLD}  RESULTS — /products ({RUNS} samples each){RESET}
{BOLD}{'─'*50}{RESET}

  {'Metric':<15} {'Direct (8000)':>15} {'Gateway (5001)':>15}
  {'─'*45}
  {'Min (ms)':<15} {str(direct['min']):>15} {str(gateway['min']):>15}
  {'Max (ms)':<15} {str(direct['max']):>15} {str(gateway['max']):>15}
  {'Mean (ms)':<15} {str(direct['mean']):>15} {str(gateway['mean']):>15}
  {'Median (ms)':<15} {str(direct['median']):>15} {str(gateway['median']):>15}
  {'P95 (ms)':<15} {str(direct['p95']):>15} {str(gateway['p95']):>15}
  {'Errors':<15} {str(direct['errors']):>15} {str(gateway['errors']):>15}

{BOLD}  Gateway Overhead: {GREEN}+{overhead}ms ({overhead_pct}%){RESET}
{BOLD}{'─'*50}{RESET}
""")

results = {
    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    "runs": RUNS,
    "direct_backend": direct,
    "via_gateway": gateway,
    "overhead_ms": overhead,
    "overhead_pct": overhead_pct,
}
with open("benchmark_results.json", "w") as f:
    json.dump(results, f, indent=2)
print(f"  Results saved to {BLUE}benchmark_results.json{RESET}\n")
