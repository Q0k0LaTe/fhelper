"""课程表 CRUD 接口。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/courses", tags=["课程表"])


@router.get("", response_model=list[schemas.CourseOut])
def list_courses(db: Session = Depends(get_db)):
    stmt = select(models.Course).order_by(
        models.Course.day_of_week, models.Course.start_time
    )
    return db.scalars(stmt).all()


@router.post("", response_model=schemas.CourseOut, status_code=201)
def create_course(payload: schemas.CourseCreate, db: Session = Depends(get_db)):
    course = models.Course(**payload.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/{course_id}", response_model=schemas.CourseOut)
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.get(models.Course, course_id)
    if not course:
        raise HTTPException(404, "课程不存在")
    return course


@router.put("/{course_id}", response_model=schemas.CourseOut)
def update_course(
    course_id: int, payload: schemas.CourseUpdate, db: Session = Depends(get_db)
):
    course = db.get(models.Course, course_id)
    if not course:
        raise HTTPException(404, "课程不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.get(models.Course, course_id)
    if not course:
        raise HTTPException(404, "课程不存在")
    db.delete(course)
    db.commit()
