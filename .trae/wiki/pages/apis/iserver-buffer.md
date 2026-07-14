---
title: iServer 缓冲区分析 API
type: api
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references:
  - pages/concepts/buffer-analysis.md
  - pages/flows/buffer-analysis.md
  - pages/components/spatial-analysis.md
related:
  - apis/iserver-feature-results.md
  - apis/iserver-network-analyst.md
source:
  - agent-backend/app/services/iserver_client.py
  - frontend/src/components/SpatialAnalysis.vue
summary: SuperMap iServer 几何缓冲区分析 REST API
---

# iServer 缓冲区分析 API

## 1. 概述

SuperMap iServer 的**几何缓冲区分析** REST API，对点/线/面几何对象按指定距离向外扩展生成缓冲区多边形。

## 2. 接口

```
POST /iserver/services/spatialanalyst-sample/restjsr/spatialanalyst/geometry/buffer.json?returnContent=true
```

## 3. 请求参数

```json
{
  "sourceGeometry": {
    "type": "POINT",
    "points": [{"x": 116.4, "y": 39.9}]
  },
  "analystParameter": {
    "endType": "ROUND",
    "leftDistance": {"value": 0.0045},
    "rightDistance": {"value": 0.0045},
    "semicircleLineSegment": 10
  }
}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `sourceGeometry` | `Object` | 源几何对象（POINT/LINE/REGION） |
| `analystParameter.endType` | `String` | 端点类型：`ROUND`（圆头）/ `FLAT`（平头） |
| `analystParameter.leftDistance` | `Object` | 左侧距离（度） |
| `analystParameter.rightDistance` | `Object` | 右侧距离（度） |
| `analystParameter.semicircleLineSegment` | `Number` | 圆弧线段数 |

## 4. 距离单位转换

API 使用**度**作为距离单位，需要将米转换为度：

```python
def meters_to_degrees(meters, lat=39.9):
    return meters / (111320 * math.cos(math.radians(lat)))
```

## 5. 响应格式

```json
{
  "resultGeometry": {
    "type": "REGION",
    "points": [{"x": 116.4045, "y": 39.9}, ...],
    "parts": [65]
  }
}
```

## 6. 代码位置

| 文件 | 路径 |
|------|------|
| iServer 客户端 | `agent-backend/app/services/iserver_client.py` |
| 前端调用 | `frontend/src/components/SpatialAnalysis.vue` |
