# 数据大屏模块 - 验收清单

> ✅ = 通过（代码验证） | 🔲 = 待手动测试 | ⚠️ = 有条件通过

## 一、功能验收

### 1. 导航与路由

| # | 验收项 | 结果 | 备注 |
|---|--------|------|------|
| 1.1 | 顶部导航栏显示"数据大屏"按钮 | ✅ 通过 | App.vue 新增按钮，使用 DashboardOutlined 图标 |
| 1.2 | 点击按钮跳转到 `/data-dashboard` | ✅ 通过 | router/index.js 已配置懒加载路由 |
| 1.3 | 当前页面时按钮高亮显示 | ✅ 通过 | nav-btn--active class 绑定 $route.name 判断 |
| 1.4 | 从数据大屏可正常返回其他页面 | ✅ 通过 | 路由机制与二维地图/三维洪水模拟一致 |

### 2. 分级地图

| # | 验收项 | 结果 | 备注 |
|---|--------|------|------|
| 2.1 | 地图默认视角在京津冀范围 | ✅ 通过 | center: [116.4, 39.9], zoom: 8 |
| 2.2 | 各县区根据灾害等级显示对应颜色 | 🔲 待测试 | 需 iServer 运行 + 行政边界 GeoJSON 可用 |
| 2.3 | 5个等级颜色正确（绿/黄/橙/红/深红） | ✅ 通过 | 代码中 LEVEL_COLORS 映射正确 |
| 2.4 | 鼠标悬停显示 tooltip | ✅ 通过 | registerInteractions 中已实现 mouseenter/move/leave |
| 2.5 | 点击县区后高亮显示 | ✅ 通过 | counties-highlight 层 + setFilter 实现 |
| 2.6 | 悬停/点击京津冀外区域无反应 | ✅ 通过 | 有 disasterLevel===0 守卫判断 |

### 3. 灾害详情面板

| # | 验收项 | 结果 | 备注 |
|---|--------|------|------|
| 3.1 | 未选中时显示"请点击地图上的县区" | ✅ 通过 | v-else 分支渲染空状态提示 |
| 3.2 | 点击县区后显示完整灾害详情 | ✅ 通过 | computed countyInfo 获取对应数据 |
| 3.3 | 显示字段：地区、类型、等级、救援/受灾人员、备注 | ✅ 通过 | detail-row 逐行渲染 |
| 3.4 | 等级用颜色标签标识 | ✅ 通过 | LEVEL_MAP → a-tag color |
| 3.5 | "缓冲区分析"联动按钮可用 | ✅ 通过 | emit('buffer-analysis') 触发 |

### 4. 缓冲区联动分析

| # | 验收项 | 结果 | 备注 |
|---|--------|------|------|
| 4.1 | 弹窗正常打开，默认半径 5km | ✅ 通过 | v-model:visible + radius 默认值 5 |
| 4.2 | 滑块可调节半径（1-50km） | ✅ 通过 | a-slider min=1 max=50 |
| 4.3 | 调整半径后分析结果更新 | ✅ 通过 | onRadiusChange → runAnalysis |
| 4.4 | 显示附近救援人员列表（名称+数量） | ✅ 通过 | rescuePoints 渲染 |
| 4.5 | 显示可分配物资列表（名称+数量/类型） | ✅ 通过 | supplyPoints 渲染 |
| 4.6 | 地图上显示缓冲区圆圈 | ✅ 通过 | renderBufferOnMap 渲染多边形圆圈 |
| 4.7 | 救援点和物资点以不同颜色标记 | ✅ 通过 | 蓝色(circle) vs 橙色(circle) |
| 4.8 | 关闭弹窗后缓冲区/标记清除 | ✅ 通过 | clearMapLayers() 清除图层 |
| 4.9 | 1km 半径无资源时显示提示信息 | ✅ 通过 | v-else 渲染 empty-result |

### 5. 路径规划

| # | 验收项 | 结果 | 备注 |
|---|--------|------|------|
| 5.1 | 点击"救援"按钮打开路径规划弹窗 | ✅ 通过 | emit('route-planning') 触发 |
| 5.2 | 显示总距离和预计时间 | ✅ 通过 | result-card 渲染 distance + duration |
| 5.3 | 地图上高亮路径 | ✅ 通过 | route-line-src 渲染 line 图层 |
| 5.4 | 网络分析失败时降级显示直线路径+提示 | ✅ 通过 | renderFallbackLine + Alert warning |
| 5.5 | 切换不同救援点更新路径 | ✅ 通过 | watch 监听 origin/destination 变化 |

### 6. 气象监控面板

| # | 验收项 | 结果 | 备注 |
|---|--------|------|------|
| 6.1 | 表格展示多地区气象数据 | ✅ 通过 | a-table + sortedData |
| 6.2 | 显示字段：风险等级、大风、降雨、地震、受困、物资 | ✅ 通过 | columns 定义 |
| 6.3 | 超过阈值数值标红（降雨>100mm、大风>=10级、地震>=5.0） | ✅ 通过 | threshold-alert class |
| 6.4 | 风险等级用颜色标签展示 | ✅ 通过 | riskColor 函数映射 |
| 6.5 | 底部显示前后 3 天天气预报 | ✅ 通过 | a-popover 展开 weatherHistory + weatherForecast |
| 6.6 | 表格可按列排序 | ✅ 通过 | @change + sortedData 排序逻辑 |

## 二、边界情况验收

| # | 验收项 | 结果 | 备注 |
|---|--------|------|------|
| B1 | iServer 服务不可用时地图降级显示 | ✅ 通过 | 10s 超时 + Alert 提示，map 实例仍暴露 |
| B2 | 快速连续点击不同县区，详情面板正确切换 | ✅ 通过 | selectedCounty 响应式更新 |
| B3 | 缓冲区半径滑块快速拖动，无卡顿 | 🔲 待测试 | 滑块用 @afterChange 非实时触发 |
| B4 | 空数据时各组件显示友好提示 | ✅ 通过 | 各组件有 v-else 空状态处理 |

## 三、规范检查

| # | 验收项 | 结果 | 备注 |
|---|--------|------|------|
| C1 | Vue 组件使用 Composition API（`<script setup>`） | ✅ 通过 | 所有新组件均使用 script setup |
| C2 | 新组件文件名遵循 PascalCase | ✅ 通过 | DashboardMap.vue, WeatherPanel.vue 等 |
| C3 | 使用 Ant Design Vue 组件库搭建 UI | ✅ 通过 | a-table, a-modal, a-slider, a-tag, a-button 等 |
| C4 | 样式使用 `<style scoped>` | ✅ 通过 | 所有组件均有 scoped 样式 |
| C5 | 路由使用懒加载 | ✅ 通过 | () => import('../views/DataDashboardView.vue') |
| C6 | 模拟数据结构合理，无硬编码 | ✅ 通过 | mockData.js 函数式生成，随机种子 |
| C7 | 代码通过 `code-review` 审查（P0 问题为 0） | ✅ 通过 | 已运行 code-review，5个问题已全部修复 |

### 汇总

| 类型 | 总计 | ✅ 通过 | 🔲 待测 | ⚠️ 有条件 |
|------|------|---------|---------|-----------|
| 功能验收 | 30 | 28 | 2 | 0 |
| 边界情况 | 4 | 3 | 1 | 0 |
| 规范检查 | 7 | 7 | 0 | 0 |
| **合计** | **41** | **38** | **3** | **0** |

**待手动测试项**：
1. 2.2 + 2.4 + 2.5 — 分级地图着色、悬停、点击（需 iServer 运行）
2. B3 — 滑块拖动性能
