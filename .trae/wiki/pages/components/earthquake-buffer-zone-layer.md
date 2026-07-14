---
title: 地震缓冲区图层 BufferZoneLayer
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, earthquake, buffer, layer]

references:
  - pages/components/dashboard-buffer-analysis-modal.md
  - pages/views/data-dashboard-view.md

related:
  - pages/components/earthquake-support-point-layer.md
  - pages/components/earthquake-rescue-dispatch-panel.md
  - pages/flows/buffer-analysis.md

source:
  - frontend/src/components/earthquake/BufferZoneLayer.vue
  - frontend/src/utils/circlePolygon.js

summary: 双缓冲区图层组件，渲染内/外两个同心圆 Polygon
---

# 地震缓冲区图层 BufferZoneLayer

## 1. 组件概述

双缓冲区图层组件，在 MapboxGL 地图上渲染两个同心圆 Polygon：
- **外圈**（橙色）：应急支援范围
- **内圈**（红色）：灾害影响范围

## 2. Props

| Prop | 类型 | 说明 |
|------|------|------|
| `map` | `Object` | MapboxGL 地图实例 |
| `center` | `Array` | 受灾点坐标 `[lng, lat]` |
| `bufferConfig` | `Object` | `{inner, outer, innerColor, outerColor, name}` |

## 3. 功能

- 外圈 Polygon（先添加，下层）
- 内圈 Polygon（后添加，上层）
- 鼠标悬停 tooltip

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 缓冲区图层 | `frontend/src/components/earthquake/BufferZoneLayer.vue` |
| 圆形多边形工具 | `frontend/src/utils/circlePolygon.js` |
