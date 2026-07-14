# Wiki Log

## [2026-07-10] init | Wiki 初始化

- 操作：从零搭建 wiki 知识库
- spec.md：从默认骨架生成
- profile.md：用户创建
- 目录结构：已创建

## [2026-07-10] scan | 代码扫描生成 stub

- 操作：运行 wiki-scan.js 扫描项目代码
- 创建 stub：39 个
  - components: 21
  - views: 8
  - stores: 2
  - entities: 4
  - apis: 4
- 计算 references：14 个页面有引用关系
- INDEX.md：已更新

## [2026-07-10] flows | 填充核心业务流程

- 操作：按 flows/_template.md 模板填充 3 个核心业务流程
- 新增页面：4 个
  - pages/flows/buffer-analysis.md — 缓冲区分析业务流程
  - pages/flows/spatial-query.md — 空间查询业务流程
  - pages/flows/network-analysis.md — 网络分析业务流程
  - pages/flows/_template.md — 模板（不应出现，仅参考）
- INDEX.md：已更新流程列表

## [2026-07-10] entities | 填充实体页面

- 操作：填充 4 个后端实体页面
- 更新页面：8 个
  - pages/entities/response-wrapper.md — 统一响应 R<T>
  - pages/entities/coord-response.md — 协同叫应处置实体
  - pages/entities/warn-info.md — 气象灾害预警实体
  - pages/entities/supply-dispatch.md — 应急物资调度实体
  - pages/schemas/agent-state.md — Agent 状态定义
  - pages/schemas/tool-result.md — 工具结果 schema
- INDEX.md：已更新实体列表

## [2026-07-10] refs-merge | 合并 references

- 操作：运行 wiki-merge-refs.js，将 auto.json 合并到页面 frontmatter
- 更新页面：14 个（技术导入依赖）
- 新增引用：31 条
- INDEX.md：无需更新（引用关系不显示在 INDEX 中）

## [2026-07-10] fill-core | 填充核心页面

- 操作：填充核心组件、页面、状态、接口页面
- 更新页面：14 个
  - pages/components/sm-map-viewer.md — 地图查看器（核心组件）
  - pages/views/home-view.md — 首页
  - pages/stores/agent.md — 地图状态
  - pages/stores/map.md — Agent 状态
  - pages/apis/coord-response.md — 协同叫应 API
  - pages/apis/health.md — 健康检查 API
  - pages/apis/warn-info.md — 气象灾害预警 API
  - pages/apis/supply-dispatch.md — 应急物资调度 API
  - pages/apis/iserver-feature-results.md — iServer 空间查询 API
  - pages/apis/iserver-buffer.md — iServer 缓冲区分析 API
  - pages/apis/iserver-overlay.md — iServer 叠置分析 API
  - pages/apis/iserver-network-analyst.md — iServer 网络分析 API
  - pages/apis/iserver-map-tile.md — iServer 地图切片 API
- INDEX.md：已更新全页面列表

## [2026-07-10] fill-all | 批量填充所有页面

- 操作：批量读取代码并填充所有剩余页面
- 更新页面：30 个（组件 + 视图 + services + tools）
- INDEX.md：已更新全页面列表

## [2026-07-10] concepts-decisions | 填充概念和决策页面

- 操作：创建 GIS 概念解释和架构决策记录
- 新增概念页面：11 个
  - pages/concepts/buffer-analysis.md — 缓冲区分析
  - pages/concepts/spatial-query.md — 空间查询
  - pages/concepts/network-analysis.md — 网络分析
  - pages/concepts/overlay-analysis.md — 叠置分析
  - pages/concepts/geojson.md — GeoJSON 数据格式
  - pages/concepts/multi-agent.md — 多智能体协同
  - pages/concepts/ddi.md — DDI 综合灾害指数
  - pages/concepts/app-config.md — 应用配置
  - pages/concepts/adr-001.md — 前端技术栈选型
  - pages/concepts/adr-002.md — SuperMap iServer 服务选型
  - pages/concepts/adr-003.md — AI Agent 多智能体架构选型
- INDEX.md：已更新概念和决策列表

## [2026-07-10] fill-agent-backend | 补全 Agent 后端

- 操作：补全 Agent 后端核心页面
- 新增页面：10 个
  - pages/components/agent-coordinator.md — 多智能体协调器（含完整技术描述）
  - pages/components/agent-intent.md — 意图分类节点
  - pages/components/agent-planner.md — 任务规划节点
  - pages/components/agent-summarize.md — 结果汇总节点
  - pages/services/coord-response-service.md — 协同叫应服务
  - pages/services/warn-info-service.md — 预警信息服务
  - pages/services/supply-dispatch-service.md — 物资调度服务
- 更新：agent-coordinator.md 补充三层架构和工程创新描述

## [2026-07-10] cleanup | 清理优化

- 操作：清理旧的重复文件和空目录
- 删除：
  - pages/components/agent.md（重复）
  - pages/components/algo-tools.md（已在 services/）
  - pages/components/gis-tools.md（已在 services/）
  - pages/components/map.md（已在 services/）
  - pages/components/rag-tools.md（已在 services/）
  - pages/stores/（整个空目录已删除）
- 节点类型精简：11 → 7
  - stores → services
  - tools → services
  - schemas → entities
  - decisions → concepts

## [2026-07-10] wiki-build | 重构可视化站点

- 操作：完全重写 wiki-build.js 和 index.html
- 新增功能：
  - 顶部工具栏（页面/关联图谱标签切换）
  - 折叠式导航栏（点击类型名称折叠/展开）
  - 侧边栏收起后左上角展开按钮
  - 搜索框添加搜索结果下拉
  - 图谱默认缩放 70% 居中
  - 孤立节点半透明显示，分布在边缘
  - 图表控制按钮（放大/缩小/重置/标签）
  - 点击图谱节点跳转页面
- 修复问题：
  - display:none 容器渲染问题
  - 无效边过滤
  - 尺寸有效性检查

## [2026-07-14] fix-graph-json | 删除空的 graph.json

- 操作：删除过时且为空的 graph.json 文件
- 原因：wiki-build.js 已改为动态从页面数据生成图谱

## [2026-07-14] fix-stores-refs | 修复 stores/ 引用路径

- 操作：更新 wiki-refs.js 和 wiki-scan.js，添加 stores/ → services/ 映射
- 目标：将代码中的 stores/ 导入正确映射到 services/ wiki 页面
- 新增页面：
  - pages/services/map.md — 地图状态管理 MapStore
  - pages/services/agent.md — Agent 状态管理 AgentStore

## [2026-07-14] fix-type-inconsistency | 修复 type 字段

- 操作：批量修复 pages/services/ 下 type 与目录不一致的页面
- 修复页面：4 个
  - llm-service.md: component → service
  - iserver-client.md: component → service
  - rag-service.md: component → service
  - session-store.md: component → service

## [2026-07-14] fix-link-syntax | 统一链接语法

- 操作：将所有 [[slug]] 语法统一为 [[pages/type/slug]] 路径形式
- 修复文件：约 15 个
  - concepts/adr-001.md, adr-002.md, adr-003.md
  - concepts/buffer-analysis.md, spatial-query.md, network-analysis.md
  - concepts/overlay-analysis.md, ddi.md, geojson.md, multi-agent.md
  - flows/buffer-analysis.md, spatial-query.md, network-analysis.md
  - services/session-store.md

## [2026-07-14] re-refs | 重新计算并合并引用

- 操作：重新运行 wiki-refs.js 和 wiki-merge-refs.js
- 刷新 auto.json：6 → 24 个页面有引用关系
- 合并到页面：更新 23 个，跳过 1 个
- 结果：78 节点 + 340 边（原为 75 节点 + 325 边）

## [2026-07-14] re-build | 重新生成可视化站点

- 操作：运行 wiki-build.js 重新生成 wiki-site/index.html
- 更新 INDEX.md 和 LOG.md
