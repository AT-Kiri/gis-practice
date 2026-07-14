---
title: 要素搜索 FeatureSearch
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references: []
related:
  - pages/components/spatial-query.md
  - pages/components/spatial-analysis.md
source:
  - frontend/src/components/FeatureSearch.vue
summary: 专题检索面板，支持关键字搜索和行政级别分级检索
---

# 要素搜索 FeatureSearch

## 1. 组件概述

专题检索面板，支持关键字搜索京津冀地区地物，可按行政级别（省/县/乡）分级过滤。

## 2. 功能

- 关键字搜索地物
- 行政级别过滤：全部/省级/县级/乡镇
- 结果分页列表
- 鼠标悬停高亮 + 点击聚焦

## 3. 事件

| 事件 | 说明 |
|------|------|
| `close` | 关闭面板 |

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 要素搜索 | `frontend/src/components/FeatureSearch.vue` |
