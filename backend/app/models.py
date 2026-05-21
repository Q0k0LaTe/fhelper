"""SQLAlchemy ORM 模型，对应数据库中的 5 张表。"""
from datetime import date as date_, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Course(Base):
    """课程表：一条记录代表每周固定的一节课。"""

    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    day_of_week: Mapped[int] = mapped_column(Integer)  # 1=周一 ... 7=周日
    start_time: Mapped[str] = mapped_column(String(5))  # "08:00"
    end_time: Mapped[str] = mapped_column(String(5))  # "09:50"
    location: Mapped[str] = mapped_column(String(120), default="")
    teacher: Mapped[str] = mapped_column(String(80), default="")
    color: Mapped[str] = mapped_column(String(20), default="#D9512C")


class Assignment(Base):
    """作业 / deadline。"""

    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    course_id: Mapped[int | None] = mapped_column(
        ForeignKey("courses.id", ondelete="SET NULL"), nullable=True
    )
    due_date: Mapped[datetime] = mapped_column(DateTime)
    notes: Mapped[str] = mapped_column(Text, default="")
    priority: Mapped[str] = mapped_column(String(10), default="medium")  # low/medium/high
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    course: Mapped["Course | None"] = relationship()


class Todo(Base):
    """今日待办事项。"""

    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(String(300))
    date: Mapped[date_] = mapped_column(Date, default=date_.today)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class Favorite(Base):
    """收藏：食堂 / 咖啡店 / 图书馆 等校园地点。"""

    __tablename__ = "favorites"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(20))  # canteen/cafe/library/other
    location: Mapped[str] = mapped_column(String(150), default="")
    note: Mapped[str] = mapped_column(Text, default="")
    rating: Mapped[int] = mapped_column(Integer, default=5)  # 1-5 星


class StudySession(Base):
    """学习时长记录，用于每周学习时间统计。"""

    __tablename__ = "study_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject: Mapped[str] = mapped_column(String(120))
    course_id: Mapped[int | None] = mapped_column(
        ForeignKey("courses.id", ondelete="SET NULL"), nullable=True
    )
    minutes: Mapped[int] = mapped_column(Integer)
    date: Mapped[date_] = mapped_column(Date, default=date_.today)
    note: Mapped[str] = mapped_column(String(300), default="")

    course: Mapped["Course | None"] = relationship()
