# Wiki Index

> Last updated: 2026-07-14 | Total pages: 82

## 系统概览

**京津冀城市综合防灾应急管理 GIS 项目**

### 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Vue 3 + Pinia + MapboxGL + Ant Design Vue |
| **后端** | SpringBoot + MyBatis + SuperMap iServer 11i |
| **AI Agent** | FastAPI + LangChain + DeepSeek LLM + FAISS |
| **数据** | SuperMap iDesktopX 2025 + PostgreSQL |
| **通信** | SSE (Server-Sent Events) + RESTful API |

## 快速导航

- [[pages/components/|组件/实现]] — 所有代码实现（按 tech 子分类）
- [[pages/views/|页面]] — 路由级页面
- [[pages/entities/|实体]] — 数据结构、Schema
- [[pages/apis/|接口]] — HTTP API 契约
- [[pages/flows/|流程]] — 业务流程
- [[pages/concepts/|概念]] — 技术概念、ADR

## 节点类型（6 种）

| 类型 | 颜色 | 数量 | 说明 |
|------|------|------|------|
| **component** | 🟣 紫色 | 37 | 所有代码实现 |
| **view** | 🔵 蓝色 | 8 | 路由级页面 |
| **entity** | 🟠 橙色 | 6 | 数据结构、Schema |
| **api** | 🟢 绿色 | 12 | HTTP API 契约 |
| **flow** | 🔵 青色 | 7 | 业务流程 |
| **concept** | 🩷 粉色 | 12 | 技术概念、ADR |

## component 子分类（tech 字段）

| tech | 含义 | 颜色 |
|------|------|------|
| `vue` | Vue 3 组件 | 🟢 绿色 |
| `store` | Pinia Store | 🟡 黄色 |
| `python` | Python 服务/工具 | 🔵 蓝色 |
| `fastapi` | FastAPI 核心模块 | 🟠 橙色 |
| `java` | Java 后端 Service | 🔴 红色 |

## 组件/实现（37）

### Vue 组件（17）

- [[pages/components/sm-map-viewer]] — 地图查看器（核心）
- [[pages/components/nav-sidebar]] — 导航侧栏
- [[pages/components/map-toolbar]] — 地图工具栏
- [[pages/components/map-measure]] — 地图量算
- [[pages/components/map-overview]] — 鹰眼视图
- [[pages/components/layer-manager]] — 图层管理器
- [[pages/components/feature-search]] — 要素搜索
- [[pages/components/spatial-analysis]] — 空间分析
- [[pages/components/spatial-query]] — 空间查询（待补充）
- [[pages/components/network-analysis]] — 网络分析（待补充）
- [[pages/components/agent-chat-panel]] — Agent 聊天面板
- [[pages/components/agent-chat-message]] — 聊天消息
- [[pages/components/agent-tool-call-card]] — 工具调用卡片
- [[pages/components/dashboard-buffer-analysis-modal]] — 缓冲区分析弹窗（待补充）
- [[pages/components/dashboard-dashboard-map]] — 仪表盘地图
- [[pages/components/dashboard-disaster-detail-panel]] — 灾害详情面板
- [[pages/components/dashboard-route-planning-modal]] — 路线规划弹窗
- [[pages/components/dashboard-weather-panel]] — 天气面板
- [[pages/components/earthquake-buffer-zone-layer]] — 地震缓冲区图层
- [[pages/components/earthquake-rescue-dispatch-panel]] — 救援调度面板
- [[pages/components/earthquake-support-point-layer]] — 支撑点图层

### FastAPI 核心（7）

- [[pages/components/fastapi-main]] — FastAPI 主入口
- [[pages/components/agent-coordinator]] — 多智能体协调器
- [[pages/components/agent-graph]] — Agent 核心逻辑
- [[pages/components/agent-intent]] — 意图分类节点
- [[pages/components/agent-planner]] — 任务规划节点
- [[pages/components/agent-sub-agents]] — 子 Agent 定义
- [[pages/components/agent-summarize]] — 结果汇总节点

### Java 服务（3）

- [[pages/components/coord-response-service]] — 协同叫应服务
- [[pages/components/supply-dispatch-service]] — 物资调度服务
- [[pages/components/warn-info-service]] — 预警信息服务

### Python 服务（8）

- [[pages/components/iserver-client]] — iServer 客户端服务
- [[pages/components/llm]] — LLM 服务
- [[pages/components/rag]] — RAG 知识库服务
- [[pages/components/session-store]] — 会话存储
- [[pages/components/agent-store]] — Agent 状态管理
- [[pages/components/map-store]] — 地图状态管理

### 页面（8）

- [[pages/views/home-view]] — 首页
- [[pages/views/data-dashboard-view]] — 数据仪表盘
- [[pages/views/coord-response-view]] — 协同叫应视图
- [[pages/views/warn-info-view]] — 预警信息视图
- [[pages/views/supply-dispatch-view]] — 物资调度视图
- [[pages/views/earthquake-command-view]] — 地震指挥视图
- [[pages/views/flood-simulation-view]] — 洪涝模拟视图
- [[pages/views/new-big-screen-view]] — 大屏视图

### 实体（6）

- [[pages/entities/response-wrapper]] — 统一响应 R&lt;T&gt;
- [[pages/entities/coord-response]] — 协同叫应实体
- [[pages/entities/warn-info]] — 气象灾害预警实体
- [[pages/entities/supply-dispatch]] — 应急物资调度实体
- [[pages/entities/agent-state]] — Agent 状态定义
- [[pages/entities/tool-result]] — 工具结果 schema

### 接口（12）

**SpringBoot（4）**：

- [[pages/apis/coord-response]] — 协同叫应 API
- [[pages/apis/health]] — 健康检查 API
- [[pages/apis/warn-info]] — 气象灾害预警 API
- [[pages/apis/supply-dispatch]] — 应急物资调度 API

**SuperMap iServer（6）**：

- [[pages/apis/iserver-feature-results]] — 空间查询 API
- [[pages/apis/iserver-buffer]] — 缓冲区分析 API
- [[pages/apis/iserver-overlay]] — 叠置分析 API
- [[pages/apis/iserver-network-analyst]] — 网络分析 API
- [[pages/apis/iserver-map-tile]] — 地图切片 API
- [[pages/apis/iserver-sql-query]] — SQL 查询 API

**FastAPI Agent（2）**：

- [[pages/apis/agent-api]] — Agent 对话 API
- [[pages/apis/rag-api]] — RAG 知识库 API

### 流程（7）

- [_template] — 业务流程图模板
- [[pages/flows/agent-emergency]] — Agent 应急分析流程
- [[pages/flows/buffer-analysis]] — 缓冲区分析业务流程
- [[pages/flows/spatial-query]] — 空间查询业务流程
- [[pages/flows/network-analysis]] — 网络分析业务流程
- [[pages/flows/coordinated-response]] — 协同叫应流程
- [[pages/flows/dual-buffer-emergency]] — 双缓冲区应急流程

### 概念（12）

- [[pages/concepts/buffer-analysis]] — 缓冲区分析
- [[pages/concepts/spatial-query]] — 空间查询
- [[pages/concepts/network-analysis]] — 网络分析
- [[pages/concepts/overlay-analysis]] — 叠置分析
- [[pages/concepts/geojson]] — GeoJSON 数据格式
- [[pages/concepts/multi-agent]] — 多智能体协同
- [[pages/concepts/ddi]] — DDI 综合灾害指数
- [[pages/concepts/app-config]] — 应用配置
- [[pages/concepts/adr-001]] — 前端技术栈选型
- [[pages/concepts/adr-002]] — SuperMap iServer 服务选型
- [[pages/concepts/adr-003]] — AI Agent 多智能体架构选型
- [[home]] — 项目总览

## 可视化站点

📂 **`.trae/wiki/wiki-site/index.html`**（82 节点）
