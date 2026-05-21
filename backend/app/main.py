"""校园生活助手 —— FastAPI 应用入口。

启动时：建表 -> 灌示例数据（仅首次）-> 挂载各功能路由。
若 frontend/dist 已构建，则一并托管前端静态文件（生产可单进程运行）。
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, SessionLocal, engine
from .routers import assignments, chat, courses, dashboard, favorites, study, todos
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动：建表 + 灌示例数据（仅首次）
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_if_empty(db)
    yield


app = FastAPI(title="校园生活助手 API", version="1.0.0", lifespan=lifespan)

# 开发环境前端跑在 Vite (5173)，允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["系统"])
def health():
    return {"status": "ok"}


app.include_router(dashboard.router)
app.include_router(courses.router)
app.include_router(assignments.router)
app.include_router(todos.router)
app.include_router(favorites.router)
app.include_router(study.router)
app.include_router(chat.router)

# 生产模式：托管已构建的前端（npm run build 后生成 frontend/dist）
DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if DIST.exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")
