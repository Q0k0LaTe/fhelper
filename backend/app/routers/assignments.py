"""作业 / deadline CRUD 接口。"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/assignments", tags=["作业"])


@router.get("", response_model=list[schemas.AssignmentOut])
def list_assignments(
    completed: bool | None = Query(default=None, description="按完成状态筛选"),
    db: Session = Depends(get_db),
):
    stmt = select(models.Assignment).order_by(models.Assignment.due_date)
    if completed is not None:
        stmt = stmt.where(models.Assignment.completed == completed)
    return db.scalars(stmt).all()


@router.post("", response_model=schemas.AssignmentOut, status_code=201)
def create_assignment(
    payload: schemas.AssignmentCreate, db: Session = Depends(get_db)
):
    assignment = models.Assignment(**payload.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/{assignment_id}", response_model=schemas.AssignmentOut)
def get_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.get(models.Assignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "作业不存在")
    return assignment


@router.put("/{assignment_id}", response_model=schemas.AssignmentOut)
def update_assignment(
    assignment_id: int,
    payload: schemas.AssignmentUpdate,
    db: Session = Depends(get_db),
):
    assignment = db.get(models.Assignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "作业不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(assignment, field, value)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/{assignment_id}", status_code=204)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.get(models.Assignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "作业不存在")
    db.delete(assignment)
    db.commit()
