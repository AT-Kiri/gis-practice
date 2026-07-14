---
title: 工具调用卡片 ToolCallCard
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, agent, tool, card]

references: []
related:
  - pages/components/agent-chat-panel.md

source:
  - frontend/src/components/agent/ToolCallCard.vue

summary: 工具调用卡片组件，展示工具调用的状态、结果和参数
---

# 工具调用卡片 ToolCallCard

## 1. 组件概述

工具调用卡片组件，在 AI 消息气泡内展示一次工具调用的状态与结果。

## 2. Props

| Prop | 类型 | 说明 |
|------|------|------|
| `toolCall` | `Object` | `{toolName, status, input, result, error}` |

## 3. 功能

- 状态图标：loading（旋转）/ done（绿色对勾）/ error（红色叉）
- 工具名称 + 状态文本
- 结果摘要 / 错误信息
- 可展开的输入参数和执行详情

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 工具调用卡片 | `frontend/src/components/agent/ToolCallCard.vue` |
