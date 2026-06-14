## Why

在京津冀综合防灾应急管理场景中，快速定位和查询特定区域内的应急资源、受灾区域、关键设施是核心需求。例如：

* 洪水淹没范围内有哪些村庄、道路、医院？

* 地震影响区域内的学校、避难所分布？

* 指定点周围最近的应急物资储备点？

空间查询功能为这些场景提供基础能力——用户可通过绘制点、矩形、圆形三种方式选择感兴趣区域，系统查询该区域内的 POI 和地物要素，并以列表和地图标绘两种方式呈现结果。

## What Changes

* 新增 `SpatialQuery.vue` 空间查询交互组件（绘制工具栏 + 结果面板）

* 新增 `spatial-query` 后端模块，代理 iServer 空间查询 REST API

* 在 `SmMapViewer.vue` 中集成空间查询组件

* 查询数据覆盖：`County_P`（县级市）、`Town_P`（乡镇）、`Road_L`（道路）、`Railway_L`（铁路）、`River_L`（河流）、`Lake_R`（湖泊）、`Landuse_R`（土地利用）等 Jingjin 数据集

## Capabilities

### New Capabilities

* `spatial-query`: 空间查询功能模块，支持三种绘制模式（点选/矩形框选/圆形框选），查询结果以分页列表 + 地图标绘展示，支持点击查看属性详情

### Modified Capabilities

* `map-viewer`: 集成空间查询组件到主地图视图

## Impact

* 新增前端文件：`SpatialQuery.vue`

* 新增后端文件：`SpatialQueryController.java`、`SpatialQueryService.java`

* 新增 iServer 数据服务依赖：`data-jingjin`（需确认已发布）

