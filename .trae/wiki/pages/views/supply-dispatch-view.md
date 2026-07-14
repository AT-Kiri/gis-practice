---
title: 物资调度视图 SupplyDispatchView
type: view
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [view, supply-dispatch, form, database]

references:
  - pages/entities/supply-dispatch.md
  - pages/apis/supply-dispatch.md

related:
  - pages/views/coord-response-view.md
  - pages/views/warn-info-view.md

source:
  - frontend/src/views/SupplyDispatchView.vue

summary: 应急物资调度录入页面，提供表单录入和列表展示
---

# 物资调度视图 SupplyDispatchView

## 1. 页面概述

应急物资调度录入页面，提供表单录入和列表展示，对应 `tb_supply_dispatch` 表。

## 2. 功能

- 表单录入：调度单号、预警编号、储备库位置、物资类型、数量、需求区域等
- 列表展示：已有调度记录
- 提交保存：调用后端 API

## 3. 代码位置

| 文件 | 路径 |
|------|------|
| 物资调度视图 | `frontend/src/views/SupplyDispatchView.vue` |
