---
title: 多智能体协调器 Coordinator
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, agent, coordinator, multi-agent, nlp, gis]

references:
  - apis/agent-api.md
  - components/agent-sub-agents.md
  - components/agent-state.md

related:
  - components/fastapi-main.md
  - concepts/multi-agent.md
  - tools/gis-tools.md

source:
  - agent-backend/app/agent/coordinator.py
  - agent-backend/app/agent/nodes/intent.py
  - agent-backend/app/agent/nodes/planner.py
  - agent-backend/app/agent/nodes/summarize.py

summary: Agent 空间问答核心，多智能体协同调度器，驱动意图分类→任务规划→子Agent执行→结果汇总全流程
---

# 多智能体协调器 Coordinator

## 1. 模块定位

**Agent 空间问答模块是系统的核心创新模块**，采用大语言模型与多智能体协同架构，通过自然语言交互替代传统 GIS 工具栏操作，实现"一句话完成 GIS 应急分析"。

用户输入自然语言（如"查询北京市朝阳区附近的医院"），Coordinator 自动完成意图识别→任务规划→工具调用→结果汇总，生成结构化报告并标绘到地图。

## 2. 三层架构

### 2.1 语义理解层

基于 DeepSeek LLM 实现：
- **六类意图分类**：`search`（检索）、`analysis`（分析）、`route`（路径）、`knowledge`（知识）、`mixed`（综合）、`chat`（闲聊）
- **实体抽取**：自动识别地名、灾害类型、半径、数据集等关键参数

### 2.2 任务执行层

ReAct 循环驱动单 Agent 模式：
- LLM 推理 → 选择工具 → 执行工具 → 观察结果 → 下一步推理
- 适用于简单任务（单一检索或分析）

### 2.3 协同调度层

Coordinator 将复杂应急任务拆解为多步，分配专业化子 Agent 顺序执行：

```
用户输入 → 意图分类 → 任务规划 → [SearchAgent, AnalysisAgent, RouteAgent, KnowledgeAgent] → 结果汇总
```

## 3. 主流程

```python
async def stream_coordinator_events(user_message, session_id):
    yield {"event": "agent_start", ...}
    
    # 阶段 1: 闲聊检测（首字延迟优化）
    if _is_trivial_chat(user_message):
        async for event in _chat_respond(...):
            yield event
        return
    
    # 阶段 2: 意图分类
    intent_result = await classify_intent(user_message)
    yield {"event": "intent_classified", ...}
    
    # 阶段 3: 闲聊直接回答
    if intent_result.intent == "chat":
        async for event in _chat_respond(...):
            yield event
        return
    
    # 阶段 4: 任务规划（考虑会话历史）
    plan = await plan_tasks(user_message, intent_result, history)
    yield {"event": "plan_created", ...}
    
    # 阶段 5: 逐步执行子 Agent（支持历史上下文传递）
    for step in plan.tasks:
        yield {"event": "step_start", ...}
        result = await execute_sub_agent(step, history, session_id)
        yield {"event": "step_done", ...}
    
    # 阶段 6: 结果汇总（流式输出）
    async for event in astream_summarize_results(...):
        yield event
    
    yield {"event": "agent_end", ...}
```

## 4. SSE 事件类型

| 事件 | 说明 |
|------|------|
| `agent_start` | 协调者开始执行 |
| `intent_classified` | 意图分类完成（含实体） |
| `plan_created` | 任务规划完成（步骤列表） |
| `step_start` | 某步开始 |
| `tool_start` | 工具开始调用 |
| `tool_result` | 工具执行完成 |
| `step_done` | 某步完成 |
| `text` | 流式文本 token |
| `agent_end` | 全部完成 |
| `error` | 出错 |

## 5. 工程创新

### 5.1 双轨制调度策略

Coordinator 不依赖 LangGraph StateGraph 编译，改用 async function 顺序调度：
- **优势**：流式 SSE 输出更自然、调试更方便、错误隔离更清晰
- **状态**：用本地变量维护，每个阶段 yield SSE 事件

### 5.2 退化 Polygon 兜底机制

LLM 生成的退化 Polygon（所有点坐标相同）会导致空间查询失效：
- **问题根因**：DeepSeek-V3.2 即使在 prompt 强调下仍 ~75% 概率构造退化 Polygon
- **解决方案**：工具层自动检测并替换为 inner Polygon（受灾圈），确保查询不失效

### 5.3 灾害类型-半径映射表

| 灾害类型 | 内圈半径 | 外圈半径 |
|---------|---------|---------|
| 地震 | 3000m | 8000m |
| 火灾 | 1000m | 3000m |
| 洪水 | 2000m | 5000m |

LLM 漏传半径参数时自动兜底，确保应急分析准确。

### 5.4 RAG 知识增强检索

针对应急知识（救援方案、处置流程、预案内容），通过 RAG 检索增强 LLM 回答的专业性。

### 5.5 Pareto 多目标资源优选

当有 2 个以上资源点需要在距离和容量间权衡时，使用 Pareto 前沿算法求解最优解集，避免 LLM 不可靠的数学推理。

## 6. 代码位置

| 文件 | 路径 |
|------|------|
| 协调器 | `agent-backend/app/agent/coordinator.py` |
| 意图分类节点 | `agent-backend/app/agent/nodes/intent.py` |
| 任务规划节点 | `agent-backend/app/agent/nodes/planner.py` |
| 结果汇总节点 | `agent-backend/app/agent/nodes/summarize.py` |
| 子 Agent 定义 | `agent-backend/app/agent/sub_agents/agents.py` |
| 状态定义 | `agent-backend/app/agent/state.py` |
