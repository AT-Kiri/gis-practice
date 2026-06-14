/**
 * Vue Router 路由配置
 * 使用 Hash 模式（createWebHashHistory），兼容静态文件部署
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

/** 路由表：目前只有首页（地图主界面） */
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
]

/** 创建路由器实例 */
const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
