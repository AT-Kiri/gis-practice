---
title: 图层管理器 LayerManager
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references: []
related:
  - pages/components/nav-sidebar.md
  - pages/components/map-toolbar.md
source:
  - frontend/src/components/LayerManager.vue
summary: 图层管理器，控制地图图层的可见性和透明度
---

# 图层管理器 LayerManager

## 1. 组件概述

图层管理器，以抽屉面板形式展示，允许用户控制地图图层的可见性和透明度。

## 2. Props

| Prop | 类型 | 说明 |
|------|------|------|
| `visible` | `Boolean` | 面板是否显示 |

## 3. 功能

- 显示图层列表（底图 + 覆盖层）
- 切换图层可见性（复选框）
- 调整图层透明度（0-100% 滑条）

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 图层管理器 | `frontend/src/components/LayerManager.vue` |
