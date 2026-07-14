# Wiki Index

> Last updated: 2026-07-10 | Total pages: 76

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

### 业务模块结构

```
京津冀城市综合防灾应急管理 GIS 系统
│
├─ 数字大屏
│   └─ NewBigScreenView
│
├─ 二维地图（核心操作区）
│   ├─ 地图基础操作
│   │   ├─ SmMapViewer      （地图渲染引擎）
│   │   ├─ NavSidebar        （侧边栏导航）
│   │   ├─ MapToolbar       （工具栏）
│   │   ├─ MapMeasure       （量算）
│   │   ├─ MapOverview      （鹰眼视图）
│   │   └─ LayerManager     （图层管理）
│   │
│   ├─ 基础空间操作
│   │   ├─ 空间查询：SpatialQuery + FeatureSearch
│   │   ├─ 空间分析：SpatialAnalysis + BufferAnalysisModal
│   │   └─ 网络分析：NetworkAnalysis + RoutePlanningModal
│   │
│   └─ Agent 应急助手（核心创新）
│       ├─ AgentChatPanel   （毛玻璃悬浮聊天面板）
│       └─ 全部 FastAPI 后端
│
├─ 三维洪水模拟
│   └─ FloodSimulationView
│
├─ 监测-预警-联动
│   ├─ 气象预警：WarnInfoView + WeatherPanel
│   ├─ 物资调度：SupplyDispatchView
│   └─ 协同叫应：CoordResponseView
│
└─ 地震指挥
    ├─ 缓冲区分析：BufferZoneLayer + DisasterDetailPanel
    └─ 救援调度：RescueDispatchPanel + SupportPointLayer
```

### 核心业务流程

| 流程 | 说明 | 页面数 |
|------|------|--------|
| Agent 应急分析 | 自然语言输入 → 意图分类 → 多 Agent 执行 → 结果汇总 | 6 |
| 双缓冲区应急 | 灾害定位 → 内外圈生成 → 救援调度 | 6 |
| 缓冲区分析 | 受灾点定位 → 缓冲区渲染 → 救援调度 | 5 |
| 空间查询 | 绘制范围 → 要素查询 → 结果渲染 | 4 |
| 网络分析 | 标记途径点 → 路径分析 → 结果渲染 | 3 |
| 协同叫应 | 气象预警 → 区域联动 → 物资调度 | 5 |

## 快速导航

- [[pages/components/|组件]] — Vue 组件 + FastAPI 模块（28 个）
- [[pages/views/|页面]] — 路由级页面（8 个）
- [[pages/services/|服务]] — 后端服务（7 个）
- [[pages/entities/|实体]] — 数据结构（6 个）
- [[pages/apis/|接口]] — REST API（12 个）
- [[pages/flows/|流程]] — 业务流程（6 个）
- [[pages/concepts/|概念]] — 技术概念（11 个）

## 节点类型（7 种）

| 类型 | 颜色 | 数量 | 说明 |
|------|------|------|------|
| **component** | 🟢 绿色 | 21 | Vue 组件 / FastAPI 模块 |
| **view** | 🔵 蓝色 | 8 | 路由级页面 |
| **service** | 🟡 黄色 | 12 | 后端服务 |
| **entity** | 🟠 橙色 | 6 | 数据结构 / Schema |
| **api** | 🟣 紫色 | 12 | REST API |
| **flow** | 🔵 青色 | 6 | 业务流程 |
| **concept** | 🩷 粉色 | 11 | 技术概念 |

---

## 组件（28）

**前端 Vue（21）**：
- [[sm-map-viewer]] — 地图查看器（核心）
- [[nav-sidebar]] — 导航侧栏
- [[map-toolbar]] — 地图工具栏
- [[map-measure]] — 地图量算
- [[map-overview]] — 鹰眼视图
- [[layer-manager]] — 图层管理器
- [[feature-search]] — 要素搜索
- [[spatial-analysis]] — 空间分析
- [[spatial-query]] — 空间查询
- [[network-analysis]] — 网络分析
- [[agent-chat-panel]] — Agent 聊天面板
- [[agent-chat-message]] — 聊天消息
- [[agent-tool-call-card]] — 工具调用卡片
- [[dashboard-buffer-analysis-modal]] — 缓冲区分析弹窗
- [[dashboard-dashboard-map]] — 仪表盘地图
- [[dashboard-disaster-detail-panel]] — 灾害详情面板
- [[dashboard-route-planning-modal]] — 路线规划弹窗
- [[dashboard-weather-panel]] — 天气面板
- [[earthquake-buffer-zone-layer]] — 地震缓冲区图层
- [[earthquake-rescue-dispatch-panel]] — 救援调度面板
- [[earthquake-support-point-layer]] — 支撑点图层

**FastAPI 后端（7）**：
- [[fastapi-main]] — FastAPI 主入口
- [[agent-coordinator]] — 多智能体协调器
- [[agent-sub-agents]] — 子 Agent 定义
- [[agent-graph]] — Agent 核心逻辑
- [[agent-intent]] — 意图分类节点
- [[agent-planner]] — 任务规划节点
- [[agent-summarize]] — 结果汇总节点

### 页面（8）

- [[home-view]] — 首页
- [[data-dashboard-view]] — 监测-预警-联动
- [[coord-response-view]] — 协同叫应视图
- [[warn-info-view]] — 预警信息视图
- [[supply-dispatch-view]] — 物资调度视图
- [[earthquake-command-view]] — 地震指挥视图
- [[flood-simulation-view]] — 洪涝模拟视图
- [[new-big-screen-view]] — 大屏视图

### 服务（7）

- [[llm-service]] — LLM 服务
- [[rag-service]] — RAG 知识库服务
- [[iserver-client]] — iServer 客户端服务
- [[session-store]] — 会话存储
- [[coord-response-service]] — 协同叫应服务
- [[warn-info-service]] — 预警信息服务
- [[supply-dispatch-service]] — 物资调度服务

### 实体（6）

- [[response-wrapper]] — 统一响应 R&lt;T&gt;
- [[coord-response]] — 协同叫应实体
- [[warn-info]] — 气象灾害预警实体
- [[supply-dispatch]] — 应急物资调度实体
- [[agent-state]] — Agent 状态定义
- [[tool-result]] — 工具结果 schema

### 接口（12）

**SpringBoot（4）**：
- [[coord-response]] — 协同叫应 API
- [[health]] — 健康检查 API
- [[warn-info]] — 气象灾害预警 API
- [[supply-dispatch]] — 应急物资调度 API

**SuperMap iServer（6）**：
- [[iserver-feature-results]] — 空间查询 API
- [[iserver-buffer]] — 缓冲区分析 API
- [[iserver-overlay]] — 叠置分析 API
- [[iserver-network-analyst]] — 网络分析 API
- [[iserver-map-tile]] — 地图切片 API
- [[iserver-sql-query]] — SQL 查询 API

**FastAPI Agent（2）**：
- [[agent-api]] — Agent 对话 API
- [[rag-api]] — RAG 知识库 API

### 流程（6）

- [[agent-emergency]] — Agent 应急分析流程
- [[dual-buffer-emergency]] — 双缓冲区应急流程
- [[buffer-analysis]] — 缓冲区分析业务流程
- [[spatial-query-flow]] — 空间查询业务流程
- [[network-analysis-flow]] — 网络分析业务流程
- [[coordinated-response]] — 协同叫应流程

### 概念（11）

- [[buffer-analysis]] — 缓冲区分析
- [[spatial-query-concept]] — 空间查询
- [[network-analysis-concept]] — 网络分析
- [[overlay-analysis]] — 叠置分析
- [[geojson]] — GeoJSON 数据格式
- [[multi-agent]] — 多智能体协同
- [[ddi]] — DDI 综合灾害指数
- [[app-config]] — 应用配置
- [[adr-001]] — 前端技术栈选型
- [[adr-002]] — SuperMap iServer 服务选型
- [[adr-003]] — AI Agent 多智能体架构选型
