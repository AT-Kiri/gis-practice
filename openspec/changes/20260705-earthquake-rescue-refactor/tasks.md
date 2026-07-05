# Tasks — 地震灾害应急救援模块实现清单

> 变更 ID：`20260705-earthquake-rescue-refactor`
> 创建时间：2026-07-05
> 阶段化交付：每阶段独立可验证，前序阶段交付后才进入下一阶段

---

## 阶段 1：AHP-DDI 算法层重构

### T1.1 — 创建 earthquakeAhp.js 核心算法文件
- **优先级**：P0
- **依赖**：无
- **状态**：✅ 已完成
- **文件**：`frontend/src/utils/earthquakeAhp.js`
- **内容**：
  - `WEIGHTS` 常量（8 指标全局权重，来源：ahp-disaster-assessment.md §2.1）
  - `THRESHOLDS` 常量（8 指标阈值，来源：ahp-disaster-assessment.md §5）
  - `normalize(raw, min, max)` 函数（极值标准化到 0~100）
  - `calculateDDI(data)` 函数（计算灾情综合指数）
  - `getDisasterLevel(ddi)` 函数（输出 Ⅰ/Ⅱ/Ⅲ/Ⅳ 等级 + 颜色）
  - `getBufferConfig(ddiLevel)` 函数（输出 4 套缓冲区半径配置）
  - `BUFFER_CONFIG` 常量（4 级配置，来源：earthquake-rescue-design.md §6.5）
- **验证**：
  - 文档示例数据 `{deaths:50, injured:300, missing:10, affected_pop:50000, evacuated:20000, collapsed_houses:3000, damaged_houses:10000, economic_loss:200000}` 计算 DDI
  - 全零数据 → DDI=0
  - 全上限数据 → DDI=100
  - 边界值 DDI=80/60/40 正确分级

### T1.2 — 算法单元测试
- **优先级**：P1
- **依赖**：T1.1
- **状态**：✅ 已完成（69/69 通过）
- **文件**：`frontend/src/utils/__tests__/earthquakeAhp.test.js`
- **内容**：
  - 测试 normalize 的 3 种边界（raw<min / 区间内 / raw>max）
  - 测试 calculateDDI 的文档示例
  - 测试 getDisasterLevel 的 4 个等级区间 + 3 个边界值（80/60/40）
  - 测试 getBufferConfig 的 4 个等级返回值
- **验证**：所有断言通过

---

## 阶段 2：双缓冲区配置层

### T2.1 — 创建 BufferZoneLayer.vue 组件
- **优先级**：P0
- **依赖**：T1.1
- **状态**：✅ 已完成
- **文件**：`frontend/src/components/earthquake/BufferZoneLayer.vue`
- **内容**：
  - Props: `map`, `center` (受灾点坐标), `bufferConfig` (内/外半径+颜色)
  - 渲染两个 GeoJSON Polygon 圆形（64 边近似）
  - 添加 source: `earthquake-buffer-outer-source` / `earthquake-buffer-inner-source`
  - 添加 layer: `earthquake-buffer-outer` (橙色 fill) / `earthquake-buffer-inner` (红色 fill)
  - 外圈先添加（下层），内圈后添加（上层）
  - 提供 `cleanup()` 方法移除旧图层
  - 鼠标悬停在外圈显示："应急支援范围（Xkm）"
  - 鼠标悬停在内圈显示："灾害影响范围（Xkm），设施已损毁"
- **验证**：
  - 地图上出现两个同心圆，外橙内红
  - 内圈遮罩外圈中心
  - 鼠标悬停 tooltip 正确

### T2.2 — 圆形 Polygon 生成工具
- **优先级**：P0
- **依赖**：T1.1
- **状态**：✅ 已完成
- **文件**：`frontend/src/utils/circlePolygon.js`
- **内容**：
  - `createCirclePolygon(center, radiusMeters, segments=64)` 函数
  - 输入：中心点 [lng, lat] + 半径（米）
  - 输出：GeoJSON Polygon（64 边近似圆）
  - 使用 haversine 距离公式计算各点坐标
- **验证**：
  - 半径 2000m 的圆，64 个点，首尾闭合
  - 在地图上渲染为正圆

### T2.3 — haversine 距离工具
- **优先级**：P0
- **依赖**：无
- **状态**：✅ 已完成
- **文件**：`frontend/src/utils/haversine.js`
- **内容**：
  - `haversine(p1, p2)` 函数，输入两个 [lng, lat]，输出米
  - `isInRing(point, center, innerRadius, outerRadius)` 函数（判断点是否在环带内）
  - `isInDamageZone(point, center, innerRadius)` 函数（判断点是否在小缓冲区内）
- **验证**：
  - 北京到天津距离约 120km
  - 同一点距离 = 0

---

## 阶段 3：支援点/物资点生成层

### T3.1 — 创建 earthquakeNaming.js 命名工具
- **优先级**：P0
- **依赖**：无
- **状态**：✅ 已完成（33/33 测试通过）
- **文件**：`frontend/src/utils/earthquakeNaming.js`
- **内容**：
  - 5 类支援点名称池（每类至少 3 个备选）
  - 4 类物资点名称池（每类至少 3 个备选）
  - `nameSupportPoint(type, districtName)` 函数
    - emergency_management → `{districtName}应急管理局`
    - fire_station → `{districtName}消防救援站` 或 `{districtName}第二消防救援站`（多个时加序号）
    - hospital → 从医院名称池随机选（无前缀）
    - supply_depot → 从物资库名称池随机选（含城市名前缀）
    - shelter → 从避难场所名称池随机选（公园名）
  - `nameSupplyPoint(type)` 函数
    - grain_oil → 品牌/连锁名
    - supermarket → 品牌名（永辉/物美/华润万家/大润发）
    - pharmacy → 品牌名（国大药房/同仁堂/益丰药房）
    - gas_station → 品牌名（中国石化/中国石油）
- **验证**：
  - 同一类型多次调用，名称有随机性
  - districtName 缺失时降级为通用名

### T3.2 — 创建 generatePoints.js 点位生成器
- **优先级**：P0
- **依赖**：T1.1（getBufferConfig）, T2.3（haversine）, T3.1（命名工具）
- **状态**：✅ 已完成（196/196 测试通过）
- **文件**：`frontend/src/utils/generateEarthquakePoints.js`
- **内容**：
  - `generateSupportPoints(center, innerRadius, outerRadius, districtName)` 函数
    - 在环带内随机生成 5~9 个点
    - 5 种类型至少各 1 个
    - 每个点字段：`{type, name, lng, lat, icon, color, distance}`
    - icon 映射：emergency_management/town-hall, fire_station/fire-station, hospital/hospital, supply_depot/warehouse, shelter/campground
    - color 映射：与 docs/earthquake-rescue-design.md §2.1 一致
  - `generateSupplyPoints(center, innerRadius, midRadius)` 函数
    - 在环带内侧（innerRadius ~ midRadius）随机生成 4~8 个点
    - 4 种类型覆盖
    - 每个点字段：`{type, name, lng, lat, icon, color, supplies, distance}`
  - `generateDamagedPoints(center, innerRadius)` 函数
    - 在小缓冲区内生成 0~3 个 `_damaged: true` 点位
  - `sortByDistance(points, center)` 函数
    - 按距离升序排序
- **验证**：
  - 生成的点位满足距离约束
  - 5 类支援点齐全
  - 4 类物资点覆盖

### T3.3 — 创建 SupportPointLayer.vue 图层组件
- **优先级**：P0
- **依赖**：T3.2
- **状态**：✅ 已完成（Vite 编译 HTTP 200）
- **文件**：`frontend/src/components/earthquake/SupportPointLayer.vue`
- **内容**：
  - Props: `map`, `supportPoints`, `supplyPoints`, `damagedPoints`, `disasterCenter`
  - 添加 3 个 GeoJSON source（支援点/物资点/已损毁点）
  - 添加 3 个 symbol layer（图标+文字）
  - 已损毁点图标灰显（icon-opacity=0.4）
  - 受灾点单独 marker（红色 #ef4444，z-order 最高）
  - 点击支援点/物资点弹出 popup（显示名称、类型、距离、物资列表）
  - 鼠标悬停高亮
- **验证**：
  - 各类图标颜色与文档一致
  - 已损毁点灰显
  - 受灾点红色标记在最上层

---

## 阶段 4：5 步调度流程编排

### T4.1 — 抽取 useShortestPath composable
- **优先级**：P0
- **依赖**：无（参考现有 RoutePlanningModal.vue）
- **状态**：✅ 已完成（Vite 编译 HTTP 200）
- **文件**：`frontend/src/composables/useShortestPath.js`
- **内容**：
  - `useShortestPath()` 返回 `{ planPath, loading, error }`
  - `planPath(origin, destination)` 调用现有 shortest_path 工具
  - 返回 GeoJSON LineString 或 null（失败时）
  - 与 RoutePlanningModal.vue 的调用方式保持一致
- **验证**：
  - 调用成功返回 LineString
  - 调用失败返回 null，不抛出异常

### T4.2 — 创建 RescueDispatchPanel.vue 调度面板
- **优先级**：P0
- **依赖**：T4.1, T3.3
- **状态**：✅ 已完成（Vite 编译 HTTP 200）
- **文件**：`frontend/src/components/earthquake/RescueDispatchPanel.vue`
- **内容**：
  - Props: `map`, `disasterData`, `supportPoints`, `disasterCenter`, `bufferConfig`
  - 状态机：`currentStep` (`'idle' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'done'`)
  - `isDispatching` 状态控制按钮 disabled
  - `startDispatch()` async 函数：
    - 顺序执行 step1 → step2 → step3 → step4 → step5
    - 每步间隔 3 秒
    - 步骤失败时降级处理，不中断流程
  - 每步对应：
    - step1: 弹窗"应急指令下达"，无路径
    - step2: 选择最近消防站 → 路径规划（红色 #e53e3e）→ 弹窗"消防搜救"
    - step3: 选择最近医院 → 路径规划（粉色 #d53f8c）→ 弹窗"医疗救治"
    - step4: 选择最近物资库 → 路径规划（橙色 #dd6b20）→ 弹窗"物资调拨"
    - step5: 选择最近避难场所 → 路径规划（绿色 #38a169）→ 弹窗"人员安置"
  - 完成后总结弹窗：出动 5 支救援力量 + 调拨物资 + 转移群众
  - 组件 unmount 时清理所有定时器
- **验证**：
  - 5 步顺序执行
  - 4 条彩色路径并行显示
  - 按钮在调度中 disabled
  - 组件卸载时无内存泄漏

### T4.3 — 路径图层管理
- **优先级**：P0
- **依赖**：T4.1
- **状态**：✅ 已完成（在 RescueDispatchPanel.vue 内实现）
- **文件**：在 RescueDispatchPanel.vue 内实现
- **内容**：
  - 4 条路径分别使用 4 个 source + 4 个 layer
  - layer id：`rescue-route-fire` / `rescue-route-medical` / `rescue-route-supply` / `rescue-route-shelter`
  - line-color 分别为 #e53e3e / #d53f8c / #dd6b20 / #38a169
  - line-width: 4
  - line-opacity: 0.85
  - 路径动画：使用 setPaintProperty 渐进显示 line-dasharray
- **验证**：
  - 4 条路径颜色与文档 §4.3 一致
  - 路径叠加显示，不互相覆盖

---

## 阶段 5：改造现有数据大屏 5 个文件

> 阶段 5 不新增独立页面，沿用 `/data-dashboard` 路由，按"逐文件改造、每步回归验证"原则推进。

### T5.1 — 改造 mockData.js（移除非地震灾种）
- **优先级**：P0
- **依赖**：T1.1
- **状态**：☐ 未开始
- **文件**：`frontend/src/utils/mockData.js`
- **改造内容**：
  - 移除暴雨/大风/沙尘/强对流/洪水/火灾等 6 种非地震灾种的 mock 数据生成逻辑
  - 保留县区结构、导出方式、字段命名风格
  - 地震灾种数据字段对齐 8 指标 DDI 模型：`deaths/injured/missing/affected_pop/evacuated/collapsed_houses/damaged_houses/economic_loss`
  - 每个县区生成一组地震灾情示例数据（不同县区数据不同，体现差异化）
- **保留内容**：县区列表、坐标、数据导出格式
- **验证**：
  - mockData.js 导出的数据中只包含地震灾种
  - 每个县区数据包含 8 项 DDI 指标字段
  - 数据大屏县区点击仍能取出 mock 数据

### T5.2 — 改造 DisasterDetailPanel.vue（新增 8 指标录入 + DDI 展示）
- **优先级**：P0
- **依赖**：T1.1（earthquakeAhp.js）, T5.1（mockData）
- **状态**：☐ 未开始
- **文件**：`frontend/src/components/dashboard/DisasterDetailPanel.vue`
- **改造内容**：
  - 内部 AHP 计算从 `utils/ahp.js` 切换为 `utils/earthquakeAhp.js`
  - 新增 8 指标录入区（a-input-number × 8，含 min/max 约束）
  - 新增"评估灾情"按钮 → 调用 `calculateDDI(formData)` → 显示 DDI 数值 + 灾情等级 tag
  - 4 类灾情信息分组展示：人员伤亡 / 受灾范围 / 房屋损毁 / 经济损失
  - 附近支援点+物资点列表（按距离升序，前缀图标 🏛️🚒🏥📦🏕️🏪💊⛽）
  - "🆘 一键救援"按钮 → emit('start-rescue')
- **保留内容**：UI 卡片布局、字段标签样式、AntD 组件用法
- **验证**：
  - 8 个字段均可录入
  - 提交后正确计算 DDI（与 earthquakeAhp.test.js 一致）
  - 灾情等级 tag 颜色与 getDisasterLevel 返回一致
  - "一键救援"按钮 emit 事件正常

### T5.3 — 改造 BufferAnalysisModal.vue（按 DDI 等级动态选择半径 + 双圈）
- **优先级**：P0
- **依赖**：T1.1（getBufferConfig）, T2.1（BufferZoneLayer）, T2.2（circlePolygon）
- **状态**：☐ 未开始
- **文件**：`frontend/src/components/dashboard/BufferAnalysisModal.vue`
- **改造内容**：
  - 缓冲区半径改为按 DDI 等级动态选择（调用 `getBufferConfig(ddiLevel)`）
  - 移除原"用户输入半径"逻辑，改为接收父组件传入的 `bufferConfig` props
  - 新增内/外双圈叠加渲染（外圈橙 rgba(221,107,32,0.15) + 内圈红 rgba(229,62,62,0.25)）
  - 外圈先添加（下层），内圈后添加（上层），通过 layer id 控制 z-order
  - 新增图层 id：`earthquake-buffer-outer` / `earthquake-buffer-inner`
  - 鼠标悬停 tooltip：外圈"应急支援范围（Xkm）"，内圈"灾害影响范围（Xkm），设施已损毁"
  - 重新计算时清理旧 source + layer
- **保留内容**：AntD Modal 容器、标题、关闭按钮、visible 控制
- **验证**：
  - 双圈同心显示，外橙内红
  - 内圈遮罩外圈中心
  - 鼠标悬停 tooltip 正确
  - 重新触发渲染无重复图层

### T5.4 — 改造 RoutePlanningModal.vue（5 步调度 + 4 路彩色并行）
- **优先级**：P0
- **依赖**：T4.1（useShortestPath）, T4.2（调度核心逻辑）, T3.3（SupportPointLayer）
- **状态**：☐ 未开始
- **文件**：`frontend/src/components/dashboard/RoutePlanningModal.vue`
- **改造内容**：
  - 新增 5 步调度状态机：`currentStep`（idle/step1/step2/step3/step4/step5/done）
  - 新增 `isDispatching` 状态控制按钮 disabled
  - 新增 `startDispatch()` async 函数：顺序执行 step1~step5，每步间隔 3 秒
  - step1: 弹窗"应急指令下达"，无路径
  - step2~step5: 分别选择最近消防/医院/物资库/避难场所，调用 useShortestPath 规划路径
  - 4 路并行显示：`rescue-route-fire`(#e53e3e) / `rescue-route-medical`(#d53f8c) / `rescue-route-supply`(#dd6b20) / `rescue-route-shelter`(#38a169)
  - 路径规划失败降级为直线连接，不中断流程
  - 完成后总结弹窗：出动 5 支救援力量 + 调拨物资 + 转移群众
  - 组件 unmount 时清理所有定时器
- **保留内容**：AntD Modal 容器、起终点输入框、shortest_path 调用方式
- **验证**：
  - 5 步顺序执行
  - 4 条彩色路径并行显示
  - 调度中按钮 disabled
  - 组件卸载无内存泄漏

### T5.5 — 改造 DataDashboardView.vue（整合状态 + 一键救援按钮）
- **优先级**：P0
- **依赖**：T5.2, T5.3, T5.4
- **状态**：☐ 未开始
- **文件**：`frontend/src/views/DataDashboardView.vue`
- **改造内容**：
  - 新增状态：`disasterData`, `ddi`, `disasterLevel`, `bufferConfig`, `supportPoints`, `supplyPoints`, `damagedPoints`, `currentStep`, `isDispatching`
  - 新增"🆘 一键救援"按钮（a-button type=primary），点击触发 RoutePlanningModal 的 startDispatch
  - 监听 DisasterDetailPanel 的 'reassess' 事件：
    1. 调用 calculateDDI + getDisasterLevel + getBufferConfig
    2. 调用 generateSupportPoints + generateSupplyPoints + generateDamagedPoints
    3. 渲染 BufferZoneLayer + SupportPointLayer
  - 监听 DisasterDetailPanel 的 'start-rescue' 事件 → 触发 RoutePlanningModal 显示 + startDispatch
  - props 下发给子组件 + emit 上报（按 design.md §3.7 D7 数据流图）
- **保留内容**：地图初始化逻辑、县区点击响应、菜单布局、左侧地图右侧面板布局
- **验证**：
  - 录入→评估→缓冲区→点位生成 全流程
  - 点击"一键救援"启动 5 步调度
  - 原县区点击响应仍正常
  - 路由 `/data-dashboard` 不变

### T5.6 — 端到端流程验证
- **优先级**：P0
- **依赖**：T5.5
- **状态**：☐ 未开始
- **内容**：
  - 启动前端 dev server
  - 访问 `/data-dashboard`
  - 点击县区 → 验证 DisasterDetailPanel 弹出
  - 录入文档示例数据 → 验证 DDI 计算
  - 验证缓冲区双圈渲染
  - 验证支援点+物资点生成
  - 点击"一键救援" → 验证 5 步调度流程
  - 验证 4 条彩色路径
  - 验证总结弹窗
  - 回归验证：原数据大屏县区点击、菜单布局仍正常
- **验证**：所有步骤正常工作，无回归问题

---

## 任务依赖图

```
T1.1 (AHP算法) ──┬─→ T1.2 (测试) ✅
                 │
                 ├─→ T2.2 (圆Polygon) ──┐
                 │                       ├─→ T2.1 (缓冲区图层)
                 ├─→ T2.3 (haversine) ──┤
                 │                       │
                 └─→ T3.1 (命名工具) ────┤
                                         ├─→ T3.2 (点位生成) ──→ T3.3 (点位图层)
                                         │                       │
T4.1 (路径 composable) ──────────────────┤                       │
                                         │                       │
                                         └─→ T4.2 (调度核心) ←───┤
                                                  │              │
                                                  ↓              │
                                          T4.3 (路径图层)        │
                                                  │              │
                                                  ↓              ↓
T5.1 (mockData改造) ──→ T5.2 (DetailPanel改造) ──→ T5.3 (BufferModal改造) ──┐
                                                                          │
T5.4 (RouteModal改造) ←────────────────────────────────────────────────────┤
        │                                                                  │
        ↓                                                                  │
T5.5 (DashboardView改造) ←─────────────────────────────────────────────────┘
        │
        ↓
T5.6 (端到端验证)
```

---

## 阶段验收检查点

每阶段交付后，运行对应检查点（详见 [checklist.md](./checklist.md)）：

| 阶段 | 检查点 | 必须通过 |
|------|--------|---------|
| 阶段 1 | checklist.md §1 AHP-DDI 算法 | ✅ |
| 阶段 2 | checklist.md §2 双缓冲区 | ✅ |
| 阶段 3 | checklist.md §3 点位生成 | ✅ |
| 阶段 4 | checklist.md §4 5 步调度 | ✅ |
| 阶段 5 | checklist.md §5~§9 数据大屏改造/兼容性/性能 | ✅ |

---

## 状态跟踪

| 任务 ID | 状态 | 完成时间 | 备注 |
|---------|------|---------|------|
| T1.1 | ✅ 已完成 | 2026-07-05 | earthquakeAhp.js 创建完成 |
| T1.2 | ✅ 已完成 | 2026-07-05 | 69/69 测试通过 |
| T2.1 | ✅ 已完成 | 2026-07-05 | BufferZoneLayer.vue 创建完成 |
| T2.2 | ✅ 已完成 | 2026-07-05 | circlePolygon.js 创建完成 |
| T2.3 | ✅ 已完成 | 2026-07-05 | haversine.js 创建完成 |
| T3.1 | ✅ 已完成 | 2026-07-05 | earthquakeNaming.js 创建完成，33/33 测试通过 |
| T3.2 | ✅ 已完成 | 2026-07-05 | generateEarthquakePoints.js 创建完成，196/196 测试通过 |
| T3.3 | ✅ 已完成 | 2026-07-05 | SupportPointLayer.vue 创建完成，Vite 编译通过 |
| T4.1 | ✅ 已完成 | 2026-07-05 | useShortestPath.js 创建完成，Vite 编译通过 |
| T4.2 | ✅ 已完成 | 2026-07-05 | RescueDispatchPanel.vue 创建完成，Vite 编译通过 |
| T4.3 | ✅ 已完成 | 2026-07-05 | 路径图层在 RescueDispatchPanel.vue 内实现 |
| T5.1 | ☐ 未开始 | - | 改造 mockData.js |
| T5.2 | ☐ 未开始 | - | 改造 DisasterDetailPanel.vue |
| T5.3 | ☐ 未开始 | - | 改造 BufferAnalysisModal.vue |
| T5.4 | ☐ 未开始 | - | 改造 RoutePlanningModal.vue |
| T5.5 | ☐ 未开始 | - | 改造 DataDashboardView.vue |
| T5.6 | ☐ 未开始 | - | 端到端流程验证 |

> 状态标记：☐ 未开始 / 🔄 进行中 / ✅ 已完成 / ⚠️ 阻塞
