---
title: iServer 网络分析 API
type: api
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references:
  - pages/concepts/network-analysis.md
  - pages/flows/network-analysis.md
  - pages/components/network-analysis.md
related:
  - apis/iserver-feature-results.md
  - apis/iserver-buffer.md
source:
  - agent-backend/app/services/iserver_client.py
  - frontend/src/components/NetworkAnalysis.vue
summary: SuperMap iServer 网络分析 REST API，提供最短路径和服务区分析
---

# iServer 网络分析 API

## 1. 概述

SuperMap iServer 的**网络分析** REST API，提供最短路径分析和服务区分析能力。

## 2. 路网数据

| 参数 | 值 |
|------|-----|
| 服务地址 | `/iserver/services/transportationanalyst-sample/rest/networkanalyst/RoadNet@Changchun` |
| 数据源 | `RoadNet@Changchun`（长春道路网络） |
| 坐标系 | 长春平面坐标（需转换为 WGS84） |

## 3. 接口列表

### 3.1 最短路径分析

```
GET /iserver/services/transportationanalyst-sample/rest/networkanalyst/RoadNet@Changchun/path.json
```

**参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `nodes` | `String` | 路径点 JSON `[{"x":lng,"y":lat},...]` |
| `parameter` | `String` | 分析参数 JSON |
| `hasLeastEdgeCount` | `String` | 是否最少边数 |

**响应**：

```json
{
  "pathList": [{
    "pathGuideItems": [...],
    "route": {"type": "LINEM", "points": [...], "parts": [...]},
    "weight": 1234.5
  }]
}
```

### 3.2 服务区分析

```
GET /iserver/services/transportationanalyst-sample/rest/networkanalyst/RoadNet@Changchun/serviceareas.json
```

**参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `centers` | `String` | 中心点 JSON `[[x,y]]` |
| `weights` | `String` | 半径 JSON `[500]` |
| `parameter` | `String` | 分析参数 JSON |
| `isAnalyzeById` | `String` | 是否按 ID 分析 |

**响应**：

```json
{
  "serviceAreaList": [{
    "edgeFeatures": {
      "type": "FeatureCollection",
      "features": [...]
    }
  }]
}
```

## 4. 坐标转换

网络分析使用**长春平面坐标**，需要转换：

```python
# WGS84 → 长春平面
def wgs84_to_changchun(lng, lat):
    x = (lng - 125.15) / (125.45 - 125.15) * (8958.0372 - 47.5066) + 47.5066
    y = (lat - 43.74185) / (43.99815 - 43.74185) * (-54.7406 - (-7668.9829)) + (-7668.9829)
    return x, y

# 长春平面 → WGS84
def changchun_to_wgs84(x, y):
    lng = (x - 47.5066) / (8958.0372 - 47.5066) * (125.45 - 125.15) + 125.15
    lat = (y - (-7668.9829)) / (-54.7406 - (-7668.9829)) * (43.99815 - 43.74185) + 43.74185
    return lng, lat
```

## 5. 代码位置

| 文件 | 路径 |
|------|------|
| iServer 客户端 | `agent-backend/app/services/iserver_client.py` |
| 前端调用 | `frontend/src/components/NetworkAnalysis.vue` |
