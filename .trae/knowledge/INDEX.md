# Project INDEX

> 项目全景图。每次交付后由 AI 自动更新。
> 你确认功能通过后，我会同步更新此文件。

---

## 变更记录

| 日期 | 变更 ID | 内容 | 涉及模块 | 状态 |
|------|---------|------|----------|------|
| — | `project-foundation` | 项目脚手架 + 基础地图 + 鹰眼 + 量算 + 图层管理 | 全部 | ✅ 完成 |
| — | `spatial-query` | 空间查询（绘制范围查询 POI） | SpatialQuery | ✅ 完成 |
| — | `spatial-analysis` | 缓冲区分析与叠置分析 | SpatialAnalysis | ✅ 完成 |
| — | `thematic-search` | 专题检索（关键字 + 行政级别分类） | FeatureSearch | ✅ 完成 |

---

## 前端组件树

```
App.vue
├── NavSidebar.vue              # 左侧导航栏（功能切换）
└── SmMapViewer.vue             # 核心地图容器
    ├── MapToolbar.vue           # 顶部工具栏（缩放/全幅/量算）
    ├── MapOverview.vue          # 鹰眼组件
    ├── LayerManager.vue         # 图层管理面板
    ├── FeatureSearch.vue        # 专题检索面板
    ├── SpatialQuery.vue         # 空间查询面板
    ├── SpatialAnalysis.vue      # 缓冲区/叠置分析面板
    └── NetworkAnalysis.vue      # 网络分析面板
```

---

## 路由表

| 路径 | 视图组件 | 说明 |
|------|----------|------|
| `/` | HomeView | 主地图页面（含全部功能组件） |
| `/flood` | FloodSimulationView | 洪涝模拟（亮点功能） |

---

## 后端服务

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |

当前后端极简，仅提供健康检查。后续信息管理功能按需扩展。

---

## 外部依赖

| 依赖 | 用途 | 版本/说明 |
|------|------|-----------|
| SuperMap iServer 11i | 地图服务 & 空间分析服务 | `http://localhost:8090/iserver` |
| `map-world` | 底图服务 | iServer 预配置 |
| `map-jingjin` | 京津冀专题地图 | iServer 预配置 |
