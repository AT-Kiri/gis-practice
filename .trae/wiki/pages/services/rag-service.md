---
title: RAG 知识库服务
type: service
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, service, rag, faiss, vector]

references:
  - apis/rag-api.md
  - services/llm-service.md

related:
  - components/agent-sub-agents.md

source:
  - agent-backend/app/services/rag_service.py

summary: RAG 向量检索服务，使用 FAISS 向量库 + Embedding 模型实现文档索引与语义检索
---

# RAG 知识库服务

## 1. 概述

RAG（Retrieval-Augmented Generation）知识库服务，使用 FAISS 向量库 + Embedding 模型实现文档索引与语义检索。

## 2. 功能

### 2.1 初始化

启动时自动加载或创建向量库：
1. 检查本地持久化文件是否存在
2. 存在则直接加载
3. 不存在则从 `knowledge_dir` 读取 `.md` 文件并索引

### 2.2 文档索引

```python
rag_service.add_text(content, metadata={"source": "doc.md"})
```

### 2.3 向量检索

```python
results = rag_service.search("应急救援方案", top_k=3)
```

### 2.4 状态检查

```python
rag_service.is_ready()  # 向量库是否已初始化
rag_service.get_indexed_docs()  # 已索引文档列表
```

## 3. 技术栈

| 技术 | 用途 |
|------|------|
| FAISS | 向量存储和相似度检索 |
| LangChain | RAG 框架和文本分割 |
| OpenAI Embedding | 向量化模型 |

## 4. 配置项

| 配置 | 说明 |
|------|------|
| `vector_store_path` | 向量库存储路径 |
| `knowledge_dir` | 知识库文档目录 |
| `embedding_model` | Embedding 模型名称 |

## 5. 代码位置

| 文件 | 路径 |
|------|------|
| RAG 服务 | `agent-backend/app/services/rag_service.py` |
| RAG API | `agent-backend/app/api/rag.py` |
| RAG 工具 | `agent-backend/app/tools/rag_tools.py` |
