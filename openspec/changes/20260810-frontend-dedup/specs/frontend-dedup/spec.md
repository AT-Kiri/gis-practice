# Spec: 前端地图组件去重

## 模块：utils/map.js 新增工具函数

### 场景 1：emptyFeatureCollection 返回标准空 GeoJSON

**Given** 任何代码需要初始化一个空的 GeoJSON FeatureCollection

**When** 调用 `emptyFeatureCollection()`

**Then** 返回对象 `{ type: 'FeatureCollection', features: [] }`

**And** 每次调用返回新对象（不共享引用）

---

### 场景 2：setGeoJSONData 安全设置数据源内容

**Given** Mapbox GL 地图实例 `map` 已创建，且名为 `sourceId` 的 GeoJSON source 已存在

**When** 调用 `setGeoJSONData(map, sourceId, features)`

**Then** `map.getSource(sourceId).setData()` 被调用，数据为 `{ type: 'FeatureCollection', features }`

**And** 若 `map` 为 null/undefined，直接 return，不抛异常

**And** 若 `map.getSource(sourceId)` 不存在或抛异常，静默忽略（try-catch）

---

### 场景 3：ensureGeoJSONSources 批量创建数据源和图层

**Given** Mapbox GL 地图实例 `map`，sources 配置列表和 layers 配置列表

**When** 调用 `ensureGeoJSONSources(map, sources, layers)`

**Then** 对每个 source，若 `map.getSource(id)` 不存在则 `map.addSource(id, { type: 'geojson', data: emptyFeatureCollection() })`

**And** 对每个 layer，若 `map.getLayer(id)` 不存在则 `map.addLayer(layerConfig)`

**And** 若 `map` 为 null/undefined，直接 return

---

### 场景 4：removeLayersSafe 安全移除图层和数据源

**Given** Mapbox GL 地图实例 `map`，layerIds 列表和 sourceIds 列表

**When** 调用 `removeLayersSafe(map, layerIds, sourceIds)`

**Then** 先逆序移除 layerIds 中的每个 layer（若存在），再移除 sourceIds 中的每个 source（若存在）

**And** 每个移除操作独立 try-catch，单个失败不影响其他

**And** 若 `map` 为 null/undefined，直接 return

---

### 场景 5：changchunBoundsToWGS84Coords 四角坐标转换

**Given** 长春平面坐标范围 xMin, xMax, yMin, yMax

**When** 调用 `changchunBoundsToWGS84Coords(xMin, xMax, yMin, yMax)`

**Then** 返回四角 WGS84 坐标数组 `[[nwLng, nwLat], [neLng, neLat], [seLng, seLat], [swLng, swLat]]`

**And** 转换使用 `changchunToWgs84()` 函数，结果与 NetworkAnalysis.vue 和 changchunBasemap.js 中现有的四角转换逻辑一致

---

## 模块：useMapLayers composable

### 场景 6：useMapLayers 初始化图层

**Given** 地图实例 `mapRef`（ref 或 computed）和配置 `{ sources, layers }`

**When** 调用 `useMapLayers(mapRef, config)` 并在 onMounted 中调用 `ensureLayers()`

**Then** sources 和 layers 按 ensureGeoJSONSources 逻辑创建

---

### 场景 7：useMapLayers 清理图层

**Given** useMapLayers 已初始化

**When** 调用 `cleanupLayers()` （通常在 onUnmounted 中）

**Then** 所有已声明的 layers 和 sources 被 removeLayersSafe 移除

---

### 场景 8：useMapLayers 设置数据

**Given** useMapLayers 已初始化

**When** 调用 `setData(sourceId, features)`

**Then** 等价于 `setGeoJSONData(currentMap, sourceId, features)`

---

## 模块：常量统一

### 场景 9：ISERVER_URL 统一导入

**Given** NetworkAnalysis.vue 和 changchunBasemap.js 原本硬编码 `const ISERVER_URL = 'http://localhost:8090'`

**When** 重构后

**Then** 两处 `const ISERVER_URL = ...` 声明被删除

**And** 改为 `import { ISERVER_URL } from '@/utils/map'`（NetworkAnalysis.vue）或 `import { ISERVER_URL } from '../map'`（changchunBasemap.js）

**And** 代码中所有 `ISERVER_URL` 引用行为不变（值仍为 `'http://localhost:8090'`）

---

### 场景 10：DATASOURCE 常量统一

**Given** FeatureSearch.vue 和 SpatialQuery.vue 原本硬编码 `const DATASOURCE = 'Jingjin'`

**When** 重构后

**Then** 两处 `const DATASOURCE = ...` 声明被删除

**And** 改为从 `utils/map.js` 导入 `DATASOURCE_JINGJIN`

**And** 代码中所有引用行为不变（值仍为 `'Jingjin'`）

---

## 模块：组件行为等价

### 场景 11：SpatialQuery 功能不变

**Given** SpatialQuery.vue 重构前后

**When** 用户使用点选/矩形框选/圆形框选执行空间查询

**Then** 查询结果与重构前完全一致（图层渲染、结果列表、分页、高亮）

**And** 清除结果功能正常（所有图层和数据源被正确清理）

---

### 场景 12：FeatureSearch 功能不变

**Given** FeatureSearch.vue 重构前后

**When** 用户按关键字搜索地理要素

**Then** 搜索结果与重构前完全一致（结果列表、地图标绘、点击定位）

---

### 场景 13：NetworkAnalysis 功能不变

**Given** NetworkAnalysis.vue 重构前后

**When** 用户执行最短路径分析或服务区分析

**Then** 分析结果与重构前完全一致（路径渲染、服务区渲染、结果摘要）

**And** 长春底图加载正常（ISERVER_URL 导入后值不变）

**And** 组件卸载时图层清理正常

---

### 场景 14：SpatialAnalysis 功能不变

**Given** SpatialAnalysis.vue 重构前后

**When** 用户执行缓冲区分析或叠置分析

**Then** 分析结果与重构前完全一致

**And** 组件卸载时图层清理正常

---

### 场景 15：MapMeasure 功能不变

**Given** MapMeasure.vue 重构前后

**When** 用户执行距离量算或面积量算

**Then** 量算结果与重构前完全一致

---

### 场景 16：DataDashboardView 地震图层清理不变

**Given** DataDashboardView.vue 重构前后

**When** 用户切换县区或卸载大屏组件

**Then** 地震图层（eq-* 系列）被正确清理，行为与重构前一致

---

### 场景 17：changchunBasemap 功能不变

**Given** changchunBasemap.js 重构前后

**When** Agent 执行 shortest_path 或 service_area 触发长春底图加载

**Then** 底图加载和路网渲染行为与重构前完全一致

**And** ISERVER_URL 和四角坐标转换结果不变
