# ShopSphere — Intelligent API Gateway with Real-Time Monitoring

> AI-Powered Security Layer for E-Commerce Applications

[![Live Demo](https://img.shields.io/badge/Live%20Demo-shop--sphere--wine.vercel.app-blue)](https://shop-sphere-wine.vercel.app)
[![Monitor](https://img.shields.io/badge/Monitor%20Dashboard-shopsphere--monitor.vercel.app-purple)](https://shopsphere-monitor.vercel.app)
[![Gateway](https://img.shields.io/badge/API%20Gateway-Docs-green)](https://shopsphere-gateway.onrender.com/docs)
[![Monitor API](https://img.shields.io/badge/Monitor%20API-Docs-orange)](https://shopsphere-monitor.onrender.com/docs)
[![GitHub](https://img.shields.io/badge/GitHub-VidhyaRamamoorthy16-black)](https://github.com/VidhyaRamamoorthy16/ShopSphere)

---

## 🌐 Live Deployment

| Service | URL |
|---|---|
| 🛒 ShopSphere Storefront | https://shop-sphere-wine.vercel.app |
| 📊 Monitor Dashboard | https://shopsphere-monitor.vercel.app |
| 🔒 API Gateway | https://shopsphere-gateway.onrender.com |
| 📡 Monitor API | https://shopsphere-monitor.onrender.com |
| ⚙️ Backend API | https://shopsphere-a1sj.onrender.com |

> **Note:** Render free-tier services spin down after 15 min of inactivity. First request may take ~30s after idle.

---

## 📋 Overview

ShopSphere is a production-deployed full-stack e-commerce platform demonstrating an **Intelligent API Gateway** that integrates machine learning threat detection, adaptive rate limiting, and a real-time monitoring dashboard across five independent microservices.

- 🤖 90.21% ML threat detection accuracy (Random Forest, < 1ms inference)
- ⚡ P95 gateway latency of 74.66 ms with zero errors
- 🛡️ 5 attack classes: SQL Injection, XSS, Path Traversal, DDoS, Brute Force
- 📊 Live monitoring dashboard with Redis-backed request feed
- 🚀 Fully deployed — no local setup needed to evaluate

---

## 🏗️ Architecture

```
User
│
▼
ShopSphere Frontend  (Vercel · React + Vite · port 5173)
│
▼
API Gateway          (Render · FastAPI · port 5001)
├─ 1. IP Ban Check          ← Redis permanent ban set
├─ 2. Rate Limiting         ← Redis sliding window (100 req/60s)
├─ 3. Feature Extraction    ← 55 features from request
├─ 4. ML Inference          ← Random Forest (threat_model.pkl)
├─ 5. Dual Logging          ← Redis + Supabase async
└─ 6. Proxy                 ← httpx async to backend
│
▼
Backend          (Render · Node.js + Express · port 8000)
│
▼
Supabase          (PostgreSQL · 13 tables · RLS enabled)
│
▼ (read-only)
Monitor API       (Render · FastAPI · port 3000)
│
▼
Monitor Dashboard (Vercel · React + Vite · port 3001)
```

---

## 🧩 Microservices

| Service | Port | Tech | Responsibility |
|---|---|---|---|
| API Gateway | 5001 | Python 3.11 + FastAPI | ML threat detection, rate limiting, async proxy |
| Backend | 8000 | Node.js 20 + Express | Products, cart, orders, auth, Supabase CRUD |
| Monitor API | 3000 | Python 3.11 + FastAPI | Read-only stats aggregator, WebSocket push |
| Monitor Dashboard | 3001 | React 18 + Vite | Live admin console |
| ShopSphere Frontend | 5173 | React 18 + Vite | Full e-commerce storefront |

---

## 🤖 ML Model Performance

| Metric | Value | Target | Status |
|---|---|---|---|
| Overall Accuracy | **90.21%** | ≥ 90% | ✅ |
| SQL Injection Detection | **97%** | ≥ 95% | ✅ |
| XSS Detection | **94%** | ≥ 90% | ✅ |
| Path Traversal Detection | **95%** | ≥ 90% | ✅ |
| Brute Force Detection | **99%** | ≥ 95% | ✅ |
| DDoS Pattern Detection | **91%** | ≥ 88% | ✅ |
| False Positive Rate | **< 8%** | < 10% | ✅ |
| ML Inference Time | **< 1 ms** | < 5 ms | ✅ |
| Gateway P95 Latency | **74.66 ms** | < 100 ms | ✅ |

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Gateway | Python 3.11 + FastAPI + httpx |
| Backend | Node.js 20 + Express |
| Frontend | React 18 + Vite |
| ML | scikit-learn + Random Forest + joblib |
| In-Memory Store | Redis (Upstash) |
| Database | Supabase (PostgreSQL) |
| Real-Time Push | WebSocket (FastAPI) |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Payment | Razorpay (test mode) |
| Email | Nodemailer |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Redis ([Upstash](https://upstash.com) free tier recommended)
- [Supabase](https://supabase.com) project

### 1. Clone
```bash
git clone https://github.com/VidhyaRamamoorthy16/ShopSphere.git
cd ShopSphere
```

### 2. Set up environment variables
```bash
cp api-gateway/.env.example       api-gateway/.env
cp backend/.env.example           backend/.env
cp monitor-api/.env.example       monitor-api/.env
cp frontend/.env.example          frontend/.env
cp monitor-dashboard/.env.example monitor-dashboard/.env
```

Fill in each `.env` file:

```env
# api-gateway/.env  and  monitor-api/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
REDIS_URL=rediss://default:password@host:port

# backend/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
REDIS_URL=rediss://default:password@host:port

# frontend/.env
VITE_API_URL=http://localhost:5001

# monitor-dashboard/.env
VITE_MONITOR_URL=http://localhost:3000
VITE_GATEWAY_URL=http://localhost:5001
```

### 3. Train the ML model
```bash
cd api-gateway
pip install -r requirements.txt
python train_model.py
cd ..
```

### 4. Start all services
```bash
bash start.sh
```

#### Or start individually (5 terminals):
```bash
cd backend && npm install && node server.js
cd api-gateway && uvicorn main:app --host 0.0.0.0 --port 5001
cd monitor-api && uvicorn monitor_server:app --host 0.0.0.0 --port 3000
cd frontend && npm install && npm run dev
cd monitor-dashboard && npm install && npm run dev
```

---

## 🛡️ Security Features

| Attack Type | Detection Signals |
|---|---|
| SQL Injection | SELECT, UNION, DROP, OR 1=1, --, /* |
| XSS | script tags, event handlers, alert(), document.cookie |
| Path Traversal | ../, /etc/passwd, /bin/sh, /proc/ |
| DDoS | Abnormal request volume, path depth signals |
| Brute Force | Login endpoint targeting with varied credentials |

### Test threat detection (live)
```javascript
// SQL Injection — expect 403
fetch('https://shopsphere-gateway.onrender.com/api/products?id=1 OR 1=1')
  .then(r => r.json()).then(console.log)

// XSS — expect 403
fetch('https://shopsphere-gateway.onrender.com/api/reviews', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ body: '<script>alert(document.cookie)</script>' })
}).then(r => r.json()).then(console.log)
```

---

## 📡 API Endpoints

### API Gateway
| Method | Endpoint | Description |
|---|---|---|
| GET | /health | Gateway health check |
| GET | /ml/metrics | ML model accuracy and metrics |
| ANY | /{path} | Proxy to backend after security checks |

### Monitor API
| Method | Endpoint | Description |
|---|---|---|
| GET | /health | Service health |
| GET | /monitor/overview | Requests, blocked count, threat score |
| GET | /monitor/requests/live | Live request feed |
| GET | /monitor/threats/live | Live threat events |
| GET | /monitor/rate-limits/active | Active rate limits |
| GET | /monitor/health | All 5 services status |
| GET | /monitor/stats/hourly | Hourly chart data |

---

## 📁 Project Structure

```
ShopSphere/
├── frontend/              # React + Vite storefront
├── backend/               # Node.js + Express business logic
├── api-gateway/           # FastAPI gateway with ML
│   ├── main.py            # Core gateway logic
│   └── train_model.py     # ML training script
├── monitor-api/           # FastAPI read-only monitor
│   └── monitor_server.py
├── monitor-dashboard/     # React + Vite admin console
└── start.sh               # One-command startup
```

---

## 🗄️ Database Schema (13 tables)

`products` · `users` · `cart` · `orders` · `order_items` · `wishlist` · `reviews` · `coupons` · `notifications` · `gateway_stats` · `threat_logs` · `rate_limit_logs` · `password_resets` 

---

## ☁️ Cloud Deployment

| Service | Platform | Root Directory |
|---|---|---|
| Frontend | Vercel | frontend/ |
| Monitor Dashboard | Vercel | monitor-dashboard/ |
| Backend | Render (Node) | backend/ |
| API Gateway | Render (Python) | api-gateway/ |
| Monitor API | Render (Python) | monitor-api/ |
| Redis | Upstash Free | — |
| Database | Supabase Free | — |

---

## 👥 Author

**Vidhya Ramamoorthy**

- GitHub: [@VidhyaRamamoorthy16](https://github.com/VidhyaRamamoorthy16)
- Email: vidhyaramamoorthy@gmail.com
