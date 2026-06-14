## Why

京津冀城市综合防灾应急管理需要一套 GIS 基础平台支撑，当前项目处于空白状态。首期需要搭建完整的前后端开发框架，并实现核心的地图可视化与基础交互能力——这是后续所有功能模块（空间查询、专题检索、缓冲区分析、网络分析等）的底层依赖。先打好地基，再盖楼。

## What Changes

- 创建 Vue3 + Vite 前端项目骨架，集成 SuperMap Vue-iClient-MapboxGL
- 创建 SpringBoot 后端项目骨架，提供 REST API 基础架构
- 实现基本地图显示（MapboxGL 底图 + Jingjin 数据服务叠加）
- 实现地图基本交互：全幅显示、放大、缩小、平移
- 实现鹰眼（Overview Map）组件
- 实现距离量算与面积量算工具
- 实现图层管理面板（显示/隐藏/透明度控制）
- 统一异常处理与跨域配置

## Capabilities

### New Capabilities

- `project-scaffolding`: Vue3 + Vite 前端项目初始化，SpringBoot 后端项目初始化，统一项目结构与构建配置
- `map-viewer`: 核心地图容器组件，集成 MapboxGL 地图引擎，加载 iServer 地图服务与底图
- `map-tools`: 地图基本交互工具——全幅显示、放大、缩小、平移、定位至初始范围
- `map-overview`: 鹰眼（MiniMap/Overview）组件，在地图角落显示缩略全局视图
- `map-measure`: 距离量算与面积量算工具，支持鼠标交互式绘制与结果显示
- `layer-manager`: 图层管理面板，列出所有已加载图层，支持显示/隐藏切换与透明度调节

### Modified Capabilities

- （无，初始项目无已有 spec）

## Impact

- 新增前端项目：`frontend/`（Vue3 + Vite + Vue-iClient-MapboxGL）
- 新增后端项目：`backend/`（SpringBoot + Maven）
- 新增依赖：`@supermap/vue-iclient-mapboxgl`、`mapbox-gl`、`ant-design-vue`（前端）；Spring Web + Spring Boot Starter（后端）
- SuperMap iServer 服务依赖：`map-jingjin`、`map-world`（需确保运行中）
