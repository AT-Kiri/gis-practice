"""
FastAPI 应用入口
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import agent, rag
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化 RAG 知识库"""
    logger.info("正在初始化 RAG 知识库...")
    try:
        rag_service.initialize()
        logger.info(f"RAG 知识库就绪：{len(rag_service.get_indexed_docs())} 个文档已索引")
    except Exception as e:
        logger.warning(f"RAG 知识库初始化失败（非致命）：{e}")
    yield


app = FastAPI(title="GIS Agent Backend", version="1.0.0", lifespan=lifespan)

# CORS 配置：允许前端开发服务器访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(rag.router, prefix="/api/rag", tags=["rag"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "gis-agent-backend"}


if __name__ == "__main__":
    import uvicorn

    # 启动命令：python -m app.main
    # 工作目录须为 agent-backend/
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
