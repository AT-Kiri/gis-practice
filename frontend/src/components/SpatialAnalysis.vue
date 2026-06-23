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
            <a-tooltip :title="DATASET_META[overlaySource]?.description || ''" placement="right">
              <a-select v-model:value="overlaySource" size="small" style="width:100%" @change="onSourceChange">
                <a-select-opt-group v-for="(items, category) in groupedDatasets" :key="category" :label="category">
                  <a-select-option v-for="ds in items" :key="ds.value" :value="ds.value">{{ ds.label }}</a-select-option>
                </a-select-opt-group>
              </a-select>
            </a-tooltip>
          </div>
          <div class="overlay-field">
            <span class="field-label">操作数据集</span>
            <a-tooltip :title="DATASET_META[overlayOperate]?.description || ''" placement="right">
              <a-select v-model:value="overlayOperate" size="small" style="width:100%">
                <a-select-option v-for="ds in filteredOperateDatasets" :key="ds.value" :value="ds.value">
                  <span v-if="DATASET_META[overlaySource]?.pairings?.recommended?.includes(ds.value)" style="color:#1890ff">★ {{ ds.label }}</span>
                  <span v-else>{{ ds.label }}</span>
                </a-select-option>
              </a-select>
            </a-tooltip>
          </div>
          <div class="overlay-field">
            <span class="field-label">操作类型</span>
            <a-tooltip :title="OPERATION_META[overlayOperation]?.description || ''" placement="right">
              <a-select v-model:value="overlayOperation" size="small" style="width:100%">
                <a-select-option v-for="op in availableOperations" :key="op" :value="op">
                  {{ OPERATION_META[op]?.name || op }} ({{ op }})
                </a-select-option>
              </a-select>
            </a-tooltip>
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
import { ref, onMounted, onUnmounted, computed } from 'vue'
import {
  CloseOutlined, PushpinOutlined, LineOutlined, BorderOutlined,
  DeleteOutlined, ApiOutlined,
} from '@ant-design/icons-vue'
import { useMapStore } from '../stores/map'
import { ISERVER_URL } from '../utils/map'
import mapboxgl from 'mapbox-gl'
import { message } from 'ant-design-vue'
import { DataFormat, BufferEndType, BufferRadiusUnit, DataReturnMode } from '@supermap/iclient-common/REST'
import { GeoJSON } from '@supermap/iclient-common/format/GeoJSON'
import { BufferAnalystService } from '@supermap/iclient-common/iServer/BufferAnalystService'
import { OverlayAnalystService } from '@supermap/iclient-common/iServer/OverlayAnalystService'
import { GeometryBufferAnalystParameters } from '@supermap/iclient-common/iServer/GeometryBufferAnalystParameters'
import { DatasetOverlayAnalystParameters } from '@supermap/iclient-common/iServer/DatasetOverlayAnalystParameters'
import { BufferSetting } from '@supermap/iclient-common/iServer/BufferSetting'
import { BufferDistance } from '@supermap/iclient-common/iServer/BufferDistance'
import { DataReturnOption } from '@supermap/iclient-common/iServer/DataReturnOption'

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

/** 数据集元数据配置：中文名、分类、描述、推荐配对 */
const DATASET_META = {
  'Landuse_R@Jingjin': {
    name: '土地利用',
    category: '人文地理',
    description: '京津地区土地利用分类矢量数据',
    pairings: { recommended: ['Geomor_R@Jingjin', 'City_R@Jingjin'], supported: ['BaseMap_R@Jingjin', 'Lake_R@Jingjin', 'River_R@Jingjin'] },
    operations: ['UNION', 'INTERSECT', 'ERASE', 'CLIP'],
  },
  'Geomor_R@Jingjin': {
    name: '地貌',
    category: '自然地理',
    description: '地貌类型分区矢量数据',
    pairings: { recommended: ['Landuse_R@Jingjin'], supported: ['City_R@Jingjin', 'BaseMap_R@Jingjin', 'Lake_R@Jingjin'] },
    operations: ['UNION', 'INTERSECT', 'CLIP'],
  },
  'BaseMap_R@Jingjin': {
    name: '基础底图',
    category: '基础地理',
    description: '基础地理底图矢量数据',
    pairings: { recommended: ['Landuse_R@Jingjin', 'City_R@Jingjin'], supported: ['Geomor_R@Jingjin', 'Lake_R@Jingjin'] },
    operations: ['UNION', 'INTERSECT', 'CLIP'],
  },
  'Lake_R@Jingjin': {
    name: '湖泊',
    category: '水文',
    description: '湖泊水域分布矢量数据',
    pairings: { recommended: ['Landuse_R@Jingjin'], supported: ['Geomor_R@Jingjin', 'BaseMap_R@Jingjin', 'City_R@Jingjin'] },
    operations: ['UNION', 'INTERSECT', 'ERASE', 'CLIP'],
  },
  'River_R@Jingjin': {
    name: '河流',
    category: '水文',
    description: '河流水系分布矢量数据',
    pairings: { recommended: ['Landuse_R@Jingjin'], supported: ['Geomor_R@Jingjin', 'BaseMap_R@Jingjin', 'City_R@Jingjin'] },
    operations: ['INTERSECT', 'CLIP'],
  },
  'City_R@Jingjin': {
    name: '城市',
    category: '人文地理',
    description: '城市建成区分布矢量数据',
    pairings: { recommended: ['Landuse_R@Jingjin', 'BaseMap_R@Jingjin'], supported: ['Geomor_R@Jingjin', 'Lake_R@Jingjin', 'River_R@Jingjin'] },
    operations: ['UNION', 'INTERSECT', 'ERASE', 'CLIP'],
  },
}

/** 分析类型元数据 */
const OPERATION_META = {
  UNION: { name: '并集', description: '合并两个数据集的全部区域' },
  INTERSECT: { name: '交集', description: '保留两个数据集的重叠区域' },
  ERASE: { name: '擦除', description: '从源数据集中去除与操作数据集重叠的部分' },
  CLIP: { name: '裁剪', description: '用操作数据集边界裁剪源数据集' },
}

/** 从 iServer 动态获取的数据集列表 */
const datasetList = ref([])

/** 按分类分组后的数据集 */
const groupedDatasets = computed(() => {
  const groups = {}
  datasetList.value.forEach(ds => {
    const cat = ds.category || '其他'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(ds)
  })
  return groups
})

/** 根据源数据集过滤后的操作数据集选项 */
const filteredOperateDatasets = computed(() => {
  const source = overlaySource.value
  const meta = DATASET_META[source]
  const all = datasetList.value.filter(ds => ds.value !== source)
  if (!meta) return all

  // 推荐的排前面
  const recommended = meta.pairings.recommended || []
  const supported = meta.pairings.supported || []
  return all.sort((a, b) => {
    const aRec = recommended.includes(a.value)
    const bRec = recommended.includes(b.value)
    const aSup = supported.includes(a.value)
    const bSup = supported.includes(b.value)
    if (aRec && !bRec) return -1
    if (!aRec && bRec) return 1
    if (aSup && !bSup) return -1
    if (!aSup && bSup) return 1
    return 0
  })
})

/** 当前源-操作配对支持的分析类型 */
const availableOperations = computed(() => {
  const sourceMeta = DATASET_META[overlaySource.value]
  const operateMeta = DATASET_META[overlayOperate.value]
  if (!sourceMeta || !operateMeta) return Object.keys(OPERATION_META)

  const sourceOps = new Set(sourceMeta.operations)
  const operateOps = new Set(operateMeta.operations)
  return Object.keys(OPERATION_META).filter(op => sourceOps.has(op) && operateOps.has(op))
})

/** 源数据集变化时，自动选择推荐的操作数据集 */
function onSourceChange(value) {
  const meta = DATASET_META[value]
  if (meta && meta.pairings.recommended.length > 0) {
    const firstRec = meta.pairings.recommended[0]
    // 确保推荐项在可用列表中
    if (datasetList.value.some(ds => ds.value === firstRec)) {
      overlayOperate.value = firstRec
    } else {
      //  fallback：选择第一个非自身的数据集
      const firstOther = datasetList.value.find(ds => ds.value !== value)
      if (firstOther) overlayOperate.value = firstOther.value
    }
  } else {
    const firstOther = datasetList.value.find(ds => ds.value !== value)
    if (firstOther) overlayOperate.value = firstOther.value
  }
  // 自动选择第一个可用的分析类型
  const ops = availableOperations.value
  if (ops.length > 0) overlayOperation.value = ops[0]
}

/** 动态获取 iServer 数据集列表 */
async function fetchDatasetList() {
  try {
    const url = `${ISERVER_URL}/iserver/services/data-jingjin/rest/data/datasources/Jingjin/datasets.json`
    const res = await fetch(url)
    if (!res.ok) throw new Error('获取数据集列表失败')
    const data = await res.json()
    const list = (data.datasetNames || []).map(name => {
      const fullName = `${name}@Jingjin`
      const meta = DATASET_META[fullName]
      return {
        value: fullName,
        label: meta ? `${meta.name} (${name})` : name,
        category: meta?.category || '其他',
        description: meta?.description || '',
        rawName: name,
      }
    })
    datasetList.value = list
  } catch (err) {
    console.error('获取数据集列表失败:', err)
    // 降级：使用静态配置
    datasetList.value = Object.keys(DATASET_META).map(fullName => {
      const meta = DATASET_META[fullName]
      return {
        value: fullName,
        label: `${meta.name} (${fullName.split('@')[0]})`,
        category: meta.category,
        description: meta.description,
        rawName: fullName.split('@')[0],
      }
    })
  }
}

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
    drawnGeo.value = geo
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

/** Promise 包装器：缓冲区分析 */
function bufferAnalysisAsync(url, params) {
  return new Promise((resolve, reject) => {
    try {
      new BufferAnalystService(url, { format: DataFormat.GEOJSON }).processAsync(
        new GeometryBufferAnalystParameters(params),
        (response) => {
          if (response.type === 'processFailed' || response.error) {
            const errorDetail = response.error?.error || response.error || JSON.stringify(response)
            console.error('缓冲区分析服务返回错误:', response)
            reject(new Error(typeof errorDetail === 'string' ? errorDetail : '缓冲区分析失败'))
          } else {
            resolve(response.result)
          }
        }
      )
    } catch (e) {
      reject(e)
    }
  })
}

/** 将米为单位的距离转换为度（基于 WGS84 近似） */
function metersToDegrees(meters, latitude) {
  const metersPerDegreeLat = 111000
  const metersPerDegreeLng = 111000 * Math.cos((latitude || 39.9) * Math.PI / 180)
  return meters / ((metersPerDegreeLat + metersPerDegreeLng) / 2)
}

/** 执行缓冲区分析：使用超图 SDK */
async function execBuffer() {
  if (!drawnGeo.value) return
  loading.value = true
  try {
    const url = `${ISERVER_URL}/iserver/services/spatialanalyst-sample/restjsr/spatialanalyst`
    const geoJSONFormat = new GeoJSON()
    const smGeometry = geoJSONFormat.read(drawnGeo.value, 'Geometry')
    if (!smGeometry) throw new Error('几何对象转换失败')

    // GeometryBufferAnalyst 在 WGS84 下单位是度，需将米转为度
    const lat = drawnGeo.value.type === 'Point'
      ? drawnGeo.value.coordinates[1]
      : 39.9
    const degreeDistance = metersToDegrees(bufferDistance.value, lat)

    const data = await bufferAnalysisAsync(url, {
      sourceGeometry: smGeometry,
      bufferSetting: new BufferSetting({
        endType: BufferEndType.ROUND,
        leftDistance: new BufferDistance({ value: degreeDistance }),
        rightDistance: new BufferDistance({ value: degreeDistance }),
        semicircleLineSegment: 10,
      }),
    })
    if (data && data.resultGeometry) {
      // SDK 返回的 resultGeometry 可能是 GeoJSON Feature，提取 geometry
      const resultGeo = data.resultGeometry.type === 'Feature'
        ? data.resultGeometry.geometry
        : data.resultGeometry
      showResult({ resultGeometry: resultGeo })
      hasResult.value = true
    }
  } catch (err) {
    console.error('缓冲区分析失败:', err)
    message.error('缓冲区分析失败: ' + err.message)
  } finally {
    loading.value = false
  }
}

// ==================== 叠置分析 ====================

/** Promise 包装器：叠置分析 */
function overlayAnalysisAsync(url, params) {
  return new Promise((resolve, reject) => {
    try {
      new OverlayAnalystService(url, { format: DataFormat.GEOJSON }).processAsync(
        new DatasetOverlayAnalystParameters(params),
        (response) => {
          if (response.type === 'processFailed' || response.error) {
            const errorDetail = response.error?.error || response.error || JSON.stringify(response)
            console.error('叠置分析服务返回错误:', response)
            reject(new Error(typeof errorDetail === 'string' ? errorDetail : '叠置分析失败'))
          } else {
            resolve(response.result)
          }
        }
      )
    } catch (e) {
      reject(e)
    }
  })
}

/** 执行叠置分析：使用超图 SDK */
async function execOverlay() {
  loading.value = true
  try {
    const url = `${ISERVER_URL}/iserver/services/spatialanalyst-sample/restjsr/spatialanalyst`
    const data = await overlayAnalysisAsync(url, {
      sourceDataset: overlaySource.value,
      operateDataset: overlayOperate.value,
      operation: overlayOperation.value,
      tolerance: 0,
      resultSetting: new DataReturnOption({
        dataReturnMode: DataReturnMode.DATASET_AND_RECORDSET,
        expectCount: 1000,
      }),
    })
    if (data && data.recordset && data.recordset.features) {
      showResult({ features: data.recordset.features })
      hasResult.value = true
    }
  } catch (err) {
    console.error('叠置分析失败:', err)
    message.error('叠置分析失败: ' + err.message)
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

onMounted(() => {
  fetchDatasetList()
})

onUnmounted(() => {
  clearAll()
  const map = getMap()
  if (map) {
    // 先检查图层是否存在再移除，避免 mapbox-gl 触发内部 error 事件
    const drawLayers = ['sa-draw-fill', 'sa-draw-line', 'sa-draw-point']
    const resultLayers = ['sa-result-fill', 'sa-result-line']
    ;[...drawLayers, ...resultLayers].forEach(id => {
      if (map.getLayer(id)) {
        try { map.removeLayer(id) } catch (e) {}
      }
    })
    // 移除数据源
    ;[DRAW_SOURCE, RESULT_SOURCE].forEach(id => {
      if (map.getSource(id)) {
        try { map.removeSource(id) } catch (e) {}
      }
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
