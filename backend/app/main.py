"""
BuildPro API — High-end Python Backend for Construction Management
FastAPI + SQLAlchemy + scikit-learn AI Forecasting

Run:  cd backend && uvicorn app.main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .config import APP_NAME, APP_VERSION, ALLOWED_ORIGINS
from .database import init_db
from .routers import auth, projects, inventory, payments, invoices, deliveries, analytics

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="""
## BuildPro Construction Management API

**Features:**
- 🔐 JWT Authentication (register/login)
- 🏗️ Multi-project management with phases
- 📦 Real-time inventory with QR/barcode tracking
- 💰 Payment & payroll management (Cash/Bank/UPI/Cheque)
- 🧾 Auto invoice generation with GST + reconciliation
- 🤖 AI demand forecasting (scikit-learn linear regression)
- 📍 Geo-tagged delivery tracking
- 🔔 Smart alerts (low stock, budget overrun, overdue payments)
- 📊 Analytics dashboard

**AI API Key:** Configure via environment variables:
- `AI_PROVIDER` = openai | gemini | custom
- `AI_API_KEY` = your-key-here
- `AI_ENDPOINT` = custom endpoint URL (for custom provider)
    """,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(inventory.router)
app.include_router(payments.router)
app.include_router(invoices.router)
app.include_router(deliveries.router)
app.include_router(analytics.router)

@app.get("/", tags=["Health"])
async def root():
    return {
        "name": APP_NAME,
        "version": APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "auth": "/api/auth/register, /api/auth/login, /api/auth/me",
            "projects": "/api/projects (CRUD + phases)",
            "materials": "/api/materials (CRUD + logs + QR lookup)",
            "transactions": "/api/transactions (CRUD)",
            "workers": "/api/workers (CRUD)",
            "invoices": "/api/invoices (CRUD + auto GST)",
            "deliveries": "/api/deliveries (CRUD + geo-tagged)",
            "analytics": "/api/analytics/dashboard, /forecast, /reconciliation, /alerts",
        },
    }

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
