---
title: 预警信息视图 WarnInfoView
type: view
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [view, warn-info, form, database]

references:
  - pages/entities/warn-info.md
  - pages/apis/warn-info.md

related:
  - pages/views/coord-response-view.md
  - pages/views/supply-dispatch-view.md

source:
  - frontend/src/views/WarnInfoView.vue

summary: 气象灾害预警信息录入页面，提供表单录入和列表展示
---

# 预警信息视图 WarnInfoView

## 1. 页面概述

气象灾害预警信息录入页面，提供表单录入和列表展示，对应 `tb_warn_info` 表。

## 2. 功能

- 表单录入：预警编号、区域编码、灾害类型、预警等级、实时气象、风险分值等
- 列表展示：已有预警记录
- 提交保存：调用后端 API

## 3. 代码位置

| 文件 | 路径 |
|------|------|
| 预警信息视图 | `frontend/src/views/WarnInfoView.vue` |
