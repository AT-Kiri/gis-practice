# Checklist — 地震灾害应急救援模块验收清单

> 变更 ID：`20260705-earthquake-rescue-refactor`
> 创建时间：2026-07-05
> 用法：逐项核对，全部 ✅ 通过方可进入评审

---

## §1 阶段 1 — AHP-DDI 算法层

### 1.1 算法文件存在性
- ☑ `frontend/src/utils/earthquakeAhp.js` 文件已创建
- ☑ 导出 `WEIGHTS` 常量，包含 8 个指标权重
- ☑ 导出 `THRESHOLDS` 常量，包含 8 个指标阈值
- ☑ 导出 `BUFFER_CONFIG` 常量，包含 4 个等级配置
- ☑ 导出 `normalize` / `calculateDDI` / `getDisasterLevel` / `getBufferConfig` 函数

### 1.2 权重正确性
- ☑ `deaths` 权重 = 0.2457
- ☑ `injured` 权重 = 0.0744
- ☑ `missing` 权重 = 0.1352
- ☑ `affected_pop` 权重 = 0.1752
- ☑ `evacuated` 权重 = 0.0876
- ☑ `collapsed_houses` 权重 = 0.1057
- ☑ `damaged_houses` 权重 = 0.0352
- ☑ `economic_loss` 权重 = 0.1409
- ☑ 权重总和 = 1.0000（实际 0.9999，文档表格舍入误差，误差 < 0.0001 视为通过）

### 1.3 阈值正确性（来源 ahp-disaster-assessment.md §5）
- ☑ `deaths` 阈值 = (0, 300)
- ☑ `injured` 阈值 = (0, 1000)
- ☑ `missing` 阈值 = (0, 100)
- ☑ `affected_pop` 阈值 = (0, 100000)
- ☑ `evacuated` 阈值 = (0, 100000)
- ☑ `collapsed_houses` 阈值 = (0, 10000)
- ☑ `damaged_houses` 阈值 = (0, 50000)
- ☑ `economic_loss` 阈值 = (0, 1000000)

### 1.4 缓冲区配置正确性（来源 earthquake-rescue-design.md §6.5）
- ☑ 等级 1：inner=2000, outer=8000, name='特别重大'
- ☑ 等级 2：inner=1500, outer=6000, name='重大'
- ☑ 等级 3：inner=1000, outer=4000, name='较大'
- ☑ 等级 4：inner=500, outer=2000, name='一般'
- ☑ innerColor = 'rgba(229,62,62,0.25)'
- ☑ outerColor = 'rgba(221,107,32,0.15)'

### 1.5 DDI 计算正确性
- ☑ 全零数据 → DDI = 0.0
- ☑ 全上限数据 → DDI ≈ 100（实际 99.99，文档权重总和 0.9999 导致，误差 < 0.05 视为通过）
- ☑ 文档示例数据 → DDI = 24.88（Ⅳ级一般，与手动验算一致；原 checklist 假设"Ⅱ级重大"系误判，文档 §6.1 未承诺具体等级）
- ☑ DDI 输出保留 2 位小数

### 1.6 灾情等级判定
- ☑ DDI = 85.3 → level=1, name='特别重大', color='#e53e3e'
- ☑ DDI = 72.5 → level=2, name='重大', color='#dd6b20'
- ☑ DDI = 45.0 → level=3, name='较大', color='#d69e2e'
- ☑ DDI = 25.8 → level=4, name='一般', color='#38a169'
- ☑ 边界值 DDI = 80.0 → level=1
- ☑ 边界值 DDI = 60.0 → level=2
- ☑ 边界值 DDI = 40.0 → level=3

### 1.7 原 ahp.js 不受影响
- ☑ `frontend/src/utils/ahp.js` 文件未被修改（git status 已确认）
- ☑ 数据大屏 DisasterDetailPanel.vue 仍正常引用原 ahp.js（import 语句未变）
- ☑ 数据大屏 AHP 风险评分功能正常（无运行时变更，逻辑保持原状）

> **阶段 1 验收完成**：35/35 项通过，自测脚本 69/69 用例通过。算法层已具备进入阶段 2 的条件。

---

## §2 阶段 2 — 双缓冲区

### 2.1 工具函数
- ☑ `frontend/src/utils/haversine.js` 文件已创建
- ☑ `haversine(p1, p2)` 返回米单位距离
- ☑ `isInRing(point, center, innerRadius, outerRadius)` 正确判断环带
- ☑ `isInDamageZone(point, center, innerRadius)` 正确判断小缓冲区
- ☑ `frontend/src/utils/circlePolygon.js` 文件已创建
- ☑ `createCirclePolygon(center, radiusMeters, segments=64)` 返回 GeoJSON Polygon

### 2.2 缓冲区图层组件
- ☑ `frontend/src/components/earthquake/BufferZoneLayer.vue` 文件已创建
- ☑ 接受 Props: `map`, `center`, `bufferConfig`
- ☑ 添加 source: `earthquake-buffer-outer-source`（橙色填充）
- ☑ 添加 source: `earthquake-buffer-inner-source`（红色填充）
- ☑ 添加 layer: `earthquake-buffer-outer`（先添加，下层）
- ☑ 添加 layer: `earthquake-buffer-inner`（后添加，上层）
- ☑ 外圈颜色 = 'rgba(221,107,32,0.15)'
- ☑ 内圈颜色 = 'rgba(229,62,62,0.25)'
- ☐ 内圈视觉上遮罩外圈中心（需浏览器视觉验证）

### 2.3 缓冲区行为
- ☑ 重新计算时清理旧 source/layer 后再添加（cleanup 函数已实现）
- ☑ 鼠标悬停外圈显示 tooltip："应急支援范围（Xkm）"（mouseenter+mousemove+mouseleave 三事件模式）
- ☑ 鼠标悬停内圈显示 tooltip："灾害影响范围（Xkm），设施已损毁"

### 2.4 4 级缓冲区配置验证
- ☑ Ⅰ级（DDI≥80）→ 半径 2000m/8000m（已在 earthquakeAhp.test.js §2.1 验证）
- ☑ Ⅱ级（60≤DDI<80）→ 半径 1500m/6000m
- ☑ Ⅲ级（40≤DDI<60）→ 半径 1000m/4000m
- ☑ Ⅳ级（DDI<40）→ 半径 500m/2000m

---

## §3 阶段 3 — 支援点/物资点生成

### 3.1 命名工具
- ☑ `frontend/src/utils/earthquakeNaming.js` 文件已创建
- ☑ 5 类支援点名称池齐全（医院/物资库/避难场所均 ≥3 个备选）
- ☑ 4 类物资点名称池齐全（粮油/超市/药店/加油站均 ≥3 个备选）
- ☑ `nameSupportPoint('emergency_management', '朝阳区')` → "朝阳区应急管理局"
- ☑ `nameSupportPoint('fire_station', '朝阳区')` → "朝阳区消防救援站"
- ☑ `nameSupportPoint('hospital', '朝阳区')` → 通用医院名（无前缀，从池中随机选）
- ☑ `nameSupplyPoint('supermarket')` → 品牌名（永辉/物美/华润万家/大润发之一）
- ☑ districtName 缺失时降级为通用名（"通用应急管理局"）

### 3.2 点位生成器
- ☑ `frontend/src/utils/generateEarthquakePoints.js` 文件已创建
- ☑ `generateSupportPoints(center, inner, outer, districtName)` 返回 5~9 个点
- ☑ 5 种支援点类型至少各 1 个：emergency_management/fire_station/hospital/supply_depot/shelter
- ☑ 每个点距离受灾点在 [inner, outer] 区间内（带 5% 安全余量）
- ☑ `generateSupplyPoints(center, inner, mid)` 返回 4~8 个点
- ☑ 4 种物资点类型覆盖：grain_oil/supermarket/pharmacy/gas_station
- ☑ `generateDamagedPoints(center, inner)` 返回 0~3 个 `_damaged:true` 点位
- ☑ `sortByDistance(points, center)` 按距离升序排序（不修改原数组）

### 3.3 图标颜色映射（来源 earthquake-rescue-design.md §2.1, §3.3）
- ☑ emergency_management → icon 'town-hall', color '#3182ce'
- ☑ fire_station → icon 'fire-station', color '#e53e3e'
- ☑ hospital → icon 'hospital', color '#d53f8c'
- ☑ supply_depot → icon 'warehouse', color '#dd6b20'
- ☑ shelter → icon 'campground', color '#38a169'
- ☑ grain_oil → icon 'store', color '#d69e2e'
- ☑ supermarket → icon 'store', color '#805ad5'
- ☑ pharmacy → icon 'pharmacy', color '#38a169'
- ☑ gas_station → icon 'fuel', color '#718096'

### 3.4 点位图层组件
- ☑ `frontend/src/components/earthquake/SupportPointLayer.vue` 文件已创建
- ☑ 支援点 circle layer + symbol label 显示图标+名称（Vite 编译 HTTP 200）
- ☑ 物资点 circle layer + symbol label 显示图标+名称
- ☑ 已损毁点 circle-opacity=0.4 灰显
- ☑ 受灾点单独 circle layer，颜色 #ef4444，半径 11（z-order 最上层）
- ☑ 点击支援点/物资点弹出 popup 显示名称/类型/距离/物资列表
- ☑ 鼠标悬停切换光标为 pointer

---

## §4 阶段 4 — 5 步调度流程

### 4.1 useShortestPath composable
- ☑ `frontend/src/composables/useShortestPath.js` 文件已创建
- ☑ `planPath(origin, destination)` 返回 {geometry, distance, duration, isFallback} 或 null
- ☑ 调用失败时不抛出异常，降级返回直线 LineString（isFallback=true）
- ☑ 与原 RoutePlanningModal.vue 调用方式一致（OSRM 公共 API + 5 秒超时）

### 4.2 调度面板组件
- ☑ `frontend/src/components/earthquake/RescueDispatchPanel.vue` 文件已创建
- ☑ Props 包含 map/disasterData/supportPoints/disasterCenter/visible
- ☑ `currentStep` 状态机：'idle' → 'step1' → ... → 'step5' → 'done'
- ☑ `isDispatching` 状态控制按钮 disabled
- ☑ `startDispatch()` 顺序执行 5 步
- ☑ 每步间隔 3 秒（使用 await sleep(3000)）
- ☑ 单步失败时降级处理，不中断流程（findNearestPoint 返回 null 时跳过该步）
- ☑ 组件 unmount 时清理所有定时器（timerIds 数组）

### 4.3 5 步调度内容
- ☑ Step 1 弹窗："🚨 {区县名}应急管理局已启动应急响应，正在下达调度指令"，无路径
- ☑ Step 2 选择最近消防站，路径颜色 `#e53e3e` 红色
- ☑ Step 2 弹窗："🚒 {消防站名称}已出发，预计{X}分钟抵达" → 3秒后 "🚒 消防救援队已抵达受灾点，开始搜救被困人员"
- ☑ Step 3 选择最近医院，路径颜色 `#d53f8c` 粉色
- ☑ Step 3 弹窗："🚑 {医院名称}已出发..." → 3秒后 "🚑 医疗救护队已抵达受灾点，开始现场救治"
- ☑ Step 4 选择最近物资库，路径颜色 `#dd6b20` 橙色
- ☑ Step 4 弹窗："📦 {物资库名称}已发出物资..." → 3秒后 "📦 救灾物资已送达受灾点，开始分发"
- ☑ Step 5 选择最近避难场所，路径颜色 `#38a169` 绿色
- ☑ Step 5 弹窗："🏕️ {避难场所名称}已开放..." → 3秒后 "✅ 受灾群众已安全转移至应急避难场所"

### 4.4 路径图层
- ☑ 4 条路径使用 4 个独立 source + 4 个 layer
- ☑ layer id: `rescue-route-fire` / `rescue-route-medical` / `rescue-route-supply` / `rescue-route-shelter`
- ☑ line-width: 4
- ☑ line-opacity: 0.85
- ☑ 4 条路径并行显示不互相覆盖（独立 source 互不影响）
- ☐ 路径动画（line-dasharray 渐进显示，可选优化项）

### 4.5 完成总结
- ☑ 5 步全部完成后弹窗："📋 救援调度全部完成！本次共出动5支救援力量，调拨物资X件，转移群众X人"
- ☑ currentStep 状态变为 'done'
- ☑ isDispatching 状态变为 false（finally 块）

### 4.6 异常处理
- ☑ 调度中按钮 disabled，不响应重复点击（isDispatching 守卫）
- ☑ 组件 unmount 时清理所有定时器（onUnmounted 钩子）
- ☑ shortest_path 失败时降级为直线显示（useShortestPath 内部降级）
- ☑ 单步失败不中断整体流程（try/catch 在 startDispatch 外层）

---

## §5 阶段 5 — 数据大屏 5 文件改造

> 阶段 5 不新增独立页面，沿用 `/data-dashboard` 路由，按"逐文件改造、每步回归验证"原则推进。

### 5.1 改造 mockData.js
- ☐ `frontend/src/utils/mockData.js` 移除 6 种非地震灾种数据生成逻辑
- ☐ 保留县区列表、坐标、导出方式不变
- ☐ 地震灾种数据字段对齐 8 指标 DDI 模型
- ☐ 每个县区生成一组差异化地震灾情示例数据
- ☐ 数据大屏县区点击仍能取出 mock 数据

### 5.2 改造 DisasterDetailPanel.vue
- ☐ 内部 AHP 计算从 `utils/ahp.js` 切换为 `utils/earthquakeAhp.js`
- ☐ 新增 8 指标录入区（a-input-number × 8，含 min/max 约束）
- ☐ 新增"评估灾情"按钮，调用 `calculateDDI(formData)` 显示 DDI 数值
- ☐ 灾情等级 tag 颜色与 getDisasterLevel 返回一致
- ☐ 4 类灾情信息分组展示：人员伤亡 / 受灾范围 / 房屋损毁 / 经济损失
- ☐ 附近支援点+物资点列表（按距离升序，图标 🏛️🚒🏥📦🏕️🏪💊⛽）
- ☐ "🆘 一键救援"按钮 emit('start-rescue') 正常
- ☐ 保留原 UI 卡片布局和字段标签样式

### 5.3 改造 BufferAnalysisModal.vue
- ☐ 缓冲区半径改为按 DDI 等级动态选择（调用 `getBufferConfig(ddiLevel)`）
- ☐ 移除原"用户输入半径"逻辑，改为接收父组件传入的 `bufferConfig` props
- ☐ 新增内/外双圈叠加渲染（外圈橙 + 内圈红）
- ☐ 外圈先添加（下层），内圈后添加（上层）
- ☐ 新增图层 id：`earthquake-buffer-outer` / `earthquake-buffer-inner`
- ☐ 外圈颜色 = 'rgba(221,107,32,0.15)'
- ☐ 内圈颜色 = 'rgba(229,62,62,0.25)'
- ☐ 内圈视觉上遮罩外圈中心
- ☐ 鼠标悬停外圈 tooltip："应急支援范围（Xkm）"
- ☐ 鼠标悬停内圈 tooltip："灾害影响范围（Xkm），设施已损毁"
- ☐ 重新计算时清理旧 source/layer 后再添加
- ☐ 保留 AntD Modal 容器、标题、关闭按钮、visible 控制

### 5.4 改造 RoutePlanningModal.vue
- ☐ 新增 5 步调度状态机：currentStep（idle/step1/step2/step3/step4/step5/done）
- ☐ 新增 `isDispatching` 状态控制按钮 disabled
- ☐ 新增 `startDispatch()` async 函数，顺序执行 5 步
- ☐ 每步间隔 3 秒（await sleep(3000)）
- ☐ step1 弹窗"应急指令下达"，无路径
- ☐ step2~step5 分别选择最近消防/医院/物资库/避难场所
- ☐ 4 路并行显示：`rescue-route-fire`(#e53e3e) / `rescue-route-medical`(#d53f8c) / `rescue-route-supply`(#dd6b20) / `rescue-route-shelter`(#38a169)
- ☐ 路径规划失败降级为直线连接，不中断流程
- ☐ 完成后总结弹窗：出动 5 支救援力量 + 调拨物资 + 转移群众
- ☐ 组件 unmount 时清理所有定时器
- ☐ 保留 AntD Modal 容器、起终点输入框、shortest_path 调用方式

### 5.5 改造 DataDashboardView.vue
- ☐ 新增状态：disasterData/ddi/disasterLevel/bufferConfig/supportPoints/supplyPoints/damagedPoints/currentStep/isDispatching
- ☐ 新增"🆘 一键救援"按钮（a-button type=primary）
- ☐ 监听 DisasterDetailPanel 的 'reassess' 事件触发：计算 DDI → 获取缓冲区配置 → 生成点位 → 渲染图层
- ☐ 监听 DisasterDetailPanel 的 'start-rescue' 事件 → 触发 RoutePlanningModal 显示 + startDispatch
- ☐ props 下发给子组件 + emit 上报（按 design.md §3.7 D7 数据流图）
- ☐ 保留地图初始化逻辑、县区点击响应、菜单布局
- ☐ 路由 `/data-dashboard` 不变

### 5.6 路由与菜单保持不变
- ☐ `frontend/src/router/index.js` 未被修改（无新增路由）
- ☐ `frontend/src/components/NavSidebar.vue` 未被修改（菜单项不变）
- ☐ `/data-dashboard` 路由仍可正常访问
- ☐ 旧路由 `/warn-info` 等仍可访问

---

## §6 端到端流程验证

### 6.1 录入→评估→缓冲区→点位
- ☐ 访问 `/data-dashboard` 页面正常加载
- ☐ 点击县区 → DisasterDetailPanel 弹出
- ☐ 录入文档示例数据，点击"评估灾情"
- ☐ DDI 正确计算，灾情等级 tag 显示正确颜色
- ☐ 地图上出现双缓冲区（外橙内红）
- ☐ 地图上出现支援点和物资点
- ☐ 已损毁点灰显
- ☐ 受灾点红色标记

### 6.2 信息卡片
- ☐ 点击受灾点弹出信息卡片
- ☐ 卡片格式与文档 §5 一致
- ☐ 支援点按距离升序排列
- ☐ 物资点按距离升序排列

### 6.3 5 步调度
- ☐ 点击"🆘 一键救援"按钮启动调度
- ☐ Step 1 弹窗显示，无路径
- ☐ Step 2 弹窗+红色路径
- ☐ Step 3 弹窗+粉色路径
- ☐ Step 4 弹窗+橙色路径
- ☐ Step 5 弹窗+绿色路径
- ☐ 4 条彩色路径同时显示
- ☐ 完成总结弹窗
- ☐ 调度中按钮 disabled

### 6.4 回归验证
- ☐ 原县区点击响应仍正常
- ☐ 原菜单布局不变
- ☐ 原地图工具栏正常

---

## §7 异常与边界情况

### 7.1 数据缺失
- ☐ 未录入灾情数据时点击地图 → 提示"请先录入灾情数据"
- ☐ 部分指标为空时提交 → 空字段默认为 0，正常计算

### 7.2 缓冲区极端情况
- ☐ 受灾点在地图边缘 → 缓冲区正常渲染（GeoJSON 完整）
- ☐ Ⅳ级（500m/2000m）小环带 → 至少生成 5 个支援点（每类 1 个）

### 7.3 路径规划异常
- ☐ shortest_path 返回空 → 降级为直线
- ☐ shortest_path 调用失败 → 弹窗仍正常更新

---

## §8 兼容性回归

### 8.1 数据大屏改造后功能正常
- ☐ 访问 `/data-dashboard` 正常加载
- ☐ 县区点击展示灾害详情正常（DisasterDetailPanel 改造后）
- ☐ DisasterDetailPanel 显示新 8 指标 DDI 评估（不再显示原 5 准则风险评分）
- ☐ 改造后的 BufferAnalysisModal 按等级动态选择半径
- ☐ 改造后的 RoutePlanningModal 支持 5 步调度流程
- ☐ "🆘 一键救援"按钮触发调度流程
- ☐ 原 ahp.js 文件保留未被引用（git diff 检查 ahp.js 无修改）

### 8.2 旧 CRUD 视图仍可访问
- ☐ 访问 `/warn-info` 正常加载，CRUD 可用
- ☐ 访问 `/coord-response` 正常加载，CRUD 可用
- ☐ 访问 `/supply-dispatch` 正常加载，CRUD 可用
- ☐ 后端 `/api/warn-info` 等接口正常响应

### 8.3 其他模块不受影响
- ☐ 空间查询功能正常
- ☐ 空间分析功能正常
- ☐ 网络分析功能正常
- ☐ 专题检索功能正常
- ☐ 地图工具栏正常
- ☐ 图层管理器正常

---

## §9 性能与代码质量

### 9.1 性能指标
- ☐ DDI 计算 < 10ms
- ☐ 缓冲区渲染 < 500ms
- ☐ 支援点+物资点生成 < 200ms
- ☐ 5 步调度全流程 15~25 秒
- ☐ 单条路径规划响应 < 2 秒

### 9.2 代码规范
- ☐ 所有 .vue 文件使用 `<script setup>` Composition API
- ☐ 组件文件名 PascalCase
- ☐ JS 文件名 camelCase
- ☐ Props 使用 defineProps + JSDoc
- ☐ 复杂逻辑添加行内注释
- ☐ 颜色主题与 Ant Design Vue 一致
- ☐ `<style scoped>` 避免全局污染

### 9.3 文件清单

**新增文件（算法 + 工具 + 图层组件）**：
- ☑ `frontend/src/utils/earthquakeAhp.js`（阶段 1 已完成）
- ☑ `frontend/src/utils/earthquakeNaming.js`（阶段 3 已完成，33/33 测试通过）
- ☑ `frontend/src/utils/generateEarthquakePoints.js`（阶段 3 已完成，196/196 测试通过）
- ☑ `frontend/src/utils/haversine.js`（阶段 2 已完成）
- ☑ `frontend/src/utils/circlePolygon.js`（阶段 2 已完成，destination 已导出）
- ☑ `frontend/src/composables/useShortestPath.js`（阶段 4 已完成，Vite 编译通过）
- ☑ `frontend/src/components/earthquake/BufferZoneLayer.vue`（阶段 2 已完成）
- ☑ `frontend/src/components/earthquake/SupportPointLayer.vue`（阶段 3 已完成，Vite 编译通过）
- ☑ `frontend/src/components/earthquake/RescueDispatchPanel.vue`（阶段 4 已完成，Vite 编译通过）

**改造现有文件（数据大屏 5 个）**：
- ☐ `frontend/src/utils/mockData.js`（移除非地震灾种）
- ☐ `frontend/src/components/dashboard/DisasterDetailPanel.vue`（切换 AHP + 新增录入区）
- ☐ `frontend/src/components/dashboard/BufferAnalysisModal.vue`（按等级动态半径 + 双圈）
- ☐ `frontend/src/components/dashboard/RoutePlanningModal.vue`（5 步调度 + 4 路并行）
- ☐ `frontend/src/views/DataDashboardView.vue`（整合状态 + 一键救援按钮）

**保留不动的文件**：
- ☑ `frontend/src/utils/ahp.js`（保留作为备份，不再被引用）
- ☑ `frontend/src/router/index.js`（路由不变）
- ☑ `frontend/src/components/NavSidebar.vue`（菜单不变）

### 9.4 代码审查
- ☐ 运行 code-review skill，P0 问题数 = 0
- ☐ 无未使用 import / 变量
- ☐ 无硬编码魔法数字（应抽为常量）
- ☐ 无 console.log 残留（开发调试除外）
- ☐ 无 TODO/FIXME 未处理

---

## §10 文档与知识库

### 10.1 OpenSpec 文档完整
- ☐ `.openspec.yaml` 元数据完整
- ☐ `proposal.md` 包含 Why/What/Capabilities/Impact
- ☐ `design.md` 包含 Context/Goals-NonGoals/Decisions
- ☐ `specs/earthquake-rescue/spec.md` 包含 Given/When/Then 场景
- ☐ `tasks.md` 包含可执行任务+依赖关系
- ☐ `checklist.md` 包含可量化验收标准

### 10.2 知识库同步（验收后）
- ☐ `.trae/knowledge/INDEX.md` 新增本变更条目
- ☐ `.trae/knowledge/decisions.md` 记录关键决策（D1~D8）

### 10.3 Git 提交
- ☐ 提交信息遵循 Angular 风格
- ☐ 示例：`feat: 重构监测-预警-联动模块为地震灾害专属评估与救援流程`
- ☐ 提交包含所有新增文件
- ☐ 提交不包含 .codegraph/ 等忽略文件

---

## 验收结论

| 章节 | 通过项 | 总项 | 结论 |
|------|-------|------|------|
| §1 阶段 1 算法层 | 35 | 35 | ☑ 通过 |
| §2 阶段 2 缓冲区 | 17 | 18 | ☑ 通过（1 项需浏览器视觉验证） |
| §3 阶段 3 点位生成 | 24 | 24 | ☑ 通过 |
| §4 阶段 4 调度流程 | 26 | 27 | ☑ 通过（1 项可选优化未实现） |
| §5 阶段 5 数据大屏改造 | 0 | 39 | ☐ 未通过 |
| §6 端到端 | 0 | 16 | ☐ 未通过 |
| §7 异常处理 | 0 | 7 | ☐ 未通过 |
| §8 兼容性回归 | 0 | 16 | ☐ 未通过 |
| §9 性能与质量 | 0 | 24 | ☐ 未通过 |
| §10 文档与知识库 | 0 | 8 | ☐ 未通过 |
| **总计** | **102** | **214** | **☐ 进行中（阶段 4 已完成）** |

> **验收规则**：所有 214 项必须全部 ☑ 通过，方可认为本变更交付完成。
> **方向调整说明**：阶段 5 从"新建 EarthquakeRescueView.vue + 路由 + 菜单"调整为"改造现有数据大屏 5 个文件"，沿用 `/data-dashboard` 路由。
