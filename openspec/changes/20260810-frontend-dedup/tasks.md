# Tasks: 前端地图组件去重

## T1: utils/map.js 新增工具函数和常量

**优先级**: P0
**依赖**: 无
**状态**: [ ]

### T1.1: 新增常量
- 在 `map.js` 中新增 `DATASOURCE_JINGJIN = 'Jingjin'`
- 新增 `MAP_NAME_CHANGCHUN = encodeURIComponent('长春市区图')`

### T1.2: 新增 emptyFeatureCollection 函数
```javascript
export function emptyFeatureCollection() {
  return { type: 'FeatureCollection', features: [] }
}
```

### T1.3: 新增 setGeoJSONData 函数
```javascript
export function setGeoJSONData(map, sourceId, features) {
  if (!map) return
  try {
    map.getSource(sourceId).setData({ type: 'FeatureCollection', features })
  } catch (e) { /* ignore */ }
}
```

### T1.4: 新增 ensureGeoJSONSources 函数
```javascript
export function ensureGeoJSONSources(map, sources = [], layers = []) {
  if (!map) return
  sources.forEach(src => {
    if (!map.getSource(src.id)) {
      map.addSource(src.id, { type: 'geojson', data: emptyFeatureCollection() })
    }
  })
  layers.forEach(l => {
    if (!map.getLayer(l.id)) map.addLayer(l)
  })
}
```

### T1.5: 新增 removeLayersSafe 函数
```javascript
export function removeLayersSafe(map, layerIds = [], sourceIds = []) {
  if (!map) return
  layerIds.slice().reverse().forEach(id => {
    try { if (map.getLayer(id)) map.removeLayer(id) } catch (e) { /* ignore */ }
  })
  sourceIds.forEach(id => {
    try { if (map.getSource(id)) map.removeSource(id) } catch (e) { /* ignore */ }
  })
}
```

### T1.6: 新增 changchunBoundsToWGS84Coords 函数
```javascript
export function changchunBoundsToWGS84Coords(xMin, xMax, yMin, yMax) {
  const nw = changchunToWgs84(xMin, yMax)
  const ne = changchunToWgs84(xMax, yMax)
  const se = changchunToWgs84(xMax, yMin)
  const sw = changchunToWgs84(xMin, yMin)
  return [[nw[0], nw[1]], [ne[0], ne[1]], [se[0], se[1]], [sw[0], sw[1]]]
}
```

---

## T2: 新增 useMapLayers composable

**优先级**: P0
**依赖**: T1
**状态**: [ ]

创建 `frontend/src/composables/useMapLayers.js`：
- 接收 `mapRef`（ref 或 getter 函数）和 `{ sources, layers }` 配置
- 暴露 `ensureLayers()`、`cleanupLayers()`、`setData(sourceId, features)` 方法
- 内部调用 T1 中的工具函数

---

## T3: 替换 SpatialQuery.vue 中的重复代码

**优先级**: P1
**依赖**: T1
**状态**: [ ]

- 删除 `emptyFC()` 函数定义（行 ~249），改为 `import { emptyFeatureCollection, setGeoJSONData, ensureGeoJSONSources, removeLayersSafe, DATASOURCE_JINGJIN } from '../utils/map'`
- 删除 `setSourceData()` 函数定义（行 ~253），所有调用改为 `setGeoJSONData(store.mapInstance, ...)`
- `ensureSources()` 函数体改为调用 `ensureGeoJSONSources(map, sources(), layers)`
- `DATASOURCE` 常量改为导入 `DATASOURCE_JINGJIN`
- 所有 `emptyFC()` 调用改为 `emptyFeatureCollection()`
- 验证：点选、矩形框选、圆形框选、清除结果功能正常

---

## T4: 替换 FeatureSearch.vue 中的重复代码

**优先级**: P1
**依赖**: T1
**状态**: [ ]

- 删除 `emptyFC()` 函数定义，改为导入
- 删除 `setSourceData()` 函数定义，改为导入 `setGeoJSONData`
- `DATASOURCE` 常量改为导入 `DATASOURCE_JINGJIN`
- 所有 `emptyFC()` 调用改为 `emptyFeatureCollection()`
- 验证：关键字搜索、结果列表、地图标绘功能正常

---

## T5: 替换 NetworkAnalysis.vue 中的重复代码

**优先级**: P1
**依赖**: T1
**状态**: [ ]

- 删除 `fc()` 函数定义，改为导入 `emptyFeatureCollection`
- 删除 `setSource()` 函数定义，改为导入 `setGeoJSONData`
- 删除 `ISERVER_URL` 硬编码，改为 `import { ISERVER_URL, MAP_NAME_CHANGCHUN } from '../utils/map'`
- 删除 `MAP_NAME` 硬编码，改为使用 `MAP_NAME_CHANGCHUN`
- `cleanupLayers()` 函数体改为调用 `removeLayersSafe(map, [...layerIds], [...sourceIds])`
- 四角坐标转换改为调用 `changchunBoundsToWGS84Coords()`
- 所有 `fc()` 调用改为 `emptyFeatureCollection()`
- 验证：最短路径、服务区分析、长春底图加载功能正常

---

## T6: 替换 SpatialAnalysis.vue 中的重复代码

**优先级**: P1
**依赖**: T1
**状态**: [ ]

- 删除 `emptyFC()` 函数定义，改为导入
- 删除 `setSource()` 函数定义，改为导入 `setGeoJSONData`
- `ensureLayer()` 函数体改为调用 `ensureGeoJSONSources(map, sources, layers)`
- cleanup 逻辑改为调用 `removeLayersSafe(map, [...layerIds], [...sourceIds])`
- 所有 `emptyFC()` 调用改为 `emptyFeatureCollection()`
- 验证：缓冲区分析、叠置分析功能正常

---

## T7: 替换 MapMeasure.vue 中的重复代码

**优先级**: P1
**依赖**: T1
**状态**: [ ]

- 删除 `emptyFC()` 函数定义，改为导入 `emptyFeatureCollection`
- 所有 `emptyFC()` 调用改为 `emptyFeatureCollection()`
- 验证：距离量算、面积量算功能正常

---

## T8: 替换 DataDashboardView.vue 中的图层清理代码

**优先级**: P1
**依赖**: T1
**状态**: [ ]

- `cleanupEarthquakeLayers()` 函数体改为调用 `removeLayersSafe(map, EQ_LAYERS, EQ_SOURCES)`
- 导入 `removeLayersSafe` from `'@/utils/map'`
- 验证：县区切换时地震图层清理正常、组件卸载时清理正常

---

## T9: 替换 changchunBasemap.js 中的重复代码

**优先级**: P1
**依赖**: T1
**状态**: [ ]

- 删除 `ISERVER_URL` 硬编码，改为 `import { ISERVER_URL, MAP_NAME_CHANGCHUN, changchunBoundsToWGS84Coords } from '../map'`
- 删除 `MAP_NAME` 硬编码，改为使用 `MAP_NAME_CHANGCHUN`
- 四角坐标转换改为调用 `changchunBoundsToWGS84Coords(xMin, xMax, yMin, yMax)`
- 验证：Agent 执行最短路径/服务区分析时长春底图加载正常

---

## T10: 全量回归验证

**优先级**: P0
**依赖**: T3-T9 全部完成
**状态**: [ ]

按 checklist.md 逐项验证所有受影响组件的功能。
