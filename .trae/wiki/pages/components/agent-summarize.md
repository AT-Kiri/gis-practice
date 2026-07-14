---
title: 结果汇总节点 summarize
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, agent, summarize, multi-agent, report]

references:
  - components/agent-coordinator.md
  - components/agent-sub-agents.md

source:
  - agent-backend/app/agent/nodes/summarize.py

summary: 流式汇总子 Agent 执行结果，生成结构化应急报告并推送给前端
---

# 结果汇总节点 summarize

## 1. 定位

结果汇总节点是 Coordinator 调度流程的最后一个阶段，接收所有子 Agent 执行结果，流式生成结构化应急报告并推送给前端。

## 2. 汇总流程

```
子 Agent 执行结果 → 结果分类（成功/失败）→ 生成报告摘要 → 流式推送
```

### 2.1 流式输出

```python
async for event in astream_summarize_results(user_message, step_results, history):
    yield event  # text 事件，逐 token 推送
```

- 使用 `astream_summarize_results` 异步流式生成
- 前端 SSE 实时显示，用户体验流畅

### 2.2 报告结构

- **成功要点总结**：关键操作结果（找到的要素数量、缓冲区面积、路径长度等）
- **模拟数据标注**：明确告知哪些数据为模拟生成
- **下一步建议**：基于当前结果推荐后续操作（如"是否需要路径规划？"）

## 3. 代码位置

| 文件 | 路径 |
|------|------|
| 结果汇总节点 | `agent-backend/app/agent/nodes/summarize.py` |
