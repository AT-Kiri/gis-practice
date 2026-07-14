---
title: 洪涝模拟视图 FloodSimulationView
type: view
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [view, flood, cesium, 3d, simulation]

references: []
related:
  - pages/views/home-view.md
  - pages/views/new-big-screen-view.md

source:
  - frontend/src/views/FloodSimulationView.vue

summary: 三维洪水模拟页面，基于 Cesium 实现积石山地区洪水淹没模拟
---

# 洪涝模拟视图 FloodSimulationView

## 1. 页面概述

三维洪水模拟页面，基于 Cesium 实现积石山地区洪水淹没模拟。

## 2. 功能

- 3D 场景展示（Cesium）
- 洪水淹没模拟：
  - 淹没高度调节（10-500m）
  - 速度调节（1-100m/s）
  - 开始/暂停/重置
- 实时统计：
  - 模拟时间
  - 当前水位
  - 淹没房屋/道路数量

## 3. 代码位置

| 文件 | 路径 |
|------|------|
| 洪涝模拟视图 | `frontend/src/views/FloodSimulationView.vue` |
