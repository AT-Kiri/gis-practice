# Design — 重构"监测-预警-联动"模块为地震灾害专属评估与救援流程

> 变更 ID：`20260705-earthquake-rescue-refactor`
> 创建时间：2026-07-05

---

## 1. Context（上下文）

### 1.1 现有架构

```
frontend/src/
├── utils/
│   ├── ahp.js                    # 灾前 AHP 5 准则风险评估（数据大屏使用）
│   └── mockData.js               # 县区灾害模拟数据
├── views/
│   ├── WarnInfoView.vue          # 气象灾害预警主表 CRUD
│   ├── CoordResponseView.vue    # 协同处置响应表 CRUD
│   ├── SupplyDispatchView.vue    # 物资调度表 CRUD
│   └── DataDashboardView.vue     # 数据大屏（保留，不修改）
├── components/
│   ├── dashboard/
│   │   ├── DisasterDetailPanel.vue    # 数据大屏灾害详情（用原 ahp.js）
│   │   ├── BufferAnalysisModal.vue     # 缓冲区分析弹窗
│   │   ├── RoutePlanningModal.vue      # 路径规划弹窗
│   │   └── DashboardMap.vue            # 大屏地图组件
│   └── NavSidebar.vue            # 左侧导航栏
└── router/index.js               # 路由配置
```

### 1.2 既有可复用资产

| 资产 | 位置 | 复用方式 |
|------|------|---------|
| MapboxGL 地图实例 | DataDashboardView.vue 的初始化逻辑 | 抽取为 `useEarthquakeMap()` composable，新视图复用 |
| 缓冲区分析弹窗 | BufferAnalysisModal.vue | 参考其 SuperMap iServer 调用方式，新组件按等级化半径重写 |
| 路径规划弹窗 | RoutePlanningModal.vue | 参考其 shortest_path 调用方式，新组件支持多路径彩色叠加 |
| 请求工具 | utils/request.js | 直接复用 |
| 地图工具 | utils/map.js | 直接复用 |

### 1.3 关键约束

| 约束 | 来源 | 影响 |
|------|------|------|
| 仅地震灾害 | 用户明确要求 | 移除其他灾害类型分支 |
| AHP 8 指标 DDI 模型 | docs/ahp-disaster-assessment.md | 替代原 5 准则 AHP（ DisasterDetailPanel 改用新算法） |
| 5 步救援流程 | docs/earthquake-rescue-design.md §1 | 调度顺序固定 |
| 等级化缓冲区 | docs/earthquake-rescue-design.md §6.2 | 4 套半径配置 |
| 改造现有组件不新增页面 | 用户明确要求 | 沿用 `/data-dashboard` 路由，不修改 router/NavSidebar |
| 不删除原 ahp.js | 用户明确要求 | 文件保留作为备份，但不再被引用 |
| CRUD 视图暂不处理 | 用户明确要求 | 先用模拟数据，待主流程通过后再处理 |
| Vue 3 Composition API | frontend_rules.md §1 | 全部使用 `<script setup>` |
| Ant Design Vue 组件 | frontend_rules.md §2 | UI 统一风格 |

---

## 2. Goals / Non-Goals

### 2.1 Goals（本变更必须达成）

1. **G1 — AHP-DDI 算法层**：实现 8 指标 DDI 计算函数，输入 8 项灾情数据 → 输出 DDI（0~100）+ 4 级灾情等级
2. **G2 — 等级化双缓冲区**：按 DDI 等级动态选择缓冲区半径，渲染红色内圈+橙色外圈
3. **G3 — 支援点/物资点生成**：在环带内生成 5 类支援点（每类至少 1 个）+ 4 类物资点，按 3 种命名策略命名
4. **G4 — 5 步调度流程**：实现应急指令→消防搜救→医疗救治→物资调拨→人员安置的顺序执行，每步配路径规划动画+弹窗
5. **G5 — 改造数据大屏**：改造现有 5 个文件（mockData/DisasterDetailPanel/BufferAnalysisModal/RoutePlanningModal/DataDashboardView）整合录入→评估→缓冲区→调度全流程
6. **G6 — 沿用路由与菜单**：不修改 router/index.js 和 NavSidebar.vue，沿用 `/data-dashboard` 路由入口

### 2.2 Non-Goals（本变更明确不做）

1. **NG1 — 不新增独立页面**：不创建 EarthquakeRescueView.vue，沿用数据大屏路由
2. **NG2 — 不修改路由和导航栏**：router/index.js 和 NavSidebar.vue 保持原状
2. **NG3 — 不删除后端 CRUD**：保留 WarnInfo / CoordResponse / SupplyDispatch 三套 Controller/Service/Mapper
3. **NG4 — 不持久化地震灾情记录**：本次只做前端模拟，后端持久化在后续迭代
4. **NG5 — 不接入真实 POI 数据**：支援点和物资点采用按规则的随机模拟（带命名策略）
5. **NG6 — 不做多灾种扩展**：仅地震，不预留火灾/洪涝接口
6. **NG7 — 不重构路径规划算法**：复用现有 shortest_path 工具
7. **NG8 — 不删除原 ahp.js 文件**：保留作为备份，DisasterDetailPanel 改用新 earthquakeAhp.js
8. **NG9 — 不处理 3 个 CRUD 视图**：WarnInfoView/CoordResponseView/SupplyDispatchView 暂不动

### 2.3 成功标准

| 编号 | 标准 | 验证方式 |
|------|------|---------|
| S1 | DDI 计算与文档示例一致 | 输入文档示例数据，断言 DDI 与手动验算一致 |
| S2 | 4 级缓冲区半径与文档表一致 | 单元测试 4 个等级 |
| S3 | 5 步调度顺序与《国家地震应急预案》§4.3 一致 | 端到端流程演示 |
| S4 | 支援点至少 5 个（每类至少 1 个） | 生成后断言数量 |
| S5 | 物资点 4~8 个，4 类齐全 | 生成后断言类型覆盖 |
| S6 | 调度路径 4 色叠加（红/粉/橙/绿） | 视觉验证 |
| S7 | 数据大屏路由和菜单不变 | 回归测试 |
| S8 | 原 ahp.js 文件未被修改 | git diff 检查 |

---

## 3. Decisions（技术决策）

### 3.1 决策 D1 — 新旧 AHP 算法分离

**背景**：原 `utils/ahp.js`（5 准则灾前风险评估）被数据大屏使用，新需求要求 8 指标灾后灾情评估。两套算法用途不同、模型不同。

**方案对比**：

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A. 改写原 ahp.js | 替换为 8 指标 DDI 算法 | 文件少 | 数据大屏需要同步迁移，风险大 |
| B. 新建 earthquakeAhp.js | 独立文件，原 ahp.js 保留 | 零影响 | 文件冗余 |
| C. 抽包+两实现 | 抽 ahp/ 目录，含 risk.js 和 ddi.js | 结构清晰 | 改动大 |

**决策**：选 **B**，新建 `frontend/src/utils/earthquakeAhp.js`，原 `ahp.js` 不动。

**理由**：
- 数据大屏是已交付功能，遵循"精准修改"原则不破坏现有功能
- 两套算法语义不同（灾前风险 vs 灾后灾情），独立文件更清晰
- 文件冗余可接受，因为后续可能扩展其他灾种

### 3.2 决策 D2 — 改造现有弹窗 vs 新增独立组件

**背景**：用户明确要求不新增独立页面，整合进现有"监测-预警-联动"模块（即数据大屏）。数据大屏已有 BufferAnalysisModal.vue 和 RoutePlanningModal.vue 两个弹窗，承载缓冲区与路径规划功能。需要决策：是改造这两个现有弹窗，还是新增独立的 RescueDispatchPanel.vue 组件。

**方案对比**：

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A. 改造现有 5 个文件 | mockData + DisasterDetailPanel + BufferAnalysisModal + RoutePlanningModal + DataDashboardView 原地改造 | 零新增文件，复用现有 UI 框架与地图实例 | 单文件改动量大，回归风险集中 |
| B. 新增 RescueDispatchPanel.vue | 保留现有弹窗，新增独立调度面板组件 | 新旧解耦，便于回滚 | 文件数+1，且数据大屏出现两套缓冲区/路径逻辑 |
| C. 双轨并存 | 现有弹窗保留，新增组件作为"高级模式"切换 | 用户可选 | 实现复杂度翻倍，违背"简洁优先" |

**决策**：选 **A**，改造现有 5 个文件（mockData.js / DisasterDetailPanel.vue / BufferAnalysisModal.vue / RoutePlanningModal.vue / DataDashboardView.vue）。

**理由**：
- 用户明确要求"不新增独立页面，整合进现有模块"
- 现有弹窗 UI 框架（标题、关闭按钮、AntD Modal 容器）可复用，仅改造内部逻辑
- 避免数据大屏出现两套并行的缓冲区/路径规划逻辑
- 改造现有 mockData.js 简化为只生成地震数据，符合"精准修改"原则
- DisasterDetailPanel 改用新 earthquakeAhp.js 即可，原 ahp.js 保留作备份不被引用

**改造范围**：

| 文件 | 改造内容 | 保留内容 |
|------|---------|---------|
| mockData.js | 移除 6 种非地震灾害，只生成地震灾害 | 数据结构、导出方式 |
| DisasterDetailPanel.vue | AHP 计算改用 earthquakeAhp.js，新增 DDI+等级展示 | UI 卡片布局、字段标签 |
| BufferAnalysisModal.vue | 缓冲区半径改为按 DDI 等级动态选择，新增内/外双圈 | Modal 容器、标题、关闭逻辑 |
| RoutePlanningModal.vue | 新增 4 路彩色并行显示，集成 useShortestPath | 起终点输入、调用 shortest_path |
| DataDashboardView.vue | 整合 5 步调度流程编排，新增"一键救援"按钮 | 地图初始化、县区点击、菜单布局 |

### 3.3 决策 D3 — 支援点命名策略

**背景**：docs/earthquake-rescue-design.md §2.2 示例使用"朝阳区""望京"等北京地名前缀，但实际受灾点可能在京津冀任意地区。

**方案对比**：

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A. 完全套用文档示例 | 固定"朝阳区消防救援站"等 | 简单 | 与受灾地区不匹配时违和 |
| B. 全部用通用名 | "消防救援站"无前缀 | 通用 | 缺乏真实感 |
| C. 三策略混合 | 受灾点有区县名时用区县名，无则通用名，商业点用品牌名 | 真实感强 | 实现略复杂 |

**决策**：选 **C**，三种策略混合：

| 点位类型 | 命名策略 | 示例 |
|---------|---------|------|
| 应急管理局 | 区县名前缀（受灾点所属区县） | 朝阳区应急管理局 |
| 消防救援站 | 区县名前缀 + 序号（多个时） | 朝阳区消防救援站、朝阳区第二消防救援站 |
| 医院急救中心 | 通用医院名（无前缀） | 市人民医院急救中心、中日友好医院急救中心 |
| 应急物资储备库 | 城市名前缀 | 北京市救灾物资储备库、中央救灾物资储备库 |
| 应急避难场所 | 公园名（无前缀） | 朝阳公园应急避难场所、奥林匹克森林公园应急避难场所 |
| 粮油储备库 | 品牌/连锁名 | 中粮粮油储备库、金源粮油批发市场 |
| 大型超市 | 品牌名 + 分店后缀 | 永辉超市、物美超市、华润万家 |
| 药店 | 品牌名 | 国大药房、同仁堂 |
| 加油站 | 品牌名 | 中国石化加油站、中国石油加油站 |

**实现方式**：在 `utils/earthquakeNaming.js` 中维护名称池 + 策略选择函数。

### 3.4 决策 D4 — 路径规划调用方式

**背景**：现有 `RoutePlanningModal.vue` 已封装 shortest_path 调用，但每次只支持单条路径。新需求需要 4 条彩色路径并行显示。

**方案对比**：

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A. 复用 RoutePlanningModal 4 次 | 弹窗依次打开 | 复用代码 | 用户体验差，无并行效果 |
| B. 抽取 useShortestPath composable | 复用底层 API，上层新组件 | 灵活 | 需重构现有弹窗 |
| C. 直接调用 shortest_path 工具 | 新组件独立实现 | 独立 | 重复代码 |

**决策**：选 **B**，抽取 `composables/useShortestPath.js`，原 RoutePlanningModal 改造为使用该 composable（可选，本变更不强制），新组件 `RescueDispatchPanel.vue` 使用同一 composable 实现 4 路并行。

**理由**：
- composable 模式符合 Vue 3 最佳实践
- 避免重复封装 iServer 调用
- 新旧组件解耦，互不影响

### 3.5 决策 D5 — 5 步调度流程编排

**背景**：5 步调度需要顺序执行，每步间隔 3~5 秒，期间有路径动画+弹窗。

**方案对比**：

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A. Promise 链式调用 | `step1().then(step2).then(step3)` | 直观 | 难中断，状态管理混乱 |
| B. async/await + 状态机 | 用 ref 管理 currentStep | 易控制 | 略复杂 |
| C. Pinia store + actions | 集中状态管理 | 全局可访问 | 本变更无跨组件共享需求 |

**决策**：选 **B**，使用 `ref('idle' | 'step1' | ... | 'step5' | 'done')` 状态机 + async/await 编排。

**实现要点**：
```js
const currentStep = ref('idle')
const isDispatching = ref(false)

async function startDispatch() {
  isDispatching.value = true
  for (const step of [step1, step2, step3, step4, step5]) {
    await step()
    await sleep(3000) // 3 秒间隔
  }
  isDispatching.value = false
  currentStep.value = 'done'
}
```

### 3.6 决策 D6 — 缓冲区图层渲染方式

**背景**：双缓冲区需要红色内圈+橙色外圈，且小缓冲区内 POI 灰显。

**方案对比**：

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A. 两层 fill layer | map.addSource + addLayer 两次 | 简单 | 需手动管理 z-order |
| B. 一层 fill + 一层 outline | 外圈填充+内圈描边 | 视觉好 | 描边不显面积 |
| C. SuperMap iServer buffer API | 后端算缓冲区 | 标准 | 已有 BufferAnalysisModal 模式，但本变更用前端圆 |

**决策**：选 **A**，两层独立 fill layer，外圈先添加（下层），内圈后添加（上层），通过 layer id 顺序保证 z-order。

**实现要点**：
- 外圈 layer id：`earthquake-buffer-outer`
- 内圈 layer id：`earthquake-buffer-inner`
- 添加顺序：外圈先，内圈后，确保内圈在上
- POI 灰显通过给小缓冲区内点位设置 `_damaged=true` 属性，在 symbol layer 的 paint 中根据属性切换 icon-opacity

### 3.7 决策 D7 — 数据流架构

**背景**：改造数据大屏后，从录入→评估→缓冲区→调度，数据需要在 DataDashboardView 及其子组件（DisasterDetailPanel / BufferAnalysisModal / RoutePlanningModal）间流转。

**决策**：使用 `DataDashboardView 集中状态管理 + props 下发 + emit 上报`的轻量数据流，不引入 Pinia store，不使用 provide/inject。

**理由**：
- 数据大屏改造后仍为单视图层级，DataDashboardView 作为父组件持有全部状态
- 改造的子组件（DisasterDetailPanel / BufferAnalysisModal / RoutePlanningModal）本就是 DataDashboardView 的子组件，沿用 props/emit 模式与现有代码风格一致
- Pinia store 会引入额外复杂度，违背"简洁优先"
- provide/inject 在改造场景下与 props/emit 等价，但 props/emit 更显式、可追溯

**数据流图**：
```
DataDashboardView (持有: disasterData, ddi, disasterLevel, bufferConfig, supportPoints, supplyPoints, currentStep)
    │
    ├── props: disasterData, ddi, disasterLevel ──→ DisasterDetailPanel
    │       ↑ emit('reassess', formData) ──────────────── 触发重新评估
    │
    ├── props: visible, bufferConfig, center ──→ BufferAnalysisModal
    │       ↑ emit('analysis-complete', result) ──────── 缓冲区分析完成
    │
    ├── props: visible, supportPoints, disasterCenter, currentStep ──→ RoutePlanningModal
    │       ↑ emit('dispatch-step', step) ─────────────── 调度步骤推进
    │
    └── 内部状态：mockData 简化为地震数据 → 县区点击触发 DisasterDetailPanel 显示
```

### 3.8 决策 D8 — 阶段化交付

**背景**：变更涉及 5 个层次（算法、缓冲区、点位、调度、视图），单次交付风险大。

**决策**：按 tasks.md 分 5 个阶段，每阶段独立可验证，前序阶段交付后才进入下一阶段。

**阶段间依赖**：
```
阶段1 (AHP算法) ←─ 阶段2 (缓冲区) ←─ 阶段3 (点位生成)
                                          ↓
                  阶段5 (视图整合) ←── 阶段4 (调度流程)
```

每阶段交付后，运行阶段验收检查点（见 checklist.md），全部通过才进入下一阶段。

---

## 4. 模块设计

### 4.1 算法层（earthquakeAhp.js）

```js
// 全局权重常量（来源：SL 579-2012 + 《国家地震应急预案》）
export const WEIGHTS = {
  deaths: 0.2457, injured: 0.0744, missing: 0.1352,
  affected_pop: 0.1752, evacuated: 0.0876,
  collapsed_houses: 0.1057, damaged_houses: 0.0352,
  economic_loss: 0.1409,
}

// 指标阈值（参考值，可按区域调整）
export const THRESHOLDS = {
  deaths: [0, 300], injured: [0, 1000], missing: [0, 100],
  affected_pop: [0, 100000], evacuated: [0, 100000],
  collapsed_houses: [0, 10000], damaged_houses: [0, 50000],
  economic_loss: [0, 1000000],
}

// 缓冲区配置（来源：docs/earthquake-rescue-design.md §6.2）
export const BUFFER_CONFIG = {
  1: { name: '特别重大', inner: 2000, outer: 8000, ... },
  2: { name: '重大',     inner: 1500, outer: 6000, ... },
  3: { name: '较大',     inner: 1000, outer: 4000, ... },
  4: { name: '一般',     inner: 500,  outer: 2000, ... },
}

export function normalize(raw, min, max) { ... }
export function calculateDDI(data) { ... }
export function getDisasterLevel(ddi) { ... }
export function getBufferConfig(ddiLevel) { ... }
```

### 4.2 视图层（改造后的 DataDashboardView.vue）

```
┌─────────────────────────────────────────────────────────────┐
│ DataDashboardView (持有全部状态: disasterData, ddi,         │
│   disasterLevel, bufferConfig, supportPoints, supplyPoints, │
│   damagedPoints, currentStep, isDispatching)               │
├──────────────┬──────────────────────────────────────────────┤
│ 左侧地图     │ 右侧面板（沿用原数据大屏布局）                │
│              │                                              │
│ MapboxGL     │ ┌──────────────────────────────────────────┐│
│ + Buffer     │ │ DisasterDetailPanel (改造后)             ││
│   ZoneLayer  │ │   - 8 指标录入（新增）                   ││
│   (改造自    │ │   - DDI + 灾情等级展示（新 earthquakeAhp）│
│    Buffer    │ │   - 4 类灾情信息分组                     ││
│    Analysis  │ │   - 附近支援点+物资点列表（按距离排序）   ││
│    Modal)    │ │   - [🆘 一键救援] 按钮                   ││
│ + Support    │ ├──────────────────────────────────────────┤│
│   PointLayer │ │ BufferAnalysisModal (改造后)             ││
│   (新增)     │ │   - 缓冲区半径按 DDI 等级动态选择         ││
│ + 4 路彩色  │ │   - 内/外双圈叠加显示                     ││
│   路径      │ │   - 外圈橙、内圈红                       ││
│   (改造自    │ ├──────────────────────────────────────────┤│
│    Route     │ │ RoutePlanningModal (改造后)              ││
│    Planning  │ │   - 5 步调度流程编排                      ││
│    Modal)    │ │   - Step 1: 应急指令（无路径）           ││
│              │ │   - Step 2: 消防搜救 → 红色路径          ││
│              │ │   - Step 3: 医疗救治 → 粉色路径          ││
│              │ │   - Step 4: 物资调拨 → 橙色路径          ││
│              │ │   - Step 5: 人员安置 → 绿色路径          ││
│              │ │   - 总结弹窗                             ││
│              │ └──────────────────────────────────────────┘│
└──────────────┴──────────────────────────────────────────────┘
```

**关键改造点**：
- DisasterDetailPanel 新增 8 指标录入区，AHP 计算切换为 earthquakeAhp.js
- BufferAnalysisModal 内部逻辑改为按 DDI 等级选择半径，UI 框架保留
- RoutePlanningModal 内部新增 5 步调度状态机，UI 框架保留
- DataDashboardView 新增"一键救援"按钮触发调度流程，新增 currentStep 状态

### 4.3 调度流程状态机

```
idle ──[录入提交]──→ ready ──[点击"一键救援"]──→ dispatching
                                                      │
                              ┌───────────────────────┴───────────────────────┐
                              ↓                                               │
                          step1 (应急指令)  ─── 弹窗                            │
                              ↓ wait 3s                                         │
                          step2 (消防搜救)  ─── 路径动画+弹窗                    │
                              ↓ wait 3s                                         │
                          step3 (医疗救治)  ─── 路径动画+弹窗                    │
                              ↓ wait 3s                                         │
                          step4 (物资调拨)  ─── 路径动画+弹窗                    │
                              ↓ wait 3s                                         │
                          step5 (人员安置)  ─── 路径动画+弹窗                    │
                              ↓ wait 3s                                         │
                          done ─── 总结弹窗                                      │
                                                                            (回到 idle)
```

---

## 5. 风险与权衡

### 5.1 风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 5 步调度动画卡顿 | 用户体验差 | 路径规划异步加载，弹窗先用骨架屏 |
| 支援点生成在小缓冲区内 | 违反规则 | 生成后用 haversine 校验，剔除无效点 |
| shortest_path 调用失败 | 调度中断 | 单点失败时降级显示直线连接，继续后续步骤 |
| 改造现有组件破坏原功能 | 数据大屏已交付的县区点击、灾害详情展示受损 | 逐文件改造，每步回归验证；保留原 ahp.js 作备份 |
| 缓冲区 z-order 错乱 | 视觉混乱 | 明确 layer id 顺序，外圈先内圈后 |
| mockData 移除其他灾种影响现有展示 | 数据大屏其他灾害类型展示异常 | 确认仅地震场景，其他灾种本就为 mock 演示 |
| DisasterDetailPanel 改造影响县区点击响应 | 县区点击不再弹出详情 | 保留原 props 接口，仅扩展内部计算逻辑 |

### 5.2 权衡

| 取舍 | 选择 | 牺牲了什么 |
|------|------|-----------|
| 算法独立文件 vs 抽包 | 独立文件 | 文件冗余 |
| 改造现有弹窗 vs 新增独立组件 | 改造现有弹窗 | 单文件改动量大，回归风险集中 |
| 前端模拟 vs 后端持久化 | 前端模拟 | 刷新后数据丢失 |
| Pinia vs props/emit | props/emit | 跨视图状态共享弱（本变更无此需求） |
| mockData 简化为只留地震 vs 多灾种并存 | 只留地震 | 失去多灾种演示能力（用户明确要求） |

---

## 6. 依赖与参考

### 6.1 文档依赖

- [ahp-disaster-assessment.md](file:///d:/Code/AI-Code/GIS-Practice/docs/ahp-disaster-assessment.md) — AHP 8 指标权重、DDI 公式、4 级阈值
- [earthquake-rescue-design.md](file:///d:/Code/AI-Code/GIS-Practice/docs/earthquake-rescue-design.md) — 5 步调度流程、双缓冲区配置、点位生成规则

### 6.2 国家标准

1. 《国家地震应急预案》（国办函〔2025〕102号），国务院办公厅，2025年10月
2. SL 579-2012《洪涝灾情评估标准》，中华人民共和国水利部，2012
3. GB/T 17742-2020《中国地震烈度表》
4. GB 51080-2015《城市消防规划规范》
5. GB/T 44013-2024《应急避难场所 分级及分类》

### 6.3 既有代码依赖

- [utils/request.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/request.js) — axios 封装
- [utils/map.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/map.js) — 地图工具
- [components/dashboard/BufferAnalysisModal.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/dashboard/BufferAnalysisModal.vue) — 缓冲区调用参考
- [components/dashboard/RoutePlanningModal.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/dashboard/RoutePlanningModal.vue) — 路径规划调用参考
