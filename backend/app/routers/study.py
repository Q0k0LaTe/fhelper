"""学习记录 CRUD + 每周学习时间统计。"""
from collections import defaultdict
from datetime import date as date_cls
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/study", tags=["学习统计"])


def _week_bounds(offset: int = 0) -> tuple[date_cls, date_cls]:
    """返回相对当前周的周一与周日。offset=0 本周，-1 上一周。"""
    today = date_cls.today()
    monday = today - timedelta(days=today.weekday())  # weekday(): 周一=0
    monday += timedelta(weeks=offset)
    return monday, monday + timedelta(days=6)


@router.get("/stats", response_model=schemas.StudyStats)
def study_stats(
    offset: int = Query(default=0, description="周偏移：0=本周，-1=上一周"),
    db: Session = Depends(get_db),
):
    week_start, week_end = _week_bounds(offset)
    stmt = select(models.StudySession).where(
        models.StudySession.date >= week_start,
        models.StudySession.date <= week_end,
    )
    sessions = db.scalars(stmt).all()

    per_day: dict[date_cls, int] = defaultdict(int)
    per_subject: dict[str, int] = defaultdict(int)
    for s in sessions:
        per_day[s.date] += s.minutes
        per_subject[s.subject] += s.minutes

    daily = [
        schemas.DailyStat(
            date=week_start + timedelta(days=i),
            weekday=i + 1,
            minutes=per_day.get(week_start + timedelta(days=i), 0),
        )
        for i in range(7)
    ]
    by_subject = [
        schemas.SubjectStat(subject=name, minutes=mins)
        for name, mins in sorted(per_subject.items(), key=lambda kv: -kv[1])
    ]
    return schemas.StudyStats(
        week_start=week_start,
        week_end=week_end,
        total_minutes=sum(per_day.values()),
        daily=daily,
        by_subject=by_subject,
    )


@router.get("", response_model=list[schemas.StudySessionOut])
def list_sessions(db: Session = Depends(get_db)):
    stmt = select(models.StudySession).order_by(models.StudySession.date.desc())
    return db.scalars(stmt).all()


@router.post("", response_model=schemas.StudySessionOut, status_code=201)
def create_session(
    payload: schemas.StudySessionCreate, db: Session = Depends(get_db)
):
    data = payload.model_dump()
    if data.get("date") is None:
        data["date"] = date_cls.today()
    session = models.StudySession(**data)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.put("/{session_id}", response_model=schemas.StudySessionOut)
def update_session(
    session_id: int,
    payload: schemas.StudySessionUpdate,
    db: Session = Depends(get_db),
):
    session = db.get(models.StudySession, session_id)
    if not session:
        raise HTTPException(404, "学习记录不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_db)):
    session = db.get(models.StudySession, session_id)
    if not session:
        raise HTTPException(404, "学习记录不存在")
    db.delete(session)
    db.commit()
