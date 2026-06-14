<template>
  <div class="spatial-query">
    <!-- Drawing Toolbar -->
    <div class="query-toolbar">
      <a-tooltip title="点选查询（点击位置500m范围）" placement="right">
        <a-button
          :type="mode === 'point' ? 'primary' : 'default'"
          shape="circle"
          @click="toggleMode('point')"
        >
          <template #icon><PushpinOutlined /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="矩形框选" placement="right">
        <a-button
          :type="mode === 'rect' ? 'primary' : 'default'"
          shape="circle"
          @click="toggleMode('rect')"
        >
          <template #icon><BorderOutlined /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="圆形框选" placement="right">
        <a-button
          :type="mode === 'circle' ? 'primary' : 'default'"
          shape="circle"
          @click="toggleMode('circle')"
        >
          <template #icon><MinusCircleOutlined /></template>
        </a-button>
      </a-tooltip>
      <a-divider style="margin: 4px 0" />
      <a-tooltip title="清除结果" placement="right">
        <a-button shape="circle" @click="clearAll">
          <template #icon><DeleteOutlined /></template>
        </a-button>
      </a-tooltip>
    </div>

    <!-- Results Panel -->
    <div v-if="showPanel" class="query-results-panel">
      <div class="panel-header">
        <span class="panel-title">查询结果</span>
        <a-button type="text" size="small" @click="showPanel = false">
          <template #icon><CloseOutlined /></template>
        </a-button>
      </div>

      <!-- Stats -->
      <div class="panel-stats">
        <a-space>
          <a-tag color="blue">共 {{ results.total }} 条</a-tag>
          <a-tag v-if="results.elapsed">耗时 {{ results.elapsed }}ms</a-tag>
        </a-space>
        <div v-if="Object.keys(results.datasetCounts || {}).length" class="dataset-chips">
          <a-tag v-for="(count, name) in results.datasetCounts" :key="name" color="cyan">
            {{ name }}: {{ count }}
          </a-tag>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="panel-loading">
        <a-spin tip="正在查询..." />
      </div>

      <!-- Error -->
      <div v-else-if="errorMsg" class="panel-error">
        <a-empty :description="errorMsg" />
      </div>

      <!-- Results List -->
      <div v-else-if="paginatedItems.length" class="panel-list">
        <div
          v-for="(item, idx) in paginatedItems"
          :key="item.smid + '-' + item.dataset + '-' + idx"
          class="result-item"
          :class="{ 'result-active': hoveredId === item.smid + '-' + item.dataset }"
          @mouseenter="highlightFeature(item)"
          @mouseleave="unhighlightFeature"
          @click="focusFeature(item)"
        >
          <div class="item-icon">
            <a-tag :color="typeColor(item.geometry)" style="margin:0;font-size:11px">
              {{ typeLabel(item.geometry) }}
            </a-tag>
          </div>
          <div class="item-body">
            <div class="item-name">{{ item.displayName }}</div>
            <div class="item-meta">
              <span>{{ item.datasetName }}</span>
              <span v-if="item.properties.SMID">· SMID: {{ item.properties.SMID }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="panel-empty">
        <a-empty description="未查询到要素，请调整选择范围" />
      </div>

      <!-- Pagination -->
      <div v-if="results.total > pageSize" class="panel-pagination">
        <a-pagination
          v-model:current="currentPage"
          :total="results.total"
          :page-size="pageSize"
          size="small"
          show-less-items
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import {
  PushpinOutlined, DeleteOutlined, CloseOutlined,
  BorderOutlined, MinusCircleOutlined,
} from '@ant-design/icons-vue'
import { useMapStore } from '../stores/map'
import { request } from '../utils/request'
import { toGeoJSON } from '../utils/map'
import mapboxgl from 'mapbox-gl'

const store = useMapStore()

// ==================== 组件状态 ====================

/** 当前绘制模式：null | 'point' | 'rect' | 'circle' */
const mode = ref(null)
/** 是否正在查询中 */
const loading = ref(false)
/** 错误信息 */
const errorMsg = ref('')
/** 是否显示结果面板 */
const showPanel = ref(false)
/** 当前页码 */
const currentPage = ref(1)
const pageSize = 10
/** 鼠标悬停的要素 ID */
const hoveredId = ref(null)

/** 查询结果数据 */
const results = reactive({
  total: 0,
  datasetCounts: {},
  features: [],
  elapsed: 0,
})

/** 当前页的要素列表（计算属性） */
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return results.features.slice(start, start + pageSize)
})

// ==================== 地图图层常量 ====================

/** 绘制中的选择框状态 */
let drawState = null  // { type, startPoint, currentPoint, center, radius }

// 各图层 Source 名称
const SELECTION_SOURCE = 'sq-selection'       // 选择范围图形
const RESULT_POINT_SOURCE = 'sq-result-points' // 点要素查询结果
const RESULT_LINE_SOURCE = 'sq-result-lines'   // 线要素查询结果
const RESULT_POLY_SOURCE = 'sq-result-polys'   // 面要素查询结果
const HIGHLIGHT_SOURCE = 'sq-highlight'         // 高亮要素

let resultMarkers = []
let popup = null

// ==================== 图层初始化 ====================

/** 确保所有查询所需的 Source 和 Layer 已创建 */
function ensureSources() {
  const map = store.mapInstance
  if (!map) return

  // 定义所有查询相关图层
  const layers = [
    { id: 'sq-selection-fill', source: SELECTION_SOURCE, type: 'fill',
      paint: { 'fill-color': '#1890ff', 'fill-opacity': 0.15 } },
    { id: 'sq-selection-outline', source: SELECTION_SOURCE, type: 'line',
      paint: { 'line-color': '#1890ff', 'line-width': 2, 'line-dasharray': [4, 2] } },
    { id: 'sq-result-fill', source: RESULT_POLY_SOURCE, type: 'fill',
      paint: { 'fill-color': '#52c41a', 'fill-opacity': 0.12 } },
    { id: 'sq-result-outline', source: RESULT_POLY_SOURCE, type: 'line',
      paint: { 'line-color': '#52c41a', 'line-width': 1.5 } },
    { id: 'sq-result-line', source: RESULT_LINE_SOURCE, type: 'line',
      paint: { 'line-color': '#1890ff', 'line-width': 3 } },
    { id: 'sq-result-point-circle', source: RESULT_POINT_SOURCE, type: 'circle',
      paint: { 'circle-color': '#1890ff', 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } },
    { id: 'sq-highlight-fill', source: HIGHLIGHT_SOURCE, type: 'fill',
      paint: { 'fill-color': '#ff4d4f', 'fill-opacity': 0.3 } },
    { id: 'sq-highlight-outline', source: HIGHLIGHT_SOURCE, type: 'line',
      paint: { 'line-color': '#ff4d4f', 'line-width': 3 } },
    { id: 'sq-highlight-point', source: HIGHLIGHT_SOURCE, type: 'circle',
      paint: { 'circle-color': '#ff4d4f', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } },
  ]

  // 创建数据源和图层（如不存在）
  sources().forEach(src => {
    if (!map.getSource(src.id)) {
      map.addSource(src.id, { type: 'geojson', data: emptyFC() })
    }
  })
  layers.forEach(l => {
    if (!map.getLayer(l.id)) {
      map.addLayer(l)
    }
  })
}

function sources() {
  return [
    { id: SELECTION_SOURCE },
    { id: RESULT_POINT_SOURCE },
    { id: RESULT_LINE_SOURCE },
    { id: RESULT_POLY_SOURCE },
    { id: HIGHLIGHT_SOURCE },
  ]
}

function emptyFC() {
  return { type: 'FeatureCollection', features: [] }
}

/** 安全设置数据源内容 */
function setSourceData(sourceId, features) {
  const map = store.mapInstance
  if (!map) return
  try {
    map.getSource(sourceId).setData({ type: 'FeatureCollection', features })
  } catch (e) { /* ignore */ }
}

// ==================== 绘制模式管理 ====================

/**
 * 切换绘制模式
 * 点击已激活的模式则关闭，否则切换到新模式
 */
function toggleMode(newMode) {
  if (mode.value === newMode) {
    deactivateDrawMode()
    return
  }
  deactivateDrawMode()
  mode.value = newMode
  activateDrawMode()
}

/** 激活绘制模式：设置光标样式、禁用地图平移、注册地图事件 */
function activateDrawMode() {
  const map = store.mapInstance
  if (!map) return
  map.getCanvas().style.cursor = 'crosshair'
  // 禁用地图平移，避免与绘制拖拽冲突
  map.dragPan.disable()
  ensureSources()
  drawState = null

  if (mode.value === 'point') {
    map.on('click', onPointClick)
  } else if (mode.value === 'rect') {
    map.on('mousedown', onRectMouseDown)
    map.on('mousemove', onRectMouseMove)
    map.on('mouseup', onRectMouseUp)
  } else if (mode.value === 'circle') {
    map.on('click', onCircleClick)
    map.on('mousemove', onCircleMouseMove)
  }
}

/** 停用绘制模式：恢复地图交互，移除事件监听 */
function deactivateDrawMode() {
  const map = store.mapInstance
  if (!map) return
  map.getCanvas().style.cursor = ''
  // 恢复地图平移
  try { map.dragPan.enable() } catch (e) { /* ignore */ }
  map.off('click', onPointClick)
  map.off('mousedown', onRectMouseDown)
  map.off('mousemove', onRectMouseMove)
  map.off('mouseup', onRectMouseUp)
  map.off('click', onCircleClick)
  map.off('mousemove', onCircleMouseMove)

  // 清除选择框图形
  setSourceData(SELECTION_SOURCE, [])
  drawState = null
  mode.value = null
}

// ==================== 点选模式 ====================

/** 点击点选：以点击位置为中心构建 500m 缓冲区，执行空间查询 */
function onPointClick(e) {
  const lng = e.lngLat.lng
  const lat = e.lngLat.lat
  const circle = buildBufferCircle([lng, lat], 500)

  setSourceData(SELECTION_SOURCE, [{
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [circle] },
  }])

  doQuery({ type: 'Polygon', coordinates: [circle] })
}

// ==================== 矩形框选模式 ====================

function onRectMouseDown(e) {
  drawState = { type: 'rect', start: [e.lngLat.lng, e.lngLat.lat], current: [e.lngLat.lng, e.lngLat.lat] }
}

function onRectMouseMove(e) {
  if (!drawState || drawState.type !== 'rect') return
  drawState.current = [e.lngLat.lng, e.lngLat.lat]
  updateRectPreview()
}

function onRectMouseUp(e) {
  if (!drawState || drawState.type !== 'rect') return
  drawState.current = [e.lngLat.lng, e.lngLat.lat]
  updateRectPreview()

  const [x1, y1] = drawState.start
  const [x2, y2] = drawState.current
  const poly = [[
    [x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1],
  ]]

  doQuery({ type: 'Polygon', coordinates: poly })
  drawState = null
}

/** 更新矩形预览图形 */
function updateRectPreview() {
  if (!drawState || drawState.type !== 'rect') return
  const [x1, y1] = drawState.start
  const [x2, y2] = drawState.current
  setSourceData(SELECTION_SOURCE, [{
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]],
    },
  }])
}

// ==================== 圆形框选模式 ====================

/** 第一次点击设圆心，第二次点击确定半径 */
function onCircleClick(e) {
  if (!drawState) {
    // First click: set center
    drawState = { type: 'circle', center: [e.lngLat.lng, e.lngLat.lat], radius: 0 }
  } else {
    // Second click: finalize
    const circle = buildBufferCircle(drawState.center, drawState.radius)
    setSourceData(SELECTION_SOURCE, [{
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [circle] },
    }])
    doQuery({ type: 'Polygon', coordinates: [circle] })
    drawState = null
  }
}

/** 鼠标移动时实时更新圆形半径 */
function onCircleMouseMove(e) {
  if (!drawState || drawState.type !== 'circle' || !drawState.center) return
  const [cx, cy] = drawState.center
  const dx = (e.lngLat.lng - cx) * 111320 * Math.cos(cy * Math.PI / 180)
  const dy = (e.lngLat.lat - cy) * 111320
  drawState.radius = Math.sqrt(dx * dx + dy * dy)

  const circle = buildBufferCircle(drawState.center, drawState.radius)
  setSourceData(SELECTION_SOURCE, [{
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [circle] },
  }])
}

// ==================== 工具函数 ====================

/**
 * 构建圆形缓冲区坐标数组（近似圆形多边形）
 * @param {number[]} center - 圆心 [lng, lat]
 * @param {number} radiusMeters - 半径（米）
 * @returns {number[][]} 多边形顶点坐标数组
 */
function buildBufferCircle(center, radiusMeters) {
  const [cx, cy] = center
  const segments = 32
  const points = []
  const latRad = cy * Math.PI / 180
  const dLng = radiusMeters / (111320 * Math.cos(latRad))
  const dLat = radiusMeters / 111320

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI
    const lng = cx + dLng * Math.cos(angle)
    const lat = cy + dLat * Math.sin(angle)
    points.push([lng, lat])
  }
  return points
}

/** 根据几何类型返回对应标签颜色 */
function typeColor(geometry) {
  if (!geometry) return 'default'
  const t = geometry.type || ''
  if (t === 'POINT' || t === 'Point' || t === 'MULTIPOINT') return 'blue'
  if (t === 'LINE' || t === 'LineString' || t === 'MULTILINESTRING') return 'green'
  if (t === 'REGION' || t === 'Polygon' || t === 'MULTIPOLYGON') return 'orange'
  return 'default'
}

/** 根据几何类型返回中文标签 */
function typeLabel(geometry) {
  if (!geometry) return '?'
  const t = geometry.type || ''
  if (t === 'POINT' || t === 'Point' || t === 'MULTIPOINT') return '点'
  if (t === 'LINE' || t === 'LineString' || t === 'MULTILINESTRING') return '线'
  if (t === 'REGION' || t === 'Polygon' || t === 'MULTIPOLYGON') return '面'
  return '?'
}

// ==================== 空间查询 ====================

/**
 * 执行空间查询：向后端发送几何图形，查询所有相交要素
 * @param {object} geometry - GeoJSON 几何对象
 */
async function doQuery(geometry) {
  const map = store.mapInstance
  if (!map) return

  loading.value = true
  errorMsg.value = ''
  showPanel.value = true
  currentPage.value = 1
  results.total = 0
  results.datasetCounts = {}
  results.features = []
  results.elapsed = 0
  clearResultDisplay()

  try {
    const res = await request.post('/spatial/query', { geometry })
    if (res.code === 200 && res.data) {
      results.total = res.data.total || 0
      results.datasetCounts = res.data.datasetCounts || {}
      results.features = res.data.features || []
      results.elapsed = res.data.elapsed || 0

      if (results.features.length > 0) {
        displayResults(results.features)
      }
    } else {
      errorMsg.value = res.message || '查询失败'
    }
  } catch (err) {
    errorMsg.value = '查询请求失败: ' + (err.message || '网络错误')
  } finally {
    loading.value = false
  }
}

// 命名光标处理器（用于事件绑定/解绑）
function cursorPointer() { const m = store.mapInstance; if (m) m.getCanvas().style.cursor = 'pointer' }
function cursorDefault() { const m = store.mapInstance; if (m) m.getCanvas().style.cursor = '' }

// ==================== 结果显示 ====================

/** 在地图上展示查询结果，按点/线/面分类渲染 */
function displayResults(features) {
  const map = store.mapInstance
  if (!map) return

  const pointFeatures = []
  const lineFeatures = []
  const polyFeatures = []

  features.forEach(f => {
    const geo = toGeoJSON(f.geometry)
    if (!geo) return
    const feature = {
      type: 'Feature',
      id: f.smid,
      geometry: geo,
      properties: { ...f.properties, _displayName: f.displayName, _dataset: f.datasetName, _feature: f },
    }
    if (geo.type === 'Point' || geo.type === 'MultiPoint') {
      pointFeatures.push(feature)
    } else if (geo.type === 'LineString' || geo.type === 'MultiLineString') {
      lineFeatures.push(feature)
    } else if (geo.type === 'Polygon' || geo.type === 'MultiPolygon') {
      polyFeatures.push(feature)
    }
  })

  setSourceData(RESULT_POINT_SOURCE, pointFeatures)
  setSourceData(RESULT_LINE_SOURCE, lineFeatures)
  setSourceData(RESULT_POLY_SOURCE, polyFeatures)

  // 注册结果要素的点击事件（显示详情弹窗）
  if (pointFeatures.length) {
    map.on('click', 'sq-result-point-circle', onResultClick)
  }
  if (lineFeatures.length) {
    map.on('click', 'sq-result-line', onResultClick)
  }
  if (polyFeatures.length) {
    map.off('click', 'sq-result-fill', onResultClick)
    map.on('click', 'sq-result-fill', onResultClick)
    map.on('click', 'sq-result-outline', onResultClick)
  }

  // 注册悬停光标变化
  map.on('mouseenter', 'sq-result-point-circle', cursorPointer)
  map.on('mouseleave', 'sq-result-point-circle', cursorDefault)
  map.on('mouseenter', 'sq-result-line', cursorPointer)
  map.on('mouseleave', 'sq-result-line', cursorDefault)
  map.on('mouseenter', 'sq-result-fill', cursorPointer)
  map.on('mouseleave', 'sq-result-fill', cursorDefault)
}

/** 清除结果显示：清空数据源、移除事件监听、清理弹窗 */
function clearResultDisplay() {
  const map = store.mapInstance
  if (!map) return

  setSourceData(RESULT_POINT_SOURCE, [])
  setSourceData(RESULT_LINE_SOURCE, [])
  setSourceData(RESULT_POLY_SOURCE, [])
  setSourceData(HIGHLIGHT_SOURCE, [])

  map.off('click', 'sq-result-point-circle', onResultClick)
  map.off('click', 'sq-result-line', onResultClick)
  map.off('click', 'sq-result-fill', onResultClick)
  map.off('click', 'sq-result-outline', onResultClick)

  // 移除鼠标悬停事件，防止内存泄漏
  map.off('mouseenter', 'sq-result-point-circle', cursorPointer)
  map.off('mouseleave', 'sq-result-point-circle', cursorDefault)
  map.off('mouseenter', 'sq-result-line', cursorPointer)
  map.off('mouseleave', 'sq-result-line', cursorDefault)
  map.off('mouseenter', 'sq-result-fill', cursorPointer)
  map.off('mouseleave', 'sq-result-fill', cursorDefault)

  // 清除 Marker
  resultMarkers.forEach(m => { try { m.remove() } catch(e) {} })
  resultMarkers = []

  // 清除弹窗
  if (popup) { popup.remove(); popup = null }
}

// ==================== 结果交互 ====================

/** 点击结果要素时显示详情弹窗 */
function onResultClick(e) {
  const map = store.mapInstance
  if (!map || !e.features || !e.features.length) return
  const feature = e.features[0]
  const props = feature.properties
  showPopup(feature.geometry.coordinates, props)
}

/** 显示要素详情弹窗 */
function showPopup(coords, props) {
  const map = store.mapInstance
  if (!map) return
  if (popup) popup.remove()

  const container = document.createElement('div')
  container.className = 'sq-popup'
  let html = '<div style="max-height:300px;overflow-y:auto;font-size:12px;">'
  if (props._displayName) {
    html += `<div style="font-weight:bold;margin-bottom:6px;font-size:13px;">${props._displayName}</div>`
  }
  if (props._dataset) {
    html += `<div style="color:#888;margin-bottom:4px;">数据来源: ${props._dataset}</div>`
  }
  html += '<table style="width:100%;border-collapse:collapse;">'
  for (const [key, val] of Object.entries(props)) {
    if (key.startsWith('_')) continue
    html += `<tr><td style="padding:2px 6px;color:#666;border-bottom:1px solid #f0f0f0;">${key}</td>
               <td style="padding:2px 6px;border-bottom:1px solid #f0f0f0;">${val != null ? val : '-'}</td></tr>`
  }
  html += '</table></div>'
  container.innerHTML = html

  // 获取合适的显示坐标
  let coord = coords
  if (Array.isArray(coord) && Array.isArray(coord[0])) coord = coord[0]
  if (Array.isArray(coord) && Array.isArray(coord[0])) coord = coord[0]

  popup = new mapboxgl.Popup({ closeOnClick: true, maxWidth: '320px' })
    .setLngLat(coord)
    .setDOMContent(container)
    .addTo(map)
}

// ==================== 高亮与聚焦 ====================

/** 鼠标悬停时高亮要素 */
function highlightFeature(item) {
  const map = store.mapInstance
  if (!map) return
  const geo = toGeoJSON(item.geometry)
  if (!geo) return
  hoveredId.value = item.smid + '-' + item.dataset
  setSourceData(HIGHLIGHT_SOURCE, [{ type: 'Feature', geometry: geo }])
}

/** 取消高亮 */
function unhighlightFeature() {
  hoveredId.value = null
  setSourceData(HIGHLIGHT_SOURCE, [])
}

/** 点击要素时聚焦并显示详情 */
function focusFeature(item) {
  const map = store.mapInstance
  if (!map) return
  const geo = toGeoJSON(item.geometry)
  if (!geo) return

  let center
  if (geo.type === 'Point') {
    center = geo.coordinates
  } else if (geo.coordinates && geo.coordinates.length) {
    const allCoords = geo.coordinates.flat(2)
    if (allCoords.length >= 2) {
      center = [allCoords[0], allCoords[1]]
    }
  }

  if (center) {
    map.flyTo({ center, zoom: Math.max(map.getZoom(), 11), duration: 400 })
  }

  showPopup(center || (geo.coordinates && geo.coordinates[0]), {
    _displayName: item.displayName,
    _dataset: item.datasetName,
    ...item.properties,
  })
}

// ==================== 清除全部 ====================

/** 清除所有查询结果和绘制状态 */
function clearAll() {
  deactivateDrawMode()
  clearResultDisplay()
  showPanel.value = false
  results.total = 0
  results.datasetCounts = {}
  results.features = []
  results.elapsed = 0
  errorMsg.value = ''
  loading.value = false
}

// ==================== 生命周期 ====================

onUnmounted(() => {
  clearAll()
})
</script>

<style scoped>
.query-toolbar {
  position: absolute;
  top: 80px;
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

.query-results-panel {
  position: absolute;
  top: 20px;
  right: 70px;
  width: 320px;
  max-height: calc(100% - 40px);
  z-index: 5;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glass);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.panel-stats {
  padding: 8px 14px;
  border-bottom: 1px solid #f0f0f0;
}

.dataset-chips {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.panel-loading,
.panel-error,
.panel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  flex: 1;
}

.panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.result-item {
  display: flex;
  align-items: flex-start;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f8f8f8;
}

.result-item:hover,
.result-active {
  background: #e6f7ff;
}

.item-icon {
  margin-right: 10px;
  margin-top: 2px;
  flex-shrink: 0;
}

.item-body {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.panel-pagination {
  padding: 8px 14px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: center;
}
</style>
