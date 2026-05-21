"""LLM 配置：从环境变量 / .env 读取。

默认对接 Kimi（Moonshot，OpenAI 兼容）。要换成别的 OpenAI 兼容服务
（OpenAI / 本地 Ollama 等），只需改这三个环境变量即可，无需改代码。
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# 加载 backend/.env（若存在）。已设置的真实环境变量优先级更高。
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.moonshot.ai/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "kimi-k2.6")

# 采样温度。留空则不传（用模型自带默认）——Kimi K2.6 等推理模型只接受 1，
# 强行传别的值会 400。需要时再用 LLM_TEMPERATURE 覆盖。
_temp = os.getenv("LLM_TEMPERATURE", "").strip()
LLM_TEMPERATURE = float(_temp) if _temp else None


def llm_configured() -> bool:
    return bool(LLM_API_KEY)
