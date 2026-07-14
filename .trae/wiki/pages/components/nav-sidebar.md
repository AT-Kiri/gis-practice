---
title: 导航侧栏 NavSidebar
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, layout, navigation]

references: []
related:
  - pages/components/map-toolbar.md
  - pages/components/layer-manager.md

source:
  - frontend/src/components/NavSidebar.vue

summary: 左侧导航侧栏，提供各功能模块的入口
---

# 导航侧栏 NavSidebar

## 1. 组件概述

左侧导航侧栏，以图标按钮形式提供各功能模块的入口，包括：
- GIS 功能模块（空间查询、量算、专题检索等）
- 数据库表格模块（协同叫应、预警信息、物资调度）
- 图层管理器入口

## 2. Props

| Prop | 类型 | 说明 |
|------|------|------|
| `activeKey` | `String` | 当前激活的菜单项 |
| `collapsed` | `Boolean` | 侧栏是否收起 |

## 3. 菜单项分组

| 分组 | 菜单项 |
|------|--------|
| GIS 功能 | 空间查询、量算、专题检索、空间分析、网络分析、鹰眼 |
| 数据库 | 协同叫应、预警信息、物资调度 |
| 工具 | 图层管理器 |

## 4. 事件

| 事件 | 说明 |
|------|------|
| `update:activeKey` | 菜单项切换 |
| `toggleCollapse` | 收起侧栏 |

## 5. 代码位置

| 文件 | 路径 |
|------|------|
| 导航侧栏 | `frontend/src/components/NavSidebar.vue` |
