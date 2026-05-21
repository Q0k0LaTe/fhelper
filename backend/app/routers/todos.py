"""今日待办事项 CRUD 接口。"""
from datetime import date as date_cls

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/todos", tags=["待办"])


@router.get("", response_model=list[schemas.TodoOut])
def list_todos(
    date: date_cls | None = Query(default=None, description="按日期筛选，默认全部"),
    db: Session = Depends(get_db),
):
    stmt = select(models.Todo).order_by(
        models.Todo.completed, models.Todo.created_at.desc()
    )
    if date is not None:
        stmt = stmt.where(models.Todo.date == date)
    return db.scalars(stmt).all()


@router.post("", response_model=schemas.TodoOut, status_code=201)
def create_todo(payload: schemas.TodoCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    if data.get("date") is None:
        data["date"] = date_cls.today()
    todo = models.Todo(**data)
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@router.put("/{todo_id}", response_model=schemas.TodoOut)
def update_todo(
    todo_id: int, payload: schemas.TodoUpdate, db: Session = Depends(get_db)
):
    todo = db.get(models.Todo, todo_id)
    if not todo:
        raise HTTPException(404, "待办不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(todo, field, value)
    db.commit()
    db.refresh(todo)
    return todo


@router.delete("/{todo_id}", status_code=204)
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    todo = db.get(models.Todo, todo_id)
    if not todo:
        raise HTTPException(404, "待办不存在")
    db.delete(todo)
    db.commit()
