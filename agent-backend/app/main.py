"""
FastAPI 应用入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import agent, rag

app = FastAPI(title="GIS Agent Backend", version="1.0.0")

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
