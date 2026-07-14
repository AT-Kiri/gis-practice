---
title: 地震指挥视图 EarthquakeCommandView
type: view
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [view, earthquake, command, big-screen]

references: []
related:
  - pages/views/data-dashboard-view.md
  - pages/flows/buffer-analysis.md

source:
  - frontend/src/views/EarthquakeCommandView.vue

summary: 地震指挥视图，展示震情信息、组织层级和跨区域联动
---

# 地震指挥视图 EarthquakeCommandView

## 1. 页面概述

地震指挥视图，展示震情信息、组织层级和跨区域联动。

## 2. 功能

- 震情信息展示：区域、震级、时间、位置、应急等级
- 视图切换：多视图切换
- 滚动预警信息：盲区预警、未应答、物资缺口、道路阻断
- 三地联合会商按钮
- 组织层级树

## 3. 代码位置

| 文件 | 路径 |
|------|------|
| 地震指挥视图 | `frontend/src/views/EarthquakeCommandView.vue` |
