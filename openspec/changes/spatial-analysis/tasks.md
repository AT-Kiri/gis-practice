## 后端

- [ ] 1.1 创建 `SpatialAnalysisController.java`：`POST /api/spatial/buffer` + `POST /api/spatial/overlay`
- [ ] 1.2 创建 `SpatialAnalysisService.java`：代理 iServer `spatialanalyst-sample` 服务的 buffer/overlay API
- [ ] 1.3 配置 `application.yml` 添加 `iserver.spatial-service`

## 前端

- [ ] 2.1 创建 `SpatialAnalysis.vue` 组件，缓冲区/叠置分析两个模式
- [ ] 2.2 缓冲区模式：绘制几何 + 输入半径 + 执行分析 + 结果标绘
- [ ] 2.3 叠置模式：选择源数据集/操作数据集/操作类型 + 执行分析 + 结果标绘
- [ ] 2.4 模式切换互斥，清除结果功能

## 集成

- [ ] 3.1 集成到 NavSidebar 和 SmMapViewer
- [ ] 3.2 vite build 通过
