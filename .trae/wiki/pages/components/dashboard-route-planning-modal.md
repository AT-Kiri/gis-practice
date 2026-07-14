---
title: 路线规划弹窗 RoutePlanningModal
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, dashboard, rescue, route]

references:
  - pages/views/data-dashboard-view.md
  - pages/components/earthquake-rescue-dispatch-panel.md

related:
  - pages/components/dashboard-buffer-analysis-modal.md
  - pages/flows/buffer-analysis.md

source:
  - frontend/src/components/dashboard/RoutePlanningModal.vue

summary: 5 步救援调度弹窗，集成 RescueDispatchPanel 组件
---

# 路线规划弹窗 RoutePlanningModal

## 1. 组件概述

5 步救援调度弹窗，集成 `RescueDispatchPanel` 组件，实现地震救援的顺序调度流程。

## 2. Props

| Prop | 类型 | 说明 |
|------|------|------|
| `visible` | `Boolean` | 弹窗显隐 |
| `map` | `Object` | MapboxGL 地图实例 |
| `disasterData` | `Object` | 灾情数据 |
| `supportPoints` | `Array` | 支援点数组 |
| `disasterCenter` | `Array` | 受灾点坐标 |

## 3. 功能

- 弹窗打开时自动聚焦视角到受灾点（zoom=13）
- 自动启动 5 步调度
- 调度中按钮 disabled
- 组件卸载时清理所有定时器

## 4. 事件

| 事件 | 说明 |
|------|------|
| `update:visible` | 弹窗显隐变化 |
| `dispatch-complete` | 调度完成 |

## 5. 代码位置

| 文件 | 路径 |
|------|------|
| 路线规划弹窗 | `frontend/src/components/dashboard/RoutePlanningModal.vue` |
| 救援调度面板 | `frontend/src/components/earthquake/RescueDispatchPanel.vue` |
