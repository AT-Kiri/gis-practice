---
title: iServer 空间查询 API
type: api
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references:
  - pages/concepts/spatial-query.md
  - pages/flows/spatial-query.md
  - pages/components/spatial-query.md
related:
  - apis/iserver-buffer.md
  - apis/iserver-network-analyst.md
  - apis/iserver-map-tile.md
source:
  - agent-backend/app/services/iserver_client.py
  - frontend/src/components/SpatialQuery.vue
summary: SuperMap iServer featureResults REST API，提供空间数据查询能力
---

# iServer 空间查询 API

## 1. 概述

SuperMap iServer 的 **featureResults** REST API，提供空间数据查询能力，支持按几何范围查询要素。

## 2. 接口列表

### 2.1 京津冀数据源查询

```
POST /iserver/services/data-jingjin/rest/data/featureResults.json?returnContent=true
```

**请求体**：

```json
{
  "getFeatureMode": "SPATIAL",
  "datasetNames": ["Jingjin:County_P", "Jingjin:Town_P", ...],
  "geometry": {
    "type": "REGION",
    "points": [{"x": lng, "y": lat}, ...],
    "parts": [n]
  },
  "spatialQueryMode": "INTERSECT"
}
```

**响应**：

```json
{
  "datasetInfos": [
    {"datasetName": "Jingjin:County_P", "featureRange": {"start": 0, "end": 5}}
  ],
  "features": [
    {
      "fieldNames": ["SMID", "NAME", ...],
      "fieldValues": ["1", "北京市", ...],
      "geometry": {"type": "REGION", "points": [...], "parts": [...]}
    }
  ]
}
```

### 2.2 长春数据源查询

```
POST /iserver/services/data-changchun/rest/data/featureResults.json?returnContent=true
```

用于查询长春市路网等数据。

### 2.3 获取数据集列表

```
GET /iserver/services/data-jingjin/rest/data/datasources/Jingjin/datasets.json
```

## 3. 数据集

### 3.1 京津冀数据源（Jingjin）

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

### 3.2 长春数据源（Changchun）

| 数据集 | 说明 |
|--------|------|
| `RoadNet` | 道路网络 |
| `POI` | 兴趣点 |

## 4. 空间查询模式

| 模式 | 说明 |
|------|------|
| `INTERSECT` | 相交（有公共部分即返回） |
| `CONTAIN` | 完全包含 |
| `WITHIN` | 被包含 |
| `DISJOINT` | 相离 |
| `BUFFER` | 缓冲区范围内 |

## 5. 代码位置

| 文件 | 路径 |
|------|------|
| iServer 客户端 | `agent-backend/app/services/iserver_client.py` |
| 前端调用 | `frontend/src/components/SpatialQuery.vue` |
