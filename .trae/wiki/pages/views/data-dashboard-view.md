---
title: 数据仪表盘
type: view
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [view, dashboard, monitor, warning, response]

references:
  - pages/components/dashboard-dashboard-map.md
  - pages/components/dashboard-weather-panel.md
  - pages/views/warn-info-view.md
  - pages/views/coord-response-view.md
  - pages/views/supply-dispatch-view.md

source:
  - frontend/src/views/DataDashboardView.vue

summary: 监测-预警-联动主页，包含气象预警、协同叫应、物资调度、数据看板四大板块
---

# 数据仪表盘

## 1. 定位

监测-预警-联动模块的主页容器，整合了：
- **气象预警**：实时预警信息 WeatherPanel 卡片
- **协同叫应**：叫应处置记录 CoordResponseView 区块
- **物资调度**：应急物资调度 SupplyDispatchView 区块
- **数据看板**：可视化统计 DashboardDashboardMap 卡片

## 2. 页面布局

```
┌──────────────────────────────────────────────┐
│  顶部栏：时间 | 预警数量 | 系统状态           │
├──────────────────────────────────────────────┤
│  预警信息卡片 │ 预警列表 │ 叫应处置          │
├──────────────────────────────────────────────┤
│  数据看板地图 │ 物资调度 │ 区域统计          │
└──────────────────────────────────────────────┘
```

## 3. 交互流程

- 加载时自动获取最新预警列表
- 预警卡片按灾害类型/等级颜色编码
- 点击预警卡片可查看详情并跳转至 warn-info-view
- 物资调度支持按状态筛选

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 页面 | `frontend/src/views/DataDashboardView.vue` |
| 地图组件 | `frontend/src/components/dashboard/DashboardDashboardMap.vue` |
| 天气面板 | `frontend/src/components/dashboard/WeatherPanel.vue` |
