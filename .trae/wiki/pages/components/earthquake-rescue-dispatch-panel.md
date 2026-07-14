---
title: 救援调度面板 RescueDispatchPanel
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, earthquake, rescue, dispatch]

references:
  - pages/components/dashboard-buffer-analysis-modal.md
  - pages/views/data-dashboard-view.md

related:
  - pages/components/earthquake-buffer-zone-layer.md
  - pages/components/earthquake-support-point-layer.md
  - pages/flows/buffer-analysis.md

source:
  - frontend/src/components/earthquake/RescueDispatchPanel.vue
  - frontend/src/composables/useShortestPath.js

summary: 5 步救援调度面板，实现地震救援的顺序调度流程
---

# 救援调度面板 RescueDispatchPanel

## 1. 组件概述

5 步救援调度面板，实现地震救援的顺序调度流程：

| 步骤 | 操作 | 路径颜色 |
|------|------|---------|
| Step 1 | 应急指令下达 | 无路径 |
| Step 2 | 消防搜救 | 红色 #e53e3e |
| Step 3 | 医疗救治 | 粉色 #d53f8c |
| Step 4 | 物资调拨 | 橙色 #dd6b20 |
| Step 5 | 人员安置 | 绿色 #38a169 |

## 2. Props

| Prop | 类型 | 说明 |
|------|------|------|
| `map` | `Object` | MapboxGL 地图实例 |
| `disasterData` | `Object` | 灾情数据 |
| `supportPoints` | `Array` | 支援点数组 |
| `disasterCenter` | `Array` | 受灾点坐标 |
| `visible` | `Boolean` | 是否显示面板 |

## 3. 功能

- 4 路彩色路径并行显示
- 每步间隔 3 秒
- 单步失败降级处理

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 救援调度面板 | `frontend/src/components/earthquake/RescueDispatchPanel.vue` |
| 最短路径 composable | `frontend/src/composables/useShortestPath.js` |
