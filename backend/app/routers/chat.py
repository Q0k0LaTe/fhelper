"""AI 助手对话接口。"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..config import LLM_MODEL, llm_configured
from ..database import get_db
from ..llm import chat as run_chat

router = APIRouter(prefix="/api/chat", tags=["AI 助手"])


@router.get("/status", response_model=schemas.ChatStatus)
def status():
    """前端用来判断是否已配置 AI（决定要不要显示提示）。"""
    return {"configured": llm_configured(), "model": LLM_MODEL if llm_configured() else None}


@router.post("", response_model=schemas.ChatResponse)
def chat(req: schemas.ChatRequest, db: Session = Depends(get_db)):
    return run_chat(db, [m.model_dump() for m in req.messages])
