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
            message="路网数据不可用，已显示直线路径"
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
 * 数据大屏 - 路径规划弹窗
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

// 监听弹窗打开 → 执行路径规划
watch(
  () => [props.visible, props.origin, props.destination],
  ([open, origin, dest]) => {
    if (open && origin && dest) {
      loading.value = true
      routeResult.value = null
      routeError.value = null
      calculateRoute()
    } else if (!open) {
      clearRouteLayers()
    }
  }
)

/**
 * 计算最优路径
 * 优先调用 iServer 网络分析服务，失败则降级为直线
 */
async function calculateRoute() {
  const { origin, destination } = props
  if (!origin || !destination) {
    routeError.value = '起点或终点坐标缺失'
    loading.value = false
    return
  }

  try {
    // 尝试 iServer 网络分析
    const result = await callNetworkAnalysis(origin, destination)
    if (result) {
      routeResult.value = {
        distance: `${result.distance.toFixed(1)} km`,
        duration: `${result.duration.toFixed(0)} 分钟`,
        isFallback: false,
      }
      renderRouteOnMap(result.path)
    } else {
      throw new Error('empty result')
    }
  } catch (err) {
    // 降级：显示直线路径
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
 * 调用 iServer 网络分析服务
 */
async function callNetworkAnalysis(origin, destination) {
  const url = '/iserver/services/transportationanalyst-sample/rest/networkanalyst/Changchun/RoadNet'
  const params = {
    nodeCount: 100,
    isAnalyzeById: false,
    parameter: {
      startPoints: [{ x: origin[0], y: origin[1] }],
      endPoints: [{ x: destination[0], y: destination[1] }],
      sourceNodes: [],
      targetNodes: [],
    },
  }

  const res = await fetch(`${url}/path.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error('Network analysis service error')
  const data = await res.json()

  if (data && data.pathList?.length > 0) {
    const path = data.pathList[0]
    return {
      distance: path.length || 0,
      duration: (path.length || 0) / 60, // 粗略估算，假定时速60km/h
      path: path.paths?.[0] || null,
    }
  }
  return null
}

/**
 * 在地图上渲染路径
 */
function renderRouteOnMap(pathGeoJson) {
  const map = props.map
  if (!map) return

  clearRouteLayers()

  if (!pathGeoJson) return

  map.addSource('route-line-src', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: pathGeoJson,
      properties: {},
    },
  })
  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: 'line',
    source: 'route-line-src',
    paint: {
      'line-color': '#1890ff',
      'line-width': 4,
      'line-opacity': 0.9,
    },
  })
}

/**
 * 降级渲染直线路径
 */
function renderFallbackLine(origin, destination) {
  const map = props.map
  if (!map) return

  clearRouteLayers()

  map.addSource('route-line-src', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [origin, destination],
      },
      properties: {},
    },
  })
  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: 'line',
    source: 'route-line-src',
    paint: {
      'line-color': '#ff4d4f',
      'line-width': 3,
      'line-dasharray': [4, 3],
      'line-opacity': 0.8,
    },
  })
}

/**
 * 清除路径图层
 */
function clearRouteLayers() {
  const map = props.map
  if (!map) return
  try {
    if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID)
    if (map.getSource('route-line-src')) map.removeSource('route-line-src')
  } catch (e) { /* ignore */ }
}

function formatCoord(coord) {
  if (!coord) return '—'
  return `${coord[1].toFixed(4)}, ${coord[0].toFixed(4)}`
}

function closeModal() {
  emit('update:visible', false)
}

onUnmounted(() => clearRouteLayers())
</script>

<style scoped>
.route-content {
  min-height: 150px;
}

.route-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.route-points {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 4px;
}

.point-label {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
}

.point-value {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

.result-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: rgba(24, 144, 255, 0.06);
  border: 1px solid rgba(24, 144, 255, 0.15);
  border-radius: 8px;
}

.result-stat {
  flex: 1;
  text-align: center;
}

.stat-label {
  display: block;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  color: #1890ff;
  font-size: 18px;
  font-weight: 600;
}

.route-status {
  margin-top: 8px;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 150px;
}
</style>
