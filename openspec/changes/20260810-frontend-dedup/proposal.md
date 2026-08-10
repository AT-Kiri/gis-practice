# Proposal: 前端地图组件去重

## Why

### 问题背景

前端 5 个地图交互组件（SpatialQuery、NetworkAnalysis、SpatialAnalysis、FeatureSearch、MapMeasure）中存在大量逐字复制的代码模式：

- `emptyFC()` / `fc()` 函数重复定义 **5 处**
- `setSourceData()` / `setSource()` 安全设置数据源函数重复 **4 处**
- try-catch removeLayer/removeSource 清理模式重复 **4+ 处**
- `ensureSources()` / `ensureLayer()` 批量创建图层模式重复 **5 处**
- `ISERVER_URL` 在 2 处硬编码（NetworkAnalysis.vue、changchunBasemap.js），与 5 处从 `utils/map.js` 导入的方式不一致
- `DATASOURCE = 'Jingjin'` 在 2 处硬编码（FeatureSearch.vue、SpatialQuery.vue）
- 长春坐标系四角转换 + LineString 坐标映射在 NetworkAnalysis.vue 和 changchunBasemap.js 中完全重复

### 为什么现在做

- 修改任一组件的图层管理逻辑时，需同步修改 4-5 个文件，极易遗漏
- iServer URL 不统一：NetworkAnalysis.vue 和 changchunBasemap.js 中硬编码 `http://localhost:8090`，与 `utils/map.js` 中的导出不同步，部署环境切换时存在隐患
- 当前 `composables/` 目录已有 `useShortestPath.js` 先例，扩展 `useMapLayers` 符合项目既有的 composable 模式

## What

1. 在 `utils/map.js` 中新增 4 个工具函数：`emptyFeatureCollection()`、`setGeoJSONData()`、`ensureGeoJSONSources()`、`removeLayersSafe()`
2. 在 `utils/map.js` 中新增常量 `DATASOURCE_JINGJIN`，统一京津冀数据源名称
3. 在 `composables/` 目录新增 `useMapLayers.js`，封装图层生命周期管理（初始化、清理、安全设置数据）
4. 将 NetworkAnalysis.vue 和 changchunBasemap.js 中的硬编码 `ISERVER_URL` 改为从 `utils/map.js` 导入
5. 将 FeatureSearch.vue 和 SpatialQuery.vue 中的硬编码 `DATASOURCE` 改为从 `utils/map.js` 导入
6. 将 changchunBasemap.js 中重复的四角坐标转换逻辑提取为 `utils/map.js` 中的 `changchunBoundsToWGS84Coords()` 函数
7. 5 个组件中的重复函数替换为从 `utils/map.js` 或 `useMapLayers` 导入

## Capabilities

- **C1**：提供统一的 GeoJSON 空集合工厂函数，消除 5 处重复定义
- **C2**：提供统一的安全数据源设置函数，消除 4 处重复定义
- **C3**：提供统一的批量图层创建/清理函数，消除 5+ 处重复模式
- **C4**：提供 `useMapLayers` composable，封装图层初始化→使用→清理的完整生命周期
- **C5**：统一 iServer URL 和数据源常量到单一来源，消除硬编码

## Impact

### 受影响文件（修改）

| 文件 | 修改内容 |
|------|----------|
| `frontend/src/utils/map.js` | 新增 4 个工具函数 + 1 个常量 + 1 个坐标转换函数 |
| `frontend/src/composables/useMapLayers.js` | **新增** composable |
| `frontend/src/components/SpatialQuery.vue` | 删除 emptyFC/setSourceData/ensureSources，改为导入 |
| `frontend/src/components/FeatureSearch.vue` | 删除 emptyFC/setSourceData，改为导入；DATASOURCE 改为导入 |
| `frontend/src/components/NetworkAnalysis.vue` | 删除 fc/setSource/cleanupLayers，改为导入；ISERVER_URL 改为导入 |
| `frontend/src/components/SpatialAnalysis.vue` | 删除 emptyFC/setSource/ensureLayer，改为导入 |
| `frontend/src/components/MapMeasure.vue` | 删除 emptyFC，改为导入 |
| `frontend/src/views/DataDashboardView.vue` | cleanupEarthquakeLayers 中手动 removeLayer/removeSource 改为调用 removeLayersSafe |
| `frontend/src/utils/agent/changchunBasemap.js` | ISERVER_URL 改为导入；四角坐标转换改为调用 map.js 函数 |

### 不受影响

- 组件的模板（template）和样式（style）不做任何修改
- 组件的业务逻辑（查询、分析、绘制等）不做任何修改
- 后端代码不做任何修改

### 风险评估

- **行为等价性**：所有改动均为"原地替换"——将组件内定义的函数替换为从 utils 导入的等价函数，不改变任何执行逻辑
- **回归范围可控**：影响 5 个地图交互组件 + 1 个大屏视图 + 1 个 Agent 工具，均可通过功能操作验证
