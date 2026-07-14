---
title: 地图查看器 SmMapViewer
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references: []
related:
  - pages/views/home-view.md
  - pages/components/map-toolbar.md
  - pages/components/layer-manager.md
source:
  - frontend/src/components/SmMapViewer.vue
  - frontend/src/stores/map.js
summary: 核心地图组件，初始化 MapboxGL 地图，协调各功能面板
---

# 地图查看器 SmMapViewer

## 1. 组件概述

应用的核心地图组件，负责：
- 初始化 MapboxGL 地图实例（世界底图 + 京津冀专题图）
- 管理地图状态（通过 `useMapStore`）
- 协调各功能面板的渲染和切换

## 2. Props

无 props，通过 Pinia store 共享状态。

## 3. 关键功能

### 3.1 地图初始化

```js
const map = new mapboxgl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      'world': { type: 'raster', tiles: [...], tileSize: 256 },
      'jingjin': { type: 'raster', tiles: [...], tileSize: 256 },
    },
    layers: [
      { id: 'world-layer', type: 'raster', source: 'world' },
      { id: 'jingjin-layer', type: 'raster', source: 'jingjin' },
    ],
  },
  center: [116.4, 39.9],
  zoom: 8,
})
```

### 3.2 功能面板切换

通过 `activeKey` 控制各功能面板的显示：

| activeKey | 显示的面板 |
|-----------|----------|
| `spatial-query` | SpatialQuery |
| `measure` | MapMeasure |
| `thematic-search` | FeatureSearch |
| `spatial-analysis` | SpatialAnalysis |
| `network-analysis` | NetworkAnalysis |
| `overview` | MapOverview |

### 3.3 图层管理器

LayerManager 通过 `v-model:visible` 控制，不占用 `activeKey`。

### 3.4 路由跳转

侧栏菜单的数据库表格模块（coord-response/warn-info/supply-dispatch）触发路由跳转，不占用 `activeKey`。

## 4. 生命周期

| 钩子 | 职责 |
|------|------|
| `onMounted` | 调用 `loadMap()` 初始化地图 |
| `onUnmounted` | 清理 `ResizeObserver` |

## 5. 错误处理

- 地图加载失败：显示 `map-error` 状态，提供"重新加载"按钮
- 地图服务连接失败：显示 `a-result` 警告

## 6. 代码位置

| 文件 | 路径 |
|------|------|
| 地图组件 | `frontend/src/components/SmMapViewer.vue` |
| 地图状态 | `frontend/src/stores/map.js` |
| 工具函数 | `frontend/src/utils/map.js` |
