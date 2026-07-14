---
title: 应用配置
type: concept
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [concept, config, settings, env]

references:
  - components/fastapi-main.md

related:
  - services/llm-service.md

source:
  - agent-backend/app/config.py

summary: 应用配置管理，从 .env 文件读取配置，不硬编码任何密钥
---

# 应用配置

## 1. 概述

应用配置管理，从 `.env` 文件读取配置，不硬编码任何密钥。

## 2. 配置项

### 2.1 DeepSeek LLM 配置

| 配置 | 说明 |
|------|------|
| `deepseek_api_key` | DeepSeek API Key |
| `deepseek_base_url` | DeepSeek API Base URL |
| `deepseek_model` | 模型名称（默认 `deepseek-chat`） |

### 2.2 iServer 配置

| 配置 | 说明 |
|------|------|
| `iserver_url` | iServer 服务地址（默认 `http://localhost:8090`） |

### 2.3 后端服务配置

| 配置 | 说明 |
|------|------|
| `host` | 监听地址（默认 `0.0.0.0`） |
| `port` | 监听端口（默认 `8001`） |

### 2.4 RAG / Embedding 配置

| 配置 | 说明 |
|------|------|
| `embedding_api_key` | Embedding API Key |
| `embedding_base_url` | Embedding API Base URL |
| `embedding_model` | Embedding 模型名称 |
| `vector_store_path` | 向量库存储路径 |
| `knowledge_dir` | 知识库文档目录 |

## 3. 配置优先级

```
构造参数 > .env 文件 > 进程环境变量 > 密钥文件
```

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 配置管理 | `agent-backend/app/config.py` |
