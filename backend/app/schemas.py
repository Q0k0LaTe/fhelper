"""Pydantic 模型：请求体校验 + 响应序列化。

每个实体通常有三种：
- *Create：新建时的字段
- *Update：更新时全部可选
- *Out：返回给前端的字段（含 id）
"""
from datetime import date as date_, datetime

from pydantic import BaseModel, ConfigDict, Field


# ---------- 课程 ----------
class CourseBase(BaseModel):
    name: str
    day_of_week: int = Field(ge=1, le=7)
    start_time: str
    end_time: str
    location: str = ""
    teacher: str = ""
    color: str = "#D9512C"


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    name: str | None = None
    day_of_week: int | None = Field(default=None, ge=1, le=7)
    start_time: str | None = None
    end_time: str | None = None
    location: str | None = None
    teacher: str | None = None
    color: str | None = None


class CourseOut(CourseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- 作业 ----------
class AssignmentBase(BaseModel):
    title: str
    course_id: int | None = None
    due_date: datetime
    notes: str = ""
    priority: str = "medium"
    completed: bool = False


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentUpdate(BaseModel):
    title: str | None = None
    course_id: int | None = None
    due_date: datetime | None = None
    notes: str | None = None
    priority: str | None = None
    completed: bool | None = None


class AssignmentOut(AssignmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    course: CourseOut | None = None


# ---------- 待办 ----------
class TodoBase(BaseModel):
    content: str
    date: date_ | None = None
    completed: bool = False


class TodoCreate(TodoBase):
    pass


class TodoUpdate(BaseModel):
    content: str | None = None
    date: date_ | None = None
    completed: bool | None = None


class TodoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    content: str
    date: date_
    completed: bool
    created_at: datetime


# ---------- 收藏 ----------
class FavoriteBase(BaseModel):
    name: str
    category: str = "other"
    location: str = ""
    note: str = ""
    rating: int = Field(default=5, ge=1, le=5)


class FavoriteCreate(FavoriteBase):
    pass


class FavoriteUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    location: str | None = None
    note: str | None = None
    rating: int | None = Field(default=None, ge=1, le=5)


class FavoriteOut(FavoriteBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- 学习记录 ----------
class StudySessionBase(BaseModel):
    subject: str
    course_id: int | None = None
    minutes: int = Field(gt=0)
    date: date_ | None = None
    note: str = ""


class StudySessionCreate(StudySessionBase):
    pass


class StudySessionUpdate(BaseModel):
    subject: str | None = None
    course_id: int | None = None
    minutes: int | None = Field(default=None, gt=0)
    date: date_ | None = None
    note: str | None = None


class StudySessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    subject: str
    course_id: int | None
    minutes: int
    date: date_
    note: str
    course: CourseOut | None = None


# ---------- 统计 ----------
class DailyStat(BaseModel):
    date: date_
    weekday: int
    minutes: int


class SubjectStat(BaseModel):
    subject: str
    minutes: int


class StudyStats(BaseModel):
    week_start: date_
    week_end: date_
    total_minutes: int
    daily: list[DailyStat]
    by_subject: list[SubjectStat]


# ---------- 今日总览 ----------
class DashboardOut(BaseModel):
    today: date_
    weekday: int
    courses_today: list[CourseOut]
    todos_today: list[TodoOut]
    upcoming_assignments: list[AssignmentOut]
    study_minutes_this_week: int


# ---------- AI 助手 ----------
class ChatMessage(BaseModel):
    role: str  # user / assistant
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ChatAction(BaseModel):
    type: str  # add_todo / add_course / complete_todo ...
    entity: str  # todo / course / assignment / favorite / study
    label: str  # 给用户看的一句话，如 "已加待办：复习算法"


class ChatResponse(BaseModel):
    reply: str
    actions: list[ChatAction] = []


class ChatStatus(BaseModel):
    configured: bool
    model: str | None = None
