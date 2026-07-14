---
title: 空间分析 SpatialAnalysis
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references: []
related:
  - pages/components/spatial-query.md
  - pages/components/feature-search.md
  - pages/flows/buffer-analysis.md
source:
  - frontend/src/components/SpatialAnalysis.vue
summary: 空间分析面板，提供缓冲区分析和叠置分析功能
---

# 空间分析 SpatialAnalysis

## 1. 组件概述

空间分析面板，提供两种分析模式：
- **缓冲区分析**：绘制点/线/面，设置半径生成缓冲区
- **叠置分析**：图层叠加分析

## 2. 功能

### 2.1 缓冲区分析

| 步骤 | 操作 |
|------|------|
| ① | 绘制分析对象（点/线/面） |
| ② | 设置缓冲区半径（10-5000 米） |
| ③ | 执行分析 |

### 2.2 叠置分析

图层叠加分析（土地利用叠置等）。

## 3. 事件

| 事件 | 说明 |
|------|------|
| `close` | 关闭面板 |

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 空间分析 | `frontend/src/components/SpatialAnalysis.vue` |
