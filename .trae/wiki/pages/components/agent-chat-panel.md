---
title: Agent 聊天面板 AgentChatPanel
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references:
  - pages/components/agent-chat-message.md
  - pages/components/agent-tool-call-card.md
related:
  - pages/components/sm-map-viewer.md
source:
  - frontend/src/components/AgentChatPanel.vue
summary: AI Agent 应急助手聊天面板，支持多智能体协同工作流
---

# Agent 聊天面板 AgentChatPanel

## 1. 组件概述

AI Agent 应急助手聊天面板，支持多智能体协同工作流，包括：
- 悬浮按钮展开/收起
- 多智能体进度条（意图 → 计划 → 步骤）
- 消息列表（用户 + AI）
- 工具调用卡片

## 2. 功能

### 2.1 多智能体工作流

显示当前执行的步骤进度：`第 N / M 步`，每个步骤按子 Agent 类型着色。

### 2.2 消息交互

- 欢迎状态 + 快捷操作
- 流式文本渲染
- 工具调用卡片展示

## 3. 事件

| 事件 | 说明 |
|------|------|
| `send` | 发送消息 |
| `stop` | 停止生成 |
| `clear` | 清空对话 |

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 聊天面板 | `frontend/src/components/AgentChatPanel.vue` |
