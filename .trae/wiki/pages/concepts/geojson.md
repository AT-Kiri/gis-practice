---
title: GeoJSON 数据格式
type: concept
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [concept, geojson, format, gis]

references:
  - flows/buffer-analysis.md
  - flows/spatial-query.md
  - flows/network-analysis.md

related:
  - concepts/buffer-analysis.md
  - concepts/spatial-query.md

source:
  - frontend/src/utils/map.js

summary: GeoJSON 是一种轻量级的地理数据交换格式，基于 JSON 表示地理要素信息
---

# GeoJSON 数据格式

## 1. 定义

GeoJSON 是一种轻量级的**地理数据交换格式**，基于 JSON 表示地理要素信息。

## 2. 几何类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `Point` | 点 | `{ type: "Point", coordinates: [lng, lat] }` |
| `LineString` | 线 | `{ type: "LineString", coordinates: [[lng, lat], ...] }` |
| `Polygon` | 面 | `{ type: "Polygon", coordinates: [[[lng, lat], ...]] }` |
| `MultiPoint` | 多点 | 多个点坐标 |
| `MultiLineString` | 多线 | 多条线坐标 |
| `MultiPolygon` | 多面 | 多个面坐标 |

## 3. Feature 和 FeatureCollection

### 3.1 Feature（单个要素）

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [116.4, 39.9]
  },
  "properties": {
    "name": "北京市",
    "population": 2154
  }
}
```

### 3.2 FeatureCollection（要素集合）

```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature", "geometry": {...}, "properties": {...} },
    { "type": "Feature", "geometry": {...}, "properties": {...} }
  ]
}
```

## 4. 项目中的应用

### 4.1 数据源格式

- 地图 `addSource` 接受 GeoJSON：`map.addSource('id', { type: 'geojson', data: geojson })`
- 空间分析结果统一以 GeoJSON 格式返回
- Agent 工具返回的 GeoJSON 直接渲染到地图

### 4.2 与 iServer 格式互转

```js
// GeoJSON → iServer Server JSON
function geoToServerJson(geometry) { ... }

// iServer Server JSON → GeoJSON
function serverGeoToGeoJSON(geometry) { ... }
```

## 5. 坐标约定

GeoJSON 使用 **WGS84 坐标系**（EPSG:4326），经度在前、纬度在后。

## 6. 相关概念

- [[pages/concepts/buffer-analysis]] — 缓冲区分析
- [[pages/concepts/spatial-query]] — 空间查询
