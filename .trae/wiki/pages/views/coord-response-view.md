---
title: 协同叫应视图 CoordResponseView
type: view
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [view, coord-response, form, database]

references:
  - pages/entities/coord-response.md
  - pages/apis/coord-response.md

related:
  - pages/views/warn-info-view.md
  - pages/views/supply-dispatch-view.md

source:
  - frontend/src/views/CoordResponseView.vue

summary: 协同叫应处置录入页面，提供表单录入和列表展示
---

# 协同叫应视图 CoordResponseView

## 1. 页面概述

协同叫应处置录入页面，提供表单录入和列表展示，对应 `tb_coord_response` 表。

## 2. 功能

- 表单录入：处置记录编号、预警编号、联动区域、责任人、联系电话、叫应方式、应答状态等
- 列表展示：已有处置记录
- 提交保存：调用后端 API

## 3. 代码位置

| 文件 | 路径 |
|------|------|
| 协同叫应视图 | `frontend/src/views/CoordResponseView.vue` |
