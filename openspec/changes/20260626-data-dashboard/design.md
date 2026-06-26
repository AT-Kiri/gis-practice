# 数据大屏模块 - 技术设计

## Context（上下文）

### 项目现状
基于 Vue3 + `@supermap/vue-iclient-mapboxgl` + Ant Design Vue 的 GIS 项目，已实现：
- 基本地图浏览、量算、图层管理
- 空间查询、专题检索
- 缓冲区/叠置分析、网络分析
- 二维地图 + 三维洪水模拟两个页面

### 本模块定位
数据大屏是第三个独立页面，聚焦于**灾害态势监控与应急调度**，采用**半屏面板式布局**（地图主导 + 右侧/底部数据面板）。

### 现有可用资源
| 资源 | 说明 |
|------|------|
| `map-jingjin` (iServer) | 京津冀行政区划、道路、水系等，可用于渲染分级地图 |
| `County_P` 数据集 | 县级市点数据，匹配县区灾害信息 |
| `JingjinImage` | 遥感影像底图 |
| `transportationanalyst-sample` | 长春路网数据（网络分析） |
| 已安装依赖 | `mapboxgl`, `iclient-mapboxgl`, `ant-design-vue` |

---

## Goals / Non-Goals

### Goals（目标）
1. 实现京津冀县区灾害程度分级渲染（绿→黄→橙→红）
2. 实现鼠标悬停 tooltip + 点击弹出详情窗口
3. 实现灾害详情窗口中的缓冲区联动分析（救援资源 + 物资）
4. 实现缓冲区分析后的最优路径规划
5. 实现气象灾害监控面板（实时数据 + 阈值预警 + 前后几天天气）
6. 模拟数据的合理性和真实性
7. 顶部导航新增"数据大屏"入口

### Non-Goals（非目标）
- 不涉及用户认证/权限管理
- 不修改后端代码（全部数据前端模拟 + iServer 现有服务）
- 不涉及真实 IoT 设备接入（数据为模拟生成）
- 不做移动端适配（仅桌面端大屏）

---

## Architecture（架构设计）

### 页面布局

```
┌─────────────────────────────────────────────────────────┐
│  顶部导航栏：二维地图 │ 三维洪水模拟 │ ★ 数据大屏       │
├─────────────────────────────────────────────────────────┤
│                    ┌──────────────────────────────┐     │
│                    │  灾害详情面板 (右上面板)      │     │
│                    │  - 地区、受灾类型、等级       │     │
│                    │  - 救援/受灾人员数量          │     │
│                    │  - 联动分析按钮 ↗            │     │
│                    │  - 救援按钮 ↗                │     │
│    京津冀           ├──────────────────────────────┤     │
│    分级地图         │  气象监控面板 (右下面板)      │     │
│    (主导区域)       │  - 风险等级、大风、降雨       │     │
│                    │  - 地震强度、阈值标红         │     │
│                    │  - 前后几天天气预报            │     │
│                    └──────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 组件树

```
DataDashboardView.vue (页面容器)
├── SmMapViewer.vue (地图实例，复用已有组件)
├── DashboardMap.vue (地图交互逻辑：悬停 tooltip + 点击选中 + 分级渲染)
├── DisasterDetailPanel.vue (右上详情面板)
│   └── BufferAnalysisModal.vue (缓冲区分析弹窗)
│       └── RoutePlanningModal.vue (路径规划弹窗)
└── WeatherPanel.vue (右下气象监控面板)
```

### 数据流

```
┌───────────────────────────────────────────────────────────────┐
│  mockData.js (模拟数据生成器)                                   │
│  ├─ generateCountyDisasters() → 各县灾害数据 (GeoJSON 属性)    │
│  ├─ generateRescueResources() → 救援资源 POI 列表             │
│  ├─ generateWeatherData() → 气象数据 + 前/后几天预报           │
│  └─ generateSupplyPoints() → 物资点列表                       │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│  DataDashboardView.vue (状态管理中心)                             │
│  - selectedCounty: 当前选中县区                                  │
│  - disasterData: 各县灾害数据 (Map<区县名, 灾害信息>)            │
│  - weatherData: 气象监控数据                                      │
│  - rescueResources: 救援资源列表                                 │
│  - supplyPoints: 物资点列表                                      │
└───┬──────────┬──────────┬──────────┬───────────────────────────┘
    │          │          │          │
    ▼          ▼          ▼          ▼
Dashboard  DisasterDetail  BufferAnalysis  WeatherPanel
Map.vue    Panel.vue      Modal.vue        .vue
(渲染)     (展示详情)      (缓冲区分析)     (气象展示)
```

---

## Component Design（组件设计）

### 1. DataDashboardView.vue（页面容器）

| 属性 | 说明 |
|------|------|
| 职责 | 页面布局、数据初始化、子组件间通信 |
| 数据 | 持有所有响应式状态，通过 props 向下传递，通过 emit 接收事件 |
| 布局 | `a-layout` + 地图区域和右侧面板区域 |

右侧面板采用 Ant Design Vue 的 `a-card` 组件堆叠：
- 上面板：灾害详情
- 下面板：气象监控

### 2. DashboardMap.vue（地图交互）

| 方面 | 方案 |
|------|------|
| 分级渲染 | 从 iServer 获取行政区划 GeoJSON → 根据 mock 灾害数据动态设置 `fill-color` |
| 分级规则 | 灾害等级 1-5：绿(#52c41a)→黄(#fadb14)→橙(#fa8c16)→红(#f5222d)→深红(#a8071a) |
| 悬停 tooltip | `map.on('mousemove')` + 自定义 tooltip DOM |
| 点击选中 | `map.on('click')` → emit('select', countyName) → 弹出详情面板 |

### 3. DisasterDetailPanel.vue（详情面板）

| 项目 | 内容 |
|------|------|
| 显示条件 | 用户点击地图上的县区后显示 |
| 展示信息 | 地区、受灾类型、受灾等级、救援人员数量、受灾人员数量、备注 |
| 联动按钮 | "缓冲区分析" → 打开 BufferAnalysisModal |
| 救援按钮 | 在缓冲区分析结果中点击"救援" → 打开 RoutePlanningModal |

### 4. BufferAnalysisModal.vue（缓冲区分析）

| 方面 | 方案 |
|------|------|
| 触发 | 点击详情面板的联动按钮 |
| 输入 | 以选中县区中心为圆心，默认半径 5km（可拖动滑块调整 1-50km） |
| 分析方式 | 使用 SuperMap `@supermap/iclient-mapboxgl` 的缓冲区分析能力 |
| 结果展示 | 弹窗内展示：附近救援人员（地点+数量）、可分配物资（地点+数量） |
| 救援按钮 | 点击后打开路径规划弹窗 |

### 5. RoutePlanningModal.vue（路径规划）

| 方面 | 方案 |
|------|------|
| 触发 | 点击缓冲区分析结果中的"救援"按钮 |
| 输入 | 起点=所选救援点，终点=受灾县区中心 |
| 分析方式 | 使用 iServer 网络分析服务（复用现有 `transportationanalyst-sample`） |
| 结果展示 | 在地图上高亮显示路径 + 弹窗显示距离/预计时间 |
| 错误处理 | 若无可用路网，降级为直线渲染+提示 |

### 6. WeatherPanel.vue（气象监控）

| 方面 | 方案 |
|------|------|
| 展示内容 | 风险等级、大风强度、降雨深度、地震强度、受灾类型 |
| 阈值预警 | 超过阈值数字标红（如降雨>100mm/h 标红，大风>10级标红） |
| 天气趋势 | 显示前 3 天 + 后 3 天的天气图标/温度/降水 |
| 布局 | 使用 `a-table` 展示多行+ `a-tag` 颜色标签 |

---

## Data Design（数据设计）

### Mock 数据结构

#### 县区灾害数据
```json
{
  "countyName": "怀来县",
  "disasterType": "洪涝",
  "disasterLevel": 4,
  "rescuePersonnel": 120,
  "affectedPeople": 3500,
  "description": "永定河水位超警戒线2.3m，多处村庄进水",
  "requiredRescueType": "冲锋舟、沙袋、饮用水",
  "rescuePoints": [{ "name": "怀来救援站", "coords": [115.5, 40.4], "personnel": 30 }],
  "supplyPoints": [{ "name": "怀来物资库", "coords": [115.52, 40.38], "supplies": "饮用水、食品" }]
}
```

#### 气象数据
```json
{
  "countyName": "怀来县",
  "riskLevel": "高",
  "windForce": 9,
  "rainfall": 85.5,
  "earthquakeIntensity": 3.2,
  "trappedPeople": 200,
  "availableSupplies": "帐篷200顶、食品5吨",
  "weatherHistory": [/* 前3天每日数据 */],
  "weatherForecast": [/* 后3天每日数据 */]
}
```

---

## Route & Navigation（路由与导航）

### 路由配置
```js
{
  path: '/data-dashboard',
  name: 'data-dashboard',
  component: () => import('../views/DataDashboardView.vue'),
}
```

### 导航栏修改
在 App.vue 的顶部导航按钮区，在"三维洪水模拟"按钮后新增：
```html
<a-button type="text" class="nav-btn"
  :class="{ 'nav-btn--active': $route.name === 'data-dashboard' }"
  @click="$router.push('/data-dashboard')">
  <DashboardOutlined />
  <span>数据大屏</span>
</a-button>
```

使用 `DashboardOutlined` 图标。

---

## Technical Decisions（技术决策）

### 决策 1：模拟数据 vs 后端接口
- **选择**：前端模拟数据
- **理由**：课设阶段无真实灾情数据源，模拟数据可覆盖所有功能场景
- **方案**：在 `utils/mockData.js` 中集中管理，每个县区固定生成一组合理的模拟数据
- **退路**：未来可替换为后端 API 调用，数据结构保持一致

### 决策 2：地图实例复用 vs 新建
- **选择**：复用 `SmMapViewer.vue` 组件新建地图实例
- **理由**：数据大屏页面与二维地图页面是独立页面，各自拥有独立地图实例
- **方案**：数据大屏页面直接引入 `SmMapViewer.vue`，地图配置指向 iServer `map-jingjin` 服务

### 决策 3：行政区划数据源
- **选择**：从 iServer `map-jingjin` 服务获取 `County_P` + `Province_L` 等服务叠加显示
- **理由**：已有 iServer 服务，无需额外发布
- **补充**：若 iServer 服务不可用，使用 `public/data/` 下的静态 GeoJSON 备份（参照之前的实现方式）

### 决策 4：缓冲区分析实现方式
- **选择**：使用 `@supermap/iclient-mapboxgl` 的 `BufferAnalystService`
- **理由**：与现有空间分析模块一致，复用已有的 SuperMap 分析能力
- **备选**：使用 Turf.js 做纯客户端缓冲区（更轻量，但数据精度不如 iServer）

### 决策 5：路径规划实现方式
- **选择**：使用 iServer 网络分析服务 `transportationanalyst-sample`
- **理由**：已配置长春路网数据，且现有 `NetworkAnalysis.vue` 已验证可用
- **注意**：路径规划的起点终点坐标会在地图上叠加显示，结果通过 `map.addLayer` 渲染

---

## File Change Plan（文件变更计划）

| 操作 | 文件 | 说明 |
|------|------|------|
| 新增 | `frontend/src/views/DataDashboardView.vue` | 数据大屏页面容器 |
| 新增 | `frontend/src/components/dashboard/DashboardMap.vue` | 分级地图 + 交互 |
| 新增 | `frontend/src/components/dashboard/DisasterDetailPanel.vue` | 灾害详情面板 |
| 新增 | `frontend/src/components/dashboard/BufferAnalysisModal.vue` | 缓冲区分析弹窗 |
| 新增 | `frontend/src/components/dashboard/RoutePlanningModal.vue` | 路径规划弹窗 |
| 新增 | `frontend/src/components/dashboard/WeatherPanel.vue` | 气象监控面板 |
| 新增 | `frontend/src/utils/mockData.js` | 模拟数据生成 |
| 修改 | `frontend/src/router/index.js` | 新增数据大屏路由 |
| 修改 | `frontend/src/App.vue` | 新增顶部导航入口 |

---

## Risk & Mitigation（风险与应对）

| 风险 | 可能性 | 影响 | 应对方案 |
|------|--------|------|----------|
| iServer 服务不可用 | 中 | 行政区划无法加载 | 使用本地 GeoJSON 备份 |
| 网络分析服务返回空 | 中 | 路径规划不可用 | 降级显示直线路径 + 提示信息 |
| 模拟数据不够真实 | 低 | 影响展示效果 | 参考真实灾害数据设计字段和数值范围 |
| 地图性能（大量 GeoJSON） | 低 | 卡顿 | 使用 `Cluster` + 简化几何体 |
