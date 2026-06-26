<template>
  <a-modal
    :open="visible"
    title="缓冲区联动分析"
    @cancel="closeModal"
    @ok="closeModal"
    ok-text="关闭"
    cancel-text="取消"
    :width="520"
    :destroyOnClose="true"
    wrap-class-name="buffer-modal"
  >
    <div class="buffer-content">
      <!-- 半径调节 -->
      <div class="radius-control">
        <span class="radius-label">缓冲区半径：<strong>{{ radius }} km</strong></span>
        <a-slider
          v-model:value="radius"
          :min="1"
          :max="50"
          :step="1"
          @afterChange="onRadiusChange"
          class="radius-slider"
        />
      </div>

      <!-- 分析结果 -->
      <div v-if="!loading" class="result-section">
        <!-- 救援人员 -->
        <div class="result-group">
          <div class="result-group-title">
            <TeamOutlined /> 附近救援人员
          </div>
          <div v-if="rescuePoints.length > 0" class="result-list">
            <div v-for="(rp, i) in rescuePoints" :key="i" class="result-item">
              <div class="item-info">
                <span class="item-name">{{ rp.name }}</span>
                <span class="item-detail">人员: {{ rp.personnel }} 人</span>
                <span class="item-detail">{{ rp.equipment }}</span>
              </div>
              <a-button
                type="primary"
                size="small"
                @click="onRoutePlan(rp)"
                :disabled="!rp.coords"
              >
                救援
              </a-button>
            </div>
          </div>
          <div v-else class="empty-result">该范围内未找到救援人员</div>
        </div>

        <!-- 物资点 -->
        <div class="result-group">
          <div class="result-group-title">
            <UnorderedListOutlined /> 可分配物资
          </div>
          <div v-if="supplyPoints.length > 0" class="result-list">
            <div v-for="(sp, i) in supplyPoints" :key="i" class="result-item">
              <div class="item-info">
                <span class="item-name">{{ sp.name }}</span>
                <span class="item-detail">{{ sp.supplies }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-result">该范围内未找到物资点</div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-else class="loading-state">
        <a-spin tip="正在分析..." />
      </div>
    </div>
  </a-modal>
</template>

<script setup>
/**
 * 数据大屏 - 缓冲区联动分析弹窗
 * @prop {Boolean} visible - 弹窗显隐
 * @prop {Object} map - MapboxGL 地图实例
 * @prop {Object} countyData - 选中县区的数据
 */
import { ref, watch, onUnmounted } from 'vue'
import { TeamOutlined, UnorderedListOutlined } from '@ant-design/icons-vue'
import { calcDistance } from '@/utils/map'

const props = defineProps({
  visible: { type: Boolean, default: false },
  map: { type: Object, default: null },
  countyData: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'route-planning'])

const radius = ref(5)
const loading = ref(false)
const rescuePoints = ref([])
const supplyPoints = ref([])

// 缓冲区圆圈和标记点的图层 ID
const CIRCLE_LAYER_ID = 'buffer-analysis-circle'
const RESCUE_LAYER_ID = 'buffer-rescue-points'
const SUPPLY_LAYER_ID = 'buffer-supply-points'

// 监听弹窗打开 → 执行分析
watch(
  () => props.visible,
  (open) => {
    if (open && props.countyData) {
      radius.value = 5
      runAnalysis(radius.value || 5)
    } else if (!open) {
      clearMapLayers()
    }
  }
)

/**
 * 执行缓冲区分析
 */
function runAnalysis(r) {
  loading.value = true
  const data = props.countyData
  if (!data) {
    loading.value = false
    return
  }

  // 模拟缓冲区分析：根据距离筛选救援点和物资点
  const center = data.coords
  rescuePoints.value = data.rescuePoints.filter((p) => {
    const dist = calcDistance(center, p.coords)
    return dist <= r
  })
  supplyPoints.value = data.supplyPoints.filter((p) => {
    const dist = calcDistance(center, p.coords)
    return dist <= r
  })

  // 渲染地图效果
  renderBufferOnMap(center, r)

  loading.value = false
}

/**
 * 在地图上渲染缓冲区和标记点
 */
function renderBufferOnMap(center, r) {
  const map = props.map
  if (!map) return

  // 先清除旧图层
  clearMapLayers()

  // 1. 缓冲区圆圈
  const circlePoints = []
  const steps = 64
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    const lat = center[1] + (r / 111.32) * Math.cos(angle)
    const lon = center[0] + (r / (111.32 * Math.cos((center[1] * Math.PI) / 180))) * Math.sin(angle)
    circlePoints.push([lon, lat])
  }
  circlePoints.push(circlePoints[0]) // 闭合

  map.addSource('buffer-circle-src', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [circlePoints] },
      properties: {},
    },
  })
  map.addLayer({
    id: CIRCLE_LAYER_ID,
    type: 'fill',
    source: 'buffer-circle-src',
    paint: {
      'fill-color': '#1890ff',
      'fill-opacity': 0.12,
      'fill-outline-color': 'rgba(24,144,255,0.6)',
    },
  })

  // 2. 救援点（蓝色标记）
  if (rescuePoints.value.length > 0) {
    const rescueGeo = {
      type: 'FeatureCollection',
      features: rescuePoints.value.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.coords },
        properties: { name: p.name, personnel: p.personnel },
      })),
    }
    map.addSource('buffer-rescue-src', { type: 'geojson', data: rescueGeo })
    map.addLayer({
      id: RESCUE_LAYER_ID,
      type: 'circle',
      source: 'buffer-rescue-src',
      paint: {
        'circle-radius': 8,
        'circle-color': '#1890ff',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.8,
      },
    })
  }

  // 3. 物资点（橙色标记）
  if (supplyPoints.value.length > 0) {
    const supplyGeo = {
      type: 'FeatureCollection',
      features: supplyPoints.value.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.coords },
        properties: { name: p.name, supplies: p.supplies },
      })),
    }
    map.addSource('buffer-supply-src', { type: 'geojson', data: supplyGeo })
    map.addLayer({
      id: SUPPLY_LAYER_ID,
      type: 'circle',
      source: 'buffer-supply-src',
      paint: {
        'circle-radius': 8,
        'circle-color': '#fa8c16',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.8,
      },
    })
  }
}

/**
 * 清除地图上的缓冲区相关图层
 */
function clearMapLayers() {
  const map = props.map
  if (!map) return
  const layers = [CIRCLE_LAYER_ID, RESCUE_LAYER_ID, SUPPLY_LAYER_ID]
  const sources = ['buffer-circle-src', 'buffer-rescue-src', 'buffer-supply-src']
  layers.forEach((id) => {
    try { if (map.getLayer(id)) map.removeLayer(id) } catch (e) { /* ignore */ }
  })
  sources.forEach((id) => {
    try { if (map.getSource(id)) map.removeSource(id) } catch (e) { /* ignore */ }
  })
}

function onRadiusChange() {
  runAnalysis(radius.value)
}

function closeModal() {
  emit('update:visible', false)
}

function onRoutePlan(point) {
  emit('route-planning', point)
}

onUnmounted(() => clearMapLayers())
</script>

<style scoped>
.buffer-content {
  min-height: 200px;
}

.radius-control {
  margin-bottom: 16px;
}

.radius-label {
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
}

.radius-slider {
  margin-top: 8px;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-group-title {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-weight: 500;
}

.item-detail {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
}

.empty-result {
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
  padding: 12px 0;
  text-align: center;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 150px;
}
</style>
