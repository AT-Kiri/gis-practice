---
title: 子 Agent 定义与执行
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, agent, sub-agent, multi-agent]

references:
  - components/agent-coordinator.md
  - tools/gis-tools.md

related:
  - apis/agent-api.md

source:
  - agent-backend/app/agent/sub_agents/agents.py

summary: 4 个专业子 Agent：SearchAgent / AnalysisAgent / RouteAgent / KnowledgeAgent
---

# 子 Agent 定义与执行

## 1. 概述

4 个专业子 Agent，每个用 `create_react_agent` 创建，有独立的工具集和系统提示词。

## 2. 子 Agent 类型

### 2.1 SearchAgent（检索专家）

**职责**：地理要素检索和空间查询

**可用工具**：
- `feature_search`：按关键字搜索地理要素
- `spatial_query`：在指定几何范围内查询地物
- `fly_to_location`：按地名定位地图
- `mock_nearby_resources`：生成模拟资源点

### 2.2 AnalysisAgent（空间分析专家）

**职责**：缓冲区分析和叠置分析

**可用工具**：
- `buffer_analysis`：对几何对象做缓冲区分析
- `dual_buffer_analysis`：双层缓冲区分析（应急分级响应专用）
- `overlay_analysis`：对两个数据集做叠置分析

### 2.3 RouteAgent（路径专家）

**职责**：最短路径、服务区分析和资源调度优化

**可用工具**：
- `shortest_path`：在长春路网中计算多点间最短路径
- `service_area`：分析中心点可达范围
- `online_route_planning`：在线路径规划（OSRM）
- `pareto_resource_optimize`：Pareto 多目标资源优选
- `aco_multi_vehicle_route`：ACO 蚁群多车路径分配

### 2.4 KnowledgeAgent（知识专家）

**职责**：回答 GIS 知识问题

**可用工具**：
- `rag_retrieval`：从应急救援知识库中检索

## 3. 代码位置

| 文件 | 路径 |
|------|------|
| 子 Agent 定义 | `agent-backend/app/agent/sub_agents/agents.py` |
