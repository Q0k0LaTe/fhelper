"""首次启动时灌入示例数据，方便直接看到效果（表为空才会执行）。

日期都相对 date.today() 计算，保证演示数据始终落在当前这一周。
"""
from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models


def seed_if_empty(db: Session) -> None:
    if db.scalars(select(models.Course).limit(1)).first():
        return  # 已有数据，跳过

    today = date.today()
    monday = today - timedelta(days=today.weekday())

    # ---- 课程表 ----
    courses = [
        models.Course(name="数据结构与算法", day_of_week=1, start_time="08:00",
                      end_time="09:50", location="逸夫楼 301", teacher="李教授",
                      color="#D9512C"),
        models.Course(name="线性代数", day_of_week=1, start_time="14:00",
                      end_time="15:50", location="一教 205", teacher="王教授",
                      color="#1F5E5B"),
        models.Course(name="计算机网络", day_of_week=2, start_time="10:00",
                      end_time="11:50", location="实验楼 B12", teacher="张教授",
                      color="#C99700"),
        models.Course(name="英语听说", day_of_week=3, start_time="08:00",
                      end_time="09:50", location="外语楼 108", teacher="Smith",
                      color="#7A5C9E"),
        models.Course(name="操作系统", day_of_week=4, start_time="14:00",
                      end_time="16:50", location="逸夫楼 412", teacher="陈教授",
                      color="#2F6F4E"),
        models.Course(name="概率论", day_of_week=5, start_time="10:00",
                      end_time="11:50", location="一教 301", teacher="刘教授",
                      color="#B23A48"),
    ]
    db.add_all(courses)
    db.flush()  # 拿到课程 id

    by_name = {c.name: c.id for c in courses}

    # ---- 作业 / deadline ----
    assignments = [
        models.Assignment(title="算法第三章习题", course_id=by_name["数据结构与算法"],
                          due_date=datetime.combine(today + timedelta(days=1), time(23, 59)),
                          priority="high", notes="重点：红黑树插入与删除"),
        models.Assignment(title="网络实验报告", course_id=by_name["计算机网络"],
                          due_date=datetime.combine(today + timedelta(days=3), time(18, 0)),
                          priority="medium"),
        models.Assignment(title="操作系统 Lab2：调度器", course_id=by_name["操作系统"],
                          due_date=datetime.combine(today + timedelta(days=5), time(23, 59)),
                          priority="high", notes="实现 MLFQ 多级反馈队列"),
        models.Assignment(title="英语口语录音作业", course_id=by_name["英语听说"],
                          due_date=datetime.combine(today + timedelta(days=2), time(12, 0)),
                          priority="low"),
        models.Assignment(title="线代第二次小测复习", course_id=by_name["线性代数"],
                          due_date=datetime.combine(today - timedelta(days=1), time(9, 0)),
                          priority="medium", completed=True),
    ]
    db.add_all(assignments)

    # ---- 今日待办 ----
    todos = [
        models.Todo(content="去图书馆借《算法导论》", date=today),
        models.Todo(content="预约下周三的健身房", date=today),
        models.Todo(content="给妈妈打电话", date=today, completed=True),
        models.Todo(content="整理操作系统课堂笔记", date=today),
    ]
    db.add_all(todos)

    # ---- 收藏 ----
    favorites = [
        models.Favorite(name="第一食堂二楼麻辣香锅", category="canteen",
                        location="一食堂 2F", note="人少、辣度可调", rating=5),
        models.Favorite(name="GeoGround 咖啡", category="cafe",
                        location="地学楼一层", note="手冲不错，有自习位", rating=4),
        models.Favorite(name="主楼图书馆 4 层", category="library",
                        location="主图 4F 西侧", note="安静，靠窗有插座", rating=5),
        models.Favorite(name="北门兰州拉面", category="canteen",
                        location="北门外 50m", note="便宜大碗", rating=4),
        models.Favorite(name="Manner 校外店", category="cafe",
                        location="东门商业街", note="便宜，出杯快", rating=4),
    ]
    db.add_all(favorites)

    # ---- 本周学习记录 ----
    sessions = [
        models.StudySession(subject="数据结构与算法", course_id=by_name["数据结构与算法"],
                            minutes=120, date=monday, note="复习树结构"),
        models.StudySession(subject="操作系统", course_id=by_name["操作系统"],
                            minutes=90, date=monday + timedelta(days=1)),
        models.StudySession(subject="线性代数", course_id=by_name["线性代数"],
                            minutes=60, date=monday + timedelta(days=1)),
        models.StudySession(subject="数据结构与算法", course_id=by_name["数据结构与算法"],
                            minutes=150, date=monday + timedelta(days=2), note="做习题"),
        models.StudySession(subject="英语", minutes=45,
                            date=monday + timedelta(days=2)),
        models.StudySession(subject="计算机网络", course_id=by_name["计算机网络"],
                            minutes=80, date=monday + timedelta(days=3)),
        models.StudySession(subject="操作系统", course_id=by_name["操作系统"],
                            minutes=200, date=min(today, monday + timedelta(days=4)),
                            note="写 Lab2"),
    ]
    db.add_all(sessions)

    db.commit()
