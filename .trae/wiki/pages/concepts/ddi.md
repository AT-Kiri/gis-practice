---
title: DDI 综合灾害指数
type: concept
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [concept, ddi, disaster, assessment]

references:
  - pages/flows/buffer-analysis.md
  - pages/components/dashboard-disaster-detail-panel.md
  - pages/views/data-dashboard-view.md

related:
  - concepts/buffer-analysis.md

source:
  - frontend/src/utils/earthquakeAhp.js
  - frontend/src/components/dashboard/DisasterDetailPanel.vue

summary: DDI（Disaster Damage Index）综合灾害指数，基于 AHP 熵权法的多指标综合评估模型
---

# DDI 综合灾害指数

## 1. 定义

DDI（Disaster Damage Index）综合灾害指数，是基于 **AHP 熵权法**的多指标综合评估模型，用于量化地震灾害的严重程度。

## 2. 评估指标体系

项目使用 **8 项指标**进行综合评估：

| 指标 | 代码 | 说明 |
|------|------|------|
| 震级 | `magnitude` | 地震释放能量 |
| 震源深度 | `depth` | 震源到地表的距离 |
| 受灾人口 | `affected_people` | 受影响人口数量 |
| 房屋倒塌 | `house_collapse` | 倒塌房屋数量 |
| 道路损毁 | `road_damage` | 损毁道路长度 |
| 通信中断 | `communication_outage` | 中断基站数量 |
| 电力中断 | `power_outage` | 停电用户数量 |
| 救援难度 | `rescue_difficulty` | 地形、交通等综合评估 |

## 3. 灾害等级划分

| 等级 | DDI 范围 | 颜色 | 说明 |
|------|---------|------|------|
| 1 级（特别重大） | DDI ≥ 8.0 | 🔴 红色 | 需国家级响应 |
| 2 级（重大） | 6.0 ≤ DDI < 8.0 | 🟠 橙色 | 需省级响应 |
| 3 级（较大） | 4.0 ≤ DDI < 6.0 | 🟡 黄色 | 需市级响应 |
| 4 级（一般） | DDI < 4.0 | 🟢 绿色 | 需县级响应 |

## 4. 缓冲区配置

DDI 等级决定缓冲区半径：

| 等级 | 内圈半径 | 外圈半径 |
|------|---------|---------|
| 1 级 | 5 km | 10 km |
| 2 级 | 3 km | 6 km |
| 3 级 | 2 km | 4 km |
| 4 级 | 1 km | 2 km |

## 5. 相关概念

- [[pages/concepts/buffer-analysis]] — 缓冲区分析
