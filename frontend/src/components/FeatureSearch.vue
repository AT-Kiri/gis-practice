<template>
  <div class="feature-search">
    <!-- Search Panel -->
    <div class="search-panel">
      <div class="search-header">
        <span class="search-title">专题检索</span>
        <a-button type="text" size="small" @click="$emit('close')">
          <template #icon><CloseOutlined /></template>
        </a-button>
      </div>

      <!-- Search Input -->
      <div class="search-input-wrap">
        <a-input-search
          v-model:value="keyword"
          placeholder="输入关键字搜索地物..."
          enter-button
          @search="doSearch"
        />
      </div>

      <!-- Level Filter -->
      <div class="level-filter">
        <a-radio-group v-model:value="searchLevel" size="small" button-style="solid">
          <a-radio-button value="all">全部</a-radio-button>
          <a-radio-button value="province">省级</a-radio-button>
          <a-radio-button value="county">县级</a-radio-button>
          <a-radio-button value="town">乡镇</a-radio-button>
        </a-radio-group>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="panel-loading">
        <a-spin tip="搜索中..." />
      </div>

      <!-- Stats -->
      <div v-else-if="searched" class="panel-stats">
        <a-space>
          <a-tag color="blue">共 {{ results.total }} 条结果</a-tag>
          <a-tag v-if="results.elapsed">耗时 {{ results.elapsed }}ms</a-tag>
        </a-space>
        <div v-if="Object.keys(results.datasetCounts || {}).length" class="dataset-chips">
          <a-tag v-for="(c, n) in results.datasetCounts" :key="n" color="cyan">{{ n }}: {{ c }}</a-tag>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="searched && !results.total" class="panel-empty">
        <a-empty description="未找到匹配的要素" />
      </div>

      <!-- Results List -->
      <div v-if="paginatedItems.length" class="results-list">
        <div
          v-for="(item, idx) in paginatedItems"
          :key="item.smid + '-' + item.dataset + '-' + idx"
          class="result-item"
          :class="{ 'result-active': hoveredId === item.smid + '-' + item.dataset }"
          @mouseenter="highlightItem(item)"
          @mouseleave="unhighlightItem"
          @click="focusItem(item)"
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
              <span v-if="item.properties.SMID"> · SMID: {{ item.properties.SMID }}</span>
            </div>
          </div>
          <a-button
            size="small"
            type="primary"
            ghost
            class="locate-btn"
            title="定位到地图"
            @click.stop="flyToItem(item)"
          >
            <template #icon><send-outlined /></template>
          </a-button>
        </div>
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

      <!-- Bottom actions -->
      <div v-if="searched" class="panel-footer">
        <a-button size="small" @click="clearResults">清除结果</a-button>
      </div>
    </div>

    <!-- Detail Drawer -->
    <a-drawer
      v-if="detailItem"
      :open="!!detailItem"
      title="要素详情"
      placement="right"
      :width="360"
      @close="detailItem = null"
      :get-container="false"
    >
      <div v-if="detailItem" class="detail-content">
        <div class="detail-header">
          <h3>{{ detailItem.displayName }}</h3>
          <a-tag :color="typeColor(detailItem.geometry)">{{ detailItem.datasetName }}</a-tag>
        </div>
        <a-divider />
        <table class="detail-table">
          <tr v-for="(val, key) in detailItem.properties" :key="key">
            <td class="detail-key">{{ key }}</td>
            <td class="detail-val">{{ val != null ? String(val) : '-' }}</td>
          </tr>
        </table>
      </div>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue'
import { CloseOutlined, SendOutlined } from '@ant-design/icons-vue'
import { useMapStore } from '../stores/map'
import { serverGeoToGeoJSON, ISERVER_URL } from '../utils/map'
import mapboxgl from 'mapbox-gl'

// ==================== iServer 配置 ====================
const DATASOURCE = 'Jingjin'

/** 数据集英文名 → 中文显示名 */
const LAYER_NAMES = {
  County_P: '县级市', Town_P: '乡镇', Road_L: '道路', Railway_L: '铁路',
  River_L: '河流', Lake_R: '湖泊', Landuse_R: '土地利用', Geomor_R: '地貌',
  Coastline_L: '海岸线', Province_L: '省界',
}

/** 搜索层级 → 数据集列表 */
const LEVEL_LAYERS = {
  province: ['Province_L', 'County_P'],
  county: ['County_P'],
  town: ['Town_P'],
  all: ['County_P', 'Town_P', 'Road_L', 'Railway_L', 'River_L', 'Lake_R', 'Landuse_R', 'Geomor_R', 'Coastline_L'],
}

const emit = defineEmits(['close'])
const store = useMapStore()

// ==================== 组件状态 ====================

/** 搜索关键字 */
const keyword = ref('')
/** 搜索层级筛选 */
const searchLevel = ref('all')
/** 是否正在搜索 */
const loading = ref(false)
/** 是否已执行过搜索 */
const searched = ref(false)
/** 当前页码 */
const currentPage = ref(1)
const pageSize = 10
/** 悬停要素 ID */
const hoveredId = ref(null)
/** 详情抽屉中的要素 */
const detailItem = ref(null)

/** 搜索结果 */
const results = reactive({
  total: 0,
  datasetCounts: {},
  features: [],
  elapsed: 0,
})

/** 当前页要素列表 */
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return results.features.slice(start, start + pageSize)
})

// ==================== 图层常量 ====================

const RESULT_POINT_SOURCE = 'ts-result-points'
const RESULT_LINE_SOURCE = 'ts-result-lines'
const RESULT_POLY_SOURCE = 'ts-result-polys'
const HIGHLIGHT_SOURCE = 'ts-highlight'

function emptyFC() { return { type: 'FeatureCollection', features: [] } }

/** 安全设置数据源内容 */
function setSourceData(src, features) {
  const map = store.mapInstance
  if (!map) return
  try { map.getSource(src).setData({ type: 'FeatureCollection', features }) } catch(e) {}
}

/** 确保搜索相关图层已创建 */
function ensureSources() {
  const map = store.mapInstance
  if (!map) return

  const sources = [
    { id: RESULT_POINT_SOURCE },
    { id: RESULT_LINE_SOURCE },
    { id: RESULT_POLY_SOURCE },
    { id: HIGHLIGHT_SOURCE },
  ]
  sources.forEach(s => {
    if (!map.getSource(s.id)) map.addSource(s.id, { type: 'geojson', data: emptyFC() })
  })

  const layers = [
    { id: 'ts-result-fill', source: RESULT_POLY_SOURCE, type: 'fill',
      paint: { 'fill-color': '#722ed1', 'fill-opacity': 0.12 } },
    { id: 'ts-result-outline', source: RESULT_POLY_SOURCE, type: 'line',
      paint: { 'line-color': '#722ed1', 'line-width': 1.5 } },
    { id: 'ts-result-line', source: RESULT_LINE_SOURCE, type: 'line',
      paint: { 'line-color': '#722ed1', 'line-width': 3 } },
    { id: 'ts-result-point', source: RESULT_POINT_SOURCE, type: 'circle',
      paint: { 'circle-color': '#722ed1', 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } },
    { id: 'ts-highlight-fill', source: HIGHLIGHT_SOURCE, type: 'fill',
      paint: { 'fill-color': '#ff4d4f', 'fill-opacity': 0.3 } },
    { id: 'ts-highlight-outline', source: HIGHLIGHT_SOURCE, type: 'line',
      paint: { 'line-color': '#ff4d4f', 'line-width': 3 } },
    { id: 'ts-highlight-point', source: HIGHLIGHT_SOURCE, type: 'circle',
      paint: { 'circle-color': '#ff4d4f', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } },
  ]
  layers.forEach(l => {
    if (!map.getLayer(l.id)) map.addLayer(l)
  })
}

// ==================== 搜索 ====================

/**
 * 执行关键字搜索：直接调 iServer 地图服务 SQLQuery
 */
async function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) return

  loading.value = true
  searched.value = true
  currentPage.value = 1
  results.total = 0
  results.datasetCounts = {}
  results.features = []
  results.elapsed = 0
  clearResultDisplay()
  detailItem.value = null

  const startTime = Date.now()

  try {
    // SQL 转义：防止注入并支持 LIKE 模糊匹配
    const escaped = kw
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "''")
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')

    // 每个数据集使用对应的名称字段，分批并行查询
    const layers = LEVEL_LAYERS[searchLevel.value] || LEVEL_LAYERS.all
    const nameFieldMap = {
      County_P: 'ADMINNAME',
      Town_P: 'NAME', Road_L: 'NAME', Railway_L: 'NAME', River_L: 'NAME',
      Lake_R: null, Landuse_R: 'LANDTYPE', Geomor_R: 'GEO_TYPE', Coastline_L: null,
      Province_L: 'NAME',
    }

    const url = `${ISERVER_URL}/iserver/services/data-jingjin/rest/data/featureResults.json?returnContent=true`

    // 并行查询所有数据集
    const queries = layers.map(async (layer) => {
      const field = nameFieldMap[layer]
      if (!field) return [] // 跳过无可搜索字段的数据集
      const filter = `${field} like '%${escaped}%'`
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            getFeatureMode: 'SQL',
            datasetNames: [DATASOURCE + ':' + layer],
            queryParameter: { attributeFilter: filter },
          }),
        })
        if (!res.ok) return []
        const data = await res.json()
        return (data.features || []).map(f => {
          const properties = {}
          if (f.fieldNames && f.fieldValues) {
            f.fieldNames.forEach((name, i) => { properties[name] = f.fieldValues[i] })
          }
          let displayName = '未命名要素'
          for (const fn of ['NAME', 'Name', 'name', 'ADMINNAME', 'KIND', 'KD', '名称', '类型', 'LANDTYPE', 'GEO_TYPE']) {
            const v = properties[fn]
            if (v != null && String(v).trim() !== '') { displayName = String(v); break }
          }
          return {
            dataset: layer,
            datasetName: LAYER_NAMES[layer] || layer,
            geometry: f.geometry,
            properties,
            displayName,
            smid: properties.SMID ?? f.ID,
          }
        })
      } catch { return [] }
    })

    const resultsByLayer = await Promise.all(queries)
    const allFeatures = resultsByLayer.flat()
    const elapsed = Date.now() - startTime

    // 统计各数据集数量
    const datasetCounts = {}
    allFeatures.forEach(f => {
      datasetCounts[f.datasetName] = (datasetCounts[f.datasetName] || 0) + 1
    })

    results.total = allFeatures.length
    results.datasetCounts = datasetCounts
    results.features = allFeatures
    results.elapsed = elapsed

    if (allFeatures.length > 0) displayResults(allFeatures)
  } catch (err) {
    console.error('搜索错误:', err)
    results.total = 0
  } finally {
    loading.value = false
  }
}

// 命名光标处理器（用于事件绑定/解绑，避免内存泄漏）
function tsCursorPointer() { const m = store.mapInstance; if (m) m.getCanvas().style.cursor = 'pointer' }
function tsCursorDefault() { const m = store.mapInstance; if (m) m.getCanvas().style.cursor = '' }

// ==================== 结果显示 ====================

/** 在地图上展示搜索结果 */
function displayResults(features) {
  const map = store.mapInstance
  if (!map) return
  ensureSources()

  const pts = [], lines = [], polys = []
  features.forEach(f => {
    const geo = serverGeoToGeoJSON(f.geometry)
    if (!geo) return
    const feat = { type: 'Feature', geometry: geo, properties: { ...f.properties, _displayName: f.displayName, _dataset: f.datasetName } }
    if (geo.type === 'Point' || geo.type === 'MultiPoint') pts.push(feat)
    else if (geo.type === 'LineString' || geo.type === 'MultiLineString') lines.push(feat)
    else if (geo.type === 'Polygon' || geo.type === 'MultiPolygon') polys.push(feat)
  })

  setSourceData(RESULT_POINT_SOURCE, pts)
  setSourceData(RESULT_LINE_SOURCE, lines)
  setSourceData(RESULT_POLY_SOURCE, polys)

  // 注册点击和悬停事件
  ;['ts-result-point', 'ts-result-line', 'ts-result-fill', 'ts-result-outline'].forEach(id => {
    map.off('click', id, onMapResultClick)
    map.on('click', id, onMapResultClick)
    map.on('mouseenter', id, tsCursorPointer)
    map.on('mouseleave', id, tsCursorDefault)
  })
}

/** 清除结果显示 */
function clearResultDisplay() {
  const map = store.mapInstance
  if (!map) return
  setSourceData(RESULT_POINT_SOURCE, [])
  setSourceData(RESULT_LINE_SOURCE, [])
  setSourceData(RESULT_POLY_SOURCE, [])
  setSourceData(HIGHLIGHT_SOURCE, [])
  ;['ts-result-point', 'ts-result-line', 'ts-result-fill', 'ts-result-outline'].forEach(id => {
    map.off('click', id, onMapResultClick)
    map.off('mouseenter', id, tsCursorPointer)
    map.off('mouseleave', id, tsCursorDefault)
  })
}

// ==================== 交互处理 ====================

/** 点地图上的结果要素时显示详情弹窗 */
function onMapResultClick(e) {
  if (!e.features || !e.features.length) return
  const p = e.features[0].properties
  showPopup(e.features[0].geometry.coordinates, p)
}

let popup = null

/** 显示弹窗 */
function showPopup(coords, props) {
  const map = store.mapInstance
  if (!map) return
  if (popup) popup.remove()

  let html = '<div style="max-height:250px;overflow-y:auto;font-size:12px;">'
  html += `<div style="font-weight:bold;margin-bottom:6px;">${props._displayName || '要素'}</div>`
  html += '<table style="width:100%;border-collapse:collapse;">'
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('_')) continue
    html += `<tr><td style="padding:2px 6px;color:#666;border-bottom:1px solid #f0f0f0;">${k}</td>
               <td style="padding:2px 6px;border-bottom:1px solid #f0f0f0;">${v != null ? v : '-'}</td></tr>`
  }
  html += '</table></div>'

  let coord = coords
  if (Array.isArray(coord) && Array.isArray(coord[0])) coord = coord[0]
  if (Array.isArray(coord) && Array.isArray(coord[0])) coord = coord[0]

  popup = new mapboxgl.Popup({ closeOnClick: true, maxWidth: '320px' })
    .setLngLat(coord)
    .setHTML(html)
    .addTo(map)
}

/** 悬停高亮要素 */
function highlightItem(item) {
  const map = store.mapInstance
  if (!map) return
  const geo = serverGeoToGeoJSON(item.geometry)
  if (!geo) return
  hoveredId.value = item.smid + '-' + item.dataset
  setSourceData(HIGHLIGHT_SOURCE, [{ type: 'Feature', geometry: geo }])
}

/** 取消悬停高亮 */
function unhighlightItem() {
  hoveredId.value = null
  setSourceData(HIGHLIGHT_SOURCE, [])
}

/** 点击列表中要素：聚焦地图并显示详情抽屉 */
function focusItem(item) {
  const map = store.mapInstance
  if (!map) return
  detailItem.value = item
  doFlyTo(item)
}

/** 定位按钮：只飞入地图，不打开详情抽屉 */
function flyToItem(item) {
  doFlyTo(item)
}

/** 从 Server JSON geometry 提取中心点 [lng, lat] */
function getCenter(g) {
  if (!g || !g.points || !g.points.length) return null
  if (g.type === 'POINT' || g.type === 'NODE') {
    return [g.points[0].x, g.points[0].y]
  }
  // LINE / REGION：取第一个点作为近似中心
  return [g.points[0].x, g.points[0].y]
}

/** 提取中心点并飞入 */
function doFlyTo(item) {
  const map = store.mapInstance
  if (!map) return
  const center = getCenter(item.geometry)
  if (center) map.flyTo({ center, zoom: Math.max(map.getZoom(), 11), duration: 400 })

  showPopup(center || [0, 0], {
    _displayName: item.displayName,
    _dataset: item.datasetName,
    ...item.properties,
  })
}

/** 清除所有搜索结果 */
function clearResults() {
  keyword.value = ''
  searched.value = false
  results.total = 0
  results.datasetCounts = {}
  results.features = []
  results.elapsed = 0
  detailItem.value = null
  currentPage.value = 1
  clearResultDisplay()
  if (popup) { popup.remove(); popup = null }
}

/** 根据几何类型返回标签颜色 */
function typeColor(g) {
  if (!g) return 'default'
  const t = g.type || ''
  if (t.includes('POINT') || t === 'Point') return 'purple'
  if (t.includes('LINE') || t === 'LineString') return 'green'
  if (t.includes('REGION') || t === 'Polygon') return 'orange'
  return 'default'
}

/** 根据几何类型返回中文标签 */
function typeLabel(g) {
  if (!g) return '?'
  const t = g.type || ''
  if (t.includes('POINT') || t === 'Point') return '点'
  if (t.includes('LINE') || t === 'LineString') return '线'
  if (t.includes('REGION') || t === 'Polygon') return '面'
  return '?'
}

onUnmounted(() => {
  clearResults()
})
</script>

<style scoped>
.feature-search {
  position: absolute;
  top: 20px;
  left: 74px;
  width: 340px;
  z-index: 5;
}

.search-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glass);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 120px);
  overflow: hidden;
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #f0f0f0;
}

.search-title { font-weight: 600; font-size: 14px; }

.search-input-wrap {
  padding: 10px 14px 6px;
  position: relative;
}

.level-filter {
  padding: 6px 14px 10px;
}

.panel-loading, .panel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px 16px;
}

.panel-stats {
  padding: 6px 14px 4px;
  border-top: 1px solid #f0f0f0;
}

.dataset-chips {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.results-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
  border-top: 1px solid #f0f0f0;
}

.result-item {
  display: flex;
  align-items: flex-start;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f8f8f8;
}
.result-item:hover, .result-active { background: #f9f0ff; }

.item-icon { margin-right: 10px; margin-top: 2px; flex-shrink: 0; }
.item-body { flex: 1; min-width: 0; }
.item-name { font-size: 13px; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-meta { font-size: 11px; color: #999; margin-top: 2px; }
.result-item .locate-btn { flex-shrink: 0; margin-left: 8px; align-self: center; opacity: 0; transition: opacity 0.15s; }
.result-item:hover .locate-btn { opacity: 1; }

.panel-pagination {
  padding: 8px 14px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: center;
}

.panel-footer {
  padding: 8px 14px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
}

.detail-content { padding: 0 4px; }
.detail-header { display: flex; align-items: center; gap: 8px; }
.detail-header h3 { margin: 0; font-size: 16px; }
.detail-table { width: 100%; border-collapse: collapse; }
.detail-table td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.detail-key { color: #888; width: 40%; }
.detail-val { color: #333; }
</style>
