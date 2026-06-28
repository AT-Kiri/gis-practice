<template>
  <!-- 应用根布局：顶部导航栏 + 地图内容区 -->
  <a-layout class="app-root">
    <!-- 顶栏：系统标题与导航 -->
    <a-layout-header class="app-header">
      <div class="header-left">
        <div class="header-logo">
          <router-link to="/" style="display: flex; align-items: center;">
            <SafetyCertificateOutlined style="color: #1890ff; font-size: 24px;" />
          </router-link>
        </div>
        <div class="header-text">
          <h1 class="header-title">京津冀城市综合防灾应急管理</h1>
          <span class="header-sub">Beijing-Tianjin-Hebei Emergency Management GIS</span>
        </div>
      </div>
      <div class="header-right">
        <!-- 导航按钮 -->
        <a-space>
          <a-button
            type="text"
            class="nav-btn"
            :class="{ 'nav-btn--active': $route.name === 'new-big-screen' }"
            @click="$router.push('/new-big-screen')"
          >
            <MonitorOutlined />
            <span>数字大屏</span>
          </a-button>
          <a-button
            type="text"
            class="nav-btn"
            :class="{ 'nav-btn--active': $route.name === 'home' }"
            @click="$router.push('/')"
          >
            <AppstoreOutlined />
            <span>二维地图</span>
          </a-button>
          <a-button
            type="text"
            class="nav-btn"
            :class="{ 'nav-btn--active': $route.name === 'flood-simulation' }"
            @click="$router.push('/flood-simulation')"
          >
            <ThunderboltOutlined />
            <span>三维洪水模拟</span>
          </a-button>
          <a-button
            type="text"
            class="nav-btn"
            :class="{ 'nav-btn--active': $route.name === 'data-dashboard' }"
            @click="$router.push('/data-dashboard')"
          >
            <DashboardOutlined />
            <span>监测-预警-联动</span>
          </a-button>
          <a-divider type="vertical" style="border-color: rgba(255,255,255,0.15); height: 20px;" />
          <div class="header-status">
            <span class="status-dot" />
            <span class="status-text">系统运行中</span>
          </div>
        </a-space>
      </div>
    </a-layout-header>
    <a-layout-content class="app-content">
      <!-- 路由视图 -->
      <router-view />
    </a-layout-content>
  </a-layout>
</template>

<script setup>
import { SafetyCertificateOutlined, AppstoreOutlined, ThunderboltOutlined, DashboardOutlined, MonitorOutlined } from '@ant-design/icons-vue'
</script>

<style scoped>
.app-root {
  height: 100vh;
  background: var(--color-bg-app);
}

.app-header {
  height: 52px;
  line-height: 52px;
  background: linear-gradient(135deg, #001529 0%, #0a1628 100%);
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
  z-index: 40;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-logo {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--color-primary);
}

.header-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.header-title {
  color: var(--color-text-on-dark);
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  letter-spacing: 1px;
}

.header-sub {
  color: var(--color-text-on-dark-muted);
  font-size: 11px;
  letter-spacing: 0.5px;
}

.header-right {
  display: flex;
  align-items: center;
}

/* 导航按钮 */
.nav-btn {
  color: rgba(255, 255, 255, 0.6) !important;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}

.nav-btn:hover {
  color: rgba(255, 255, 255, 0.9) !important;
  background: rgba(255, 255, 255, 0.08) !important;
}

.nav-btn--active {
  color: #1890ff !important;
  background: rgba(24, 144, 255, 0.12) !important;
}

/* 系统运行状态指示灯 */
.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(82, 196, 26, 0.1);
  border: 1px solid rgba(82, 196, 26, 0.2);
  border-radius: 20px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #52c41a;
  animation: pulse-dot 2s ease infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.status-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.app-content {
  height: calc(100vh - 52px);
  position: relative;
}
</style>
