#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${PURPLE}${BOLD}ShieldMart — Conference Demo Runner${NC}"
echo ""
echo -e "What would you like to run?"
echo ""
echo -e "  ${BOLD}1${NC} — Attack demo (SQL injection, XSS, DDoS, path traversal)"
echo -e "  ${BOLD}2${NC} — Performance benchmark (latency comparison)"
echo -e "  ${BOLD}3${NC} — Full paper results collector"
echo -e "  ${BOLD}4${NC} — Quick security test (5 attacks)"
echo -e "  ${BOLD}5${NC} — Open all browser tabs"
echo ""
read -p "Enter choice (1-5): " choice

PROJECT="$(cd "$(dirname "$0")" && pwd)"

case $choice in
  1)
    echo ""
    echo -e "${YELLOW}Opening monitor dashboard...${NC}"
    open "http://localhost:3001/requests" 2>/dev/null
    sleep 2
    echo -e "${YELLOW}Running attack demo...${NC}"
    echo -e "${BLUE}Watch the dashboard light up red!${NC}"
    echo ""
    cd "$PROJECT/demo"
    python3 attack_demo.py
    ;;
  2)
    echo ""
    echo -e "${YELLOW}Running benchmark (50 requests × 2 paths)...${NC}"
    cd "$PROJECT/demo"
    python3 benchmark.py
    ;;
  3)
    echo ""
    echo -e "${YELLOW}Collecting paper results...${NC}"
    cd "$PROJECT/demo"
    python3 collect_paper_results.py 2>/dev/null || python3 benchmark.py
    ;;
  4)
    echo ""
    echo -e "${YELLOW}Running quick security tests...${NC}"
    GATEWAY="http://localhost:5001"

    run_test() {
      local name=$1; local method=$2; local url=$3; local body=$4
      if [ -n "$body" ]; then
        result=$(curl -s -X $method "$url" -H "Content-Type: application/json" -d "$body")
      else
        result=$(curl -s "$url")
      fi
      if echo "$result" | grep -q "blocked"; then
        echo -e "  ${GREEN}✓ BLOCKED${NC}: $name"
      else
        echo -e "  ${RED}✗ NOT BLOCKED${NC}: $name"
      fi
    }

    run_test "SQL Injection login" POST "$GATEWAY/api/auth/login" '{"email":"admin'"'"' OR '"'"'1'"'"'='"'"'1","password":"x"}'
    run_test "SQL Injection search" POST "$GATEWAY/api/search" '{"query":"SELECT * FROM users WHERE 1=1"}'
    run_test "XSS script tag" POST "$GATEWAY/api/reviews" '{"body":"<script>alert(document.cookie)</script>"}'
    run_test "XSS onerror" POST "$GATEWAY/api/reviews" '{"body":"<img src=x onerror=alert(1)>"}'
    run_test "Path traversal" GET "$GATEWAY/api/../../../etc/passwd" ""
    echo ""
    echo -e "${BLUE}Check http://localhost:3001/threats for details${NC}"
    ;;
  5)
    open "http://localhost:5173" 2>/dev/null
    open "http://localhost:3001" 2>/dev/null
    open "http://localhost:5001/health" 2>/dev/null
    open "http://localhost:3000/monitor/overview" 2>/dev/null
    echo -e "${GREEN}Opened all tabs${NC}"
    ;;
  *)
    echo "Invalid choice"
    ;;
esac

echo ""
