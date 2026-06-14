<template>
  <!-- 图层管理器入口按钮 -->
  <div class="layer-manager-trigger">
    <a-tooltip title="图层管理" placement="left">
      <a-button shape="circle" @click="togglePanel">
        <template #icon><AppstoreOutlined /></template>
      </a-button>
    </a-tooltip>
  </div>

  <!-- 图层管理抽屉面板 -->
  <a-drawer
    title="图层管理"
    placement="right"
    :open="panelVisible"
    :width="280"
    @close="closePanel"
    :get-container="false"
  >
    <!-- 空状态 -->
    <div v-if="store.layers.length === 0" style="color: #999; text-align: center; padding: 40px 0;">
      暂无图层
    </div>

    <!-- 图层列表：每个图层可控制可见性和透明度 -->
    <div v-for="(layer, index) in store.layers" :key="layer.id" class="layer-item">
      <div class="layer-header">
        <!-- 可见性复选框 -->
        <a-checkbox :checked="layer.visible" @change="(e) => toggleVisibility(layer, e.target.checked)">
          <span :class="{ 'base-layer': index === 0 }">{{ layer.name }}</span>
        </a-checkbox>
        <a-tag v-if="index === 0" color="blue" style="font-size: 11px;">底图</a-tag>
        <a-tag v-else color="green" style="font-size: 11px;">覆盖层</a-tag>
      </div>

      <!-- 透明度滑条 -->
      <div class="layer-opacity">
        <span style="font-size: 12px; color: #888;">透明度</span>
        <a-slider
          :min="0"
          :max="1"
          :step="0.1"
          :value="layer.opacity"
          style="flex: 1; margin: 0 8px;"
          @change="(val) => setOpacity(layer, val)"
        />
        <span style="font-size: 12px; color: #888; min-width: 30px;">{{ Math.round(layer.opacity * 100) }}%</span>
      </div>
    </div>
  </a-drawer>
</template>

<script setup>
import { ref, watch } from 'vue'
import { AppstoreOutlined } from '@ant-design/icons-vue'
import { useMapStore } from '../stores/map'

const props = defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible'])

const store = useMapStore()
const panelVisible = ref(false)

// 同步父组件的 visible prop 到内部状态
watch(() => props.visible, (v) => {
  panelVisible.value = v
}, { immediate: true })

function togglePanel() {
  panelVisible.value = !panelVisible.value
  emit('update:visible', panelVisible.value)
}

function closePanel() {
  panelVisible.value = false
  emit('update:visible', false)
}

/**
 * 切换图层可见性
 * 通过 MapboxGL 的 setLayoutProperty 设置 visibility 属性
 */
function toggleVisibility(layer, visible) {
  const map = store.mapInstance
  if (!map) return

  const visibility = visible ? 'visible' : 'none'
  if (map.getLayer(layer.id)) {
    map.setLayoutProperty(layer.id, 'visibility', visibility)
  }
  layer.visible = visible
}

/**
 * 设置图层透明度
 * 通过 MapboxGL 的 setPaintProperty 设置 raster-opacity
 */
function setOpacity(layer, opacity) {
  const map = store.mapInstance
  if (!map) return

  if (map.getLayer(layer.id)) {
    map.setPaintProperty(layer.id, 'raster-opacity', opacity)
  }
  layer.opacity = opacity
}
</script>

<style scoped>
.layer-manager-trigger {
  position: absolute;
  bottom: 100px;
  right: 10px;
  z-index: 5;
}

.layer-manager-trigger .ant-btn {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-sm);
}

.layer-item {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.layer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.base-layer {
  font-weight: 600;
}

.layer-opacity {
  display: flex;
  align-items: center;
  padding-left: 24px;
}
</style>
