# Design: 前端地图组件去重

## Context

### 现状

前端 5 个地图交互组件各自独立实现了相同的图层管理逻辑：

```
SpatialQuery.vue     → emptyFC() + setSourceData() + ensureSources() + cleanupLayers()
FeatureSearch.vue    → emptyFC() + setSourceData() + ensureSources() + cleanupLayers()
NetworkAnalysis.vue  → fc() + setSource() + initLayers() + cleanupLayers()  + ISERVER_URL 硬编码
SpatialAnalysis.vue  → emptyFC() + setSource() + ensureLayer() + cleanupLayers()
MapMeasure.vue       → emptyFC() + removeLayersSafe() 内联
DataDashboardView.vue→ EQ_LAYERS/EQ_SOURCES + 手动 removeLayer/removeSource
changchunBasemap.js  → ISERVER_URL 硬编码 + 四角坐标转换重复
```

### 约束

- **行为等价**：重构后所有组件的执行结果必须与重构前完全一致
- **风格一致**：遵循 frontend_rules.md — Composition API、`<script setup>`、scoped style
- **最小改动**：只替换重复代码，不修改业务逻辑、模板、样式
- **渐进式**：utils 函数和 composable 独立可测，组件逐个替换

## Goals / Non-Goals

### Goals

1. 在 `utils/map.js` 中新增工具函数，消除 5 个组件中的重复代码
2. 新增 `useMapLayers` composable，封装图层生命周期
3. 统一 iServer 常量，消除硬编码
4. 所有改动行为等价，可通过功能操作验证

### Non-Goals

- 不重构 DataDashboardView 的组件拆分（属于第三梯队 F3）
- 不修改组件的 template 和 style
- 不修改后端代码
- 不引入新的依赖

## Decisions

### D1：工具函数放在 `utils/map.js` 还是新建文件

**选择**：放在 `utils/map.js`

**理由**：
- `map.js` 已导出 `ISERVER_URL`、`changchunToWgs84`、`serverGeoToGeoJSON` 等地图工具函数，是项目约定的地图工具集散地
- 新增函数（emptyFeatureCollection、setGeoJSONData 等）本质都是地图操作工具，属于同一领域
- 避免 import 路径碎片化——组件已经从 `map.js` 导入其他函数

### D2：新增 composable 还是仅用工具函数

**选择**：工具函数为主 + composable 为辅

**理由**：
- `emptyFC()`、`setSourceData()` 是纯函数，无需响应式，放在 utils 即可
- 图层初始化+清理涉及组件生命周期（onMounted/onUnmounted），适合 composable 封装
- `composables/` 目录已有 `useShortestPath.js` 先例，模式一致

### D3：函数命名

**选择**：语义化命名，与现有项目风格一致

| 函数名 | 替换的重复函数 | 说明 |
|--------|---------------|------|
| `emptyFeatureCollection()` | `emptyFC()` / `fc()` | 更语义化，避免缩写 |
| `setGeoJSONData(map, sourceId, features)` | `setSourceData()` / `setSource()` | 显式传 map，不依赖 store |
| `ensureGeoJSONSources(map, sources, layers)` | `ensureSources()` / `ensureLayer()` | 统一参数接口 |
| `removeLayersSafe(map, layerIds, sourceIds)` | 各组件的 cleanup 函数 | 显式传 map 和 ID 列表 |
| `changchunBoundsToWGS84Coords(xMin, xMax, yMin, yMax)` | NetworkAnalysis/changchunBasemap 的四角转换 | 提取为纯函数 |

### D4：useMapLayers composable 的 API 设计

```javascript
const { ensureLayers, cleanupLayers, setData } = useMapLayers(map, {
  sources: [{ id, data? }, ...],
  layers: [{ id, source, type, paint?, filter? }, ...],
})
```

**理由**：
- 配置式声明 sources 和 layers，与组件中现有的 `ensureSources` 函数结构一致
- `cleanupLayers()` 在 onUnmounted 中调用
- `setData(sourceId, features)` 替代 `setSourceData`

### D5：常量命名

| 常量名 | 值 | 说明 |
|--------|-----|------|
| `DATASOURCE_JINGJIN` | `'Jingjin'` | 京津冀数据源名 |
| `MAP_NAME_CHANGCHUN` | `encodeURIComponent('长春市区图')` | 长春地图服务名 |

`ISERVER_URL` 已存在于 `map.js`，直接复用。

### D6：修改顺序（安全增量）

1. 先在 `map.js` 新增函数和常量（不删旧代码）
2. 逐个组件替换（每替一个验证一个）
3. 最后确认无遗漏后删除组件内的旧函数

## 方案对比

### 方案 A：仅提取工具函数（不新增 composable）

- **优点**：改动最小，风险最低
- **缺点**：组件中仍需手动管理 onUnmounted 清理，生命周期逻辑重复

### 方案 B：工具函数 + composable（选择此方案）

- **优点**：工具函数可独立测试，composable 封装生命周期，两者互补
- **缺点**：多一个文件，但符合项目 composable 模式

### 方案 C：全部用 composable

- **优点**：最彻底
- **缺点**：对简单函数（如 emptyFC）过度封装，违反"简洁优先"原则

**最终选择**：方案 B — 工具函数处理纯逻辑，composable 处理生命周期，职责清晰。
