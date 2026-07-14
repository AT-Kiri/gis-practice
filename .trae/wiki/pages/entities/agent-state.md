---
title: Agent 状态定义
type: entity
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [entity, state, agent, schema]

references:
  - components/agent-coordinator.md
  - components/agent-sub-agents.md

source:
  - agent-backend/app/agent/state.py

summary: 多智能体状态定义与 Schema，所有结构化输出都通过 JSON Schema 校验
---

# Agent 状态定义

## 1. 概述

多智能体状态定义与 Schema，所有结构化输出都通过 JSON Schema 校验。

## 2. 状态结构

```python
class AgentState(TypedDict):
    user_input: str               # 用户原始输入
    session_id: str               # 会话 ID
    intent: str                   # 识别出的意图
    entities: dict                # 提取的实体
    task_plan: list[dict]         # 拆解后的任务计划
    current_step: int             # 当前执行到第几步
    step_results: list[dict]      # 每步的执行结果
    tool_events: list[dict]       # 工具执行事件
    final_answer: str             # 最终回答
```

## 3. Schema 定义

### 3.1 意图分类结果

```python
class IntentResult(BaseModel):
    intent: Literal["search", "analysis", "route", "knowledge", "mixed", "chat"]
    entities: dict
    reasoning: str
```

### 3.2 任务规划

```python
class TaskStep(BaseModel):
    step: int
    agent_type: Literal["search", "analysis", "route", "knowledge"]
    description: str
    tool_hint: str

class TaskPlan(BaseModel):
    tasks: list[TaskStep]
    summary: str
```

### 3.3 子 Agent 结果

```python
class SubAgentResult(BaseModel):
    agent_type: str
    success: bool
    summary: str
    geojson: dict | None
    data: dict
```

## 4. 常量

| 常量 | 值 | 说明 |
|------|-----|------|
| `MAX_STEPS` | 8 | 最大执行步数（双缓冲区应急流程 7 步 +1 冗余） |
| `MAX_RETRY` | 3 | JSON Schema 校验失败最大重试次数 |

## 5. 代码位置

| 文件 | 路径 |
|------|------|
| 状态定义 | `agent-backend/app/agent/state.py` |
| 协调器 | `agent-backend/app/agent/coordinator.py` |
