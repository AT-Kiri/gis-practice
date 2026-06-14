<template>
  <!-- 地图操作工具条：缩放和全幅显示，始终悬浮在地图左上方 -->
  <div class="map-toolbar">
    <a-tooltip title="放大" placement="right">
      <a-button class="tool-btn" @click="zoomIn">
        <template #icon><PlusOutlined /></template>
      </a-button>
    </a-tooltip>
    <a-tooltip title="缩小" placement="right">
      <a-button class="tool-btn" @click="zoomOut">
        <template #icon><MinusOutlined /></template>
      </a-button>
    </a-tooltip>
    <a-tooltip title="全幅显示" placement="right">
      <a-button class="tool-btn" @click="fullExtent">
        <template #icon><FullscreenOutlined /></template>
      </a-button>
    </a-tooltip>
  </div>
</template>

<script setup>
import { PlusOutlined, MinusOutlined, FullscreenOutlined } from '@ant-design/icons-vue'
import { useMapStore } from '../stores/map'

const store = useMapStore()

/** 放大一级 */
function zoomIn() {
  const map = store.mapInstance
  if (map) map.zoomIn({ duration: 300 })
}

/** 缩小一级 */
function zoomOut() {
  const map = store.mapInstance
  if (map) map.zoomOut({ duration: 300 })
}

/** 飞回京津冀区域全幅视图 */
function fullExtent() {
  const map = store.mapInstance
  if (map) {
    map.flyTo({ center: [116.4, 39.9], zoom: 8, duration: 500 })
  }
}
</script>

<style scoped>
.map-toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glass);
  padding: 6px;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  box-shadow: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.tool-btn:hover {
  background: rgba(24, 144, 255, 0.08);
}
</style>
