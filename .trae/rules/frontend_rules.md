# 前端编码规范

> Vue 3 + Ant Design Vue + @supermap/vue-iclient-mapboxgl

---

## 1. Vue 组件规范

- 使用 **Composition API**（`<script setup>`），不使用 Options API
- 组件文件名使用 **PascalCase**（如 `SmMapViewer.vue`）
- 组件 Props 使用 `defineProps` 并用 JSDoc 注释说明
- 复杂组件拆分子组件，单一文件不超过 300 行

```vue
<script setup>
/**
 * 地图量算工具
 * @prop {Object} map - MapboxGL 地图实例
 */
const props = defineProps({
  map: { type: Object, required: true }
})
</script>
```

## 2. UI 规范

- 优先使用 Ant Design Vue 组件（`a-button`、`a-card`、`a-slider` 等）
- 地图工具栏图标使用 Ant Design Vue 图标库
- 样式使用 `<style scoped>`，避免全局污染
- 颜色主题保持一致，参考 Ant Design Vue 默认色板

## 3. SuperMap 集成规范

- 地图实例统一通过 `SmMapViewer.vue` 的 `map` prop 或 Pinia store 传递
- iServer 服务地址统一使用相对路径，由 Vite proxy 转发：

```js
// vite.config.js proxy: '/iserver' → http://localhost:8090/iserver
```

- 空间分析调用 iServer REST API 时，使用 `@supermap/iclient-mapboxgl` 的封装类
- GeoJSON 数据统一通过 `map.addSource / map.addLayer` 添加

## 4. API 封装规范

- 后端接口调用统一封装在 `utils/request.js`（基于 axios）
- 每个后端接口在调用处直接使用 `request.get/post`，不另建 api 目录（后端接口极少时）

```js
import request from '@/utils/request'
const res = await request.get('/api/health')
```

## 5. 目录约定

| 目录 | 用途 |
|------|------|
| `components/` | 功能组件（地图相关、分析面板等） |
| `views/` | 页面级别组件（路由直接引用） |
| `stores/` | Pinia 状态管理 |
| `utils/` | 工具函数 |
| `router/` | Vue Router 配置 |
| `assets/` | 静态资源 |

## 6. 注释规范

- 组件 `script setup` 顶部用 JSDoc 说明组件用途和 Props
- 复杂的计算逻辑、SuperMap API 特殊用法需要加行内注释
- 常规的 Ant Design Vue 组件调用不需要注释
