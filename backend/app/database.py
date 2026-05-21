"""数据库连接与会话管理（SQLite + SQLAlchemy）。"""
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 数据库文件放在 backend/ 目录下，名为 campus.db
DB_PATH = Path(__file__).resolve().parent.parent / "campus.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False 让 SQLite 在 FastAPI 的多线程下可用
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI 依赖注入：每个请求一个数据库会话。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
