---
title: iServer SQL 查询 API
type: api
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references:
  - pages/components/network-analysis.md
  - pages/flows/network-analysis.md
related:
  - apis/iserver-feature-results.md
source:
  - frontend/src/components/NetworkAnalysis.vue
summary: SuperMap iServer SQL 查询 REST API，用于查询矢量数据（如路网）
---

# iServer SQL 查询 API

## 1. 概述

SuperMap iServer 的 **SQL 查询** REST API，用于查询矢量数据，如长春道路网络。

## 2. 接口

```
POST /iserver/services/map-changchun/rest/maps/长春市区图/queryBySQL.json
```

## 3. 请求参数

```json
{
  "queryQueryParams": [
    {
      "name": "RoadNet@Changchun@@长春市区图",
      "attributeFilter": ""
    }
  ],
  "returnAttribute": true,
  "returnGeometry": true,
  "expectCount": 2000
}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `queryQueryParams` | `Array` | 查询参数列表 |
| `queryQueryParams[].name` | `String` | 数据集名称 |
| `queryQueryParams[].attributeFilter` | `String` | 属性过滤条件 |
| `returnAttribute` | `Boolean` | 是否返回属性 |
| `returnGeometry` | `Boolean` | 是否返回几何 |
| `expectCount` | `Number` | 期望返回数量 |

## 4. 响应格式

```json
{
  "recordsets": [
    {
      "features": {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": [[x, y], ...]},
            "properties": {"name": "..."}
          }
        ]
      }
    }
  ]
}
```

## 5. 代码位置

| 文件 | 路径 |
|------|------|
| 前端调用 | `frontend/src/components/NetworkAnalysis.vue` |
