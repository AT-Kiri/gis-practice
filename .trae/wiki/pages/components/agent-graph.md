---
title: Agent 核心逻辑 graph
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, agent, graph, langchain]

references:
  - components/agent-coordinator.md
  - components/agent-sub-agents.md

related:
  - apis/agent-api.md

source:
  - agent-backend/app/agent/graph.py

summary: Agent 核心逻辑，单点封装 Agent 构造，隔离版本差异
---

# Agent 核心逻辑 graph

## 1. 概述

Agent 核心逻辑，单点封装 Agent 构造，隔离版本差异。P0 阶段：单 Agent + 多 Tool；P1 阶段升级为多智能体。

## 2. 系统提示词

Agent 的系统提示词定义了：
- 职责：理解用户需求、选择 GIS 工具、反馈结果
- 可用工具列表及使用规则
- 回答风格：简洁专业、应急场景果断清晰

## 3. 工具列表

### 3.1 GIS 工具

| 工具 | 说明 |
|------|------|
| `feature_search` | 专题检索 |
| `spatial_query` | 空间查询 |
| `buffer_analysis` | 缓冲区分析 |
| `dual_buffer_analysis` | 双缓冲区分析 |
| `overlay_analysis` | 叠置分析 |
| `shortest_path` | 最短路径分析 |
| `service_area` | 服务区分析 |
| `online_route_planning` | 在线路径规划 |
| `mock_nearby_resources` | 模拟周边资源点 |
| `fly_to_location` | 地图定位 |

### 3.2 RAG 工具

| 工具 | 说明 |
|------|------|
| `rag_retrieval` | 知识检索 |

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| Agent 核心逻辑 | `agent-backend/app/agent/graph.py` |
| 子 Agent 定义 | `agent-backend/app/agent/sub_agents/agents.py` |
| GIS 工具 | `agent-backend/app/tools/gis_tools.py` |
| RAG 工具 | `agent-backend/app/tools/rag_tools.py` |
