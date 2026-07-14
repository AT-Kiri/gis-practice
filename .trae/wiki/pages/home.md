---
title: 项目总览
type: concept
status: stable
created: 2026-07-10
updated: 2026-07-14
tags: [home, overview, tech-stack]

summary: 京津冀城市综合防灾应急管理 GIS 项目总览
---

# 京津冀城市综合防灾应急管理 GIS 项目

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Vue 3 + Pinia + MapboxGL + Ant Design Vue |
| **后端** | SpringBoot + MyBatis + SuperMap iServer 11i |
| **AI Agent** | FastAPI + LangChain + DeepSeek LLM + FAISS |
| **数据** | SuperMap iDesktopX 2025 + PostgreSQL |
| **通信** | SSE (Server-Sent Events) + RESTful API |

## 业务模块

```
京津冀城市综合防灾应急管理 GIS 系统
│
├─ 数字大屏
│   └─ NewBigScreenView
│
├─ 二维地图（核心操作区）
│   ├─ 地图基础操作
│   │   ├─ SmMapViewer      （地图渲染引擎）
│   ├─ 基础空间操作
│   │   ├─ 空间查询：SpatialQuery + FeatureSearch
│   │   ├─ 空间分析：SpatialAnalysis + BufferAnalysisModal
│   │   └─ 网络分析：NetworkAnalysis + RoutePlanningModal
│   │
│   └─ Agent 应急助手（核心创新）
│       └─ AgentChatPanel + 全部 FastAPI 后端
│
├─ 三维洪水模拟
│
├─ 监测-预警-联动
│   ├─ 气象预警 → 物资调度 → 协同叫应
│
└─ 地震指挥
    ├─ 缓冲区分析 → 救援调度
```

## 核心业务流程

| 流程 | 说明 |
|------|------|
| Agent 应急分析 | 自然语言输入 → 意图分类 → 多 Agent 执行 → 结果汇总 |
| 双缓冲区应急 | 灾害定位 → 内外圈生成 → 救援调度 |
| 缓冲区分析 | 受灾点定位 → 缓冲区渲染 → 救援调度 |
| 空间查询 | 绘制范围 → 要素查询 → 结果渲染 |
| 网络分析 | 标记途径点 → 路径分析 → 结果渲染 |
| 协同叫应 | 气象预警 → 区域联动 → 物资调度 |

## 项目统计

- **总页面数**：82
- **节点类型**：6 种
- **子分类（tech）**：5 种（vue, store, python, fastapi, java）
