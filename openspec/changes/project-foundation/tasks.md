## 1. 前后端项目脚手架搭建

- [x] 1.1 初始化 Vue3 + Vite 前端项目，配置 `@vitejs/plugin-vue`
- [x] 1.2 安装前端核心依赖：`vue-router`、`pinia`、`ant-design-vue`、`axios`
- [x] 1.3 安装 SuperMap 地图依赖：`@supermap/iclient-mapboxgl`
- [x] 1.4 配置 Vite 开发代理（`/iserver` → `localhost:8090`）
- [x] 1.5 搭建前端目录结构：`components/`、`views/`、`router/`、`stores/`、`utils/`、`assets/`
- [x] 1.6 初始化 SpringBoot + Maven 后端项目，添加 `spring-boot-starter-web`、`spring-boot-starter-actuator` 依赖
- [x] 1.7 搭建后端目录结构：`controller/`、`service/`、`config/`、`common/`
- [x] 1.8 实现统一响应格式工具类 `R.java`（`{code, message, data}`）
- [x] 1.9 配置后端全局异常拦截器
- [x] 1.10 配置后端 CORS 跨域规则

## 2. 核心地图容器组件（Map Viewer）

- [x] 2.1 创建 `SmMapViewer.vue` 组件，初始化 MapboxGL 地图实例
- [x] 2.2 配置地图中心点（[116.4, 39.9]）和初始缩放级别（8）
- [x] 2.3 加载 `map-world` 底图服务
- [x] 2.4 叠加 `map-jingjin` 专题地图服务
- [x] 2.5 实现地图 resize 自适应容器（ResizeObserver）
- [x] 2.6 实现地图加载状态指示器（a-spin）
- [x] 2.7 实现 iServer 服务不可用时的错误提示与重试按钮
- [x] 2.8 创建 `App.vue` 主布局，集成 MapViewer 组件

## 3. 地图基础交互工具（Map Tools）

- [x] 3.1 创建 `MapToolbar.vue` 浮动工具栏组件
- [x] 3.2 实现放大按钮（zoom in）
- [x] 3.3 实现缩小按钮（zoom out）
- [x] 3.4 实现全幅显示按钮（full extent / home）
- [x] 3.5 启用鼠标滚轮缩放和拖拽平移交互
- [x] 3.6 为工具栏按钮添加图标和 tooltip 提示

## 4. 鹰眼组件（Map Overview）

- [x] 4.1 创建 `MapOverview.vue` 鹰眼组件
- [x] 4.2 实现缩略图地图和当前视口范围矩形
- [x] 4.3 实现主图 pan 时鹰眼镜框实时更新
- [x] 4.4 实现主图 zoom 时鹰眼镜框实时更新
- [x] 4.5 实现鹰眼点击重定位主图功能
- [x] 4.6 实现鹰眼面板显示/隐藏切换
- [x] 4.7 集成鹰眼组件到 MapViewer

## 5. 量算工具（Map Measure）

- [x] 5.1 创建 `MapMeasure.vue` 量算工具组件
- [x] 5.2 实现距离测量模式（鼠标点击画线 + 实时标注分段距离）
- [x] 5.3 实现面积测量模式（鼠标点击画面 + 实时计算面积）
- [x] 5.4 实现双键结束绘制并显示结果
- [x] 5.5 实现自动单位换算（m / km 和 m² / km²）
- [x] 5.6 实现清除所有测量标注功能
- [x] 5.7 实现测量模式互斥（距离/面积不能同时激活）
- [x] 5.8 集成量算组件到 MapToolbar

## 6. 图层管理面板（Layer Manager）

- [x] 6.1 创建 `LayerManager.vue` 图层管理面板组件（Ant Design Drawer）
- [x] 6.2 实现图层列表面板（含中文图层名和类型标识）
- [x] 6.3 实现图层显示/隐藏切换（checkbox）
- [x] 6.4 实现图层透明度滑块调节
- [ ] 6.5 实现拖拽排序调整图层叠放顺序（后续迭代）
- [x] 6.6 实现面板折叠/展开切换
- [x] 6.7 集成图层管理面板到主页面布局

## 7. 集成验证

- [x] 7.1 确认 frontend `npm run dev` 启动无报错（vite build 通过）
- [x] 7.2 确认 backend `mvn compile` 编译通过
- [ ] 7.3 确认地图加载成功并正确显示京津冀数据
- [ ] 7.4 确认所有地图交互工具功能正常
- [ ] 7.5 确认鹰眼、量算、图层管理面板功能正常
