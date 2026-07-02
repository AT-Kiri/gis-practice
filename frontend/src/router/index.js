/**
 * Vue Router 路由配置
 * 使用 Hash 模式（createWebHashHistory），兼容静态文件部署
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

/** 路由表 */
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/flood-simulation',
    name: 'flood-simulation',
    component: () => import('../views/FloodSimulationView.vue'),
  },
  {
    path: '/data-dashboard',
    name: 'data-dashboard',
    component: () => import('../views/DataDashboardView.vue'),
  },
  {
    path: '/new-big-screen',
    name: 'new-big-screen',
    component: () => import('../views/NewBigScreenView.vue'),
  },
  {
    path: '/warn-info',
    name: 'warn-info',
    component: () => import('../views/WarnInfoView.vue'),
  },
  {
    path: '/coord-response',
    name: 'coord-response',
    component: () => import('../views/CoordResponseView.vue'),
  },
  {
    path: '/supply-dispatch',
    name: 'supply-dispatch',
    component: () => import('../views/SupplyDispatchView.vue'),
  },
]

/** 创建路由器实例 */
const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
