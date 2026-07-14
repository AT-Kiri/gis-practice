---
title: 缓冲区分析
type: concept
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [concept, gis, buffer, analysis]

references:
  - pages/flows/buffer-analysis.md
  - pages/components/spatial-analysis.md
  - pages/components/earthquake-buffer-zone-layer.md

related:
  - concepts/spatial-query.md
  - concepts/overlay-analysis.md

source:
  - frontend/src/utils/circlePolygon.js
  - frontend/src/components/earthquake/BufferZoneLayer.vue

summary: 缓冲区分析是 GIS 中最基础的空间分析功能，以点/线/面为输入，按指定半径生成多边形区域
---

# 缓冲区分析

## 1. 定义

缓冲区分析（Buffer Analysis）是 GIS 中最基础的空间分析功能，以**点/线/面**为输入要素，按**指定半径**向外扩展生成**多边形区域**。

## 2. 数学原理

### 2.1 点缓冲区

以点 `(cx, cy)` 为圆心，半径 `r` 生成圆形多边形：

```
对于角度 θ ∈ [0, 2π]，步长 2π/n（n=64 边）：
  x = cx + r * cos(θ) / (111320 * cos(cy * π/180))
  y = cy + r * sin(θ) / 111320
```

其中 `111320` 是每度对应的米数（赤道处），`cos(cy * π/180)` 修正经度方向的纬度缩放。

### 2.2 线缓冲区

沿线的每个节点生成半圆，两侧生成平行线，合并形成缓冲区多边形。

### 2.3 面缓冲区

面向外扩展，外角处生成圆弧，内角处生成尖角。

## 3. 项目中的应用

### 3.1 双缓冲区（地震应急）

项目中使用**内/外双圈缓冲区**：
- **内圈**（红色 `rgba(229,62,62,0.25)`）：灾害影响范围
- **外圈**（橙色 `rgba(221,107,32,0.15)`）：应急支援范围

```js
// circlePolygon.js
function createCirclePolygon(center, radiusMeters, segments = 64) {
  const [cx, cy] = center
  const points = []
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI
    const lng = cx + dLng * Math.cos(angle)
    const lat = cy + dLat * Math.sin(angle)
    points.push([lng, lat])
  }
  return { type: 'Polygon', coordinates: [points] }
}
```

### 3.2 点选缓冲区（空间查询）

用户点击地图时，以点击位置为中心生成 **500m 缓冲区**（32 边近似圆），作为空间查询的范围。

## 4. 关键参数

| 参数 | 说明 | 项目取值 |
|------|------|---------|
| `segments` | 近似圆边数 | 32 或 64 |
| `radiusMeters` | 缓冲区半径（米） | 内圈/外圈动态计算 |
| `innerColor` | 内圈填充色 | `rgba(229,62,62,0.25)` |
| `outerColor` | 外圈填充色 | `rgba(221,107,32,0.15)` |

## 5. 相关概念

- [[pages/concepts/spatial-query]] — 空间查询
- [[pages/concepts/overlay-analysis]] — 叠置分析
- [[pages/concepts/network-analysis]] — 网络分析
