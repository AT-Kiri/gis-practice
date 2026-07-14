# 京津冀城市综合防灾应急管理 — 项目概要

## 一、基本信息

| 项目 | 内容 |
|---|---|
| **课程** | GIS 工程应用实践 |
| **技术栈** | Vue3 + SuperMap iClient (Vue-iClient-MapboxGL) + SpringBoot |
| **数据处理** | SuperMap iDesktopX 2025 |
| **服务发布** | SuperMap iServer 11i (11.3.0) |
| **数据来源** | 超图 iServer 11i 自带样本数据 |

## 二、核心数据资源

所有数据均为 SuperMap iServer 11i 安装自带的样本数据，路径如下：

### 2.1 京津冀基础地理数据（60MB）

```
D:\SuperMap\SuperMapiServer11i\samples\data\City\Jingjin.udbx
D:\SuperMap\SuperMapiServer11i\samples\data\City\Jingjin.sxwu（工作空间）
```

包含数据集：
- `Road_L`（多级道路·线）
- `Railway_L`（铁路·线）
- `River_L`（河流·线） / `Lake_R`（湖泊·面）
- `County_P`（县级市·点） / `Town_P`（乡镇·点）
- `Captital_P`（首都·点） / `Province_L`（省界·线）
- `Landuse_R`（土地利用·面）
- `Geomor_R` / `Geomor_L`（地貌·面/线）
- `JingjinImage`（遥感影像图）
- `Coastline_L`（海岸线·线）
- `BaseMap_R/L/P`（基础底图）
- `Neighbor_P/R`（邻接区域）

预置专题地图（已在工作空间中配置）：
- 京津地区地图
- 京津地区土地利用现状图
- 京津地区人口分布图
- 京津地区城乡建设用地规模控制图
- 京津地区地貌分布图
- 京津地区城镇工矿用地规模控制图

**iServer 服务名**：`map-jingjin`（已预配置）

### 2.2 世界底图（239MB）

```
D:\SuperMap\SuperMapiServer11i\samples\data\World\World.udbx
```

包含国家/首都/湖泊/河流/海洋/航线/夜间灯光/土地覆盖等。
**iServer 服务名**：`map-world`（已预配置）

### 2.3 长春路网 + POI 数据（17MB）— 用于网络分析模块

```
D:\SuperMap\SuperMapiServer11i\samples\data\NetworkAnalyst\Changchun.udbx
```

包含 `RoadNet`（路网）、`RoadNet_Node`（节点）、`BusLine`/`BusPoint`（公交）、`Hospital`/`School`/`Park`/`Government`/`Factory`/`ResidentialArea` 等 POI。
**iServer 服务名**：`transportationanalyst-sample`（已预配置）

### 2.4 可选扩展数据

| 数据 | 路径 | 用途 |
|---|---|---|
| CBD 三维数据（237MB） | `D:\SuperMap\SuperMap iDesktopX 2025\sampleData\3D\CBDDataset\CBD.udb` | 3D 场景展示模块 |
| 中国100万（232MB） | `D:\SuperMap\SuperMap iDesktopX 2025\sampleData\WebMap\China100\China100.udbx` | 全国地理底图 |
| 中国数据（221MB） | `D:\SuperMap\SuperMapiServer11i\samples\data\China\China.udbx` | 全国基础数据 |
| 人口/经济数据 | `D:\SuperMap\SuperMapiServer11i\samples\data\Population\` | 人口经济专题 |
| 导航原始数据（室内） | `D:\SuperMap\导航原始数据\` | 室内导航模块（需处理） |

## 三、技术路线

```
┌─────────────────────────────────────────────────────┐
│                  表现层（Vue3）                       │
│  Vue-iClient-MapboxGL + Ant Design Vue              │
│  Leaflet / MapboxGL / OpenLayers 地图引擎           │
├─────────────────────────────────────────────────────┤
│                  业务层（SpringBoot）                 │
│  REST API + 业务逻辑 + 数据访问                      │
├─────────────────────────────────────────────────────┤
│                  服务层（SuperMap iServer 11i）       │
│  地图服务 / 数据服务 / 空间分析 / 网络分析           │
├─────────────────────────────────────────────────────┤
│                  数据层                               │
│  Jingjin.udbx + World.udbx + Changchun.udbx           │
│  （iDesktopX 2025 制图 + 发布）                      │
└─────────────────────────────────────────────────────┘
```

SuperMap iClient JavaScript 11i(2024) 的 Vue 支持位于：

```
D:\SuperMap\SuperMapiServer11i\iClient\forJavaScript\web\apis\vue\
```

核心组件库：**Vue-iClient-MapboxGL**（开源地址：`github.com/SuperMap/vue-iclient`）

## 四、六大功能模块设计

### 模块 1：基本地图功能
- 地图全幅显示、放大、缩小、平移
- 鹰眼（mini-map 组件）
- 距离量算、面积量算（measure 组件）
- 图层管理（layer-manager 组件）
- **数据**：Jingjin.udbx + World.udbx（底图）

### 模块 2：空间查询功能
- 按绘制范围（点击/矩形/圆形）查询 POI
- 分页显示查询结果（>10条分页）
- 结果地图标绘 + 点击弹出属性信息
- **数据**：County_P / Town_P / Road_L / Landuse_R 等

### 模块 3：专题检索功能
- 按关键字查询地物
- 按行政级别（省/县/乡镇）分级检索
- 查询结果详情展示
- **数据**：所有点/线/面图层

### 模块 4：缓冲区与叠置分析
- 选定目标 → 设定缓冲区半径 → 分析覆盖范围内的其他要素
- 示例场景：新建道路/设施的辐射范围分析
- 土地利用与地貌的叠置分析
- **数据**：Road_L + Landuse_R + Geomor_R

### 模块 5：网络分析功能
- 最短路径分析（选取起止点生成路径）
- 服务区分析（某点周边一定范围内的设施覆盖）
- **数据**：Changchun.udbx（RoadNet + BusLine + POI）
- **说明**：此模块独立标注为"城市交通分析功能演示"

### 模块 6：亮点特色功能
- **土地利用变化对比**（可选，用 map-compare 组件）
- **人口分布专题图**（Jingjin 已预配置）
- **3D 场景展示**（可选扩展，使用 CBD 三维数据）
- **地图故事 / 旅游路线**（plotting 组件）

## 五、SuperMap 开发包关键位置

### iClient for JavaScript（前端 SDK）

```
D:\SuperMap\SuperMapiServer11i\iClient\forJavaScript\web\
├── apis/vue/           ← Vue-iClient-MapboxGL API 文档
├── libs/               ← 第三方库
│   ├── leaflet/        ← Leaflet 地图引擎
│   ├── mapbox-gl-js/   ← MapboxGL 地图引擎
│   ├── openlayers/     ← OpenLayers 地图引擎
│   ├── vue/            ← Vue.js
│   ├── vue-cesium/     ← Vue + Cesium 3D 集成
│   └── ant-design-vue/ ← Ant Design Vue 组件库
├── examples/           ← 示例代码
└── dist/               ← 核心库
```

### iClient for 3D（三维 SDK）

```
D:\SuperMap\SuperMapiServer11i\iClient\for3D\webgl\zh\
├── Build/SuperMap3D/   ← 三维核心库
└── examples/webgl/     ← 3D 示例（含淹没分析/日照分析/服务区分析等）
```

### iServer 关键服务配置

```
D:\SuperMap\SuperMapiServer11i\webapps\iserver\WEB-INF\iserver-services-samples.xml
```

预配置服务：`map-world`、`map-jingjin`、`map-changchun`、`3D-CBD`、`transportationanalyst-sample`、`spatialanalyst-changchun`、`map-temperature`、`map-Precipitation` 等。

### iDesktopX（数据处理）

```
D:\SuperMap\SuperMap iDesktopX 2025\SuperMap iDesktopX.exe
```

## 六、开发建议

1. **先用 iDesktopX** 打开 Jingjin.sxwu 工作空间，确认数据和各专题图效果
2. **启动 iServer** 发布服务，验证 `map-jingjin` 等服务可访问
3. **前后端分离开发**：Vue3 前端 + SpringBoot 后端
4. 前端使用 npm 安装 `@supermap/vue-iclient-mapboxgl`（或从本地 SDK 引入）
5. 参考优秀案例中 2024 年"应急物资调度系统"的文档结构（`.trae/docs/project/GIS应用工程实践/13 课程设计报告优秀案例.pdf`）

## 七、OpenSpec 启动指引

在新对话中开始开发时，依次执行：

```
openspec init          → 初始化 OpenSpec
openspec spec          → 编写项目规格说明书
openspec design        → 设计系统架构
→ 编码实现
```

参考资料路径：`.trae/docs/project/GIS应用工程实践/`
（含课程大纲、实验指导书、文献综述模板、设计报告模板、优秀案例等）
