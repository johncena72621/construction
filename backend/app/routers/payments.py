from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import date
from ..database import get_db
from ..models.models import Transaction, Worker, User
from ..models.schemas import TransactionCreate, TransactionUpdate, TransactionOut, WorkerCreate, WorkerUpdate, WorkerOut
from ..services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["Payments & Payroll"])

@router.get("/transactions", response_model=List[TransactionOut])
async def list_transactions(project_id: Optional[str] = None, category: Optional[str] = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    q = select(Transaction)
    if project_id: q = q.where(Transaction.project_id == project_id)
    if category: q = q.where(Transaction.category == category)
    result = await db.execute(q.order_by(Transaction.created_at.desc()))
    return [TransactionOut.model_validate(t) for t in result.scalars().all()]

@router.post("/transactions", response_model=TransactionOut, status_code=201)
async def create_transaction(data: TransactionCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    t = Transaction(**data.model_dump(exclude={"date"}))
    t.date = data.date or date.today()
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return TransactionOut.model_validate(t)

@router.patch("/transactions/{tx_id}", response_model=TransactionOut)
async def update_transaction(tx_id: str, data: TransactionUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Transaction).where(Transaction.id == tx_id))
    t = result.scalar_one_or_none()
    if not t: raise HTTPException(404, "Transaction not found")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(t, k, v)
    await db.commit()
    await db.refresh(t)
    return TransactionOut.model_validate(t)

@router.delete("/transactions/{tx_id}", status_code=204)
async def delete_transaction(tx_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Transaction).where(Transaction.id == tx_id))
    t = result.scalar_one_or_none()
    if not t: raise HTTPException(404, "Transaction not found")
    await db.delete(t)
    await db.commit()

@router.get("/workers", response_model=List[WorkerOut])
async def list_workers(project_id: Optional[str] = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    q = select(Worker)
    if project_id: q = q.where(Worker.project_id == project_id)
    result = await db.execute(q.order_by(Worker.created_at.desc()))
    return [WorkerOut.model_validate(w) for w in result.scalars().all()]

@router.post("/workers", response_model=WorkerOut, status_code=201)
async def create_worker(data: WorkerCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    w = Worker(**data.model_dump(), join_date=date.today())
    db.add(w)
    await db.commit()
    await db.refresh(w)
    return WorkerOut.model_validate(w)

@router.patch("/workers/{worker_id}", response_model=WorkerOut)
async def update_worker(worker_id: str, data: WorkerUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    w = result.scalar_one_or_none()
    if not w: raise HTTPException(404, "Worker not found")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(w, k, v)
    await db.commit()
    await db.refresh(w)
    return WorkerOut.model_validate(w)

@router.delete("/workers/{worker_id}", status_code=204)
async def delete_worker(worker_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    w = result.scalar_one_or_none()
    if not w: raise HTTPException(404, "Worker not found")
    await db.delete(w)
    await db.commit()
