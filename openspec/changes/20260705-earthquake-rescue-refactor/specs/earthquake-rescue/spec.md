# Spec — 地震灾害应急救援模块行为规格

> 变更 ID：`20260705-earthquake-rescue-refactor`
> 模块：`earthquake-rescue`
> 创建时间：2026-07-05

---

## 1. AHP-DDI 灾情评估算法

### 1.1 极值标准化

**Scenario: raw_value 在 [min, max] 区间内**
- **Given** 指标阈值 min=0, max=300（死亡人口）
- **When** 调用 `normalize(50, 0, 300)`
- **Then** 返回 `16.67`（≈ 50/300 × 100）

**Scenario: raw_value ≤ min_value**
- **Given** 指标阈值 min=0, max=300
- **When** 调用 `normalize(0, 0, 300)`
- **Then** 返回 `0.0`

**Scenario: raw_value ≥ max_value**
- **Given** 指标阈值 min=0, max=300
- **When** 调用 `normalize(500, 0, 300)`
- **Then** 返回 `100.0`

### 1.2 DDI 计算

**Scenario: 文档示例数据**
- **Given** 灾情数据：`{deaths:50, injured:300, missing:10, affected_pop:50000, evacuated:20000, collapsed_houses:3000, damaged_houses:10000, economic_loss:200000}`
- **And** 阈值表与文档 §5 一致
- **When** 调用 `calculateDDI(data)`
- **Then** 返回 DDI ≈ 24.88（Ⅳ级一般；文档 §6.1 仅给出使用示例，未承诺具体等级，以算法实际输出为准）

**Scenario: 全零数据**
- **Given** 所有 8 项指标均为 0
- **When** 调用 `calculateDDI(data)`
- **Then** 返回 `0.0`

**Scenario: 全部达上限**
- **Given** 所有 8 项指标均 ≥ max_value
- **When** 调用 `calculateDDI(data)`
- **Then** 返回 `100.0`（理论最大值）

### 1.3 灾情等级判定

**Scenario: DDI ≥ 80 → Ⅰ级 特别重大**
- **Given** DDI = 85.3
- **When** 调用 `getDisasterLevel(85.3)`
- **Then** 返回 `{level:1, name:'特别重大', color:'#e53e3e'}`

**Scenario: 60 ≤ DDI < 80 → Ⅱ级 重大**
- **Given** DDI = 72.5
- **When** 调用 `getDisasterLevel(72.5)`
- **Then** 返回 `{level:2, name:'重大', color:'#dd6b20'}`

**Scenario: 40 ≤ DDI < 60 → Ⅲ级 较大**
- **Given** DDI = 45.0
- **When** 调用 `getDisasterLevel(45.0)`
- **Then** 返回 `{level:3, name:'较大', color:'#d69e2e'}`

**Scenario: DDI < 40 → Ⅳ级 一般**
- **Given** DDI = 25.8
- **When** 调用 `getDisasterLevel(25.8)`
- **Then** 返回 `{level:4, name:'一般', color:'#38a169'}`

**Scenario: 边界值 DDI = 80 → Ⅰ级**
- **Given** DDI = 80.0
- **When** 调用 `getDisasterLevel(80.0)`
- **Then** 返回 level=1（边界值归入上一级，依据 SL 579-2012 "r ≥ 80"）

**Scenario: 边界值 DDI = 60 → Ⅱ级**
- **Given** DDI = 60.0
- **When** 调用 `getDisasterLevel(60.0)`
- **Then** 返回 level=2

**Scenario: 边界值 DDI = 40 → Ⅲ级**
- **Given** DDI = 40.0
- **When** 调用 `getDisasterLevel(40.0)`
- **Then** 返回 level=3

---

## 2. 等级化双缓冲区

### 2.1 缓冲区配置查询

**Scenario: Ⅰ级灾情 → 大缓冲区 8km / 小缓冲区 2km**
- **Given** DDI 等级 = 1（特别重大）
- **When** 调用 `getBufferConfig(1)`
- **Then** 返回 `{inner:2000, outer:8000, name:'特别重大', innerColor:'rgba(229,62,62,0.25)', outerColor:'rgba(221,107,32,0.15)'}`

**Scenario: Ⅱ级灾情 → 大缓冲区 6km / 小缓冲区 1.5km**
- **Given** DDI 等级 = 2
- **When** 调用 `getBufferConfig(2)`
- **Then** 返回 `{inner:1500, outer:6000, ...}`

**Scenario: Ⅲ级灾情 → 大缓冲区 4km / 小缓冲区 1km**
- **Given** DDI 等级 = 3
- **When** 调用 `getBufferConfig(3)`
- **Then** 返回 `{inner:1000, outer:4000, ...}`

**Scenario: Ⅳ级灾情 → 大缓冲区 2km / 小缓冲区 0.5km**
- **Given** DDI 等级 = 4
- **When** 调用 `getBufferConfig(4)`
- **Then** 返回 `{inner:500, outer:2000, ...}`

### 2.2 缓冲区图层渲染

**Scenario: 双缓冲区叠加渲染**
- **Given** 已计算缓冲区配置 inner=1500, outer=6000
- **And** 受灾点坐标 (lng, lat)
- **When** 调用 `BufferZoneLayer.render(map, center, config)`
- **Then** 地图上出现两个 fill layer：
  - layer id `earthquake-buffer-outer`（橙色 rgba(221,107,32,0.15)，半径 6000m）
  - layer id `earthquake-buffer-inner`（红色 rgba(229,62,62,0.25)，半径 1500m）
- **And** 外圈在下层，内圈在上层（视觉上内圈遮罩外圈中心）
- **And** 两个 source 均为 GeoJSON Polygon，圆形 64 边近似

**Scenario: 重新计算时清理旧图层**
- **Given** 地图上已有 `earthquake-buffer-outer` 和 `earthquake-buffer-inner` 图层
- **When** 用户提交新灾情数据触发重新渲染
- **Then** 旧 source 和 layer 被移除后重新添加（避免重复）

---

## 3. 支援点/物资点生成

### 3.1 支援点生成规则

**Scenario: 在环带内生成支援点**
- **Given** 受灾点坐标 (lng, lat)，DDI 等级 = 2（inner=1500m, outer=6000m）
- **When** 调用 `generateSupportPoints(center, 1500, 6000)`
- **Then** 返回 5~9 个点位的数组
- **And** 每个点位满足 `1500m < haversine(point, center) ≤ 6000m`
- **And** 5 种类型至少各 1 个：emergency_management / fire_station / hospital / supply_depot / shelter
- **And** 每个点位包含字段：`{type, name, lng, lat, icon, color, distance}`

**Scenario: 支援点命名策略 — 区县名前缀**
- **Given** 受灾点所属区县为"朝阳区"
- **When** 生成应急管理局点位
- **Then** 名称格式为 `"朝阳区应急管理局"`

**Scenario: 支援点命名策略 — 通用医院名**
- **Given** 生成医院急救中心点位
- **When** 调用命名函数
- **Then** 名称从池中随机选取：`["市人民医院急救中心", "中日友好医院急救中心", "中心医院急救中心"]` 之一（无前缀）

**Scenario: 支援点命名策略 — 公园名（避难场所）**
- **Given** 生成应急避难场所点位
- **When** 调用命名函数
- **Then** 名称从池中随机选取：`["人民公园应急避难场所", "奥林匹克森林公园应急避难场所", "城市公园应急避难场所"]` 之一

### 3.2 物资点生成规则

**Scenario: 在环带内侧生成物资点**
- **Given** DDI 等级 = 2，inner=1500m, outer=6000m
- **When** 调用 `generateSupplyPoints(center, 1500, 3750)` （3750 = (1500+6000)/2，环带内侧中点）
- **Then** 返回 4~8 个点位的数组
- **And** 每个点位满足 `1500m < haversine(point, center) ≤ 3750m`
- **And** 4 种类型覆盖：grain_oil / supermarket / pharmacy / gas_station

**Scenario: 物资点命名 — 品牌名**
- **Given** 生成超市类型物资点
- **When** 调用命名函数
- **Then** 名称从池中选取：`["永辉超市", "物美超市", "华润万家", "大润发"]` 之一（无前缀）

### 3.3 小缓冲区内"已损毁"点位

**Scenario: 生成少量已损毁点位**
- **Given** inner=1500m
- **When** 调用 `generateDamagedPoints(center, 1500)`
- **Then** 返回 0~3 个点位，全部满足 `haversine(point, center) ≤ 1500m`
- **And** 每个点位字段包含 `_damaged: true`
- **And** 渲染时图标灰显（opacity=0.4）

---

## 4. 5 步救援调度流程

### 4.1 调度流程启动

**Scenario: 启动调度流程**
- **Given** 已录入灾情数据并计算 DDI
- **And** 已生成支援点和物资点
- **When** 用户点击"🆘 一键救援"按钮
- **Then** `currentStep` 状态从 `'idle'` 变为 `'step1'`
- **And** 弹窗显示：`"🚨 XX应急管理局已启动应急响应，正在下达调度指令"`
- **And** 等待 3 秒后进入 step2

### 4.2 Step 1 — 应急指令下达

**Scenario: Step 1 执行**
- **Given** currentStep = 'step1'
- **When** 执行 step1 函数
- **Then** 弹窗内容为：`"🚨 {区县名}应急管理局已启动应急响应，正在下达调度指令"`
- **And** 无路径规划动画（指令下达无需移动）
- **And** 持续 3 秒

### 4.3 Step 2 — 消防搜救

**Scenario: Step 2 执行成功**
- **Given** currentStep = 'step2'
- **And** 已选择最近的消防救援站作为支援点
- **When** 执行 step2 函数
- **Then** 弹窗显示：`"🚒 {消防站名称}已出发，预计{X}分钟抵达"`
- **And** 地图上显示消防站→受灾点的路径规划动画，线条颜色 `#e53e3e` 红色
- **And** 3 秒后弹窗更新：`"🚒 消防救援队已抵达受灾点，开始搜救被困人员"`

**Scenario: Step 2 路径规划失败降级**
- **Given** shortest_path 调用返回错误
- **When** 执行 step2
- **Then** 路径降级为直线连接（消防站→受灾点）
- **And** 弹窗仍正常显示
- **And** 流程不中断，继续等待 3 秒后进入 step3

### 4.4 Step 3 — 医疗救治

**Scenario: Step 3 执行**
- **Given** currentStep = 'step3'
- **When** 执行 step3 函数
- **Then** 弹窗显示：`"🚑 {医院名称}已出发，预计{X}分钟抵达"`
- **And** 地图上显示医院→受灾点的路径，颜色 `#d53f8c` 粉色
- **And** 3 秒后弹窗更新：`"🚑 医疗救护队已抵达受灾点，开始现场救治"`

### 4.5 Step 4 — 物资调拨

**Scenario: Step 4 执行**
- **Given** currentStep = 'step4'
- **When** 执行 step4 函数
- **Then** 弹窗显示：`"📦 {物资库名称}已发出物资，包含帐篷X顶、棉被X床..."`
- **And** 地图上显示物资库→受灾点的路径，颜色 `#dd6b20` 橙色
- **And** 3 秒后弹窗更新：`"📦 救灾物资已送达受灾点，开始分发"`

### 4.6 Step 5 — 人员安置

**Scenario: Step 5 执行**
- **Given** currentStep = 'step5'
- **When** 执行 step5 函数
- **Then** 弹窗显示：`"🏕️ {避难场所名称}已开放，正在转移受灾群众"`
- **And** 地图上显示避难场所→受灾点的路径，颜色 `#38a169` 绿色
- **And** 3 秒后弹窗更新：`"✅ 受灾群众已安全转移至应急避难场所"`

### 4.7 调度流程完成

**Scenario: 全部 5 步完成**
- **Given** step5 已执行完毕
- **When** 流程进入 done 状态
- **Then** 弹窗显示总结：`"📋 救援调度全部完成！本次共出动5支救援力量，调拨物资X件，转移群众X人"`
- **And** `currentStep` 状态变为 `'done'`
- **And** `isDispatching` 状态变为 `false`
- **And** 4 条彩色路径同时显示在地图上（红/粉/橙/绿）

### 4.8 调度流程异常

**Scenario: 用户在调度中关闭页面**
- **Given** currentStep = 'step3'
- **When** 组件 unmount
- **Then** 所有定时器被清理（避免内存泄漏）

**Scenario: 重复点击"一键救援"按钮**
- **Given** isDispatching = true
- **When** 用户再次点击按钮
- **Then** 按钮处于 disabled 状态，不响应点击

---

## 5. 受灾点信息卡片（DisasterDetailPanel 改造后）

### 5.1 卡片内容展示

**Scenario: 县区点击弹出改造后的 DisasterDetailPanel**
- **Given** 已访问 `/data-dashboard` 数据大屏
- **When** 用户点击县区或受灾点 marker
- **Then** DisasterDetailPanel 卡片展示包含以下信息：
  ```
  受灾地点：XX附近
  灾情等级：Ⅱ级 重大
  DDI指数：72.5

  【人员伤亡】死亡：5人 | 受伤：128人 | 失踪：12人
  【受灾范围】受灾人口：35,000人 | 转移安置：8,200人
  【房屋损毁】倒塌：1,200间 | 严重损坏：5,600间
  【经济损失】直接经济损失：85,000万元

  【附近支援点位（Xkm内）】
    🏛️ 应急管理局        1.2km
    🚒 消防救援站        2.1km
    🏥 医院急救中心      3.5km
    📦 物资储备库        4.8km
    🏕️ 应急避难场所      2.7km

  【附近物资供应点（Xkm内）】
    🏪 永辉超市          0.8km   方便食品/饮用水/日用品
    💊 国大药房          0.5km   急救药品/消毒用品
    ⛽ 中国石化加油站    1.1km   燃油

  [ 🆘 一键救援 ]
  ```

### 5.2 录入区与评估

**Scenario: 8 指标录入并评估**
- **Given** DisasterDetailPanel 改造后包含 8 指标录入区
- **When** 用户录入 8 项指标数据并点击"评估灾情"
- **Then** 调用 `calculateDDI(formData)` 计算 DDI
- **And** 显示 DDI 数值（保留 2 位小数）
- **And** 显示灾情等级 tag（颜色与 getDisasterLevel 返回一致）
- **And** 卡片切换为"已评估"状态，显示 4 类灾情信息分组

### 5.3 支援点距离排序

**Scenario: 支援点按距离升序展示**
- **Given** 5 个支援点距离分别为 1.2km, 2.1km, 3.5km, 4.8km, 2.7km
- **When** 渲染信息卡片
- **Then** 支援点列表按距离升序排序：1.2 → 2.1 → 2.7 → 3.5 → 4.8

---

## 6. 数据大屏改造（不新增路由与菜单）

### 6.1 路由保持不变

**Scenario: 沿用 /data-dashboard 路由**
- **Given** [router/index.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/router/index.js) 当前路由表
- **When** 本变更部署后
- **Then** 路由表不变，无新增路由条目
- **And** `/data-dashboard` 路由仍指向 `DataDashboardView.vue`
- **And** 旧路由 `/warn-info` / `/coord-response` / `/supply-dispatch` 仍可访问

### 6.2 菜单保持不变

**Scenario: NavSidebar 不修改**
- **Given** [NavSidebar.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/NavSidebar.vue) 现有菜单
- **When** 本变更部署后
- **Then** menuItems 不变，无新增/删除菜单项
- **And** "数据库"分组下的 coord-response / warn-info / supply-dispatch 三项保留

### 6.3 DataDashboardView 改造后布局

**Scenario: 改造后的 DataDashboardView 布局结构**
- **Given** 用户访问 `/data-dashboard`
- **When** 渲染视图
- **Then** 页面布局沿用原数据大屏结构：
  - 左侧：MapboxGL 地图（叠加缓冲区+支援点+物资点+路径）
  - 右侧：原有面板布局
    - DisasterDetailPanel（改造后：8 指标录入 + DDI 展示 + 信息卡片）
    - BufferAnalysisModal（改造后：按 DDI 等级动态选择半径 + 双圈）
    - RoutePlanningModal（改造后：5 步调度 + 4 路彩色并行）
  - 新增"🆘 一键救援"按钮触发 RoutePlanningModal 的 startDispatch

### 6.4 状态管理与数据流

**Scenario: DataDashboardView 集中状态管理**
- **Given** 改造后的 DataDashboardView
- **When** 用户完成灾情录入并点击"评估灾情"
- **Then** DataDashboardView 持有的状态更新：disasterData / ddi / disasterLevel / bufferConfig / supportPoints / supplyPoints / damagedPoints
- **And** 通过 props 下发给 DisasterDetailPanel / BufferAnalysisModal / RoutePlanningModal
- **And** 子组件通过 emit 上报事件（'reassess' / 'analysis-complete' / 'dispatch-step'）

---

## 7. 异常与边界情况

### 7.1 灾情数据缺失

**Scenario: 未录入灾情数据就点击"评估灾情"**
- **Given** 用户尚未录入灾情数据
- **When** 用户点击 DisasterDetailPanel 中的"评估灾情"按钮
- **Then** 提示：`"请先录入灾情数据"`
- **And** DDI 不计算，灾情等级 tag 不显示

**Scenario: 仅录入部分指标**
- **Given** 用户只填写了 deaths 和 injured，其余为空
- **When** 提交录入
- **Then** 空字段默认值为 0，正常计算 DDI（不报错）

### 7.2 缓冲区极端情况

**Scenario: 受灾点在地图边缘**
- **Given** 受灾点接近地图边界
- **When** 生成缓冲区
- **Then** 缓冲区正常渲染（部分超出地图视图，但 GeoJSON 数据完整）

**Scenario: 支援点生成数量不足**
- **Given** 环带面积过小（Ⅳ级，inner=500m, outer=2000m）
- **When** 尝试生成 9 个支援点
- **Then** 退化为生成 5 个（每类至少 1 个），不报错

### 7.3 路径规划异常

**Scenario: shortest_path 返回空路径**
- **Given** 起终点距离过远或无路网连接
- **When** 调用 useShortestPath
- **Then** 返回 null
- **And** 上层组件降级为直线显示
- **And** 弹窗仍正常更新

---

## 8. 兼容性约束

### 8.1 数据大屏改造后功能正常

**Scenario: 改造后的数据大屏完整运行**
- **Given** 本变更已部署
- **When** 访问 `/data-dashboard`
- **Then** 数据大屏正常工作：
  - 县区点击展示改造后的 DisasterDetailPanel（含 8 指标录入 + DDI 评估）
  - DisasterDetailPanel 显示新 8 指标 DDI 评估结果（不再显示原 5 准则风险评分）
  - 改造后的 BufferAnalysisModal 按 DDI 等级动态选择半径并显示双圈
  - 改造后的 RoutePlanningModal 支持 5 步调度流程与 4 路彩色并行
  - "🆘 一键救援"按钮触发调度流程
- **And** 原 `utils/ahp.js` 文件保留未被修改（git diff 检查无变化）
- **And** 原 `utils/ahp.js` 不再被任何组件引用

### 8.2 旧 CRUD 视图仍可访问

**Scenario: 通过 URL 直接访问旧视图**
- **Given** 本变更已部署
- **When** 用户访问 `/warn-info`
- **Then** WarnInfoView 正常加载，CRUD 功能可用
- **And** 后端 `/api/warn-info` 接口正常响应
- **And** 同样适用于 `/coord-response` 和 `/supply-dispatch`

### 8.3 路由与菜单不变

**Scenario: 路由表和导航栏未被修改**
- **Given** 本变更已部署
- **When** 检查 `router/index.js` 和 `NavSidebar.vue`
- **Then** 两个文件均未被修改（git diff 检查无变化）
- **And** 所有原有路由仍可正常访问
- **And** 导航栏菜单项不变

---

## 9. 性能要求

| 场景 | 指标 |
|------|------|
| DDI 计算 | < 10ms |
| 缓冲区渲染 | < 500ms |
| 支援点+物资点生成 | < 200ms |
| 5 步调度全流程 | 总时长 15~25 秒（含 3 秒 × 4 间隔） |
| 4 条路径并行显示 | 单条路径规划响应 < 2 秒 |

---

## 10. 验证矩阵

| Spec 章节 | 验证方式 | 验收文件 |
|----------|---------|---------|
| §1 AHP-DDI 算法 | 单元测试 + 文档示例断言 | earthquakeAhp.test.js |
| §2 双缓冲区 | 视觉验证 + 配置断言 | checklist.md §2 |
| §3 点位生成 | 数量断言 + 距离断言 | checklist.md §3 |
| §4 5 步调度 | 端到端流程演示 | checklist.md §4 |
| §5 信息卡片（DisasterDetailPanel 改造后） | 视觉验证 | checklist.md §5 |
| §6 数据大屏改造 | 路由/菜单不变性检查 + 点击测试 | checklist.md §5/§6 |
| §7 异常处理 | 异常场景测试 | checklist.md §7 |
| §8 兼容性 | 数据大屏改造后回归测试 + ahp.js 未修改检查 | checklist.md §8 |
| §9 性能 | 浏览器 DevTools | checklist.md §9 |
