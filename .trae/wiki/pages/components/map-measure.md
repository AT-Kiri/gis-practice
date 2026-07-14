---
title: 地图量算 MapMeasure
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references: []
related:
  - pages/components/map-toolbar.md
  - pages/components/spatial-query.md
source:
  - frontend/src/components/MapMeasure.vue
summary: 地图量算工具，提供距离和面积量算功能
---

# 地图量算 MapMeasure

## 1. 组件概述

地图量算工具，提供距离量算和面积量算功能，用户可在地图上采集点进行测量。

## 2. 功能

| 模式 | 说明 |
|------|------|
| 距离量算 | 采集点，显示累计距离 |
| 面积量算 | 采集点，显示多边形面积 |
| 清除 | 清除所有标注 |

## 3. 图层命名

- `measure-main`：测量结果图层（线/面）
- `measure-preview`：鼠标跟随预览线

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 地图量算 | `frontend/src/components/MapMeasure.vue` |
