# 🛒 ShopSphere — Intelligent API Gateway with ML-Powered Threat Detection

[![Vercel](https://img.shields.io/badge/Frontend-Live-success?logo=vercel)](https://shop-sphere-wine.vercel.app)
[![Vercel](https://img.shields.io/badge/Dashboard-Live-success?logo=vercel)](https://shopsphere-monitor.vercel.app)
[![Render](https://img.shields.io/badge/Gateway-Live-blue?logo=render)](https://shopsphere-gateway.onrender.com)
[![Python](https://img.shields.io/badge/Python-3.13-blue?logo=python)](https://python.org)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org)

AI-Powered Security Layer for E-Commerce Applications with real-time monitoring, ML-based threat detection, and Redis caching.

## 🌐 Live Deployments

| Service | URL | Status |
|---------|-----|--------|
| 🛒 **ShopSphere Frontend** | [https://shop-sphere-wine.vercel.app](https://shop-sphere-wine.vercel.app) | ✅ Live |
| 📊 **Monitor Dashboard** | [https://shopsphere-monitor.vercel.app](https://shopsphere-monitor.vercel.app) | ✅ Live |
| 🔒 **API Gateway** | [https://shopsphere-gateway.onrender.com/docs](https://shopsphere-gateway.onrender.com/docs) | ✅ Live |
| 📡 **Monitor API** | [https://shopsphere-monitor.onrender.com/docs](https://shopsphere-monitor.onrender.com/docs) | ✅ Live |
| ⚙️ **Backend API** | [https://shopsphere-backend.onrender.com/health](https://shopsphere-backend.onrender.com/health) | ✅ Live |

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   ShopSphere    │────▶│  API Gateway     │────▶│    Backend      │
│   Frontend      │     │  (ML Security)   │     │   (Node.js)     │
│   (Vercel)      │     │   (Render)       │     │   (Render)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Redis Cache     │     │   Supabase      │
                        │  (Upstash)       │     │   (PostgreSQL)  │
                        └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Monitor API     │
                        │   (Render)       │
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Monitor Dashboard│
                        │    (Vercel)      │
                        └──────────────────┘
```

## 🚀 Microservices Architecture

| Service | Port | Technology | Description |
|---------|------|------------|-------------|
| **API Gateway** | 5001 | Python + FastAPI | ML-powered threat detection, rate limiting, request routing |
| **Backend** | 8000 | Node.js + Express | Core e-commerce API, authentication, cart, orders |
| **Monitor API** | 3000 | Python + FastAPI | Real-time monitoring, logging, analytics endpoints |
| **Monitor Dashboard** | 3001 | React + Vite | Security monitoring dashboard with live request tracking |
| **ShopSphere Frontend** | 5173 | React + Vite | Modern e-commerce UI with USD pricing |

## ✨ Key Features

### 🔒 Security Layer (API Gateway)
- **ML-Based Threat Detection** — Random Forest classifier with 90.21% accuracy
- **Real-time Rate Limiting** — 100 requests/minute per IP
- **Attack Pattern Recognition** — SQL Injection, XSS, Path Traversal, DDoS, Brute Force
- **Request Logging** — All requests logged to Redis + Supabase

### 📊 Monitoring & Analytics
- **Live Request Stream** — WebSocket + polling fallback
- **Threat Detection Logs** — Real-time alerts with payload analysis
- **Rate Limit Tracking** — Active windows, blocked IPs, historical data
- **System Health Dashboard** — Service uptime, Redis stats, ML metrics

### 🛒 E-Commerce Features
- **50 Products** — USD pricing across Electronics, Fashion, Books, Sports, Beauty, Toys, Home & Kitchen
- **Cart & Wishlist** — Full CRUD with real-time updates
- **Quick View Modal** — Product preview without navigation
- **Recently Viewed** — Session-based product history
- **Search & Filter** — Real-time product search

### 🎨 Modern UI
- **Responsive Design** — Mobile-first approach
- **Dark Theme Dashboard** — Professional security console
- **Toast Notifications** — Success/error feedback
- **Skeleton Loading** — Better perceived performance

## 🛠️ Tech Stack

### Backend
- **Python 3.13** + FastAPI (Gateway & Monitor API)
- **Node.js 20** + Express (Backend API)
- **Redis** — Caching & real-time data (Upstash)
- **Supabase** — PostgreSQL database & authentication
- **scikit-learn** — ML threat detection model

### Frontend
- **React 18** + Vite
- **React Router DOM** — Client-side routing
- **Recharts** — Data visualization
- **Lucide React** — Icons
- **Framer Motion** — Animations

### Infrastructure
- **Vercel** — Frontend & Dashboard hosting
- **Render** — Backend & API hosting
- **Upstash** — Redis cloud service
- **Supabase** — Database & auth
- **GitHub** — Version control

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.13+
- Node.js 20+
- Redis (local or cloud)

### 1. Clone Repository
```bash
git clone https://github.com/VidhyaRamamoorthy16/ShopSphere.git
cd ShopSphere
```

### 2. Environment Setup
Copy `.env.example` to `.env` in each service folder:

```bash
cp backend/.env.example backend/.env
cp api-gateway/.env.example api-gateway/.env
cp monitor-api/.env.example monitor-api/.env
cp frontend/.env.example frontend/.env
```

### 3. Start All Services
```bash
chmod +x start.sh
./start.sh
```

Or start individually:

```bash
# Terminal 1 — Backend (Port 8000)
cd backend && npm install && npm run dev

# Terminal 2 — API Gateway (Port 5001)
cd api-gateway && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 5001 --reload

# Terminal 3 — Monitor API (Port 3000)
cd monitor-api && source venv/bin/activate && uvicorn monitor_server:app --host 0.0.0.0 --port 3000 --reload

# Terminal 4 — Frontend (Port 5173)
cd frontend && npm install && npm run dev

# Terminal 5 — Monitor Dashboard (Port 3001)
cd monitor-dashboard && npm install && npm run dev
```

### 4. Access Services
- **ShopSphere**: http://localhost:5173
- **Monitor Dashboard**: http://localhost:3001
- **API Gateway Docs**: http://localhost:5001/docs
- **Monitor API Docs**: http://localhost:3000/docs

## 🧪 Testing Threat Detection

Open browser DevTools console and run:
```javascript
fetch('http://localhost:5001/api/products?id=1 OR 1=1')
  .then(r => r.json())
  .then(d => console.log(d))
```

You should see a `403` blocked response. Check the Monitor Dashboard → Threat Detection page.

## 📊 ML Model Metrics

```json
{
  "model": "Random Forest Classifier",
  "accuracy": 90.21,
  "cv_accuracy": 90.92,
  "threat_classes": [
    "SQL Injection",
    "XSS",
    "Path Traversal",
    "DDoS",
    "Brute Force"
  ]
}
```

## 📁 Project Structure

```
ShopSphere/
├── api-gateway/          # ML Security Gateway (Python)
├── backend/              # E-Commerce API (Node.js)
├── monitor-api/          # Monitoring Service (Python)
├── monitor-dashboard/    # Security Dashboard (React)
├── frontend/             # ShopSphere Store (React)
└── README.md
```

## 🔗 Links

- 📱 **Live Demo**: https://shop-sphere-wine.vercel.app
- 📊 **Dashboard**: https://shopsphere-monitor.vercel.app
- 🔒 **API Gateway**: https://shopsphere-gateway.onrender.com/docs
- 📡 **Monitor API**: https://shopsphere-monitor.onrender.com/docs
- 📁 **GitHub**: https://github.com/VidhyaRamamoorthy16/ShopSphere

---

<p align="center">Built with ❤️ for AI-powered e-commerce security</p>
