# Project Profile — 京津冀城市综合防灾应急管理 GIS

## 技术栈

- **前端**：Vue 3 + Ant Design Vue + @supermap/vue-iclient-mapboxgl
- **后端**：SpringBoot + SuperMap iServer 11i
- **构建**：Vite（前端）+ Maven（后端）
- **数据**：SuperMap iDesktopX 2025 处理，iServer 11i 发布

## 目录约定

- 前端源码：`frontend/src/`
- 后端源码：`backend/src/main/java/com/gis/emergency/`
- 静态数据：`frontend/public/data/`
- 前端组件：`frontend/src/components/`
- 页面视图：`frontend/src/views/`
- 状态管理：`frontend/src/stores/`
- 路由配置：`frontend/src/router/`
- 后端控制器：`backend/src/main/java/com/gis/emergency/controller/`
- 通用响应：`backend/src/main/java/com/gis/emergency/common/R.java`

## 命名约定

| 类型 | 规范 | 示例 |
|------|------|------|
| Vue 组件 | PascalCase | `SmMapViewer.vue`、`MeasureTool.vue` |
| JS 文件 | camelCase | `request.js`、`map.js` |
| Pinia Store | camelCase | `map.js`（useMapStore） |
| 路由路径 | kebab-case | `/flood-simulation` |
| 后端 Controller | PascalCase | `HealthController.java` |
| 后端实体类 | PascalCase | `R.java`、`BufferParam.java` |

## 关键数据源

- iServer 服务：通过 Vite proxy `/iserver` → `http://localhost:8090/iserver`
- 空间数据：Jingjin.udbx、Changchun.udbx
- GeoJSON 数据：通过 `map.addSource / map.addLayer` 添加

## 核心功能模块

- 基本地图功能：全幅显示、缩放平移、鹰眼、量算、图层管理
- 空间查询：按绘制范围查询 POI、结果标绘
- 专题检索：关键字查询、行政级别分级检索
- 缓冲区与叠置分析：辐射范围分析、土地利用叠置分析
- 网络分析：最短路径分析、服务区分析
- 亮点特色：土地利用变化对比、人口分布专题图、3D 场景展示

## 接口规范

- 后端统一响应：`R<T>` 包装（code/message/data）
- iServer REST API：通过 `@supermap/iclient-mapboxgl` 封装类调用
- 前后端通信：axios 封装在 `utils/request.js`
