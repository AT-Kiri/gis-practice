## Context

空间查询模块是项目概要中六大功能模块的第二个模块，构建在已完成的地图容器和基础交互之上。用户需要能够在地图上通过绘制几何形状来查询感兴趣区域内的地物要素，以支持防灾应急场景中的快速信息获取。

## Goals / Non-Goals

**Goals:**
- 提供三种空间查询绘制模式：点选（自动缓冲500m）、矩形框选、圆形框选
- 查询覆盖 Jingjin 数据集中主要的点/线/面要素数据集
- 结果以分页列表 + 地图标绘方式展示
- 点击结果项或地图要素可查看完整属性信息
- 查询结果可一键清除

**Non-Goals:**
- 不实现自定义缓冲距离（固定500m）
- 不实现多边形（手绘）选择（后续可扩展）
- 不涉及空间分析（如缓冲区分析属于模块4）
- 不实现属性条件过滤（后续可扩展）

## Decisions

### 1. 前端架构

```
SpatialQuery.vue
├── 绘制工具栏（点选/矩形/圆形/清除按钮）
├── 所选几何图形（MapboxGL GeoJSON source + layer）
├── 查询结果数据源（独立 MapboxGL source + layer）
├── 查询结果面板（分页列表）
└── 属性弹窗（Popup）
```

### 2. 绘制交互设计

| 模式 | 交互方式 | 查询几何 |
|---|---|---|
| 点选 | 单击地图 → 获取坐标 → 构建500m缓冲圆 | Polygon（圆近似） |
| 矩形 | mousedown 开始 → mousemove 拖拽 → mouseup 确定 | Polygon（矩形） |
| 圆形 | 单击设圆心 → 再次单击设半径 | Polygon（圆近似，32边形） |

### 3. iServer 查询策略

前端将绘制几何（GeoJSON）发给后端，后端通过 HTTP 请求 iServer 数据服务的 `POST /datasets/{name}/features` 接口进行空间查询，再返回统一格式的结果。

后端代理查询的优势：
- 避免前端直接暴露多个 iServer 数据服务 URL
- 统一结果格式（数据集名称 + 属性字段映射）
- 便于后续添加缓存、分页优化

### 4. 数据映射

Jingjin 数据集中可用的属性字段：

| 数据集 | 关键属性字段 |
|---|---|
| County_P | SMID, NAME, 省名称(ProvinceName), 面积 |
| Town_P | SMID, NAME, 所属区县 |
| Road_L | SMID, NAME, ROAD_CLASS, LENGTH |
| Railway_L | SMID, NAME, 类型 |
| River_L | SMID, NAME, LENGTH |
| Lake_R | SMID, NAME, AREA |
| Landuse_R | SMID, 类型, AREA |
| Geomor_R | SMID, 类型, AREA |
| Coastline_L | SMID, NAME, LENGTH |

### 5. 结果展示设计

- **结果面板**：右侧抽屉式面板，顶部显示总记录数和查询范围描述，中部为分页结果列表，每项显示名称+数据集来源+关键属性
- **地图标绘**：点用蓝色圆形 Marker，线用蓝色实线（3px），面用半透明蓝色填充
- **交互响应**：鼠标悬停结果项 → 对应要素高亮；点击结果项 → 地图 flyTo 定位 + 弹出属性 Popup

## Risks / Trade-offs

| 风险 | 缓解措施 |
|---|---|
| `data-jingjin` 数据服务未发布 | 后端代码支持配置服务名，可降级使用 spatialanalyst 接口 |
| iServer 空间查询性能慢（多数据集顺序请求） | 使用 `Promise.all` 并发查询，前端显示加载状态 |
| 某些数据集无名称字段 | 结果项显示"未命名要素" + SMID，不崩溃 |
