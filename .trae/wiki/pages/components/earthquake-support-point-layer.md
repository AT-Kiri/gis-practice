---
title: 支撑点图层 SupportPointLayer
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, earthquake, support, supply, layer]

references:
  - pages/components/dashboard-buffer-analysis-modal.md
  - pages/views/data-dashboard-view.md

related:
  - pages/components/earthquake-buffer-zone-layer.md
  - pages/components/earthquake-rescue-dispatch-panel.md
  - pages/flows/buffer-analysis.md

source:
  - frontend/src/components/earthquake/SupportPointLayer.vue

summary: 支援点/物资点/已损毁点图层组件，渲染 4 类要素
---

# 支撑点图层 SupportPointLayer

## 1. 组件概述

支援点/物资点/已损毁点图层组件，在 MapboxGL 地图上渲染 4 类要素：
- **受灾点**（红色大圆）：z-order 最高
- **支援点**（5 类图标）：消防/医院/物资库/避难场所/应急管理
- **物资点**（4 类图标）：粮油店/超市/药店/加油站
- **已损毁点**（灰显）：opacity=0.4，最下层

## 2. Props

| Prop | 类型 | 说明 |
|------|------|------|
| `map` | `Object` | MapboxGL 地图实例 |
| `supportPoints` | `Array` | 支援点数组 |
| `supplyPoints` | `Array` | 物资点数组 |
| `damagedPoints` | `Array` | 已损毁点数组 |
| `disasterCenter` | `Array` | 受灾点坐标 |

## 3. 交互

- 点击支援点/物资点 → popup 显示名称、类型、距离、物资列表
- 鼠标悬停 → 光标切换为 pointer

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 支撑点图层 | `frontend/src/components/earthquake/SupportPointLayer.vue` |
