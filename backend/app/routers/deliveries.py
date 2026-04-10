from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from ..database import get_db
from ..models.models import Delivery, User
from ..models.schemas import DeliveryCreate, DeliveryUpdate, DeliveryOut
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/deliveries", tags=["Deliveries"])

@router.get("", response_model=List[DeliveryOut])
async def list_deliveries(project_id: Optional[str] = None, status: Optional[str] = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    q = select(Delivery)
    if project_id: q = q.where(Delivery.project_id == project_id)
    if status: q = q.where(Delivery.status == status)
    result = await db.execute(q.order_by(Delivery.created_at.desc()))
    return [DeliveryOut.model_validate(d) for d in result.scalars().all()]

@router.post("", response_model=DeliveryOut, status_code=201)
async def create_delivery(data: DeliveryCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    d = Delivery(**data.model_dump())
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return DeliveryOut.model_validate(d)

@router.patch("/{delivery_id}", response_model=DeliveryOut)
async def update_delivery(delivery_id: str, data: DeliveryUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Delivery).where(Delivery.id == delivery_id))
    d = result.scalar_one_or_none()
    if not d: raise HTTPException(404, "Delivery not found")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(d, k, v)
    await db.commit()
    await db.refresh(d)
    return DeliveryOut.model_validate(d)

@router.delete("/{delivery_id}", status_code=204)
async def delete_delivery(delivery_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Delivery).where(Delivery.id == delivery_id))
    d = result.scalar_one_or_none()
    if not d: raise HTTPException(404, "Delivery not found")
    await db.delete(d)
    await db.commit()
