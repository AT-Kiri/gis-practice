---
title: 聊天消息 ChatMessage
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references:
  - pages/components/agent-tool-call-card.md
related:
  - pages/components/agent-tool-call-card.md
source:
  - frontend/src/components/agent/ChatMessage.vue
summary: 单条对话消息组件，用户消息靠右蓝色气泡，AI 消息靠左灰色气泡
---

# 聊天消息 ChatMessage

## 1. 组件概述

单条对话消息组件，用户消息靠右（蓝色气泡），AI 消息靠左（灰色气泡）。AI 消息内可嵌入工具调用卡片，多智能体模式下按 step 分组展示。

## 2. Props

| Prop | 类型 | 说明 |
|------|------|------|
| `message` | `Object` | 消息对象 `{id, role, content, toolCalls, isStreaming}` |

## 3. 功能

- AI 头像 + 灰色气泡
- 用户头像 + 蓝色气泡
- AI 消息 Markdown 渲染
- 流式文本光标
- 工具调用卡片嵌入（按 step 分组）
- 时间戳显示

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 聊天消息 | `frontend/src/components/agent/ChatMessage.vue` |
