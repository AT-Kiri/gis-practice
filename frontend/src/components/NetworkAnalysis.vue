<template>
  <!-- 网络分析面板：提供最短路径和服务区分析 -->
  <div class="network-analysis">
    <div class="na-panel glass-panel">
      <!-- Header -->
      <div class="panel-header">
        <span class="panel-title">城市交通分析</span>
        <a-tag color="orange" style="font-size:11px;">长春市路网</a-tag>
        <a-button type="text" size="small" @click="handleClose">
          <template #icon><CloseOutlined /></template>
        </a-button>
      </div>

      <!-- 模式切换标签 -->
      <div class="mode-tabs">
        <a-tabs v-model:activeKey="tabKey" size="small">
          <a-tab-pane key="path" tab="最短路径" />
          <a-tab-pane key="service-area" tab="服务区分析" />
        </a-tabs>
      </div>

      <!-- 状态信息栏 -->
      <div class="status-bar">
        <EnvironmentOutlined class="status-icon" />
        <span v-if="tabKey === 'path'">
          已标记 <b>{{ points.length }}</b> 个路径点（至少2个）
        </span>
        <span v-else>
          {{ centerPoint ? '已设置中心点' : '请在地图上点击选择中心点' }}
        </span>
      </div>

      <!-- 操作步骤与执行区 -->
      <div class="mode-body">
        <!-- 最短路径模式 -->
        <div v-if="tabKey === 'path'" class="section">
          <div class="section-label">操作步骤</div>
          <ol class="step-list">
            <li :class="{ done: points.length >= 1 }">在地图上<strong>点击</strong>标记途径点</li>
            <li :class="{ done: points.length >= 2 }">继续点击添加更多点（≥2个）</li>
            <li>点击下方按钮执行分析</li>
          </ol>
          <div class="section-actions">
            <a-button type="primary" :disabled="points.length < 2" :loading="loading" block @click="execPath">
              <NodeIndexOutlined /> 执行最短路径分析
            </a-button>
          </div>
        </div>

        <!-- 服务区分析模式 -->
        <div v-else class="section">
          <div class="section-label">操作步骤</div>
          <ol class="step-list">
            <li :class="{ done: !!centerPoint }">在地图上<strong>点击</strong>设置服务区中心</li>
            <li>设置服务区半径</li>
            <li>点击下方按钮执行分析</li>
          </ol>
          <div class="section-field">
            <label class="field-label">服务区半径（米）</label>
            <div class="radius-input">
              <a-slider v-model:value="serviceRadius" :min="100" :max="3000" :step="100" style="flex:1;margin:0 10px" />
              <a-input-number v-model:value="serviceRadius" :min="100" :max="3000" :step="100" size="small" style="width:80px">
                <template #addonAfter>米</template>
              </a-input-number>
            </div>
          </div>
          <div class="section-actions">
            <a-button type="primary" :disabled="!centerPoint" :loading="loading" block @click="execServiceArea">
              <NodeIndexOutlined /> 执行服务区分析
            </a-button>
          </div>
        </div>

        <!-- 结果摘要 -->
        <div v-if="resultInfo" class="result-box">
          <CheckCircleFilled class="result-icon" />
          <span class="result-text">{{ resultInfo }}</span>
        </div>
      </div>

      <div class="panel-footer">
        <a-button size="small" danger @click="clearAll">
          <DeleteOutlined /> 清除全部
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  CloseOutlined, EnvironmentOutlined, NodeIndexOutlined,
  DeleteOutlined, CheckCircleFilled,
} from '@ant-design/icons-vue'
import { useMapStore } from '../stores/map'
import { request } from '../utils/request'
import { convertGeometry, changchunToWgs84 } from '../utils/map'
import mapboxgl from 'mapbox-gl'

const emit = defineEmits(['close'])
const store = useMapStore()

// ==================== 常量 ====================

const ISERVER_URL = 'http://localhost:8090'
const MAP_NAME = encodeURIComponent('长春市区图')

// ==================== 组件状态 ====================

const tabKey = ref('path')          // 当前标签页：path | service-area
const loading = ref(false)          // 是否正在分析
const resultInfo = ref(null)        // 结果摘要文字

const points = ref([])              // 最短路径途经点 [{ x, y }]
const centerPoint = ref(null)       // 服务区中心点 { x, y }
const serviceRadius = ref(500)      // 服务区半径（米）
const pathResult = ref(null)        // 路径分析结果 GeoJSON
const areaResult = ref(null)        // 服务区分析结果 GeoJSON

// 地图图层 Source 名称
const NA_DRAW_SRC = 'na-draw'
const NA_PATH_SRC = 'na-path'
const NA_AREA_SRC = 'na-area'
const NA_BG_IMAGE = 'na-bg-image'     // 长春 tileImage 底图
const NA_ROAD_SRC = 'na-road'          // 矢量路网

// 保存切换前的地图状态（中心点、缩放级别、样式）
let savedState = null

// ==================== 生命周期 ====================

onMounted(() => {
  switchToChangchun()
  initLayers()
  setupClickHandler()
})

onUnmounted(() => {
  removeClickHandler()
  restoreMap()
  cleanupLayers()
})

// ==================== 地图切换 ====================

/** 切换到长春市区图：隐藏世界底图，加载长春 tileImage 和矢量路网 */
function switchToChangchun() {
  const map = store.mapInstance
  if (!map) return

  // 保存当前地图视图状态以便恢复
  savedState = {
    center: map.getCenter(),
    zoom: map.getZoom(),
    style: map.getStyle(),
  }

  // 隐藏世界底图和京津冀图层
  ;['world-layer', 'jingjin-layer'].forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none')
  })

  // 飞往长春市区（WGS84 坐标: ~125.3°E, 43.8°N）
  map.flyTo({ center: [125.3, 43.8], zoom: 10 })

  // 飞行结束后加载长春底图和路网
  map.once('moveend', () => {
    loadChangchunTile()
    loadRoadNetwork()
  })
}

/** 恢复地图到进入网络分析前的状态 */
function restoreMap() {
  const map = store.mapInstance
  if (!map || !savedState) return

  // 移除长春 tileImage 图层
  try {
    if (map.getLayer(NA_BG_IMAGE)) map.removeLayer(NA_BG_IMAGE)
    if (map.getSource(NA_BG_IMAGE)) map.removeSource(NA_BG_IMAGE)
    store.removeLayer(NA_BG_IMAGE)
  } catch (e) { /* ignore */ }

  // 恢复世界底图和京津冀图层可见
  ;['world-layer', 'jingjin-layer'].forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible')
  })

  // 恢复到之前的视图
  if (savedState) {
    map.flyTo({ center: savedState.center, zoom: savedState.zoom })
  }
  savedState = null
}

/**
 * 加载长春市区图作为底图背景
 * 使用 iServer tileImage 服务，将平面坐标系映射到 WGS84 经纬度
 */
function loadChangchunTile() {
  const map = store.mapInstance
  if (!map) return

  // 长春市区底图中心点（平面坐标）
  const cx = 4503, cy = -3862
  const centerJson = JSON.stringify({ x: cx, y: cy })
  const url = `${ISERVER_URL}/iserver/services/map-changchun/rest/maps/${MAP_NAME}/tileImage.png`
    + `?width=1024&height=1024&center=${encodeURIComponent(centerJson)}`

  // 将平面坐标范围映射到 WGS84 四角坐标（NW → NE → SE → SW）
  const nw = changchunToWgs84(47, -55)
  const ne = changchunToWgs84(8958, -55)
  const se = changchunToWgs84(8958, -7669)
  const sw = changchunToWgs84(47, -7669)
  const coords = [[nw[0], nw[1]], [ne[0], ne[1]], [se[0], se[1]], [sw[0], sw[1]]]

  // 更新或创建 ImageSource（放在分析图层下方）
  if (map.getSource(NA_BG_IMAGE)) {
    map.getSource(NA_BG_IMAGE).updateImage({ url, coordinates: coords })
  } else {
    map.addSource(NA_BG_IMAGE, { type: 'image', url, coordinates: coords })
    // 第二参数确保底图在矢量路网之下
    map.addLayer({ id: NA_BG_IMAGE, type: 'raster', source: NA_BG_IMAGE }, 'na-road-line')
    store.addLayer({ id: NA_BG_IMAGE, name: '长春市区底图', visible: true, opacity: 1 })
  }
}

// ==================== 地图图层 ====================

/** 初始化网络分析所需的图层 */
function initLayers() {
  const map = store.mapInstance
  if (!map) return

  // 路径点标记
  if (!map.getSource(NA_DRAW_SRC)) {
    map.addSource(NA_DRAW_SRC, { type: 'geojson', data: fc() })
    map.addLayer({ id: 'na-points', source: NA_DRAW_SRC, type: 'circle',
      paint: { 'circle-color': '#f5222d', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })
  }

  // 路径分析结果线
  if (!map.getSource(NA_PATH_SRC)) {
    map.addSource(NA_PATH_SRC, { type: 'geojson', data: fc() })
    map.addLayer({ id: 'na-path-line', source: NA_PATH_SRC, type: 'line',
      paint: { 'line-color': '#1890ff', 'line-width': 5, 'line-opacity': 0.9 } })
  }

  // 服务区分析结果面
  if (!map.getSource(NA_AREA_SRC)) {
    map.addSource(NA_AREA_SRC, { type: 'geojson', data: fc() })
    map.addLayer({ id: 'na-area-fill', source: NA_AREA_SRC, type: 'fill',
      paint: { 'fill-color': '#722ed1', 'fill-opacity': 0.2, 'fill-outline-color': '#722ed1' } })
  }

  // 矢量路网（清晰的矢量线，介于底图和分析图层之间）
  if (!map.getSource(NA_ROAD_SRC)) {
    map.addSource(NA_ROAD_SRC, { type: 'geojson', data: fc() })
    map.addLayer({ id: 'na-road-line', source: NA_ROAD_SRC, type: 'line',
      paint: { 'line-color': '#888', 'line-width': 1, 'line-opacity': 0.6 },
    }, 'na-points')
  }
}

/** 从后端加载 RoadNet 矢量路网数据 */
async function loadRoadNetwork() {
  try {
    const res = await request.get('/network/road-network', { params: { limit: 2000 } })
    if (res.code === 200 && res.data) {
      const map = store.mapInstance
      if (map && map.getSource(NA_ROAD_SRC)) {
        map.getSource(NA_ROAD_SRC).setData(res.data)
      }
    }
  } catch (e) {
    console.warn('矢量路网加载失败:', e)
  }
}

/** 清理网络分析图层 */
function cleanupLayers() {
  const map = store.mapInstance
  if (!map) return
  ;['na-points', 'na-path-line', 'na-area-fill', 'na-road-line'].forEach(id => {
    try { map.removeLayer(id) } catch(e) {}
  })
  ;[NA_DRAW_SRC, NA_PATH_SRC, NA_AREA_SRC, NA_ROAD_SRC].forEach(id => {
    try { map.removeSource(id) } catch(e) {}
  })
}

function fc() { return { type: 'FeatureCollection', features: [] } }

/** 安全设置数据源内容 */
function setSource(src, features) {
  const map = store.mapInstance
  if (!map) return
  try { map.getSource(src).setData({ type: 'FeatureCollection', features }) } catch(e) {}
}

// ==================== 点击事件 ====================

let clickHandler = null

/** 注册地图点击事件：路径模式添加途经点，服务区模式设置中心点 */
function setupClickHandler() {
  const map = store.mapInstance
  if (!map) return
  clickHandler = (e) => {
    const pt = { x: e.lngLat.lng, y: e.lngLat.lat }
    if (tabKey.value === 'path') {
      points.value.push(pt)
      updateDrawPoints()
    } else {
      centerPoint.value = pt
      updateDrawPoints()
    }
  }
  map.on('click', clickHandler)
  map.getCanvas().style.cursor = 'crosshair'
}

/** 移除点击事件 */
function removeClickHandler() {
  const map = store.mapInstance
  if (!map) return
  if (clickHandler) map.off('click', clickHandler)
  map.getCanvas().style.cursor = ''
  clickHandler = null
}

/** 更新地图上的标记点显示 */
function updateDrawPoints() {
  const features = tabKey.value === 'path'
    ? points.value.map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.x, p.y] } }))
    : centerPoint.value
      ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [centerPoint.value.x, centerPoint.value.y] } }]
      : []
  setSource(NA_DRAW_SRC, features)
}

// ==================== 最短路径分析 ====================

/** 执行最短路径分析 */
async function execPath() {
  if (points.value.length < 2) return
  loading.value = true
  resultInfo.value = null
  try {
    const res = await request.post('/network/shortest-path', {
      points: points.value.map(p => [p.x, p.y]),
      weightField: 'length',
    })
    if (res.code === 200 && res.data) {
      displayPathResult(res.data)
    } else {
      resultInfo.value = '分析失败: ' + (res.msg || '未知错误')
    }
  } catch (err) {
    console.error('路径分析失败:', err)
    resultInfo.value = '请求失败: ' + err.message
  } finally {
    loading.value = false
  }
}

/** 展示路径分析结果 */
function displayPathResult(data) {
  const map = store.mapInstance
  if (!map) return

  const pathList = data.pathList
  if (!pathList || pathList.length === 0) {
    resultInfo.value = '未找到路径'
    return
  }

  // 从 pathGuideItems 中提取所有 LINE 类型的边，拼接成完整路径
  const allCoords = []
  let routeLength = 0

  pathList.forEach(p => {
    const items = p.pathGuideItems
    if (!items) return

    items.forEach(item => {
      if (item.isEdge && item.geometry && item.geometry.type === 'LINE') {
        const geo = convertGeometry(item.geometry)
        if (geo && geo.coordinates) {
          // 第一个 segment 取全部点，后续跳过第一个点避免重复
          if (allCoords.length === 0) {
            allCoords.push(...geo.coordinates)
          } else {
            allCoords.push(...geo.coordinates.slice(1))
          }
          routeLength += item.length || 0
        }
      }
    })
  })

  if (allCoords.length < 2) {
    resultInfo.value = '未找到有效路径'
    return
  }

  const feature = {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: allCoords },
  }
  setSource(NA_PATH_SRC, [feature])

  // 缩放到路径范围
  const bounds = new mapboxgl.LngLatBounds()
  allCoords.forEach(c => bounds.extend(c))
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40 })

  resultInfo.value = `路径分析完成 (${(routeLength / 1000).toFixed(2)} km)`
}

// ==================== 服务区分析 ====================

/** 执行服务区分析 */
async function execServiceArea() {
  if (!centerPoint.value) return
  loading.value = true
  resultInfo.value = null
  try {
    const res = await request.post('/network/service-area', {
      center: [centerPoint.value.x, centerPoint.value.y],
      weights: [serviceRadius.value],
      weightField: 'length',
    })
    if (res.code === 200 && res.data) {
      displayAreaResult(res.data)
    } else {
      resultInfo.value = '分析失败: ' + (res.msg || '未知错误')
    }
  } catch (err) {
    console.error('服务区分析失败:', err)
    resultInfo.value = '请求失败: ' + err.message
  } finally {
    loading.value = false
  }
}

/** 展示服务区分析结果 */
function displayAreaResult(data) {
  const map = store.mapInstance
  if (!map) return

  const areaList = data.serviceAreaList
  if (!areaList || areaList.length === 0) {
    resultInfo.value = '未生成服务区'
    return
  }

  // 提取所有 LINE 几何并转换为 WGS84
  const allCoords = []
  let edgeCount = 0

  areaList.forEach(a => {
    const edges = a.edgeFeatures
    if (!edges) return

    edges.forEach(edge => {
      if (edge.geometry && edge.geometry.type === 'LINE') {
        const geo = convertGeometry(edge.geometry)
        if (geo && geo.coordinates && geo.coordinates.length >= 2) {
          allCoords.push(...geo.coordinates)
          edgeCount++
        }
      }
    })
  })

  if (allCoords.length < 2) {
    resultInfo.value = '未生成有效服务区'
    return
  }

  // 将边显示为线图层
  const features = areaList.flatMap(a =>
    (a.edgeFeatures || [])
      .filter(e => e.geometry && e.geometry.type === 'LINE')
      .map(e => ({
        type: 'Feature',
        geometry: convertGeometry(e.geometry),
        properties: { name: (e.fieldValues && e.fieldValues[9]) || '' },
      }))
      .filter(f => f.geometry && f.geometry.coordinates)
  )

  if (features.length === 0) {
    resultInfo.value = '未生成有效服务区'
    return
  }

  setSource(NA_AREA_SRC, features)

  // 缩放到结果范围
  const bounds = new mapboxgl.LngLatBounds()
  allCoords.forEach(c => bounds.extend(c))
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 50 })

  resultInfo.value = `服务区分析完成 (${edgeCount} 条路段)`
}

// ==================== 清除操作 ====================

/** 清除所有标记和分析结果 */
function clearAll() {
  points.value = []
  centerPoint.value = null
  resultInfo.value = null
  pathResult.value = null
  areaResult.value = null
  setSource(NA_DRAW_SRC, [])
  setSource(NA_PATH_SRC, [])
  setSource(NA_AREA_SRC, [])
}

function handleClose() {
  emit('close')
}

// 切换标签时自动清除
watch(tabKey, () => {
  clearAll()
})
</script>

<style scoped>
.network-analysis {
  position: absolute;
  top: 20px;
  left: 84px;
  width: 300px;
  z-index: 5;
}

.na-panel {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 120px);
  overflow: hidden;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glass);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px 0;
}
.panel-title { font-weight: 600; font-size: 14px; }

.mode-tabs { padding: 0 14px; }

.status-bar {
  margin: 0 14px 6px;
  padding: 6px 10px;
  background: rgba(24, 144, 255, 0.08);
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}
.status-icon { color: var(--color-primary); }

.mode-body {
  padding: 0 14px 10px;
  overflow-y: auto;
  flex: 1;
}

.section { margin-bottom: 12px; }
.section-label { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 8px; }

.step-list {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.8;
}
.step-list li.done { color: var(--color-accent-green); text-decoration: line-through; }

.section-actions { margin-top: 10px; }

.section-field { margin-bottom: 10px; }
.field-label { display: block; font-size: 11px; color: var(--color-text-muted); margin-bottom: 4px; }

.radius-input {
  display: flex;
  align-items: center;
  gap: 4px;
}

.result-box {
  margin-top: 8px;
  padding: 8px 10px;
  background: rgba(82, 196, 26, 0.08);
  border: 1px solid rgba(82, 196, 26, 0.15);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.result-icon { color: var(--color-accent-green); }
.result-text { color: var(--color-text-primary); }

.panel-footer {
  padding: 8px 14px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}
</style>
