# ShopSphere — Intelligent API Gateway

AI-Powered Security Layer for E-Commerce Applications

## Architecture
Frontend (5173) → Gateway (5001) → Backend (8000) → Supabase
↓
Monitor API (3000) → Dashboard (3001)

## Services

| Service | Port | Tech |
|---------|------|------|
| API Gateway | 5001 | Python + FastAPI |
| Backend | 8000 | Node.js + Express |
| Monitor API | 3000 | Python + FastAPI |
| Monitor Dashboard | 3001 | React + Vite |
| ShopSphere Frontend | 5173 | React + Vite |

## Quick Start

```bash
bash start.sh
```

## Environment Setup

Copy each `.env.example` to `.env` in each service folder and fill values.
