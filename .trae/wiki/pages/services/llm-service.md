---
title: LLM 服务
type: service
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, service, llm, langchain]

references:
  - components/agent-coordinator.md
  - components/agent-sub-agents.md

related:
  - services/rag-service.md

source:
  - agent-backend/app/services/llm_service.py

summary: LLM 服务封装，统一 DeepSeek 和 Embedding 模型的创建接口
---

# LLM 服务

## 1. 概述

LLM 服务封装，隔离底层 API 差异，业务代码不直接依赖具体构造器细节。

## 2. 功能

### 2.1 聊天模型

```python
LLMService.get_chat_model(temperature=0.3)
```

使用 DeepSeek 兼容 OpenAI 格式的 API：
- 模型：`deepseek-chat`
- API Key：从 `.env` 读取
- Base URL：`https://api.deepseek.com/v1`

### 2.2 Embedding 模型

```python
LLMService.get_embedding_model()
```

用于 RAG 向量检索，支持 OpenAI 兼容的 Embedding API。

## 3. 配置项

| 配置 | 说明 |
|------|------|
| `deepseek_api_key` | DeepSeek API Key |
| `deepseek_base_url` | DeepSeek API Base URL |
| `deepseek_model` | 模型名称 |
| `embedding_api_key` | Embedding API Key |
| `embedding_base_url` | Embedding API Base URL |
| `embedding_model` | Embedding 模型名称 |

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| LLM 服务 | `agent-backend/app/services/llm_service.py` |
| 配置管理 | `agent-backend/app/config.py` |
