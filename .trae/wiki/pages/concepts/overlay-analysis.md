---
title: 叠置分析
type: concept
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: []
references:
  - pages/components/spatial-analysis.md
related:
  - concepts/buffer-analysis.md
  - concepts/spatial-query.md
source:
  - frontend/src/components/SpatialAnalysis.vue
summary: 叠置分析是将多个空间数据层进行叠加，分析其空间关系和属性关系
---

# 叠置分析

## 1. 定义

叠置分析（Overlay Analysis）是将**多个空间数据层**进行叠加，分析其空间关系和属性关系。

## 2. 叠置类型

| 类型 | 说明 |
|------|------|
| **Intersect（相交）** | 保留两个图层的公共部分 |
| **Union（合并）** | 合并两个图层的所有区域 |
| **Erase（擦除）** | 从目标图层中擦除源图层区域 |
| **Identity（标识）** | 用源图层边界切割目标图层 |

## 3. 项目中的应用

项目中的叠置分析主要用于**土地利用叠置**：
- 将不同年份的土地利用数据叠加
- 分析土地利用变化情况
- 结果以专题图形式展示

## 4. 相关概念

- [[pages/concepts/buffer-analysis]] — 缓冲区分析
- [[pages/concepts/spatial-query]] — 空间查询
