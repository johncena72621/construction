"""
BuildPro API — Construction Management Backend
FastAPI + SQLAlchemy + SQLite (async)

Run: uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
Docs: http://localhost:8000/docs
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.config import APP_NAME, APP_VERSION
from app.routers import auth, projects, inventory, payments, invoices, deliveries, analytics

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="Construction management API with inventory, payments, invoices, UPI, QR codes, AI forecasting, and smart alerts.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.get("/")
async def root():
    return {
        "name": APP_NAME,
        "version": APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "auth": "/api/auth",
            "projects": "/api/projects",
            "materials": "/api/materials",
            "transactions": "/api/transactions",
            "workers": "/api/workers",
            "invoices": "/api/invoices",
            "deliveries": "/api/deliveries",
            "upi": "/api/upi",
            "analytics": "/api/analytics",
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}
