## 1. 后端空间查询接口

- [x] 1.1 创建 `SpatialQueryController.java`，暴露 `POST /api/spatial/query` 接口
- [x] 1.2 创建 `SpatialQueryService.java`，封装调用 iServer 数据服务 REST API
- [x] 1.3 实现多数据集并发查询（`County_P`, `Town_P`, `Road_L`, `Railway_L`, `River_L`, `Lake_R`, `Landuse_R`, `Geomor_R`, `Coastline_L`）
- [x] 1.4 统一结果格式：`{ dataset, features: [{ geometry, properties }] }`
- [x] 1.5 配置 iServer 数据服务地址（`application.yml`）

## 2. 前端绘制工具栏

- [x] 2.1 创建 `SpatialQuery.vue` 组件，含点选/矩形/圆形/清除四个按钮
- [x] 2.2 实现点选模式（单击取点 → 自动构建500m缓冲区圆 → 触发查询）
- [x] 2.3 实现矩形框选模式（mousedown/mousemove/mouseup 绘制矩形 → 触发查询）
- [x] 2.4 实现圆形框选模式（单击设圆心 → 再次单击设半径 → 触发查询）
- [x] 2.5 绘制几何图形在地图上可见（GeoJSON source + 半透明填充 layer）
- [x] 2.6 模式互斥（切换时清除上一次的选择图形）

## 3. 前端查询结果展示

- [x] 3.1 调用后端 `/api/spatial/query` 接口发送查询请求
- [x] 3.2 加载状态指示（Spin 组件）
- [x] 3.3 结果面板展示总记录数和数据集统计
- [x] 3.4 分页展示结果列表（每页10条），使用 Ant Design Pagination
- [x] 3.5 每项显示名称 + 数据集来源 + 关键属性

## 4. 前端地图标绘与交互

- [x] 4.1 结果要素地图标绘：点用 Circle layer，线用蓝线 layer，面用蓝色半透明 fill layer
- [x] 4.2 鼠标悬停结果项 → 对应要素高亮（红色高亮层）
- [x] 4.3 点击结果项 → 地图 flyTo + Popup 显示完整属性
- [x] 4.4 点击地图标绘要素 → Popup 显示属性
- [x] 4.5 清除按钮 → 移除所有选择图形 + 标绘 + 清空结果面板

## 5. 集成与验证

- [x] 5.1 将 `SpatialQuery.vue` 集成到 `SmMapViewer.vue`
- [x] 5.2 确认 vite build 通过
- [ ] 5.3 确认后端编译通过（需本地 Maven 环境）
- [ ] 5.4 确认 iServer `data-jingjin` 数据服务已发布
- [ ] 5.5 点选查询功能正常
- [ ] 5.6 矩形框选功能正常
- [ ] 5.7 圆形框选功能正常
- [ ] 5.8 分页和属性弹窗正常
