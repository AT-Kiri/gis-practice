---
title: FastAPI 主入口 main
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, fastapi, main, backend]

references:
  - apis/agent-api.md
  - apis/rag-api.md

related:
  - components/llm.md
  - components/rag.md

source:
  - agent-backend/app/main.py
  - agent-backend/app/config.py

summary: FastAPI 应用主入口，配置 CORS、路由注册和生命周期管理
---

# FastAPI 主入口 main

## 1. 概述

FastAPI 应用的主入口文件，负责：
- 创建 FastAPI 应用实例
- 配置 CORS 中间件
- 注册路由
- 应用生命周期管理（启动时初始化 RAG 知识库）

## 2. 应用配置

```python
app = FastAPI(title="GIS Agent Backend", version="1.0.0", lifespan=lifespan)
```

## 3. CORS 配置

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 4. 路由注册

| 路由 | 前缀 | 来源 |
|------|------|------|
| Agent 路由 | `/api/agent` | `app.api.agent` |
| RAG 路由 | `/api/rag` | `app.api.rag` |

## 5. 健康检查

```
GET /api/health
```

```json
{"status": "ok", "service": "gis-agent-backend"}
```

## 6. 生命周期

启动时异步初始化 RAG 知识库，失败不影响服务启动。

## 7. 启动方式

```bash
# 开发模式
python -m app.main

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## 8. 代码位置

| 文件 | 路径 |
|------|------|
| 主入口 | `agent-backend/app/main.py` |
| 配置管理 | `agent-backend/app/config.py` |
| 依赖声明 | `agent-backend/requirements.txt` |
