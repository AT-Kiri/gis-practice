## Why

在京津冀防灾应急场景中，用户需要快速检索特定的地物要素——例如搜索某条道路、某个乡镇、某类土地利用类型。不同于空间查询的"画范围找要素"，专题检索允许用户通过关键字和分类条件快速定位关注的地物，并查看其详细属性信息，是日常应急管理中的高频操作。

## What Changes

- 新增 `FeatureSearch.vue` 专题检索组件（搜索面板 + 结果列表 + 详情展示）
- 新增 `thematic-search` 后端接口，支持关键字模糊匹配 + 按行政级别分类检索
- 在 `SmMapViewer.vue` 中集成专题检索组件（通过侧栏切换）
- 查询数据覆盖：County_P、Town_P、Road_L、Railway_L、River_L、Lake_R、Landuse_R、Geomor_R、Coastline_L

## Capabilities

### New Capabilities

- `thematic-search`: 专题检索功能模块，支持关键字搜索、行政级别（省/县/乡镇）过滤、结果详情查看

### Modified Capabilities

- `map-viewer`: 集成专题检索组件到主地图视图

## Impact

- 新增前端文件：`FeatureSearch.vue`
- 新增后端文件：`ThematicSearchController.java`、`ThematicSearchService.java`
