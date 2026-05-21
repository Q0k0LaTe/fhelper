"""今日总览：聚合今天的课程、待办、临近作业与本周学习时长。"""
from datetime import date as date_cls
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["总览"])


@router.get("", response_model=schemas.DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    today = date_cls.today()
    weekday = today.weekday() + 1  # 1=周一 ... 7=周日

    courses_today = db.scalars(
        select(models.Course)
        .where(models.Course.day_of_week == weekday)
        .order_by(models.Course.start_time)
    ).all()

    todos_today = db.scalars(
        select(models.Todo)
        .where(models.Todo.date == today)
        .order_by(models.Todo.completed, models.Todo.created_at.desc())
    ).all()

    # 未完成且 7 天内到期的作业
    soon = datetime.now() + timedelta(days=7)
    upcoming = db.scalars(
        select(models.Assignment)
        .where(
            models.Assignment.completed.is_(False),
            models.Assignment.due_date <= soon,
        )
        .order_by(models.Assignment.due_date)
    ).all()

    # 本周（周一至周日）学习总时长
    monday = today - timedelta(days=today.weekday())
    week_minutes = sum(
        s.minutes
        for s in db.scalars(
            select(models.StudySession).where(
                models.StudySession.date >= monday,
                models.StudySession.date <= monday + timedelta(days=6),
            )
        ).all()
    )

    return schemas.DashboardOut(
        today=today,
        weekday=weekday,
        courses_today=courses_today,
        todos_today=todos_today,
        upcoming_assignments=upcoming,
        study_minutes_this_week=week_minutes,
    )
