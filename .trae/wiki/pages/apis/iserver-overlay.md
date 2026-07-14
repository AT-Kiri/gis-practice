---
title: iServer 叠置分析 API
type: api
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [api, iserver, rest, overlay, spatial-analysis]

references:
  - concepts/overlay-analysis.md
  - components/spatial-analysis.md

related:
  - apis/iserver-feature-results.md
  - apis/iserver-buffer.md

source:
  - agent-backend/app/services/iserver_client.py

summary: SuperMap iServer 数据集叠置分析 REST API
---

# iServer 叠置分析 API

## 1. 概述

SuperMap iServer 的**数据集叠置分析** REST API，将两个数据集进行叠加分析（相交、合并、擦除等）。

## 2. 接口

```
POST /iserver/services/spatialanalyst-sample/restjsr/spatialanalyst/datasets/{source_dataset}/overlay.json
```

## 3. 请求参数

```json
{
  "operateDataset": "Jingjin:Landuse_R",
  "operation": "INTERSECT",
  "tolerance": 0,
  "resultSetting": {
    "dataReturnMode": "DATASET_AND_RECORDSET",
    "expectCount": 1000
  }
}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `operateDataset` | `String` | 操作数据集名 |
| `operation` | `String` | 操作类型：`INTERSECT`/`UNION`/`ERASE`/`IDENTITY` |
| `tolerance` | `Number` | 容差（度） |
| `resultSetting.dataReturnMode` | `String` | 返回模式 |
| `resultSetting.expectCount` | `Number` | 期望返回数量 |

## 4. 操作类型

| 操作 | 说明 |
|------|------|
| `INTERSECT` | 相交（保留公共部分） |
| `UNION` | 合并（所有区域） |
| `ERASE` | 擦除（从源中擦除操作区） |
| `IDENTITY` | 标识（用操作区边界切割源） |

## 5. 代码位置

| 文件 | 路径 |
|------|------|
| iServer 客户端 | `agent-backend/app/services/iserver_client.py` |
