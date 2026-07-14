---
title: iServer 客户端服务
type: service
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, service, iserver, client, http]

references:
  - apis/iserver-feature-results.md
  - apis/iserver-buffer.md
  - apis/iserver-network-analyst.md
  - apis/iserver-overlay.md

related:
  - tools/gis-tools.md

source:
  - agent-backend/app/services/iserver_client.py

summary: iServer REST API 统一客户端封装，提供数据查询、空间分析、网络分析等能力
---

# iServer 客户端服务

## 1. 概述

iServer REST API 统一客户端封装，直接调用 SuperMap iServer REST API，不依赖 SuperMap Python SDK。

## 2. 功能

### 2.1 数据查询

| 方法 | 说明 |
|------|------|
| `post_feature_results(body)` | 京津冀数据源查询 |
| `post_changchun_feature_results(body)` | 长春数据源查询 |
| `get_datasets()` | 获取数据集列表 |

### 2.2 空间分析

| 方法 | 说明 |
|------|------|
| `geometry_buffer(geometry, distance)` | 几何缓冲区分析 |
| `dataset_overlay(source, operate, operation)` | 数据集叠置分析 |

### 2.3 网络分析

| 方法 | 说明 |
|------|------|
| `find_path(nodes, weight_field)` | 最短路径分析 |
| `find_service_areas(centers, weights, weight_field)` | 服务区分析 |

### 2.4 坐标转换

| 函数 | 说明 |
|------|------|
| `changchun_to_wgs84(x, y)` | 长春平面坐标 → WGS84 |
| `wgs84_to_changchun(lng, lat)` | WGS84 → 长春平面坐标 |
| `convert_changchun_geometry(geo)` | 转换 GeoJSON 坐标 |

## 3. 数据源配置

| 数据源 | 用途 |
|--------|------|
| `Jingjin` | 京津冀数据（空间查询） |
| `Changchun` | 长春数据（网络分析） |

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| iServer 客户端 | `agent-backend/app/services/iserver_client.py` |
| GIS 工具层 | `agent-backend/app/tools/gis_tools.py` |
