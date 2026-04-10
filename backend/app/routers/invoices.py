from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date
from ..database import get_db
from ..models.models import Invoice, InvoiceItem, User
from ..models.schemas import InvoiceCreate, InvoiceUpdate, InvoiceOut
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])

async def _next_inv_number(db: AsyncSession) -> str:
    result = await db.execute(select(func.count(Invoice.id)))
    count = result.scalar() or 0
    return f"INV-{date.today().year}-{str(count + 1).zfill(4)}"

@router.get("", response_model=List[InvoiceOut])
async def list_invoices(project_id: Optional[str] = None, status: Optional[str] = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    q = select(Invoice).options(selectinload(Invoice.items))
    if project_id: q = q.where(Invoice.project_id == project_id)
    if status: q = q.where(Invoice.status == status)
    result = await db.execute(q.order_by(Invoice.created_at.desc()))
    invoices = result.scalars().all()
    today = date.today()
    for inv in invoices:
        if inv.status == "pending" and inv.due_date and inv.due_date < today:
            inv.status = "overdue"
    await db.commit()
    return [InvoiceOut.model_validate(i) for i in invoices]

@router.post("", response_model=InvoiceOut, status_code=201)
async def create_invoice(data: InvoiceCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    inv_num = await _next_inv_number(db)
    items = []
    amount = 0
    for item_data in data.items:
        total = item_data.quantity * item_data.unit_price
        amount += total
        items.append(InvoiceItem(description=item_data.description, quantity=item_data.quantity, unit=item_data.unit, unit_price=item_data.unit_price, total=total))
    tax = round(amount * 0.18) if data.inv_type == "supplier" else 0
    inv = Invoice(project_id=data.project_id, invoice_number=inv_num, inv_type=data.inv_type, amount=amount, tax=tax, total=amount + tax, date=date.today(), due_date=data.due_date, party_name=data.party_name, party_contact=data.party_contact, items=items)
    db.add(inv)
    await db.commit()
    await db.refresh(inv, ["items"])
    return InvoiceOut.model_validate(inv)

@router.get("/{invoice_id}", response_model=InvoiceOut)
async def get_invoice(invoice_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id).options(selectinload(Invoice.items)))
    inv = result.scalar_one_or_none()
    if not inv: raise HTTPException(404, "Invoice not found")
    return InvoiceOut.model_validate(inv)

@router.patch("/{invoice_id}", response_model=InvoiceOut)
async def update_invoice(invoice_id: str, data: InvoiceUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id).options(selectinload(Invoice.items)))
    inv = result.scalar_one_or_none()
    if not inv: raise HTTPException(404, "Invoice not found")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(inv, k, v)
    await db.commit()
    await db.refresh(inv, ["items"])
    return InvoiceOut.model_validate(inv)

@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(invoice_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    inv = result.scalar_one_or_none()
    if not inv: raise HTTPException(404, "Invoice not found")
    await db.delete(inv)
    await db.commit()
