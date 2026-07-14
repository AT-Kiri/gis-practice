---
title: Agent 对话 API
type: api
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [api, fastapi, agent, sse, chat]

references: []

related:
  - apis/rag-api.md
  - concepts/multi-agent.md

source:
  - agent-backend/app/api/agent.py

summary: Agent 对话 API，提供 SSE 流式响应的对话接口
---

# Agent 对话 API

## 1. 概述

Agent 对话 API，提供 SSE（Server-Sent Events）流式响应的对话接口，支持单 Agent 和多智能体两种模式。

## 2. 接口列表

### 2.1 单 Agent 对话（P0 fallback）

```
POST /api/agent/chat
```

**请求体**：

```json
{
  "message": "查询北京市附近的医院",
  "session_id": "default"
}
```

**SSE 事件**：

| 事件 | 说明 |
|------|------|
| `agent_start` | Agent 开始执行 |
| `tool_start` | 工具开始调用 |
| `tool_result` | 工具执行完成 |
| `text` | 流式文本 token |
| `agent_end` | 全部完成 |
| `error` | 出错 |

### 2.2 多智能体对话（P1 推荐）

```
POST /api/agent/chat/multi
```

**请求体**：

```json
{
  "message": "查询北京市附近的医院",
  "session_id": "default"
}
```

**SSE 事件**：

| 事件 | 说明 |
|------|------|
| `agent_start` | 协调者开始执行 |
| `intent_classified` | 意图分类完成 |
| `plan_created` | 任务规划完成 |
| `step_start` | 某步开始 |
| `tool_start` | 工具开始调用（来自子 Agent） |
| `tool_result` | 工具执行完成（来自子 Agent） |
| `step_done` | 某步完成 |
| `text` | 流式文本 token（最终汇总报告） |
| `agent_end` | 全部完成 |
| `error` | 出错 |

### 2.3 获取会话历史

```
GET /api/agent/sessions/{session_id}/history
```

### 2.4 清空会话历史

```
DELETE /api/agent/sessions/{session_id}/history
```

## 3. 请求模型

```python
class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
```

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| Agent API | `agent-backend/app/api/agent.py` |
| 前端调用 | `frontend/src/utils/agent/sse.js` |
