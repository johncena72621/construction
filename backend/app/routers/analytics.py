from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime
from ..database import get_db
from ..models.models import Project, Material, MaterialLog, Transaction, Invoice, Worker, Delivery, User
from ..models.schemas import ForecastOut, ReconciliationOut, DashboardOut, AlertOut
from ..services.auth import get_current_user
from ..services.forecasting import forecast_all_materials
from ..services.reconciliation import reconcile_invoices
from ..services.alerts import generate_alerts

router = APIRouter(prefix="/api/analytics", tags=["Analytics & AI"])

@router.get("/dashboard", response_model=DashboardOut)
async def dashboard(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    projects = (await db.execute(select(Project).where(Project.owner_id == user.id))).scalars().all()
    materials = (await db.execute(select(Material))).scalars().all()
    transactions = (await db.execute(select(Transaction))).scalars().all()
    invoices = (await db.execute(select(Invoice))).scalars().all()
    workers = (await db.execute(select(Worker))).scalars().all()
    active = [p for p in projects if p.status == "active"]
    total_budget = sum(p.budget for p in projects)
    total_spent = sum(p.spent for p in projects)
    pending = sum(t.amount for t in transactions if t.status == "pending" and t.tx_type == "payment")
    low_stock = sum(1 for m in materials if m.current_stock <= m.min_stock and m.min_stock > 0)
    overdue = sum(1 for i in invoices if i.status == "overdue")
    weekly = sum(w.rate for w in workers if w.pay_type == "weekly" and w.status == "active")
    monthly = sum(w.rate for w in workers if w.pay_type == "monthly" and w.status == "active")
    return DashboardOut(total_projects=len(projects), active_projects=len(active), total_budget=total_budget, total_spent=total_spent, total_remaining=total_budget - total_spent, pending_payments=pending, total_workers=len([w for w in workers if w.status == "active"]), total_materials=len(materials), low_stock_count=low_stock, overdue_invoices=overdue, weekly_payroll=weekly, monthly_payroll=monthly)

@router.get("/forecast", response_model=List[ForecastOut])
async def demand_forecast(project_id: str = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    q = select(Material)
    if project_id: q = q.where(Material.project_id == project_id)
    materials = (await db.execute(q)).scalars().all()
    all_logs = (await db.execute(select(MaterialLog))).scalars().all()
    results = forecast_all_materials(materials, all_logs)
    return [ForecastOut(**r) for r in results]

@router.get("/reconciliation", response_model=ReconciliationOut)
async def run_reconciliation(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    invoices = (await db.execute(select(Invoice).options(selectinload(Invoice.items)))).scalars().all()
    transactions = (await db.execute(select(Transaction))).scalars().all()
    result = reconcile_invoices(invoices, transactions)
    for inv in invoices:
        inv.reconciled = inv.id in result["matched_ids"]
    await db.commit()
    return ReconciliationOut(**result)

@router.get("/alerts", response_model=List[AlertOut])
async def smart_alerts(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    projects = (await db.execute(select(Project).where(Project.owner_id == user.id).options(selectinload(Project.phases)))).scalars().all()
    materials = (await db.execute(select(Material))).scalars().all()
    invoices = (await db.execute(select(Invoice))).scalars().all()
    transactions = (await db.execute(select(Transaction))).scalars().all()
    deliveries = (await db.execute(select(Delivery))).scalars().all()
    alert_dicts = generate_alerts(projects, materials, invoices, transactions, deliveries)
    return [AlertOut(id=f"gen-{i}", created_at=datetime.utcnow(), is_read=False, **a) for i, a in enumerate(alert_dicts)]
