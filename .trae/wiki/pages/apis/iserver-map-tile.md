---
title: iServer 地图切片 API
type: api
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references:
  - pages/components/sm-map-viewer.md
  - pages/components/nav-sidebar.md
  - pages/components/map-toolbar.md
  - pages/components/map-overview.md
  - pages/components/map-measure.md
  - pages/components/feature-search.md
  - pages/components/spatial-analysis.md
  - pages/components/network-analysis.md
  - pages/components/spatial-query.md
  - pages/components/layer-manager.md
related:
  - apis/iserver-feature-results.md
source:
  - frontend/src/components/SmMapViewer.vue
  - frontend/src/components/NetworkAnalysis.vue
  - frontend/src/utils/map.js
summary: SuperMap iServer 地图切片 REST API，提供瓦片地图和图片服务
---

# iServer 地图切片 API

## 1. 概述

SuperMap iServer 的**地图切片** REST API，提供瓦片地图和图片服务，用于地图底图渲染。

## 2. 接口列表

### 2.1 世界底图

```
GET /iserver/services/map-world/rest/maps/World/tileImage.png?width=256&height=256&...
```

### 2.2 京津冀专题图

```
GET /iserver/services/map-jingjin/rest/maps/京津地区地图/tileImage.png?width=256&height=256&...
```

### 2.3 长春市区图

```
GET /iserver/services/map-changchun/rest/maps/长春市区图/tileImage.png?width=256&height=256&...
```

### 2.4 长春底图（图片模式）

```
GET /iserver/services/map-changchun/rest/maps/长春市区图/image.png?width=4096&height=...&viewBounds=...
```

**参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `width` | `Number` | 图片宽度（像素） |
| `height` | `Number` | 图片高度（像素） |
| `viewBounds` | `String` | 视图范围 JSON（URL 编码） |
| `transparent` | `Boolean` | 是否透明 |
| `cacheEnabled` | `Boolean` | 是否启用缓存 |

## 3. 地图服务配置

| 地图 | URL 前缀 | 用途 |
|------|---------|------|
| World | `/iserver/services/map-world/rest/maps/World` | 全球底图 |
| 京津地区地图 | `/iserver/services/map-jingjin/rest/maps/京津地区地图` | 京津冀专题图 |
| 长春市区图 | `/iserver/services/map-changchun/rest/maps/长春市区图` | 网络分析底图 |

## 4. 前端使用

### 4.1 瓦片地图（SmMapViewer）

```js
sources: {
  'world': {
    type: 'raster',
    tiles: [getTileUrl(`${ISERVER_URL}/iserver/services/map-world/rest/maps/World`)],
    tileSize: 256,
  },
  'jingjin': {
    type: 'raster',
    tiles: [getTileUrl(`${ISERVER_URL}/iserver/services/map-jingjin/rest/maps/京津地区地图`)],
    tileSize: 256,
  },
}
```

### 4.2 图片底图（NetworkAnalysis）

```js
const url = `${ISERVER_URL}/iserver/services/map-changchun/rest/maps/长春市区图/image.png?width=4096&height=...&viewBounds=...`
map.addSource('na-bg-image', { type: 'image', url, coordinates: [nw, ne, se, sw] })
```

## 5. 代码位置

| 文件 | 路径 |
|------|------|
| 前端地图组件 | `frontend/src/components/SmMapViewer.vue` |
| 网络分析组件 | `frontend/src/components/NetworkAnalysis.vue` |
| 工具函数 | `frontend/src/utils/map.js` |
