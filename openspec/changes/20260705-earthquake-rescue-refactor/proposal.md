# Proposal — 重构"监测-预警-联动"模块为地震灾害专属评估与救援流程

> 变更 ID：`20260705-earthquake-rescue-refactor`
> 创建时间：2026-07-05
> 父变更：`20260626-data-dashboard`

---

## 1. Why（业务背景）

### 1.1 现状问题

当前"监测-预警-联动"模块以 [DataDashboardView.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/views/DataDashboardView.vue) 数据大屏为核心，包含 [DisasterDetailPanel.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/dashboard/DisasterDetailPanel.vue) 灾害详情、[BufferAnalysisModal.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/dashboard/BufferAnalysisModal.vue) 缓冲区分析、[RoutePlanningModal.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/dashboard/RoutePlanningModal.vue) 路径规划。框架已具备，但**不够真实、流程不够规范**：

1. **灾害类型泛化**：[mockData.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/mockData.js) 模拟 7 种灾害（洪涝/大风/地震/滑坡/暴雨/干旱/冰雹），业务焦点分散
2. **灾害评级不科学**：[ahp.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/ahp.js) 使用 5 准则（降雨/风力/地震强度/受灾人数/救援能力）做灾前风险评估，与项目文档 [ahp-disaster-assessment.md](file:///d:/Code/AI-Code/GIS-Practice/docs/ahp-disaster-assessment.md) 中的 8 指标灾后灾情评估模型不一致
3. **救援流程不完整**：BufferAnalysisModal 仅做单缓冲区+随机点位，无"指令下达→消防→医疗→物资→安置"的完整应急流程
4. **救援点生成不符合规范**：mockData.js 中 `generateRescuePoints/generateSupplyPoints` 纯随机模拟，未遵循《国家地震应急预案》§4.3 处置措施顺序
5. **缓冲区半径硬编码**：单一固定半径，与 [earthquake-rescue-design.md](file:///d:/Code/AI-Code/GIS-Practice/docs/earthquake-rescue-design.md) 中按灾情等级分级配置（Ⅰ/Ⅱ/Ⅲ/Ⅳ）的双缓冲区设计不符
6. **路径规划单一**：RoutePlanningModal 仅支持单条路径，无法体现 5 步调度的并行救援

> **注**：[WarnInfoView.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/views/WarnInfoView.vue) / [CoordResponseView.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/views/CoordResponseView.vue) / [SupplyDispatchView.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/views/SupplyDispatchView.vue) 三个独立 CRUD 视图暂不处理，先专注数据大屏的重构。CRUD 数据先用模拟数据替代，待主流程通过后再处理。

### 1.2 业务驱动

依据国务院办公厅《国家地震应急预案》（国办函〔2025〕102号，2025年10月）及水利部 SL 579-2012《洪涝灾情评估标准》，需将现有数据大屏重构为符合国家规范要求的地震灾后评估与应急救援模拟模块。

课设项目范围内，聚焦单一灾种（地震）有助于：

- **深度优先**：在单一灾种上完整呈现 AHP 评估、双缓冲区、5 步调度全流程
- **规范对齐**：评级阈值、调度顺序、缓冲区半径均有国家标准背书
- **可演示性**：5 步调度 + 路径规划动画 + 弹窗信息有更好的可视化效果
- **零新增页面**：沿用现有数据大屏路由和菜单入口，不破坏现有导航结构

---

## 2. What（变更内容）

### 2.1 模块重构方向

**改造数据大屏**为以地震灾害为核心的**一体化救援调度模块**。沿用 `/data-dashboard` 路由和"数据大屏"菜单入口，不新增页面，改造现有 5 个文件：

| 层次 | 名称 | 改造对象 | 重构方向 |
|------|------|---------|---------|
| 监测层 | 地震灾情录入与 AHP-DDI 评估 | DisasterDetailPanel.vue + BufferAnalysisModal.vue | 录入 8 项灾情指标 → 计算 DDI → 输出 Ⅰ/Ⅱ/Ⅲ/Ⅳ 灾情等级 |
| 预警层 | 双缓冲区灾害影响分析 | BufferAnalysisModal.vue | 按 DDI 等级配置内/外缓冲区半径，生成灾害影响范围与支援搜索环带 |
| 联动层 | 5 步应急救援调度 | RoutePlanningModal.vue | 按《国家地震应急预案》5 步顺序调度支援点+物资点+路径规划 |
| 数据层 | 县区模拟数据 | mockData.js | 仅生成地震灾害数据，移除其他 6 种灾害 |
| 状态层 | 主视图状态管理 | DataDashboardView.vue | 增加 DDI 等级、支援点、调度状态等状态字段 |

### 2.2 灾害评级重构

依据 [ahp-disaster-assessment.md](file:///d:/Code/AI-Code/GIS-Practice/docs/ahp-disaster-assessment.md) 重构 AHP 算法：

- **8 个指标**（替代原 5 准则）：死亡人口、受伤人口、失踪人口、受灾人口、紧急转移安置人口、倒塌房屋、严重损坏房屋、直接经济损失
- **全局权重**（来源于 SL 579-2012 + 《国家地震应急预案》）：

| 编号 | 指标 | 全局权重 |
|------|------|---------|
| C11 | 死亡人口 | 0.2457 |
| C21 | 受灾人口 | 0.1752 |
| C41 | 直接经济损失 | 0.1409 |
| C13 | 失踪人口 | 0.1352 |
| C31 | 倒塌房屋 | 0.1057 |
| C22 | 紧急转移安置人口 | 0.0876 |
| C12 | 受伤人口 | 0.0744 |
| C32 | 严重损坏房屋 | 0.0352 |

- **DDI 计算公式**：`DDI = Σ (全局权重 × 标准化指标值)`，输出 0~100
- **4 级灾情等级**（依据 SL 579-2012 阈值）：
  - Ⅰ级 特别重大：DDI ≥ 80
  - Ⅱ级 重大：60 ≤ DDI < 80
  - Ⅲ级 较大：40 ≤ DDI < 60
  - Ⅳ级 一般：DDI < 40

### 2.3 救援流程重构

依据 [earthquake-rescue-design.md](file:///d:/Code/AI-Code/GIS-Practice/docs/earthquake-rescue-design.md) §1 的 5 步调度顺序：

| 步骤 | 名称 | 执行单位 | 行为 |
|------|------|---------|------|
| 1 | 应急指令下达 | 应急管理局 | 启动应急响应，原地弹窗 |
| 2 | 消防搜救 | 消防救援站 | 出动消防车辆+生命探测仪，路径规划 |
| 3 | 医疗救治 | 医院急救中心 | 出动救护车，现场救治并转运 |
| 4 | 物资调拨 | 应急物资储备库 | 调拨帐篷/折叠床/棉被等中央救灾物资 |
| 5 | 人员安置 | 应急避难场所 | 开放避难场所，转移受灾群众 |

### 2.4 支援点/物资点命名策略

不照搬文档示例的"朝阳区"等地名前缀，按以下规则生成名称：

| 策略 | 适用场景 | 命名规则 |
|------|---------|---------|
| **受灾地区名作为前缀** | 受灾点有明确行政区名时 | `{受灾点所属区县名}消防救援站`（如"朝阳区消防救援站"） |
| **通用功能名** | 无法确定行政区时 | `消防救援站`、`应急避难场所`（仅保留类型功能名） |
| **品牌/连锁名** | 商业物资点 | `永辉超市`、`国大药房`、`中国石化加油站`（无前缀） |

支援点类型固定 5 类（每类至少 1 个）：
- 应急管理局 `#3182ce`
- 消防救援站 `#e53e3e`
- 医院急救中心 `#d53f8c`
- 应急物资储备库 `#dd6b20`
- 应急避难场所 `#38a169`

物资点类型固定 4 类：
- 粮油储备库 `#d69e2e`（大米/面粉/食用油）
- 大型超市 `#805ad5`（方便食品/饮用水/日用品/肉菜蛋奶）
- 药店 `#38a169`（急救药品/消毒用品/医用绷带）
- 加油站 `#718096`（燃油）

### 2.5 双缓冲区按灾情等级配置

依据 [earthquake-rescue-design.md](file:///d:/Code/AI-Code/GIS-Practice/docs/earthquake-rescue-design.md) §6.2：

| DDI 等级 | 灾情名称 | 小缓冲区（灾害影响） | 大缓冲区（支援搜索） | 环带宽度 |
|----------|---------|---------------------|---------------------|---------|
| Ⅰ级 | 特别重大 | 2000m | 8000m | 6000m |
| Ⅱ级 | 重大 | 1500m | 6000m | 4500m |
| Ⅲ级 | 较大 | 1000m | 4000m | 3000m |
| Ⅳ级 | 一般 | 500m | 2000m | 1500m |

- 小缓冲区：红色半透明 `rgba(229, 62, 62, 0.25)`
- 大缓冲区：橙色半透明 `rgba(221, 107, 32, 0.15)`

### 2.6 点位生成规则

- **支援点**：在**环带**（小缓冲区外 ~ 大缓冲区内）随机生成 5~9 个（每种类型至少 1 个）
- **物资点**：在**环带内侧**（小缓冲区外 ~ 大缓冲区中点）随机生成 4~8 个
- **小缓冲区内**：可生成少量"已损毁"灰显点位，增加真实感

---

## 3. Capabilities（新增/修改能力）

### 3.1 新增能力

| 编号 | 能力 | 说明 |
|------|------|------|
| CAP-01 | 8 指标灾情录入 | 录入死亡/受伤/失踪/受灾人口等 8 项指标 |
| CAP-02 | DDI 自动计算 | 基于全局权重+极值标准化计算灾情综合指数（0~100） |
| CAP-03 | 4 级灾情等级判定 | 输出 Ⅰ/Ⅱ/Ⅲ/Ⅳ 等级及对应颜色 |
| CAP-04 | 等级化双缓冲区 | 按 DDI 等级动态选择缓冲区半径 |
| CAP-05 | 5 步调度流程 | 应急指令→消防搜救→医疗救治→物资调拨→人员安置 |
| CAP-06 | 支援点智能命名 | 按受灾点行政区名/通用功能名/品牌名三种策略命名 |
| CAP-07 | 路径规划动画 | 每个调度步骤显示彩色路径线段（红/粉/橙/绿） |
| CAP-08 | 受灾点信息卡片 | 弹窗显示灾情信息+附近支援点+物资点列表 |

### 3.2 修改能力（改造现有组件）

| 编号 | 能力 | 变更前 | 变更后 |
|------|------|-------|-------|
| MOD-01 | AHP 算法 | 原 ahp.js 5 准则灾前风险评估 | 新 earthquakeAhp.js 8 指标灾后灾情评估（DDI），DisasterDetailPanel 改用新算法 |
| MOD-02 | 县区灾害数据 | mockData.js 7 种灾害随机生成 | mockData.js 仅生成地震灾害数据 |
| MOD-03 | 缓冲区分析弹窗 | BufferAnalysisModal 单缓冲区+随机点 | 顶部加 8 指标录入，缓冲区改为 DDI 等级双缓冲区+真实流程支援点 |
| MOD-04 | 路径规划弹窗 | RoutePlanningModal 单条路径 | 改造为 5 步状态机+4 条彩色路径并行+5 个步骤弹窗 |
| MOD-05 | 灾害详情面板 | DisasterDetailPanel 用原 ahp.js 5 准则 | 改用 earthquakeAhp.js 8 指标 DDI，按钮改为"启动地震救援" |
| MOD-06 | 主视图状态 | DataDashboardView 仅选县区 | 增加 DDI 等级、支援点、调度状态等状态字段 |
| MOD-07 | 缓冲区半径 | 固定半径 | 按 Ⅰ/Ⅱ/Ⅲ/Ⅳ 等级分级（4 套配置） |
| MOD-08 | 支援点生成 | mockData.js 纯随机 | 按《国家地震应急预案》5 类执行单位生成，三策略命名 |

### 3.3 保留不动的资产

| 编号 | 资产 | 处理方式 |
|------|------|---------|
| KEEP-01 | [ahp.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/ahp.js) 5 准则灾前 AHP | 文件保留，但不再被 DisasterDetailPanel 引用 |
| KEEP-02 | [router/index.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/router/index.js) | 不修改，沿用 `/data-dashboard` 路由 |
| KEEP-03 | [NavSidebar.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/NavSidebar.vue) | 不修改，沿用"数据大屏"菜单 |
| KEEP-04 | 3 个 CRUD 视图（WarnInfoView/CoordResponseView/SupplyDispatchView） | 暂不处理，先用模拟数据 |
| KEEP-05 | 后端 Controller/Service/Mapper | 暂不修改 |

---

## 4. Impact（影响范围）

### 4.1 文件变更影响

#### 前端新增（工具文件 + 1 个组件）

```
frontend/src/
├── utils/
│   ├── earthquakeAhp.js              # 新增：8 指标 AHP-DDI 算法
│   ├── earthquakeNaming.js           # 新增：支援点/物资点命名策略
│   ├── generateEarthquakePoints.js   # 新增：点位生成器
│   ├── circlePolygon.js              # 新增：64 边近似圆 GeoJSON
│   └── haversine.js                  # 新增：球面距离+环带判定
├── composables/
│   └── useShortestPath.js            # 新增：路径规划 composable
└── components/
    └── earthquake/
        ├── BufferZoneLayer.vue         # 新增：双缓冲区图层组件
        └── SupportPointLayer.vue       # 新增：支援点/物资点图层组件
```

#### 前端修改（5 个文件，全部为改造现有组件）

- [utils/mockData.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/mockData.js) — `DISASTER_TYPES=['地震']`，移除 `buildAHPRiskMetrics` 引用，新增 `generateEarthquakePoints` 调用
- [components/dashboard/DisasterDetailPanel.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/dashboard/DisasterDetailPanel.vue) — 改用新 AHP，按钮文案改为"启动地震救援"
- [components/dashboard/BufferAnalysisModal.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/dashboard/BufferAnalysisModal.vue) — 顶部加 8 指标录入面板，缓冲区改为 DDI 等级双缓冲区，救援点改用 `generateEarthquakePoints`
- [components/dashboard/RoutePlanningModal.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/dashboard/RoutePlanningModal.vue) — 单条路径改为 5 步状态机+4 条彩色路径并行+5 个步骤弹窗
- [views/DataDashboardView.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/views/DataDashboardView.vue) — 增加 DDI/支援点/调度状态，传递给子组件

#### 前端保留不修改

- [utils/ahp.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/ahp.js) — 保留文件作为备份，不再被引用
- [router/index.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/router/index.js) — 不修改
- [components/NavSidebar.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/NavSidebar.vue) — 不修改
- 3 个 CRUD 视图文件 — 暂不处理

### 4.2 后端影响

无后端改动。后端 SpringBoot CRUD 接口保留不删除：
- `/api/warn-info` / `/api/coord-response` / `/api/supply-dispatch`

> 后端如需新增"地震灾情记录"持久化能力，可在后续迭代中扩展（本变更不涉及后端修改）。

### 4.3 文档影响

- 新增本变更目录 `openspec/changes/20260705-earthquake-rescue-refactor/`
- 完成后更新 `.trae/knowledge/INDEX.md` 知识库索引

### 4.4 路由/菜单影响

| 路由 | 处理方式 |
|------|---------|
| `/data-dashboard` | **沿用不变**，作为地震救援模块入口 |
| `/warn-info` | 沿用不变，CRUD 视图暂不处理 |
| `/coord-response` | 沿用不变 |
| `/supply-dispatch` | 沿用不变 |

### 4.5 不受影响范围

- 3 个 CRUD 视图（WarnInfoView/CoordResponseView/SupplyDispatchView）保持原状
- 空间查询、空间分析、网络分析、专题检索、地图工具等模块不受影响
- 后端 Controller/Service/Mapper 文件保留，不做修改
- NavSidebar 菜单结构不变

---

## 5. 阶段划分预览

由于本变更涉及算法重构、流程编排、地图交互、现有组件改造多个层面，按 tasks.md 分阶段执行：

| 阶段 | 名称 | 主要交付物 | 验证标准 |
|------|------|----------|---------|
| 阶段 1 | AHP-DDI 算法层重构 | `earthquakeAhp.js` + 单元测试 | DDI 计算结果与文档示例一致 |
| 阶段 2 | 双缓冲区配置层 | `BufferZoneLayer.vue` + 圆 Polygon 工具 | 4 个等级缓冲区半径正确 |
| 阶段 3 | 支援点/物资点生成层 | `SupportPointLayer.vue` + 命名策略 | 5 类支援点+4 类物资点按规则生成 |
| 阶段 4 | 5 步调度流程编排 | `useShortestPath` composable + 调度核心逻辑 | 调度顺序、路径颜色、弹窗内容正确 |
| 阶段 5 | 改造现有 5 个文件 | `mockData.js` + `DisasterDetailPanel` + `BufferAnalysisModal` + `RoutePlanningModal` + `DataDashboardView` | 端到端流程可演示 |

每个阶段独立可验证，前序阶段交付后才进入下一阶段。

> **与原方案的差异**：原方案阶段 5 计划新建 `EarthquakeRescueView.vue` 独立页面 + 新增路由。现调整为**改造现有 5 个文件**，沿用数据大屏路由，避免新增页面。
