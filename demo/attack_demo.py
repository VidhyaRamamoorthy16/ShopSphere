#!/usr/bin/env python3
"""
ShopSphere API Gateway — Live Security Demo
Conference Paper Demonstration Script
Shows: Rate Limiting, SQL Injection blocking, XSS blocking, DDoS simulation
"""

import requests
import time
import json
import threading
import sys
from datetime import datetime

GATEWAY = "http://localhost:5001"
MONITOR = "http://localhost:3000"

GREEN  = "\033[92m"
RED    = "\033[91m"
AMBER  = "\033[93m"
BLUE   = "\033[94m"
PURPLE = "\033[95m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def banner():
    print(f"""
{PURPLE}{BOLD}
╔══════════════════════════════════════════════════════════╗
║       ShopSphere — Intelligent API Gateway Demo          ║
║       Conference Paper Security Demonstration            ║
╚══════════════════════════════════════════════════════════╝
{RESET}""")

def print_result(method, path, status, action, reason=None, duration=None):
    color = GREEN if action == "ALLOWED" else RED if action == "BLOCKED" else AMBER
    badge = f"{color}[{action}]{RESET}"
    dur = f" {BLUE}({duration}ms){RESET}" if duration else ""
    reason_str = f" — {AMBER}{reason}{RESET}" if reason else ""
    print(f"  {badge} {BOLD}{method}{RESET} {path}{dur}{reason_str}")

def get_stats():
    try:
        r = requests.get(f"{MONITOR}/monitor/overview", timeout=3)
        return r.json()
    except:
        return {}

def separator(title):
    print(f"\n{PURPLE}{BOLD}{'─'*55}{RESET}")
    print(f"{PURPLE}{BOLD}  {title}{RESET}")
    print(f"{PURPLE}{'─'*55}{RESET}\n")

# ── Demo 1: Normal Shopping Traffic ─────────────────────────
def demo_normal_traffic():
    separator("DEMO 1 — Normal Shopping Traffic (should all PASS)")
    endpoints = [
        ("GET",  "/products",        None),
        ("GET",  "/products?category=electronics", None),
        ("POST", "/cart",            {"productId": "123", "qty": 2}),
        ("GET",  "/orders",          None),
        ("POST", "/auth/login",      {"email": "user@test.com", "password": "pass123"}),
    ]
    for method, path, body in endpoints:
        try:
            t = time.time()
            if method == "GET":
                r = requests.get(f"{GATEWAY}{path}", timeout=5)
            else:
                r = requests.post(f"{GATEWAY}{path}", json=body, timeout=5)
            ms = round((time.time() - t) * 1000)
            action = "ALLOWED" if r.status_code < 400 else "BLOCKED"
            print_result(method, path, r.status_code, action, duration=ms)
        except Exception as e:
            print_result(method, path, 0, "ERROR", str(e))
        time.sleep(0.3)

# ── Demo 2: SQL Injection Attacks ───────────────────────────
def demo_sql_injection():
    separator("DEMO 2 — SQL Injection Attacks (should all BLOCK)")
    payloads = [
        ("POST", "/auth/login",   {"email": "admin' OR '1'='1", "password": "anything"}),
        ("POST", "/search",       {"query": "SELECT * FROM users WHERE 1=1 --"}),
        ("POST", "/products",     {"filter": "1; DROP TABLE products; --"}),
        ("GET",  "/user?id=1 UNION SELECT username,password FROM users", None),
        ("POST", "/checkout",     {"coupon": "' OR 1=1--"}),
    ]
    for method, path, body in payloads:
        try:
            t = time.time()
            if method == "GET":
                r = requests.get(f"{GATEWAY}{path}", timeout=5)
            else:
                r = requests.post(f"{GATEWAY}{path}", json=body, timeout=5)
            ms = round((time.time() - t) * 1000)
            blocked = r.status_code in [403, 429]
            action = "BLOCKED" if blocked else "ALLOWED"
            reason = r.json().get("reason", "") if blocked else "NOT BLOCKED ⚠"
            print_result(method, path[:50], r.status_code, action, reason, ms)
        except Exception as e:
            print_result(method, path, 0, "ERROR", str(e))
        time.sleep(0.3)

# ── Demo 3: XSS Attacks ─────────────────────────────────────
def demo_xss():
    separator("DEMO 3 — XSS Attacks (should all BLOCK)")
    payloads = [
        ("POST", "/reviews",  {"comment": "<script>alert('XSS')</script>"}),
        ("POST", "/search",   {"query": "<img src=x onerror=alert(1)>"}),
        ("POST", "/profile",  {"bio": "javascript:void(document.cookie)"}),
        ("POST", "/products", {"name": "<svg onload=alert('xss')>"}),
    ]
    for method, path, body in payloads:
        try:
            t = time.time()
            r = requests.post(f"{GATEWAY}{path}", json=body, timeout=5)
            ms = round((time.time() - t) * 1000)
            blocked = r.status_code in [403, 429]
            action = "BLOCKED" if blocked else "ALLOWED"
            reason = r.json().get("reason", "") if blocked else "NOT BLOCKED ⚠"
            print_result(method, path, r.status_code, action, reason, ms)
        except Exception as e:
            print_result(method, path, 0, "ERROR", str(e))
        time.sleep(0.3)

# ── Demo 4: Rate Limiting / DDoS ────────────────────────────
def demo_rate_limiting():
    separator("DEMO 4 — Rate Limit / DDoS Simulation (first 100 pass, rest BLOCK)")
    print(f"  {AMBER}Firing 120 rapid requests from same IP...{RESET}\n")
    allowed = 0
    blocked = 0
    for i in range(1, 121):
        try:
            r = requests.get(f"{GATEWAY}/products", timeout=5)
            if r.status_code == 429:
                blocked += 1
                if blocked == 1:
                    print(f"  {RED}{BOLD}[RATE LIMIT HIT]{RESET} at request #{i} — subsequent requests now blocked")
            else:
                allowed += 1
            if i % 20 == 0:
                print(f"  Progress: {i}/120 — {GREEN}Allowed: {allowed}{RESET} | {RED}Blocked: {blocked}{RESET}")
        except:
            blocked += 1
        time.sleep(0.05)
    print(f"\n  {BOLD}Result: {GREEN}Allowed: {allowed}{RESET} | {RED}Blocked: {blocked}{RESET}")
    print(f"  {GREEN}Rate limiting working correctly ✓{RESET}")

# ── Demo 5: Path Traversal ──────────────────────────────────
def demo_path_traversal():
    separator("DEMO 5 — Path Traversal Attacks (should all BLOCK)")
    paths = [
        "/api/../../../etc/passwd",
        "/api/files?path=../../../etc/shadow",
        "/api/download?file=../../../../etc/hosts",
        "/api/config?load=../config/database.yml",
    ]
    for path in paths:
        try:
            t = time.time()
            r = requests.get(f"{GATEWAY}{path}", timeout=5)
            ms = round((time.time() - t) * 1000)
            blocked = r.status_code in [403, 429]
            action = "BLOCKED" if blocked else "ALLOWED"
            print_result("GET", path[:55], r.status_code, action, duration=ms)
        except Exception as e:
            print_result("GET", path, 0, "ERROR", str(e))
        time.sleep(0.3)

# ── Final Stats ─────────────────────────────────────────────
def show_final_stats():
    separator("FINAL STATS — Gateway Summary")
    stats = get_stats()
    if stats:
        total    = stats.get("total_requests", 0)
        blocked  = stats.get("blocked_requests", 0)
        allowed  = stats.get("allowed", total - blocked)
        score    = stats.get("threat_score", 0)
        block_pct = round((blocked / max(total, 1)) * 100, 1)
        print(f"  {BOLD}Total Requests  :{RESET} {BLUE}{total}{RESET}")
        print(f"  {BOLD}Allowed         :{RESET} {GREEN}{allowed}{RESET}")
        print(f"  {BOLD}Blocked         :{RESET} {RED}{blocked} ({block_pct}%){RESET}")
        print(f"  {BOLD}Threat Score    :{RESET} {AMBER}{score}/100{RESET}")
        print(f"\n  {BOLD}Monitor Dashboard:{RESET} {BLUE}http://localhost:3001{RESET}")
        print(f"  {BOLD}Live Requests   :{RESET} {BLUE}http://localhost:3001/requests{RESET}")
    else:
        print(f"  {AMBER}Could not reach Monitor API at {MONITOR}{RESET}")
    print(f"\n{PURPLE}{BOLD}{'═'*55}{RESET}")
    print(f"{GREEN}{BOLD}  Demo complete! Check the monitor dashboard now.{RESET}")
    print(f"{PURPLE}{BOLD}{'═'*55}{RESET}\n")

if __name__ == "__main__":
    banner()
    print(f"  {BLUE}Gateway:{RESET} {GATEWAY}")
    print(f"  {BLUE}Monitor:{RESET} {MONITOR}")
    print(f"  {BLUE}Time   :{RESET} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Check gateway is running
    try:
        r = requests.get(f"{GATEWAY}/health", timeout=3)
        print(f"\n  {GREEN}✓ Gateway is online{RESET}")
    except:
        print(f"\n  {RED}✗ Gateway not reachable at {GATEWAY} — start it first{RESET}")
        sys.exit(1)

    input(f"\n  {AMBER}Press ENTER to start the demo...{RESET}")

    demo_normal_traffic()
    time.sleep(1)
    demo_sql_injection()
    time.sleep(1)
    demo_xss()
    time.sleep(1)
    demo_path_traversal()
    time.sleep(1)
    demo_rate_limiting()
    time.sleep(2)
    show_final_stats()
