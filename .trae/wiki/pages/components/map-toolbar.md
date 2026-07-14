---
title: 地图工具栏 MapToolbar
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references: []
related:
  - pages/components/nav-sidebar.md
  - pages/components/map-overview.md
source:
  - frontend/src/components/MapToolbar.vue
summary: 地图操作工具条，提供缩放和全幅显示功能
---

# 地图工具栏 MapToolbar

## 1. 组件概述

悬浮在地图左上角的工具条，提供缩放和全幅显示功能。

## 2. 功能

| 按钮 | 操作 |
|------|------|
| 放大 | `map.zoomIn()` |
| 缩小 | `map.zoomOut()` |
| 全幅显示 | `map.flyTo([116.4, 39.9], zoom: 8)` |

## 3. 代码位置

| 文件 | 路径 |
|------|------|
| 地图工具栏 | `frontend/src/components/MapToolbar.vue` |
