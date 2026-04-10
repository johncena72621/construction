from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import date
from ..database import get_db
from ..models.models import Material, MaterialLog, User
from ..models.schemas import MaterialCreate, MaterialUpdate, MaterialOut, MaterialLogCreate, MaterialLogOut
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/materials", tags=["Inventory"])

@router.get("", response_model=List[MaterialOut])
async def list_materials(project_id: Optional[str] = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    q = select(Material)
    if project_id: q = q.where(Material.project_id == project_id)
    result = await db.execute(q.order_by(Material.created_at.desc()))
    return [MaterialOut.model_validate(m) for m in result.scalars().all()]

@router.post("", response_model=MaterialOut, status_code=201)
async def create_material(data: MaterialCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    m = Material(**data.model_dump(), last_restocked=date.today())
    m.qr_code = f"BUILDPRO-MAT-{m.id[:8]}"
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return MaterialOut.model_validate(m)

@router.get("/{material_id}", response_model=MaterialOut)
async def get_material(material_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Material).where(Material.id == material_id))
    m = result.scalar_one_or_none()
    if not m: raise HTTPException(404, "Material not found")
    return MaterialOut.model_validate(m)

@router.patch("/{material_id}", response_model=MaterialOut)
async def update_material(material_id: str, data: MaterialUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Material).where(Material.id == material_id))
    m = result.scalar_one_or_none()
    if not m: raise HTTPException(404, "Material not found")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(m, k, v)
    await db.commit()
    await db.refresh(m)
    return MaterialOut.model_validate(m)

@router.delete("/{material_id}", status_code=204)
async def delete_material(material_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Material).where(Material.id == material_id))
    m = result.scalar_one_or_none()
    if not m: raise HTTPException(404, "Material not found")
    await db.delete(m)
    await db.commit()

@router.post("/log", response_model=MaterialLogOut, status_code=201)
async def log_material_usage(data: MaterialLogCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Material).where(Material.id == data.material_id))
    m = result.scalar_one_or_none()
    if not m: raise HTTPException(404, "Material not found")
    log = MaterialLog(**data.model_dump(), date=date.today())
    db.add(log)
    if data.log_type == "out":
        m.current_stock = max(0, m.current_stock - data.quantity)
    else:
        m.current_stock += data.quantity
        m.last_restocked = date.today()
    await db.commit()
    await db.refresh(log)
    return MaterialLogOut.model_validate(log)

@router.get("/{material_id}/logs", response_model=List[MaterialLogOut])
async def get_material_logs(material_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(MaterialLog).where(MaterialLog.material_id == material_id).order_by(MaterialLog.created_at.desc()))
    return [MaterialLogOut.model_validate(l) for l in result.scalars().all()]

@router.get("/qr/{qr_code}", response_model=MaterialOut)
async def lookup_by_qr(qr_code: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Material).where(Material.qr_code == qr_code))
    m = result.scalar_one_or_none()
    if not m: raise HTTPException(404, "Material not found for QR code")
    return MaterialOut.model_validate(m)
