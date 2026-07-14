---
title: 空间查询
type: concept
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references:
  - pages/flows/spatial-query.md
  - pages/components/spatial-query.md
related:
  - concepts/buffer-analysis.md
  - concepts/overlay-analysis.md
source:
  - frontend/src/components/SpatialQuery.vue
  - frontend/src/utils/map.js
summary: 空间查询是 GIS 的核心功能，根据空间位置关系（相交、包含、相邻等）检索地理要素
---

# 空间查询

## 1. 定义

空间查询（Spatial Query）是 GIS 的核心功能，根据**空间位置关系**（相交、包含、相邻等）检索地理要素。

## 2. 空间关系

| 关系 | 说明 |
|------|------|
| **INTERSECT（相交）** | 两个几何对象有公共部分 |
| **CONTAIN（包含）** | 一个几何对象完全包含另一个 |
| **WITHIN（被包含）** | 一个几何对象完全在另一个内部 |
| **DISJOINT（相离）** | 两个几何对象无公共部分 |
| **BUFFER（缓冲）** | 在指定距离范围内 |

## 3. 项目中的实现

### 3.1 查询模式

项目支持三种绘制模式：

| 模式 | 说明 |
|------|------|
| **点选** | 点击位置 500m 缓冲区查询 |
| **矩形框选** | 拖拽绘制矩形范围 |
| **圆形框选** | 两次点击确定圆心和半径 |

### 3.2 查询流程

```
用户绘制范围 → GeoJSON Polygon → iServer REGION 转换 → REST API 查询 → GeoJSON 渲染
```

### 3.3 数据集

项目查询 9 个数据集：

| 数据集 | 说明 |
|--------|------|
| `County_P` | 县级市 |
| `Town_P` | 乡镇 |
| `Road_L` | 道路 |
| `Railway_L` | 铁路 |
| `River_L` | 河流 |
| `Lake_R` | 湖泊 |
| `Landuse_R` | 土地利用 |
| `Geomor_R` | 地貌 |
| `Coastline_L` | 海岸线 |

## 4. 坐标转换

### 4.1 GeoJSON → iServer REGION

```js
function geoToServerJson(geometry) {
  if (geometry.type === 'Polygon') {
    const outerRing = geometry.coordinates[0]
    const points = outerRing.map(([lng, lat]) => ({ x: lng, y: lat }))
    return { type: 'REGION', points, parts: [outerRing.length] }
  }
}
```

### 4.2 iServer 几何 → GeoJSON

```js
function serverGeoToGeoJSON(geometry) {
  if (geometry.type === 'POINT') {
    return { type: 'Point', coordinates: geometry.points[0] }
  }
  if (geometry.type === 'LINE') {
    return { type: 'LineString', coordinates: geometry.points }
  }
  if (geometry.type === 'REGION') {
    return { type: 'Polygon', coordinates: [geometry.points] }
  }
}
```

## 5. 相关概念

- [[pages/concepts/buffer-analysis]] — 缓冲区分析
- [[pages/concepts/overlay-analysis]] — 叠置分析
