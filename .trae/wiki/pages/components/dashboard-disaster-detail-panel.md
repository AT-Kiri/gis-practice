---
title: 灾害详情面板 DisasterDetailPanel
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, dashboard, earthquake, assessment]

references:
  - pages/views/data-dashboard-view.md
  - pages/components/dashboard-buffer-analysis-modal.md

related:
  - pages/components/dashboard-dashboard-map.md
  - pages/components/dashboard-weather-panel.md

source:
  - frontend/src/components/dashboard/DisasterDetailPanel.vue

summary: 灾情评估详情面板，提供 8 项灾情指标录入和 DDI 综合评估
---

# 灾害详情面板 DisasterDetailPanel

## 1. 组件概述

灾情评估详情面板，提供 8 项灾情指标录入和 DDI 综合评估，支持重新评估。

## 2. Props

| Prop | 类型 | 说明 |
|------|------|------|
| `selectedCounty` | `String` | 选中的县 |
| `disasterData` | `Object` | 灾害数据 |
| `supportPoints` | `Array` | 支援点数组 |
| `disasterCenter` | `Array` | 受灾点坐标 |

## 3. 功能

### 3.1 灾情信息概览

- 灾害类型、初始等级、初始 DDI

### 3.2 8 项指标录入

分组录入灾情指标，支持 `a-input-number` 输入。

### 3.3 重新评估

根据录入的指标重新计算 DDI 和灾害等级。

## 4. 事件

| 事件 | 说明 |
|------|------|
| `reassess` | 重新评估 |
| `start-rescue` | 启动救援 |

## 5. 代码位置

| 文件 | 路径 |
|------|------|
| 灾害详情面板 | `frontend/src/components/dashboard/DisasterDetailPanel.vue` |
