## Why

在城市防灾应急场景中，缓冲区分析用于评估灾害影响范围（如化工厂泄漏的疏散区域、新建应急设施的服务半径），叠置分析用于综合多因子评估（如土地利用与地貌的叠加分析，找出易受灾区域）。这些是 GIS 空间分析的核心能力。

## What Changes

- 新增 `SpatialAnalysis.vue` 空间分析组件（缓冲区分析 + 叠置分析两个子模式）
- 新增后端 `SpatialAnalysisService.java` + `SpatialAnalysisController.java`
- 集成到侧栏导航和主地图视图

## Impact

- 新增前端文件：`SpatialAnalysis.vue`
- 新增后端文件：`SpatialAnalysisController.java`、`SpatialAnalysisService.java`
- 新增 iServer 依赖：`spatialanalyst-sample` 空间分析服务
