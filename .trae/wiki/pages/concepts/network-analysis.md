---
title: 网络分析
type: concept
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references:
  - pages/flows/network-analysis.md
  - pages/components/network-analysis.md
related:
  - concepts/buffer-analysis.md
  - concepts/spatial-query.md
source:
  - frontend/src/components/NetworkAnalysis.vue
  - frontend/src/composables/useShortestPath.js
summary: 网络分析是 GIS 的重要功能，基于道路网络计算最短路径和服务区范围
---

# 网络分析

## 1. 定义

网络分析（Network Analysis）是 GIS 的重要功能，基于**道路网络**计算最短路径和服务区范围。

## 2. 网络分析类型

### 2.1 最短路径分析

给定起点和终点，计算经过道路网络的最短路径。

**算法**：Dijkstra 算法（SuperMap SDK 内置）

**项目应用**：
- 用户标记 ≥2 个途径点
- 计算经过道路网络的最短路径
- 结果以蓝色线渲染

### 2.2 服务区分析

给定中心点和半径，计算道路网络覆盖范围。

**项目应用**：
- 用户设置中心点和半径（100-3000 米）
- 计算道路网络覆盖范围
- 结果以紫色面渲染

## 3. 路网数据

项目使用长春市路网数据：

| 参数 | 值 |
|------|-----|
| 数据源 | `RoadNet@Changchun` |
| 服务地址 | `/iserver/services/transportationanalyst-sample/rest/networkanalyst/RoadNet@Changchun` |
| 坐标系 | 长春平面坐标（需转换为 WGS84） |

## 4. 坐标转换

### 4.1 WGS84 → 长春平面

```js
function wgs84ToChangchun(lng, lat) {
  // 使用 proj4 或自定义转换
  return { x, y }
}
```

### 4.2 长春平面 → WGS84

```js
function changchunToWgs84(x, y) {
  return [lng, lat]
}
```

## 5. 相关概念

- [[pages/concepts/buffer-analysis]] — 缓冲区分析
- [[pages/concepts/spatial-query]] — 空间查询
