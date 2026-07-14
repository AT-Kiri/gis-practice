---
title: 天气面板 WeatherPanel
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, dashboard, weather]

references:
  - pages/views/data-dashboard-view.md

related:
  - pages/components/dashboard-disaster-detail-panel.md

source:
  - frontend/src/components/dashboard/WeatherPanel.vue

summary: 气象灾害监控面板，展示气象数据表格和风险等级
---

# 天气面板 WeatherPanel

## 1. 组件概述

气象灾害监控面板，展示气象数据表格和风险等级，支持超阈值标红警示。

## 2. Props

| Prop | 类型 | 说明 |
|------|------|------|
| `weatherData` | `Array` | 气象数据数组 |

## 3. 功能

- 气象数据表格展示
- 风险等级标签着色
- 超阈值标红警示：
  - 降雨量 > 100mm
  - 风力 ≥ 10 级
  - 地震烈度 ≥ 5
- 天气预报展开查看

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 天气面板 | `frontend/src/components/dashboard/WeatherPanel.vue` |
