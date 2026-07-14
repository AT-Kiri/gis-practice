---
title: 任务规划节点 planner
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, agent, planner, multi-agent, task-decomposition]

references:
  - components/agent-coordinator.md
  - pages/components/agent-store
  - components/agent-sub-agents.md

source:
  - agent-backend/app/agent/nodes/planner.py

summary: 协同调度层核心，将复杂任务拆解为可执行的子任务序列，分配专业化子 Agent
---

# 任务规划节点 planner

## 1. 定位

协同调度层核心组件，接收意图分类结果，将复杂应急任务拆解为可执行的子任务序列，分配给专业化子 Agent 顺序执行。

## 2. 任务拆解策略

### 2.1 单步任务（简单意图）

单一工具即可完成，如：
- "查询北京市附近的医院" → 1 步 SearchAgent

### 2.2 多步任务（复合意图）

需要多步协作完成，如：
- "查询北京市附近的医院并规划救援路线" → 2 步 SearchAgent + RouteAgent
- "分析洪水影响范围并查询周边避难所" → 3 步（定位 → 缓冲区分析 → 查询避难所）

### 2.3 应急任务模板

针对标准化应急流程，内置任务模板：
- 双缓冲区应急流程：7 步（定位 → 缓冲区分析 → 查询受灾点资源 → 查询支援点资源 → 路径规划 → 资源优选 → 生成报告）

## 3. Schema 校验

```python
class TaskStep(BaseModel):
    step: int                              # 步骤序号
    agent_type: Literal["search", "analysis", "route", "knowledge"]  # 子 Agent 类型
    description: str                       # 任务描述
    tool_hint: str                         # 建议工具

class TaskPlan(BaseModel):
    tasks: list[TaskStep]
    summary: str
```

## 4. 历史上下文

- 支持多轮对话：后续任务可引用前序步骤结果
- 自动传递坐标、缓冲区几何等中间产物

## 5. 代码位置

| 文件 | 路径 |
|------|------|
| 任务规划节点 | `agent-backend/app/agent/nodes/planner.py` |
