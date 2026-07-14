---
title: RAG 知识库 API
type: api
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [api, fastapi, rag, knowledge, vector]

references: []

related:
  - apis/agent-api.md

source:
  - agent-backend/app/api/rag.py
  - agent-backend/app/services/rag_service.py

summary: RAG 知识库 API，提供文档上传、向量检索和知识库管理
---

# RAG 知识库 API

## 1. 概述

RAG（Retrieval-Augmented Generation）知识库 API，提供文档上传、向量检索和知识库管理能力。

## 2. 接口列表

### 2.1 上传文档

```
POST /api/rag/upload
```

**请求**：`multipart/form-data`，支持 `.md` / `.txt` 文件

**响应**：

```json
{
  "success": true,
  "message": "文档 xxx.md 已索引",
  "char_count": 1234
}
```

### 2.2 向量检索

```
GET /api/rag/search?query=北京市医院&top_k=3
```

**响应**：

```json
{
  "success": true,
  "query": "北京市医院",
  "documents": [{"content": "...", "metadata": {...}}],
  "count": 3
}
```

### 2.3 获取已索引文档列表

```
GET /api/rag/docs
```

**响应**：

```json
{
  "success": true,
  "docs": ["doc1.md", "doc2.md"],
  "ready": true
}
```

## 3. 技术栈

| 技术 | 用途 |
|------|------|
| FAISS | 向量存储 |
| LangChain | RAG 框架 |
| OpenAI Embedding | 向量化模型 |

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| RAG API | `agent-backend/app/api/rag.py` |
| RAG 服务 | `agent-backend/app/services/rag_service.py` |
