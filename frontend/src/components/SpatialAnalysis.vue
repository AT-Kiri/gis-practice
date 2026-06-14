<template>
  <div class="spatial-analysis">
    <div class="analysis-panel glass-panel">
      <!-- Header -->
      <div class="panel-header">
        <span class="panel-title">空间分析</span>
        <a-button type="text" size="small" @click="$emit('close')">
          <template #icon><CloseOutlined /></template>
        </a-button>
      </div>

      <!-- Mode Tabs -->
      <div class="mode-tabs">
        <a-tabs v-model:activeKey="tabKey" size="small">
          <a-tab-pane key="buffer" tab="缓冲区分析" />
          <a-tab-pane key="overlay" tab="叠置分析" />
        </a-tabs>
      </div>

      <!-- Buffer Mode -->
      <div v-if="tabKey === 'buffer'" class="mode-body">
        <div class="section">
          <div class="section-label">① 绘制分析对象</div>
          <div class="draw-tools">
            <a-tooltip title="点">
              <a-button :type="drawMode === 'point' ? 'primary' : 'default'" shape="circle" @click="setDrawMode('point')">
                <template #icon><PushpinOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="线">
              <a-button :type="drawMode === 'line' ? 'primary' : 'default'" shape="circle" @click="setDrawMode('line')">
                <template #icon><LineOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="面">
              <a-button :type="drawMode === 'polygon' ? 'primary' : 'default'" shape="circle" @click="setDrawMode('polygon')">
                <template #icon><BorderOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-divider type="vertical" />
            <a-tooltip title="清除绘制">
              <a-button shape="circle" @click="clearDraw">
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </a-tooltip>
          </div>
        </div>

        <div class="section">
          <div class="section-label">② 设置缓冲区半径</div>
          <div class="buffer-input">
            <a-slider
              v-model:value="bufferDistance"
              :min="10"
              :max="5000"
              :step="10"
              style="flex:1;margin:0 10px"
            />
            <a-input-number
              v-model:value="bufferDistance"
              :min="10"
              :max="5000"
              :step="10"
              size="small"
              style="width:80px"
            >
              <template #addonAfter>米</template>
            </a-input-number>
          </div>
        </div>

        <div class="section actions">
          <a-button type="primary" :disabled="!drawnGeo" :loading="loading" block @click="execBuffer">
            <ApiOutlined /> 执行缓冲区分析
          </a-button>
        </div>
      </div>

      <!-- Overlay Mode -->
      <div v-if="tabKey === 'overlay'" class="mode-body">
        <div class="section">
          <div class="section-label">选择数据集与操作类型</div>
          <div class="overlay-field">
            <span class="field-label">源数据集</span>
            <a-select v-model:value="overlaySource" size="small" style="width:100%">
              <a-select-option value="Landuse_R@Jingjin">土地利用 (Landuse_R)</a-select-option>
              <a-select-option value="Geomor_R@Jingjin">地貌 (Geomor_R)</a-select-option>
              <a-select-option value="BaseMap_R@Jingjin">基础底图 (BaseMap_R)</a-select-option>
              <a-select-option value="Lake_R@Jingjin">湖泊 (Lake_R)</a-select-option>
            </a-select>
          </div>
          <div class="overlay-field">
            <span class="field-label">操作数据集</span>
            <a-select v-model:value="overlayOperate" size="small" style="width:100%">
              <a-select-option value="Geomor_R@Jingjin">地貌 (Geomor_R)</a-select-option>
              <a-select-option value="Landuse_R@Jingjin">土地利用 (Landuse_R)</a-select-option>
              <a-select-option value="BaseMap_R@Jingjin">基础底图 (BaseMap_R)</a-select-option>
              <a-select-option value="Lake_R@Jingjin">湖泊 (Lake_R)</a-select-option>
            </a-select>
          </div>
          <div class="overlay-field">
            <span class="field-label">操作类型</span>
            <a-select v-model:value="overlayOperation" size="small" style="width:100%">
              <a-select-option value="UNION">并集 (UNION)</a-select-option>
              <a-select-option value="INTERSECT">交集 (INTERSECT)</a-select-option>
              <a-select-option value="ERASE">擦除 (ERASE)</a-select-option>
              <a-select-option value="CLIP">裁剪 (CLIP)</a-select-option>
            </a-select>
          </div>
        </div>

        <div class="section actions">
          <a-button type="primary" :loading="loading" block @click="execOverlay">
            <ApiOutlined /> 执行叠置分析
          </a-button>
        </div>
      </div>

      <!-- Clear Results -->
      <div v-if="hasResult" class="panel-footer">
        <a-button size="small" danger @click="clearResult">清除分析结果</a-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import {
  CloseOutlined, PushpinOutlined, LineOutlined, BorderOutlined,
  DeleteOutlined, ApiOutlined,
} from '@ant-design/icons-vue'
import { useMapStore } from '../stores/map'
import { request } from '../utils/request'
import mapboxgl from 'mapbox-gl'

const emit = defineEmits(['close'])
const store = useMapInstance()

// ==================== 组件状态 ====================

/** 当前标签页：buffer | overlay */
const tabKey = ref('buffer')
/** 是否正在分析中 */
const loading = ref(false)
/** 缓冲区半径（米） */
const bufferDistance = ref(500)
/** 是否有分析结果 */
const hasResult = ref(false)

// 绘制状态
/** 当前绘制模式：null | 'point' | 'line' | 'polygon' */
const drawMode = ref(null)
/** 已绘制的几何对象（GeoJSON Geometry） */
let drawnGeo = ref(null)
/** 是否正在绘制中 */
let isDrawing = false
/** 当前绘制中的临时点列表 */
let tempPoints = []
/** 事件监听器列表，用于清理 */
let drawListeners = []

// 叠置分析参数
const overlaySource = ref('Landuse_R@Jingjin')
const overlayOperate = ref('Geomor_R@Jingjin')
const overlayOperation = ref('UNION')

// 图层 Source 名称
const DRAW_SOURCE = 'sa-draw'
const RESULT_SOURCE = 'sa-result'

// ==================== 辅助函数 ====================

function getMap() { return store.mapInstance }

/** 确保绘制和结果的 Source/Layer 已创建 */
function ensureLayer() {
  const map = getMap()
  if (!map) return
  if (!map.getSource(DRAW_SOURCE)) {
    map.addSource(DRAW_SOURCE, { type: 'geojson', data: emptyFC() })
    map.addLayer({ id: 'sa-draw-fill', source: DRAW_SOURCE, type: 'fill',
      paint: { 'fill-color': '#1890ff', 'fill-opacity': 0.15 },
      filter: ['==', '$type', 'Polygon'] })
    map.addLayer({ id: 'sa-draw-line', source: DRAW_SOURCE, type: 'line',
      paint: { 'line-color': '#1890ff', 'line-width': 3 },
      filter: ['==', '$type', 'LineString'] })
    map.addLayer({ id: 'sa-draw-point', source: DRAW_SOURCE, type: 'circle',
      paint: { 'circle-color': '#1890ff', 'circle-radius': 7 } })
  }
  if (!map.getSource(RESULT_SOURCE)) {
    map.addSource(RESULT_SOURCE, { type: 'geojson', data: emptyFC() })
    map.addLayer({ id: 'sa-result-fill', source: RESULT_SOURCE, type: 'fill',
      paint: { 'fill-color': '#722ed1', 'fill-opacity': 0.2, 'fill-outline-color': '#722ed1' } })
    map.addLayer({ id: 'sa-result-line', source: RESULT_SOURCE, type: 'line',
      paint: { 'line-color': '#722ed1', 'line-width': 2 } })
  }
}

function emptyFC() { return { type: 'FeatureCollection', features: [] } }

/** 安全设置数据源内容 */
function setSource(src, features) {
  const map = getMap()
  if (!map) return
  try { map.getSource(src).setData({ type: 'FeatureCollection', features }) } catch(e) {}
}

function useMapInstance() {
  return useMapStore()
}

// ==================== 绘制功能 ====================

/**
 * 设置绘制模式
 * 点击已激活的模式取消，否则激活新模式
 */
function setDrawMode(mode) {
  clearDrawListeners()
  if (drawMode.value === mode) { drawMode.value = null; return }
  drawMode.value = mode
  tempPoints = []
  isDrawing = false
  const map = getMap()
  if (!map) return
  map.getCanvas().style.cursor = 'crosshair'
  ensureLayer()

  if (mode === 'point') {
    map.on('click', onDrawClick)
    drawListeners.push(['click', onDrawClick])
  } else {
    // 线和面需要双击完成绘制
    map.on('click', onDrawClick)
    map.on('dblclick', onDrawDblClick)
    drawListeners.push(['click', onDrawClick], ['dblclick', onDrawDblClick])
  }
}

/** 点击添加绘制点 */
function onDrawClick(e) {
  const map = getMap()
  if (!map) return
  const pt = [e.lngLat.lng, e.lngLat.lat]

  if (drawMode.value === 'point') {
    const geo = { type: 'Point', coordinates: pt }
    drawnGeo.value = JSON.stringify({ type: 'Feature', geometry: geo })
    setSource(DRAW_SOURCE, [{ type: 'Feature', geometry: geo }])
    return
  }

  tempPoints.push(pt)
  if (tempPoints.length === 1 && drawMode.value === 'line') {
    // 线模式：刚点击第一个点，等后续点
  }
  updateTempDraw()
}

/** 双击完成绘制（线/面） */
function onDrawDblClick(e) {
  const map = getMap()
  if (!map) return
  if (drawMode.value === 'polygon' && tempPoints.length >= 3) {
    // 闭合多边形
    const coords = [...tempPoints, tempPoints[0]]
    const geo = { type: 'Polygon', coordinates: [coords] }
    drawnGeo.value = geo
    setSource(DRAW_SOURCE, [{ type: 'Feature', geometry: geo }])
  } else if (drawMode.value === 'line' && tempPoints.length >= 2) {
    const geo = { type: 'LineString', coordinates: tempPoints }
    drawnGeo.value = geo
    setSource(DRAW_SOURCE, [{ type: 'Feature', geometry: geo }])
  }
  clearDrawListeners()
  if (map) map.getCanvas().style.cursor = ''
  drawMode.value = null
}

/** 更新临时绘制图形 */
function updateTempDraw() {
  if (tempPoints.length < 1) return
  if (drawMode.value === 'line' && tempPoints.length >= 1) {
    const geo = { type: 'LineString', coordinates: tempPoints }
    setSource(DRAW_SOURCE, [{ type: 'Feature', geometry: geo }])
  } else if (drawMode.value === 'polygon' && tempPoints.length >= 2) {
    const coords = [...tempPoints]
    const geo = { type: 'Polygon', coordinates: [coords] }
    setSource(DRAW_SOURCE, [{ type: 'Feature', geometry: geo }])
  }
}

/** 清除绘制事件监听 */
function clearDrawListeners() {
  const map = getMap()
  if (!map) return
  drawListeners.forEach(([evt, fn]) => map.off(evt, fn))
  drawListeners = []
  map.getCanvas().style.cursor = ''
}

/** 清除绘制内容 */
function clearDraw() {
  clearDrawListeners()
  drawMode.value = null
  tempPoints = []
  drawnGeo.value = null
  setSource(DRAW_SOURCE, [])
}

// ==================== 缓冲区分析 ====================

/** 执行缓冲区分析 */
async function execBuffer() {
  if (!drawnGeo.value) return
  loading.value = true
  try {
    const res = await request.post('/spatial-analysis/buffer', {
      geometry: drawnGeo.value,
      distance: bufferDistance.value,
      unit: 'METER',
    })
    if (res.code === 200 && res.data) {
      showResult(res.data)
      hasResult.value = true
    }
  } catch (err) {
    console.error('缓冲区分析失败:', err)
  } finally {
    loading.value = false
  }
}

// ==================== 叠置分析 ====================

/** 执行叠置分析 */
async function execOverlay() {
  loading.value = true
  try {
    const res = await request.post('/spatial-analysis/overlay', {
      sourceDataset: overlaySource.value,
      operateDataset: overlayOperate.value,
      operation: overlayOperation.value,
    })
    if (res.code === 200 && res.data) {
      showResult(res.data)
      hasResult.value = true
    }
  } catch (err) {
    console.error('叠置分析失败:', err)
  } finally {
    loading.value = false
  }
}

// ==================== 结果显示 ====================

/** 在地图上展示分析结果 */
function showResult(data) {
  const map = getMap()
  if (!map) return
  clearResult()

  // 兼容不同响应格式
  let features = null
  if (data.recordset && data.recordset.features) {
    features = data.recordset.features
  } else if (data.resultGeometry) {
    features = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: data.resultGeometry }] }
  } else if (data.features) {
    features = data.features
  }

  if (!features) return

  setSource(RESULT_SOURCE, features.type === 'FeatureCollection' ? features.features : [features])

  // 缩放到结果范围
  const bounds = new mapboxgl.LngLatBounds()
  const allFeatures = features.type === 'FeatureCollection' ? features.features : [features]
  allFeatures.forEach(f => {
    if (f.geometry && f.geometry.coordinates) {
      const coords = f.geometry.coordinates.flat(2)
      for (let i = 0; i < coords.length - 1; i += 2) {
        bounds.extend([coords[i], coords[i + 1]])
      }
    }
  })
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 50, maxZoom: 14 })
}

/** 清除分析结果 */
function clearResult() {
  setSource(RESULT_SOURCE, [])
  hasResult.value = false
}

/** 清除所有（绘制+结果） */
function clearAll() {
  clearDraw()
  clearResult()
}

onUnmounted(() => {
  clearAll()
  const map = getMap()
  if (map) {
    ;[DRAW_SOURCE, RESULT_SOURCE].forEach(id => {
      try { map.removeLayer('sa-draw-fill'); map.removeLayer('sa-draw-line'); map.removeLayer('sa-draw-point') } catch(e) {}
      try { map.removeLayer('sa-result-fill'); map.removeLayer('sa-result-line') } catch(e) {}
      try { map.removeSource(id) } catch(e) {}
    })
  }
})
</script>

<style scoped>
.spatial-analysis {
  position: absolute;
  top: 20px;
  left: 84px;
  width: 320px;
  z-index: 5;
}

.analysis-panel {
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

.mode-body {
  padding: 0 14px 12px;
  overflow-y: auto;
  flex: 1;
}

.section {
  margin-bottom: 14px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.draw-tools {
  display: flex;
  align-items: center;
  gap: 6px;
}

.buffer-input {
  display: flex;
  align-items: center;
  gap: 4px;
}

.overlay-field {
  margin-bottom: 10px;
}

.field-label {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 3px;
}

.actions {
  margin-top: 4px;
}

.panel-footer {
  padding: 8px 14px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}
</style>
