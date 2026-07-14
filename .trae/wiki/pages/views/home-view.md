---
title: 首页 HomeView
type: view
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references:
  - pages/components/sm-map-viewer.md
  - pages/components/agent-chat-panel.md
related:
  - pages/views/data-dashboard-view.md
  - pages/components/spatial-query.md
  - pages/components/network-analysis.md
source:
  - frontend/src/views/HomeView.vue
  - frontend/src/components/AgentChatPanel.vue
  - frontend/src/utils/agent/sse.js
  - frontend/src/utils/agent/mapRenderer.js
summary: 应用首页，集成地图组件和 Agent 应急助手面板，处理 SSE 事件流
---

# 首页 HomeView

## 1. 页面概述

应用的默认首页，由两大区域组成：
- **主地图区域**：SmMapViewer 组件
- **Agent 应急助手面板**：AgentChatPanel 组件

处理用户与 AI Agent 的交互，包括 SSE 事件流的接收和地图渲染。

## 2. 关键功能

### 2.1 Agent SSE 事件流

通过 `sendAgentMessage()` 建立 SSE 连接，处理以下事件：

| 事件 | 处理逻辑 |
|------|---------|
| `onIntentClassified` | 存储用户意图和实体到 agentStore |
| `onPlanCreated` | 存储执行计划（任务列表 + 摘要） |
| `onStepStart` | 标记步骤开始 |
| `onStepDone` | 标记步骤完成 |
| `onToolStart` | 添加工具调用卡片（loading 状态） |
| `onToolResult` | 更新工具调用卡片（done/error），渲染 GeoJSON 到地图 |
| `onText` | 流式文本追加到 AI 消息 |
| `onAgentEnd` | 标记消息完成，关闭 loading |
| `onError` | 显示错误信息 |

### 2.2 地图渲染

Agent 工具返回的 GeoJSON 通过 `renderAgentResult()` 渲染到地图：
- `fly_to_location`：飞行到指定位置
- 其他 GeoJSON：添加为临时图层

### 2.3 多智能体模式

默认走多智能体 Coordinator（`useMulti: true`），保留单 Agent 作为 fallback。

## 3. 生命周期

| 操作 | 职责 |
|------|------|
| 发送消息 | 重置工作流 → 添加用户消息 → 创建 AI 占位 → 建立 SSE |
| 停止生成 | AbortController.abort() → 标记消息完成 |
| 清空对话 | clearAllAgentResults() + agentStore.resetWorkflow() |

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 首页视图 | `frontend/src/views/HomeView.vue` |
| Agent 聊天面板 | `frontend/src/components/AgentChatPanel.vue` |
| Agent 状态 | `frontend/src/stores/agent.js` |
| SSE 工具 | `frontend/src/utils/agent/sse.js` |
| 地图渲染 | `frontend/src/utils/agent/mapRenderer.js` |
