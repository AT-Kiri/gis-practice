<template>
  <a-layout class="app-root">
    <a-layout-header class="app-header">
      <div class="header-left">
        <div class="header-logo">
        <SafetyCertificateOutlined style="color: #1890ff; font-size: 24px;" />
      </div>
        <div class="header-text">
          <h1 class="header-title">京津冀城市综合防灾应急管理</h1>
          <span class="header-sub">Beijing-Tianjin-Hebei Emergency Management GIS</span>
        </div>
      </div>
      <div class="header-right">
        <div class="header-status">
          <span class="status-dot" />
          <span class="status-text">系统运行中</span>
        </div>
      </div>
    </a-layout-header>
    <a-layout-content class="app-content">
      <router-view />
    </a-layout-content>
  </a-layout>
</template>

<script setup>
import { SafetyCertificateOutlined } from '@ant-design/icons-vue'
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
