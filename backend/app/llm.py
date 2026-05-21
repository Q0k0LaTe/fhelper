"""AI 校园助手：基于 Kimi（OpenAI 兼容）的工具调用 agent。

三件事：
1. 把用户当前状态（课程 / 作业 / 待办 / 学习 / 收藏）注入 system prompt，
   让模型"读懂现状"后再回复；
2. 提供一组工具，让模型在对话中自行判断并**自动创建/完成**条目；
3. 规划学习时间 = 模型按 deadline 紧迫度多次调用 add_study_session / add_todo。

工具执行是自动的（用户选择"自动添加 + 提示"），每次执行都会回传一个
action，前端据此显示"已添加 xxx"并跳转到对应页面。
"""
from __future__ import annotations

import json
from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models
from .config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_TEMPERATURE, llm_configured

WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
CATEGORY_LABELS = {"canteen": "食堂", "cafe": "咖啡店", "library": "图书馆", "other": "其他"}
COURSE_COLORS = [
    "#cf4b22", "#1f5e5b", "#c28a1e", "#7a5c9e", "#5c7a52", "#b23a48", "#356a8c",
]
MAX_STEPS = 6  # 工具调用循环上限，防止失控


# ---------------------------------------------------------------- 解析助手
def _wd(n: int) -> str:
    return WEEKDAYS[n - 1] if 1 <= n <= 7 else f"周{n}"


def _parse_date(s: str | None) -> date:
    if not s:
        return date.today()
    try:
        return date.fromisoformat(s.strip()[:10])
    except ValueError:
        return date.today()


def _parse_dt(s: str | None) -> datetime:
    """容忍多种格式；缺省落到今天 23:59。"""
    s = (s or "").strip().replace("T", " ")
    if not s:
        d = date.today()
        return datetime(d.year, d.month, d.day, 23, 59)
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    d = date.today()
    return datetime(d.year, d.month, d.day, 23, 59)


def _resolve_course_id(db: Session, course_name: str | None) -> int | None:
    if not course_name:
        return None
    name = course_name.strip()
    c = db.scalar(select(models.Course).where(models.Course.name == name))
    if not c:
        c = db.scalar(select(models.Course).where(models.Course.name.like(f"%{name}%")))
    return c.id if c else None


def _next_color(db: Session) -> str:
    n = db.scalar(select(func.count()).select_from(models.Course)) or 0
    return COURSE_COLORS[n % len(COURSE_COLORS)]


# ---------------------------------------------------------------- 当前状态摘要
def state_summary(db: Session) -> str:
    today = date.today()
    out: list[str] = [f"今天是 {today.isoformat()} {_wd(today.weekday() + 1)}。"]

    courses = db.scalars(
        select(models.Course).order_by(models.Course.day_of_week, models.Course.start_time)
    ).all()
    out.append(f"\n课程表（共 {len(courses)} 门）：")
    out += [
        f"  - [id{c.id}] {_wd(c.day_of_week)} {c.start_time}-{c.end_time} {c.name}"
        f"{'｜' + c.location if c.location else ''}"
        for c in courses
    ] or ["  （空）"]

    asgs = db.scalars(
        select(models.Assignment)
        .where(models.Assignment.completed.is_(False))
        .order_by(models.Assignment.due_date)
    ).all()
    out.append(f"\n未完成作业（{len(asgs)} 个）：")
    out += [
        f"  - [id{a.id}] {a.title}｜截止 {a.due_date:%m-%d %H:%M}｜{a.priority}优先级"
        for a in asgs
    ] or ["  （无）"]

    todos = db.scalars(
        select(models.Todo)
        .where(models.Todo.completed.is_(False), models.Todo.date >= today)
        .order_by(models.Todo.date)
    ).all()
    out.append(f"\n待办（未完成，{len(todos)} 条）：")
    out += [f"  - [id{t.id}] {t.date.isoformat()} {t.content}" for t in todos] or ["  （无）"]

    # 本周学习
    monday = today.fromordinal(today.toordinal() - today.weekday())
    rows = db.execute(
        select(models.StudySession.subject, func.sum(models.StudySession.minutes))
        .where(models.StudySession.date >= monday)
        .group_by(models.StudySession.subject)
    ).all()
    total = sum(m or 0 for _, m in rows)
    out.append(f"\n本周学习共 {total} 分钟。")
    out += [f"  - {subj}: {m} 分钟" for subj, m in rows]

    fav_n = db.scalar(select(func.count()).select_from(models.Favorite)) or 0
    out.append(f"\n收藏地点 {fav_n} 个。")
    return "\n".join(out)


# ---------------------------------------------------------------- 工具定义
def _fn(name, desc, props, required):
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": desc,
            "parameters": {"type": "object", "properties": props, "required": required},
        },
    }


TOOLS = [
    _fn(
        "add_course", "添加一节每周固定的课程到课程表。",
        {
            "name": {"type": "string", "description": "课程名，如 高等数学"},
            "day_of_week": {"type": "integer", "description": "星期几：1=周一 … 7=周日"},
            "start_time": {"type": "string", "description": "开始时间，24 小时制 HH:MM，如 14:00"},
            "end_time": {"type": "string", "description": "结束时间 HH:MM"},
            "location": {"type": "string", "description": "上课地点，可选"},
            "teacher": {"type": "string", "description": "授课老师，可选"},
        },
        ["name", "day_of_week", "start_time", "end_time"],
    ),
    _fn(
        "add_assignment", "添加一个作业 / deadline。",
        {
            "title": {"type": "string", "description": "作业标题"},
            "due_date": {"type": "string", "description": "截止时间，格式 YYYY-MM-DD HH:MM"},
            "priority": {"type": "string", "enum": ["low", "medium", "high"], "description": "优先级"},
            "course_name": {"type": "string", "description": "所属课程名（会自动匹配已有课程），可选"},
            "notes": {"type": "string", "description": "备注，可选"},
        },
        ["title", "due_date"],
    ),
    _fn(
        "add_todo", "添加一条待办事项。",
        {
            "content": {"type": "string", "description": "待办内容"},
            "date": {"type": "string", "description": "日期 YYYY-MM-DD，缺省为今天"},
        },
        ["content"],
    ),
    _fn(
        "add_favorite", "收藏一个校园地点（食堂 / 咖啡店 / 图书馆 等）。",
        {
            "name": {"type": "string", "description": "地点名称"},
            "category": {
                "type": "string",
                "enum": ["canteen", "cafe", "library", "other"],
                "description": "类别：canteen 食堂 / cafe 咖啡店 / library 图书馆 / other 其他",
            },
            "location": {"type": "string", "description": "位置描述，可选"},
            "rating": {"type": "integer", "description": "评分 1-5，可选，默认 5"},
            "note": {"type": "string", "description": "备注，可选"},
        },
        ["name", "category"],
    ),
    _fn(
        "add_study_session",
        "记录 / 规划一段学习时间。规划复习计划时，按 deadline 紧迫度多次调用，分配到不同日期。",
        {
            "subject": {"type": "string", "description": "学习科目 / 内容"},
            "minutes": {"type": "integer", "description": "时长（分钟），> 0"},
            "date": {"type": "string", "description": "日期 YYYY-MM-DD，缺省今天"},
            "course_name": {"type": "string", "description": "关联课程名，可选"},
            "note": {"type": "string", "description": "备注，可选"},
        },
        ["subject", "minutes"],
    ),
    _fn(
        "complete_todo", "把某条待办标记为已完成（用当前状态里给出的 id）。",
        {"todo_id": {"type": "integer", "description": "待办的 id"}},
        ["todo_id"],
    ),
    _fn(
        "complete_assignment", "把某个作业标记为已完成（用当前状态里给出的 id）。",
        {"assignment_id": {"type": "integer", "description": "作业的 id"}},
        ["assignment_id"],
    ),
]


# ---------------------------------------------------------------- 工具执行
def _add_course(db, a):
    dow = max(1, min(7, int(a["day_of_week"])))
    c = models.Course(
        name=a["name"], day_of_week=dow,
        start_time=str(a["start_time"]), end_time=str(a["end_time"]),
        location=a.get("location") or "", teacher=a.get("teacher") or "",
        color=_next_color(db),
    )
    db.add(c); db.commit(); db.refresh(c)
    label = f"{_wd(dow)} {c.start_time} {c.name}"
    return {"ok": True, "id": c.id}, {"type": "add_course", "entity": "course", "label": f"已加到课程表：{label}"}


def _add_assignment(db, a):
    asg = models.Assignment(
        title=a["title"], due_date=_parse_dt(a.get("due_date")),
        priority=a.get("priority") or "medium", notes=a.get("notes") or "",
        course_id=_resolve_course_id(db, a.get("course_name")),
    )
    db.add(asg); db.commit(); db.refresh(asg)
    return {"ok": True, "id": asg.id}, {
        "type": "add_assignment", "entity": "assignment",
        "label": f"已加作业：{asg.title}（{asg.due_date:%m-%d %H:%M} 截止）",
    }


def _add_todo(db, a):
    t = models.Todo(content=a["content"], date=_parse_date(a.get("date")))
    db.add(t); db.commit(); db.refresh(t)
    when = "今天" if t.date == date.today() else t.date.isoformat()
    return {"ok": True, "id": t.id}, {
        "type": "add_todo", "entity": "todo", "label": f"已加待办（{when}）：{t.content}",
    }


def _add_favorite(db, a):
    cat = a.get("category") if a.get("category") in CATEGORY_LABELS else "other"
    rating = int(a.get("rating") or 5)
    f = models.Favorite(
        name=a["name"], category=cat, location=a.get("location") or "",
        note=a.get("note") or "", rating=max(1, min(5, rating)),
    )
    db.add(f); db.commit(); db.refresh(f)
    return {"ok": True, "id": f.id}, {
        "type": "add_favorite", "entity": "favorite",
        "label": f"已收藏：{f.name}（{CATEGORY_LABELS[cat]}）",
    }


def _add_study_session(db, a):
    mins = max(1, int(a["minutes"]))
    s = models.StudySession(
        subject=a["subject"], minutes=mins, date=_parse_date(a.get("date")),
        note=a.get("note") or "", course_id=_resolve_course_id(db, a.get("course_name")),
    )
    db.add(s); db.commit(); db.refresh(s)
    when = "今天" if s.date == date.today() else s.date.isoformat()
    return {"ok": True, "id": s.id}, {
        "type": "add_study_session", "entity": "study",
        "label": f"已排学习（{when}）：{s.subject} {mins} 分钟",
    }


def _complete_todo(db, a):
    t = db.get(models.Todo, int(a["todo_id"]))
    if not t:
        return {"ok": False, "error": "找不到该待办"}, None
    t.completed = True; db.commit()
    return {"ok": True}, {"type": "complete_todo", "entity": "todo", "label": f"已完成待办：{t.content}"}


def _complete_assignment(db, a):
    asg = db.get(models.Assignment, int(a["assignment_id"]))
    if not asg:
        return {"ok": False, "error": "找不到该作业"}, None
    asg.completed = True; db.commit()
    return {"ok": True}, {"type": "complete_assignment", "entity": "assignment", "label": f"已完成作业：{asg.title}"}


_IMPL = {
    "add_course": _add_course,
    "add_assignment": _add_assignment,
    "add_todo": _add_todo,
    "add_favorite": _add_favorite,
    "add_study_session": _add_study_session,
    "complete_todo": _complete_todo,
    "complete_assignment": _complete_assignment,
}


def _execute(db: Session, name: str, args: dict):
    fn = _IMPL.get(name)
    if not fn:
        return {"ok": False, "error": f"未知工具 {name}"}, None
    try:
        return fn(db, args)
    except Exception as e:  # 工具出错也回传给模型，让它自行解释/重试
        db.rollback()
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}, None


# ---------------------------------------------------------------- 主循环
def _system_prompt(db: Session) -> str:
    return (
        "你是“校园手账” App 里的 AI 助理，帮助大学生管理课程表、作业 deadline、"
        "待办、学习时间和校园收藏。\n\n"
        "【用户当前状态】\n" + state_summary(db) + "\n\n"
        "【工作方式】\n"
        "- 用简体中文、轻松简洁地回复，不要长篇大论。\n"
        "- 当用户提到要上的课、要交的作业/deadline、要做的事、想去的地点、学习计划时，"
        "主动调用对应工具帮他添加，而不是只用嘴说。\n"
        "- 规划学习/复习时间时，先看上面各科 deadline 的紧迫度，把任务拆成若干段，"
        "用 add_study_session（或 add_todo）分配到合适日期，越紧的越靠前、留足缓冲。\n"
        "- 信息不全时（比如加课缺少时间），用合理默认值，或先简短问清最关键的一两项再添加。\n"
        "- 引用现状时只用上面给出的数据，不要编造。\n"
        "- 完成所有工具调用后，用一两句话总结你做了什么。"
    )


def chat(db: Session, messages: list[dict]) -> dict:
    """messages: [{role, content}]（user/assistant 历史）。返回 {reply, actions}。"""
    if not llm_configured():
        return {
            "reply": "我还没接上大脑～请在 backend/.env 里设置 LLM_API_KEY=你的 Kimi 密钥"
            "（可选 LLM_BASE_URL、LLM_MODEL），然后重启后端就能聊啦。",
            "actions": [],
        }

    convo = [{"role": "system", "content": _system_prompt(db)}]
    for m in messages:
        if m.get("role") in ("user", "assistant") and (m.get("content") or "").strip():
            convo.append({"role": m["role"], "content": m["content"]})

    actions: list[dict] = []
    try:
        from openai import OpenAI

        client = OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)
        kwargs = dict(model=LLM_MODEL, messages=convo, tools=TOOLS, tool_choice="auto")
        if LLM_TEMPERATURE is not None:
            kwargs["temperature"] = LLM_TEMPERATURE
        for _ in range(MAX_STEPS):
            resp = client.chat.completions.create(**kwargs)
            msg = resp.choices[0].message
            if not msg.tool_calls:
                return {"reply": (msg.content or "").strip(), "actions": actions}

            assistant_msg = {
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {
                        "id": tc.id, "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in msg.tool_calls
                ],
            }
            # Kimi K2.6 等“思考”模型：带 tool_calls 的 assistant 消息回传时
            # 必须带上 reasoning_content，否则下一轮请求 400。
            reasoning = getattr(msg, "reasoning_content", None)
            if reasoning:
                assistant_msg["reasoning_content"] = reasoning
            convo.append(assistant_msg)
            for tc in msg.tool_calls:
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                result, action = _execute(db, tc.function.name, args)
                if action:
                    actions.append(action)
                convo.append({
                    "role": "tool", "tool_call_id": tc.id,
                    "content": json.dumps(result, ensure_ascii=False),
                })
        return {"reply": "（这次帮你处理的步骤有点多，先停一下，你看看上面的结果～）", "actions": actions}
    except Exception as e:
        return {"reply": f"调用 AI 时出错了：{type(e).__name__}: {e}", "actions": actions}
