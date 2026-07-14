---
title: 会话存储
type: service
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, service, session, store]

references:
  - pages/apis/agent-api.md
  - pages/components/agent-coordinator.md

source:
  - agent-backend/app/services/session_store.py

summary: 内存级会话存储，每个 session_id 维护一个消息列表
---

# 会话存储

## 1. 概述

内存级会话存储，每个 `session_id` 维护一个消息列表（`HumanMessage` / `AIMessage`），重启后丢失。

## 2. 功能

| 方法 | 说明 |
|------|------|
| `get_history(session_id)` | 获取指定会话的历史消息列表 |
| `add_exchange(session_id, user_message, ai_response)` | 追加一轮对话到会话历史 |
| `clear_session(session_id)` | 清空指定会话历史 |

## 3. 设计约束

- 只存 `HumanMessage` 和最终 `AIMessage`（纯文本）
- 不存 `ToolMessage` / 含 `tool_calls` 的 `AIMessage`，避免 Agent 重复执行工具
- 每个会话最多保留 20 条消息（防止上下文膨胀）

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 会话存储 | `agent-backend/app/services/session_store.py` |
