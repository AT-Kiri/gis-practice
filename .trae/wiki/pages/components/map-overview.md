---
title: 鹰眼视图 MapOverview
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references: []
related:
  - pages/components/map-toolbar.md
  - pages/components/nav-sidebar.md
source:
  - frontend/src/components/MapOverview.vue
summary: 鹰眼视图（小地图），显示主地图在全球范围内的位置矩形
---

# 鹰眼视图 MapOverview

## 1. 组件概述

鹰眼视图（小地图），显示主地图在全球范围内的位置矩形，帮助用户了解当前视图在全局的位置。

## 2. Props

| Prop | 类型 | 说明 |
|------|------|------|
| `visible` | `Boolean` | 是否显示鹰眼 |

## 3. 功能

- 显示世界底图
- 同步主地图视图范围矩形
- 支持拖拽矩形改变主地图视图

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 鹰眼视图 | `frontend/src/components/MapOverview.vue` |
