## Context

当前项目为空白状态，需要从零搭建京津冀城市综合防灾应急管理系统的技术底座。前端选用 Vue3 + Vite + SuperMap Vue-iClient-MapboxGL，后端选用 SpringBoot，数据层依赖已部署的 SuperMap iServer 11i 服务。首期聚焦于基础地图功能的实现，为后续模块提供可扩展的架构。

已有基础设施：
- SuperMap iServer 11i 已部署，`map-jingjin`、`map-world` 等服务已预配置
- Jingjin.udbx 数据位于 `D:\SuperMap\SuperMapiServer11i\samples\data\City\`
- Vue-iClient-MapboxGL API 文档位于 iClient 安装目录下

## Goals / Non-Goals

**Goals:**
- 搭建 Vue3 + Vite 前端工程，集成 @supermap/vue-iclient-mapboxgl
- 搭建 SpringBoot + Maven 后端工程，提供基础 REST API 架构
- 实现 MapboxGL 地图容器组件，加载 iServer 瓦片服务
- 实现地图基础交互（缩放、平移、全幅）
- 实现鹰眼（Overview Map）组件
- 实现距离/面积量算工具
- 实现图层管理面板（显示/隐藏/透明度）
- 统一前后端通信规范与异常处理

**Non-Goals:**
- 不实现空间查询（属于下一阶段）
- 不实现专题图与缓冲区分析（属于下一阶段）
- 不实现网络分析（属于下一阶段）
- 不涉及用户认证与权限管理（后续阶段处理）
- 不处理 3D 场景展示

## Decisions

### 1. 技术栈选型

| 决策 | 选择 | 替代方案 | 理由 |
|---|---|---|---|
| 前端构建工具 | Vite | Webpack | 更快开发服务器启动/HMR，官方推荐 |
| 状态管理 | Pinia | Vuex | Vue3 官方推荐，TS 支持更好 |
| UI 组件库 | Ant Design Vue | Element Plus | SuperMap 示例和 iClient 官方推荐 |
| 后端构建 | Maven | Gradle | 课程环境统一，校内资源更丰富 |
| 地图引擎 | MapboxGL (vue-iclient-mapboxgl) | Leaflet/OpenLayers | 课程技术栈指定 |
| 前后端通信 | Axios + REST | — | 社区标准，SpringBoot 天然支持 |

### 2. 前端架构

采用**组件树结构**，核心地图功能作为独立 Vue 组件：

```
App.vue
├── MapContainer.vue          # 核心地图容器（mapboxgl map）
│   ├── MapTools.vue          # 缩放/平移/全幅工具栏
│   ├── MapOverview.vue       # 鹰眼组件
│   ├── MapMeasure.vue        # 量算工具
│   └── LayerManager.vue      # 图层管理面板
└── Layout 组件                # 页面布局
```

原理：SuperMap Vue-iClient-MapboxGL 的组件机制基于 MapboxGL 地图实例的依赖注入，所有功能组件作为地图的子组件存在，共享同一个 map 实例。

### 3. 后端架构

```
backend/src/main/java/com/gis/emergency/
├── controller/        # REST 控制器
├── service/           # 业务逻辑层
├── config/            # CORS、全局异常等配置
└── common/            # 通用工具与返回格式
```

后端首期职责较轻，主要是 CORS 配置、健康检查和后续模块的 API 预留。

### 4. 前后端通信规范

- RESTful API 风格
- 统一响应格式：`{ code, message, data }`
- 全局异常拦截器统一错误响应

### 5. 数据服务调用策略

前端直接访问 SuperMap iServer REST 服务（`http://localhost:8090/iserver/services/`），后端不代理地图服务请求。这种模式：
- 优点：减少后端转发开销，利用 iServer 的高并发能力
- 缺点：需要处理跨域（CORS）
- 缓解：后端负责配置 CORS 代理规则

## Risks / Trade-offs

| 风险 | 缓解措施 |
|---|---|
| SuperMap iServer 未启动或服务不可用 | 前端显示服务离线提示，支持配置服务地址 |
| Vue-iClient-MapboxGL 版本与 MapboxGL 不兼容 | 锁定 package.json 版本号，参照 iClient 安装包内的示例 |
| 浏览器跨域限制 | 后端配置 CORS，开发环境使用 Vite proxy |
| SuperMap 组件文档不充分 | 参考 iClient 安装目录下的 API 文档和 examples |
