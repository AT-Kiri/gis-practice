<template>
  <a-modal
    :open="visible"
    title="最优路径规划"
    @cancel="closeModal"
    @ok="closeModal"
    ok-text="关闭"
    :width="480"
    :destroyOnClose="true"
    wrap-class-name="route-modal"
  >
    <div class="route-content">
      <!-- 路径信息 -->
      <div v-if="!loading" class="route-info">
        <div class="route-points">
          <div class="route-point">
            <span class="point-label">起点：</span>
            <span class="point-value">{{ originName || formatCoord(origin) }}</span>
          </div>
          <div class="route-point">
            <span class="point-label">终点：</span>
            <span class="point-value">{{ destName || formatCoord(destination) }}</span>
          </div>
        </div>

        <!-- 路径结果 -->
        <div v-if="routeResult" class="route-result">
          <div class="result-card">
            <div class="result-stat">
              <span class="stat-label">总距离</span>
              <span class="stat-value">{{ routeResult.distance }}</span>
            </div>
            <div class="result-stat">
              <span class="stat-label">预计时间</span>
              <span class="stat-value">{{ routeResult.duration }}</span>
            </div>
          </div>
          <a-alert
            v-if="routeResult.isFallback"
            type="warning"
            show-icon
            message="在线路网不可用，已显示直线路径"
            style="margin-top: 8px;"
          />
        </div>
        <div v-else class="route-status">
          <a-alert
            v-if="routeError"
            type="error"
            show-icon
            :message="routeError"
            style="margin-top: 8px;"
          />
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-else class="loading-state">
        <a-spin tip="正在计算最优路径..." />
      </div>
    </div>
  </a-modal>
</template>

<script setup>
/**
 * 数据大屏 - 最优路径规划
 * 使用 OSRM 免费公共 API 计算行车路径，失败则降级为直线
 * @prop {Boolean} visible - 弹窗显隐
 * @prop {Object} map - MapboxGL 地图实例
 * @prop {Array} origin - 起点坐标 [lng, lat]
 * @prop {Array} destination - 终点坐标 [lng, lat]
 */
import { ref, watch, onUnmounted } from 'vue'
import { calcDistance } from '@/utils/map'

const props = defineProps({
  visible: { type: Boolean, default: false },
  map: { type: Object, default: null },
  origin: { type: Array, default: () => [] },
  destination: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:visible'])

const loading = ref(false)
const routeResult = ref(null)
const routeError = ref(null)
const originName = ref('')
const destName = ref('')

const ROUTE_LAYER_ID = 'planning-route-line'
const ROUTE_SRC_ID = 'planning-route-src'

// 监听弹窗打开 → 执行路径规划
watch(
  () => [props.visible, props.origin, props.destination],
  ([open, origin, dest]) => {
    if (open && origin && dest) {
      loading.value = true
      routeResult.value = null
      routeError.value = null
      calculateRoute()
    }
  },
  { immediate: true }
)

/**
 * 计算最优路径
 * 优先调用 OSRM 在线路由 API，失败则降级为直线
 */
async function calculateRoute() {
  const { origin, destination } = props
  if (!origin || !destination) {
    routeError.value = '起点或终点坐标缺失'
    loading.value = false
    return
  }

  try {
    const result = await callOSRM(origin, destination)
    if (result) {
      routeResult.value = {
        distance: `${(result.distance / 1000).toFixed(1)} km`,
        duration: `${Math.round(result.duration / 60)} 分钟`,
        isFallback: false,
      }
      renderRouteLine(result.geometry)
    } else {
      throw new Error('empty result')
    }
  } catch {
    // 降级：直线路径
    routeResult.value = {
      distance: `${calcDistance(origin, destination).toFixed(1)} km`,
      duration: '—',
      isFallback: true,
    }
    renderFallbackLine(origin, destination)
  }

  loading.value = false
}

/**
 * 调用 OSRM 公共路由 API
 * https://router.project-osrm.org/ - 免费、无需 Key
 */
async function callOSRM(origin, destination) {
  const coordStr = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error('OSRM service error')
  const data = await res.json()

  if (data && data.routes && data.routes.length > 0) {
    return {
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
      geometry: data.routes[0].geometry,
    }
  }
  return null
}

/**
 * 在地图上渲染路径线
 * 自动将起终点坐标补到路径首尾，确保线与圆点相连
 */
function renderRouteLine(geometry) {
  const map = props.map
  if (!map) return
  clearRouteLayers()

  // 复制坐标数组，避免修改原始数据
  let coords = [...geometry.coordinates]
  const { origin, destination } = props
  const TOLERANCE = 0.0001 // ~100m 容差

  // 如果路径起点离圆点太远，把圆点坐标补到最前面
  if (origin && coords.length > 0) {
    const dx = coords[0][0] - origin[0]
    const dy = coords[0][1] - origin[1]
    if (Math.abs(dx) > TOLERANCE || Math.abs(dy) > TOLERANCE) {
      coords = [origin, ...coords]
    }
  }

  // 如果路径终点离圆点太远，把圆点坐标补到最后面
  if (destination && coords.length > 0) {
    const last = coords[coords.length - 1]
    const dx = last[0] - destination[0]
    const dy = last[1] - destination[1]
    if (Math.abs(dx) > TOLERANCE || Math.abs(dy) > TOLERANCE) {
      coords = [...coords, destination]
    }
  }

  map.addSource(ROUTE_SRC_ID, {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {},
    },
  })
  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: 'line',
    source: ROUTE_SRC_ID,
    paint: {
      'line-color': '#1890ff',
      'line-width': 4,
      'line-opacity': 0.9,
    },
  })

  // 自动缩放适配路径
  if (coords.length > 0) {
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
    coords.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    })
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 80, duration: 1000 })
  }
}

/**
 * 降级渲染直线路径
 */
function renderFallbackLine(origin, destination) {
  const map = props.map
  if (!map) return
  clearRouteLayers()

  map.addSource(ROUTE_SRC_ID, {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [origin, destination] },
      properties: {},
    },
  })
  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: 'line',
    source: ROUTE_SRC_ID,
    paint: {
      'line-color': '#ff4d4f',
      'line-width': 3,
      'line-dasharray': [4, 3],
      'line-opacity': 0.8,
    },
  })
}

function clearRouteLayers() {
  const map = props.map
  if (!map) return
  try {
    if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID)
    if (map.getSource(ROUTE_SRC_ID)) map.removeSource(ROUTE_SRC_ID)
  } catch (e) { /* ignore */ }
}

function formatCoord(coord) {
  if (!coord) return '—'
  return `${coord[1].toFixed(4)}, ${coord[0].toFixed(4)}`
}

function closeModal() {
  emit('update:visible', false)
}

// 注意：不再在 onUnmounted 清除路径线，让路径保留在地图上
// 用户重新执行路径规划时会先 clearRouteLayers()
// 离开数据大屏页面时 DashboardMap 统一清理
</script>

<style scoped>
.route-content { min-height: 150px; }
.route-info { display: flex; flex-direction: column; gap: 12px; }
.route-points { display: flex; flex-direction: column; gap: 6px; }
.route-point { display: flex; align-items: center; gap: 4px; }
.point-label { color: rgba(255,255,255,0.45); font-size: 12px; }
.point-value { color: rgba(255,255,255,0.75); font-size: 13px; }
.result-card {
  display: flex; gap: 16px; padding: 16px;
  background: rgba(24,144,255,0.06);
  border: 1px solid rgba(24,144,255,0.15);
  border-radius: 8px;
}
.result-stat { flex: 1; text-align: center; }
.stat-label { display: block; color: rgba(255,255,255,0.4); font-size: 11px; margin-bottom: 4px; }
.stat-value { display: block; color: #1890ff; font-size: 18px; font-weight: 600; }
.route-status { margin-top: 8px; }
.loading-state { display: flex; justify-content: center; align-items: center; min-height: 150px; }
</style>

<style>
.route-modal .ant-modal-content { background: #141414; border: 1px solid rgba(255,255,255,0.08); }
.route-modal .ant-modal-header { background: #141414; border-bottom: 1px solid rgba(255,255,255,0.06); }
.route-modal .ant-modal-title { color: rgba(255,255,255,0.85); }
.route-modal .ant-modal-close { color: rgba(255,255,255,0.45); }
.route-modal .ant-modal-footer { border-top: 1px solid rgba(255,255,255,0.06); background: #141414; }
</style>
