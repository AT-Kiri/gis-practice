---
title: 仪表盘地图 DashboardMap
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, dashboard, earthquake, map]

references:
  - pages/views/data-dashboard-view.md

related:
  - pages/components/dashboard-buffer-analysis-modal.md
  - pages/components/dashboard-disaster-detail-panel.md

source:
  - frontend/src/components/dashboard/DashboardMap.vue
  - frontend/src/utils/mockData.js

summary: 数据大屏分级地图交互组件，渲染县级灾害等级点标记
---

# 仪表盘地图 DashboardMap

## 1. 组件概述

数据大屏分级地图交互组件，使用 `COUNTY_COORDS` 点标记 + 灾害等级着色，不依赖 iServer。

## 2. Props

| Prop | 类型 | 说明 |
|------|------|------|
| `map` | `Object` | MapboxGL 地图实例 |
| `disasterData` | `Object` | 各县灾害数据 |

## 3. 灾害等级颜色

| 等级 | 颜色 |
|------|------|
| 1（特别重大） | #e53e3e 红 |
| 2（重大） | #dd6b20 橙 |
| 3（较大） | #d69e2e 黄 |
| 4（一般） | #38a169 绿 |

## 4. 事件

| 事件 | 说明 |
|------|------|
| `select-county` | 选中县 |

## 5. 代码位置

| 文件 | 路径 |
|------|------|
| 仪表盘地图 | `frontend/src/components/dashboard/DashboardMap.vue` |
| 模拟数据 | `frontend/src/utils/mockData.js` |
