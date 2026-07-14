---
title: 多智能体协同
type: concept
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [concept, ai, agent, multi-agent, sse]

references:
  - pages/components/agent-chat-panel.md
  - pages/views/home-view.md

related: []

source:
  - frontend/src/stores/agent.js
  - frontend/src/utils/agent/sse.js

summary: 多智能体协同是将复杂任务分解为多个子任务，由不同的专业 Agent 协同完成
---

# 多智能体协同

## 1. 定义

多智能体协同（Multi-Agent Collaboration）是将**复杂任务分解**为多个子任务，由不同的**专业 Agent** 协同完成。

## 2. 架构

```
用户输入 → Coordinator（协调者）
              ↓
         意图分类 + 任务规划
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
Search    Analysis   Route   Knowledge
Agent     Agent     Agent   Agent
    ↓         ↓         ↓         ↓
    └─────────┼─────────┘
              ↓
         结果汇总 → 输出给用户
```

## 3. 项目中的实现

### 3.1 协调者（Coordinator）

- **意图分类**：识别用户意图（检索/分析/路径/知识/综合）
- **任务规划**：将复杂任务分解为可执行的子任务
- **步骤调度**：按顺序或并行调度子 Agent

### 3.2 子 Agent

| Agent | 职责 | 工具 |
|-------|------|------|
| **Search Agent** | 执行空间查询、要素搜索 | `spatial_query`, `feature_search` |
| **Analysis Agent** | 执行缓冲区分析、网络分析 | `buffer_analysis`, `shortest_path` |
| **Route Agent** | 执行路径规划、路线分析 | `shortest_path`, `service_area` |
| **Knowledge Agent** | 回答 GIS 知识问题 | `knowledge_base` |

### 3.3 通信机制

通过 **SSE（Server-Sent Events）** 实现前后端实时通信：

```js
// 建立 SSE 连接
const eventSource = new EventSource('/chat/multi')

// 接收事件
eventSource.addEventListener('onStepDone', (e) => {
  const data = JSON.parse(e.data)
  // 更新 UI
})
```

## 4. 相关概念

- [[pages/concepts/buffer-analysis]] — 缓冲区分析
- [[pages/concepts/spatial-query]] — 空间查询
- [[pages/concepts/network-analysis]] — 网络分析
