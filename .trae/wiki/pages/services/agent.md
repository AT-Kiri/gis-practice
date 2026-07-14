---
title: Agent 状态管理 AgentStore
type: service
status: stable
created: 2026-07-14
updated: 2026-07-14
tags: [service, store, agent, pinia, state, multi-agent]

references:
  - pages/components/agent-chat-panel.md
  - pages/components/agent-chat-message.md
  - pages/components/agent-tool-call-card.md
  - pages/views/home-view.md

related:
  - pages/components/agent-chat-panel.md
  - pages/concepts/multi-agent.md

source:
  - frontend/src/stores/agent.js

summary: Pinia Agent 状态管理，管理对话消息、多智能体工作流状态（意图/计划/步骤）
---

# Agent 状态管理 AgentStore

## 1. 概述

Pinia Store，管理 AI Agent 的对话消息列表、加载状态、面板展开状态，以及多智能体协同的意图分类、任务规划、步骤执行状态。

## 2. 状态定义

### 2.1 对话状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `messages` | `Ref<Array>` | 对话消息列表 |
| `isLoading` | `Ref<boolean>` | 是否正在等待 AI 回复 |
| `isPanelOpen` | `Ref<boolean>` | Agent 面板是否展开 |

### 2.2 多智能体工作流状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `currentIntent` | `Ref<string>` | 当前意图（search/analysis/route/knowledge/mixed/chat） |
| `currentEntities` | `Ref<Object>` | 意图关联的实体 |
| `currentPlan` | `Ref<Object\|null>` | 任务计划 { tasks, summary, totalSteps } |
| `currentStep` | `Ref<number>` | 当前执行步号（从 1 开始） |
| `totalSteps` | `Ref<number>` | 总步数 |
| `steps` | `Ref<Array>` | 各步状态 [{ step, agentType, description, status, summary }] |

## 3. 枚举映射

### 3.1 子 Agent 类型

```js
export const AGENT_TYPE_LABEL = {
  search: '检索专家',
  analysis: '分析专家',
  route: '路径专家',
  knowledge: '知识专家',
}
```

### 3.2 意图类型

```js
export const INTENT_LABEL = {
  search: '专题检索',
  analysis: '空间分析',
  route: '路径规划',
  knowledge: '知识检索',
  mixed: '综合应急',
  chat: '智能问答',
}
```

## 4. 方法

### 4.1 对话方法

| 方法 | 说明 |
|------|------|
| `addMessage(partial)` | 新增消息，返回消息 id |
| `updateMessage(id, patch)` | 按 id 更新消息字段 |
| `clearMessages()` | 清空全部消息 |
| `setLoading(status)` | 设置加载状态 |
| `togglePanel()` | 切换面板展开/收起 |
| `addToolCall(messageId, toolCall)` | 添加工具调用记录 |
| `updateToolCall(messageId, index, patch)` | 更新工具调用字段 |

### 4.2 多智能体方法

| 方法 | 说明 |
|------|------|
| `setIntent(intent, entities)` | 设置意图分类结果 |
| `setPlan(tasks, summary)` | 设置任务计划 |
| `startStep(step, total, agentType, description)` | 标记步骤开始 |
| `finishStep(step, success, summary)` | 标记步骤完成 |
| `resetWorkflow()` | 重置工作流（发送新消息前调用） |

## 5. 使用方式

```js
import { useAgentStore, INTENT_LABEL } from '@/stores/agent'

const agentStore = useAgentStore()

// 监听意图变化
watch(() => agentStore.currentIntent, (intent) => {
  if (intent) {
    console.log('当前意图:', INTENT_LABEL[intent])
  }
})

// 监听步骤进度
watch(() => agentStore.currentStep, (step) => {
  console.log(`进度: ${step}/${agentStore.totalSteps}`)
})
```

## 6. 关联组件

- `AgentChatPanel` - 主容器，调用 `addMessage/setLoading`
- `AgentChatMessage` - 渲染消息列表
- `AgentToolCallCard` - 渲染工具调用卡片
- `HomeView` - SSE 事件驱动状态更新

## 7. 代码位置

| 文件 | 路径 |
|------|------|
| Agent 状态 | `frontend/src/stores/agent.js` |
