from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from ..database import get_db
from ..models.models import Project, ProjectPhase, User
from ..models.schemas import ProjectCreate, ProjectUpdate, ProjectOut, PhaseCreate, PhaseUpdate, PhaseOut
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectOut])
async def list_projects(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Project).where(Project.owner_id == user.id).options(selectinload(Project.phases)).order_by(Project.created_at.desc()))
    return [ProjectOut.model_validate(p) for p in result.scalars().all()]

@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    p = Project(**data.model_dump(), owner_id=user.id)
    db.add(p)
    await db.commit()
    await db.refresh(p, ["phases"])
    return ProjectOut.model_validate(p)

@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == user.id).options(selectinload(Project.phases)))
    p = result.scalar_one_or_none()
    if not p: raise HTTPException(404, "Project not found")
    return ProjectOut.model_validate(p)

@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, data: ProjectUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == user.id).options(selectinload(Project.phases)))
    p = result.scalar_one_or_none()
    if not p: raise HTTPException(404, "Project not found")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(p, k, v)
    await db.commit()
    await db.refresh(p, ["phases"])
    return ProjectOut.model_validate(p)

@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == user.id))
    p = result.scalar_one_or_none()
    if not p: raise HTTPException(404, "Project not found")
    await db.delete(p)
    await db.commit()

@router.post("/{project_id}/phases", response_model=PhaseOut, status_code=201)
async def add_phase(project_id: str, data: PhaseCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == user.id))
    if not result.scalar_one_or_none(): raise HTTPException(404, "Project not found")
    phase = ProjectPhase(project_id=project_id, **data.model_dump())
    db.add(phase)
    await db.commit()
    await db.refresh(phase)
    return PhaseOut.model_validate(phase)

@router.patch("/{project_id}/phases/{phase_id}", response_model=PhaseOut)
async def update_phase(project_id: str, phase_id: str, data: PhaseUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(ProjectPhase).where(ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id))
    ph = result.scalar_one_or_none()
    if not ph: raise HTTPException(404, "Phase not found")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(ph, k, v)
    await db.commit()
    await db.refresh(ph)
    return PhaseOut.model_validate(ph)

@router.delete("/{project_id}/phases/{phase_id}", status_code=204)
async def delete_phase(project_id: str, phase_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(ProjectPhase).where(ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id))
    ph = result.scalar_one_or_none()
    if not ph: raise HTTPException(404, "Phase not found")
    await db.delete(ph)
    await db.commit()
