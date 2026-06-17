# 决策日志

> 记录每次变更的关键技术选型和踩坑记录。
> 只有值得记的才记——方案理由、踩坑教训、API 隐藏限制。

| 日期 | 变更 | 决策 | 选择方案 | 理由 / 备注 |
|------|------|------|----------|-------------|
| 2026-06-10 | `project-foundation` | 前端构建工具 | Vite | 相比 Webpack 开发服务器启动更快，Vue3 官方推荐 |
| 2026-06-10 | `project-foundation` | UI 组件库 | Ant Design Vue | SuperMap iClient 官方示例推荐 |
| 2026-06-10 | `project-foundation` | 状态管理 | Pinia | Vue3 官方推荐，相比 Vuex TS 支持更好 |
| 2026-06-10 | `project-foundation` | 地图引擎 | @supermap/vue-iclient-mapboxgl | 课程技术栈指定的 MapboxGL 封装 |
