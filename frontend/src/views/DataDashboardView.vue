<template>
  <div class="dashboard-root">
    <!-- 左侧地图区域 -->
    <div class="dashboard-map-area">
      <div ref="mapContainer" class="dashboard-map-container" />

      <!-- 加载状态 -->
      <div v-if="mapLoading" class="map-loading">
        <a-spin :spinning="true" tip="地图加载中..." />
      </div>

      <!-- 加载错误提示 -->
      <div v-else-if="mapError" class="map-error-tip">
        <a-alert type="warning" :message="mapError" closable banner />
      </div>

      <!-- 分级地图交互（圆点标记） -->
      <DashboardMap
        v-if="mapInstance && !mapLoading"
        :map="mapInstance"
        :disaster-data="disasterData"
        @select-county="onSelectCounty"
      />
    </div>

    <!-- 右侧面板区域：顶部标题页签切换 -->
    <div class="dashboard-panels">
      <a-tabs v-model:activeKey="activeTab" class="dashboard-tabs" :animated="false">
        <a-tab-pane key="assessment" tab="灾情评估">
          <DisasterDetailPanel
            :selected-county="selectedCounty"
            :disaster-data="disasterData"
            :support-points="supportPoints"
            :supply-points="supplyPoints"
            :disaster-center="disasterCenter"
            @reassess="onReassess"
            @start-rescue="onStartRescue"
          />
        </a-tab-pane>
        <a-tab-pane key="weather" tab="气象监控">
          <WeatherPanel :weather-data="weatherData" />
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- 缓冲区联动分析弹窗（仅摘要 + 图例 + 启动按钮，图层已常驻地图） -->
    <BufferAnalysisModal
      v-model:visible="showBufferModal"
      :map="mapInstance"
      :assessment="assessment"
      :disaster-center="disasterCenter"
      :buffer-config="bufferConfig"
      :support-points="supportPoints"
      :supply-points="supplyPoints"
      :damaged-points="damagedPoints"
      @start-rescue="onStartRescue"
    />

    <!-- 5 步救援调度弹窗 -->
    <RoutePlanningModal
      v-model:visible="showRouteModal"
      :map="mapInstance"
      :disaster-data="selectedCountyData"
      :support-points="supportPoints"
      :disaster-center="disasterCenter"
      @dispatch-complete="onDispatchComplete"
    />
  </div>
</template>

<script setup>
/**
 * 数据大屏 - 主页面容器
 * 半屏面板式布局：左侧独立地图 + 右侧顶部页签切换面板
 *
 * 改造说明（20260705-earthquake-rescue-refactor）：
 *  - 整合 8 指标 DDI 评估 → 双缓冲区分析 → 5 步救援调度 全流程
 *  - 地震图层（缓冲区 + 支援点/物资点/已损毁点）由 renderEarthquakeLayers()
 *    原子化管理，不依赖子组件的 watcher 自动渲染，消除卡顿根因
 *  - 右侧面板由上下滚动改为顶部页签切换（"灾情评估" / "气象监控"）
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import mapboxgl from 'mapbox-gl'
import DashboardMap from '@/components/dashboard/DashboardMap.vue'
import DisasterDetailPanel from '@/components/dashboard/DisasterDetailPanel.vue'
import WeatherPanel from '@/components/dashboard/WeatherPanel.vue'
import BufferAnalysisModal from '@/components/dashboard/BufferAnalysisModal.vue'
import RoutePlanningModal from '@/components/dashboard/RoutePlanningModal.vue'
import {
  generateCountyDisasters,
  generateWeatherData,
  getCountyCoords,
} from '@/utils/mockData.js'
import {
  generateSupportPoints,
  generateSupplyPoints,
  generateDamagedPoints,
} from '@/utils/generateEarthquakePoints.js'
import { createCirclePolygon } from '@/utils/circlePolygon.js'

// ====== 状态 ======
const mapContainer = ref(null)
const mapInstance = ref(null)
const mapLoading = ref(true)
const mapError = ref('')
const selectedCounty = ref(null)
const disasterData = ref({})
const weatherData = ref([])

// 右侧面板页签
const activeTab = ref('assessment')

// 评估与点位状态
const assessment = ref(null) // { ddi, level, bufferConfig, details }
const disasterCenter = ref(null) // [lng, lat]
const bufferConfig = computed(() => assessment.value?.bufferConfig || null)
const supportPoints = ref([])
const supplyPoints = ref([])
const damagedPoints = ref([])

// 弹窗显隐
const showBufferModal = ref(false)
const showRouteModal = ref(false)

let loadTimer = null

// 当前选中县区的完整数据（供 RoutePlanningModal 使用）
const selectedCountyData = computed(() => {
  if (!selectedCounty.value) return null
  return disasterData.value[selectedCounty.value] || null
})

// ====== 地图初始化 ======
onMounted(() => {
  disasterData.value = generateCountyDisasters()
  weatherData.value = generateWeatherData()
  initMap()
})

onUnmounted(() => {
  cleanupEarthquakeLayers()
  if (mapInstance.value) {
    mapInstance.value.remove()
    mapInstance.value = null
  }
  if (loadTimer) clearTimeout(loadTimer)
})

function initMap() {
  if (!mapContainer.value) return

  mapLoading.value = true
  mapError.value = ''

  try {
    mapboxgl.accessToken = null

    const style = {
      version: 8,
      glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
      sources: {
        'tianditu-vec': {
          type: 'raster',
          tiles: [
            'http://t0.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=f8bf399b1e49a8f6a513ff3df0005477',
            'http://t1.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=f8bf399b1e49a8f6a513ff3df0005477',
            'http://t2.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=f8bf399b1e49a8f6a513ff3df0005477',
          ],
          tileSize: 256,
        },
        'tianditu-cva': {
          type: 'raster',
          tiles: [
            'http://t0.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=f8bf399b1e49a8f6a513ff3df0005477',
            'http://t1.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=f8bf399b1e49a8f6a513ff3df0005477',
            'http://t2.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=f8bf399b1e49a8f6a513ff3df0005477',
          ],
          tileSize: 256,
        },
      },
      layers: [
        { id: 'tianditu-vec-layer', type: 'raster', source: 'tianditu-vec', minzoom: 0, maxzoom: 18 },
        { id: 'tianditu-cva-layer', type: 'raster', source: 'tianditu-cva', minzoom: 0, maxzoom: 18 },
      ],
    }

    const map = new mapboxgl.Map({
      container: mapContainer.value,
      style,
      center: [116.4, 39.9],
      zoom: 7,
      attributionControl: false,
      maxBounds: [[113.5, 36.0], [120.0, 42.5]],
    })

    function onMapLoaded() {
      mapLoading.value = false
      mapInstance.value = map
      if (loadTimer) clearTimeout(loadTimer)
    }

    if (map.loaded()) {
      onMapLoaded()
    } else {
      map.on('load', onMapLoaded)
    }
  } catch (err) {
    mapLoading.value = false
    mapError.value = err.message || '地图初始化失败'
    console.error('地图初始化异常:', err)
  }
}

// ====== 地震图层管理（原子化渲染，拒绝 watcher 级联触发）======
// 所有 eq-* 开头的 source/layer 均由 renderEarthquakeLayers 管理
//
// 图层设计：
//   - eq-buffers-src（FeatureCollection，外圈+内圈多边形）
//     → eq-buffer-outer（fill，橙 rgba(221,107,32,0.15)）
//     → eq-buffer-inner（fill，红 rgba(229,62,62,0.25)）
//   - eq-points-src（FeatureCollection，所有点位）
//     → eq-points-circle（circle，依 layerGroup 分大小）
//     → eq-points-label（symbol，文字标注）

// eq-* 层/源名称常量
const EQ_LAYERS = ['eq-buffer-outer', 'eq-buffer-inner', 'eq-points-circle', 'eq-points-label']
const EQ_SOURCES = ['eq-buffers-src', 'eq-points-src']

/**
 * 清除所有地震图层
 */
function cleanupEarthquakeLayers() {
  const map = mapInstance.value
  if (!map) return
  // 后添加的层先删除 → 先删 layer 再删 source
  EQ_LAYERS.slice().reverse().forEach((id) => {
    try { if (map.getLayer(id)) map.removeLayer(id) } catch (e) { /* ignore */ }
  })
  EQ_SOURCES.forEach((id) => {
    try { if (map.getSource(id)) map.removeSource(id) } catch (e) { /* ignore */ }
  })
}

/**
 * 渲染双缓冲区 + 支援点/物资点/已损毁点/受灾点
 *
 * 核心优化：
 *   - 单次 rAF 批量操作，避免多次 style 重新计算
 *   - 所有点位合入一个 GeoJSON source，通过 layerGroup 属性分流
 *   - 使用 circle 类型而非 symbol（排除 Maki 图标依赖）
 */
function renderEarthquakeLayers() {
  const map = mapInstance.value
  if (!map) return

  // 防抖：如果在 rAF 队列中已有待处理的渲染，跳过此次
  if (renderEarthquakeLayers._pending) return
  renderEarthquakeLayers._pending = true

  requestAnimationFrame(() => {
    renderEarthquakeLayers._pending = false
    try {
      // === Step 1: 清除旧图层 ===
      cleanupEarthquakeLayers()

      // === Step 2: 双缓冲区 ===
      if (disasterCenter.value && bufferConfig.value) {
        const center = disasterCenter.value
        const { inner, outer } = bufferConfig.value

        map.addSource('eq-buffers-src', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: createCirclePolygon(center, outer),
                properties: { zone: 'outer' },
              },
              {
                type: 'Feature',
                geometry: createCirclePolygon(center, inner),
                properties: { zone: 'inner' },
              },
            ],
          },
        })

        map.addLayer({
          id: 'eq-buffer-outer',
          type: 'fill',
          source: 'eq-buffers-src',
          filter: ['==', ['get', 'zone'], 'outer'],
          paint: {
            'fill-color': 'rgba(221,107,32,0.15)',
            'fill-outline-color': 'rgba(221,107,32,0.6)',
          },
        })

        map.addLayer({
          id: 'eq-buffer-inner',
          type: 'fill',
          source: 'eq-buffers-src',
          filter: ['==', ['get', 'zone'], 'inner'],
          paint: {
            'fill-color': 'rgba(229,62,62,0.25)',
            'fill-outline-color': 'rgba(229,62,62,0.8)',
          },
        })
      }

      // === Step 3: 所有点位（单 GeoJSON source + 单 circle layer + 单 label layer）===
      const features = []

      // 受灾中心
      if (disasterCenter.value) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: disasterCenter.value },
          properties: {
            layerGroup: 'center',
            color: '#e53e3e',
            shortName: '受灾中心',
          },
        })
      }

      // 支援点
      supportPoints.value.forEach((p) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: {
            layerGroup: 'support',
            groupOrder: 1,
            color: p.color || '#3182ce',
            shortName: (p.name || '').substring(0, 8),
            type: p.type,
          },
        })
      })

      // 物资点
      supplyPoints.value.forEach((p) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: {
            layerGroup: 'supply',
            groupOrder: 2,
            color: p.color || '#38a169',
            shortName: (p.name || '').substring(0, 8),
            type: p.type,
          },
        })
      })

      // 已损毁点
      damagedPoints.value.forEach((p) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: {
            layerGroup: 'damaged',
            groupOrder: 3,
            color: '#555',
            shortName: '× ' + ((p.name || '').substring(0, 6)),
            type: p.type,
          },
        })
      })

      if (features.length === 0) return

      map.addSource('eq-points-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      })

      // Circle 层（使用 get 表达式读取 feature 属性）
      map.addLayer({
        id: 'eq-points-circle',
        type: 'circle',
        source: 'eq-points-src',
        paint: {
          'circle-radius': [
            'match',
            ['get', 'layerGroup'],
            'center', 16,
            'damaged', 10,
            9,
          ],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': [
            'match',
            ['get', 'layerGroup'],
            'center', 4,
            2,
          ],
          'circle-stroke-color': [
            'match',
            ['get', 'layerGroup'],
            'damaged', '#e53e3e',
            '#fff',
          ],
          'circle-opacity': 1.0,
        },
      })

      // Label 层（受灾中心不显示文字）
      map.addLayer({
        id: 'eq-points-label',
        type: 'symbol',
        source: 'eq-points-src',
        filter: ['!=', ['get', 'layerGroup'], 'center'],
        layout: {
          'text-field': ['get', 'shortName'],
          'text-size': 10,
          'text-offset': [0, 1.5],
          'text-optional': true,
        },
        paint: {
          'text-color': '#fff',
          'text-halo-color': 'rgba(0,0,0,0.85)',
          'text-halo-width': 2,
        },
      })

      // 将点位图层提升到最顶部（确保不被后续添加的路线图层覆盖）
      if (map.getLayer('eq-points-circle')) map.moveLayer('eq-points-circle')
      if (map.getLayer('eq-points-label')) map.moveLayer('eq-points-label')
    } catch (e) {
      console.error('[renderEarthquakeLayers] error:', e)
    }
  })
}

// ====== 事件处理 ======

/**
 * 县区选中/取消
 */
function onSelectCounty(countyName) {
  selectedCounty.value = countyName
  if (!countyName) {
    resetAssessment()
  }
}

watch(selectedCounty, (val) => {
  if (!val) {
    resetAssessment()
  }
})

/**
 * 重置评估与点位状态
 */
function resetAssessment() {
  assessment.value = null
  disasterCenter.value = null
  supportPoints.value = []
  supplyPoints.value = []
  damagedPoints.value = []
  showBufferModal.value = false
  showRouteModal.value = false
  cleanupEarthquakeLayers()
}

/**
 * 监听 DisasterDetailPanel 的 'reassess' 事件
 *
 * 全同步流程（<5ms 计算），无 sleep/await/网络请求：
 *   1. 受灾点坐标 → disasterCenter
 *   2. 评估结果 → assessment
 *   3. 生成支援点/物资点/已损毁点
 *   4. 渲染地震图层（renderEarthquakeLayers 异步 via rAF，不阻塞 UI）
 *   5. 打开 BufferAnalysisModal
 */
function onReassess(payload) {
  if (!payload || !payload.countyName) return

  const center = getCountyCoords(payload.countyName)
  const { inner, outer } = payload.bufferConfig
  const midRadius = Math.round((inner + outer) / 2)

  // Step 1-3: 全同步生成数据
  disasterCenter.value = center
  assessment.value = {
    ddi: payload.ddi,
    level: payload.level,
    bufferConfig: payload.bufferConfig,
    details: payload.details,
  }
  supportPoints.value = generateSupportPoints(center, inner, outer, payload.countyName)
  supplyPoints.value = generateSupplyPoints(center, inner, midRadius)
  damagedPoints.value = generateDamagedPoints(center, inner)

  // Step 4: 渲染图层（rAF 异步，不阻塞 UI）
  renderEarthquakeLayers()

  // Step 5: 打开弹窗
  showBufferModal.value = true
}

/**
 * 监听 DisasterDetailPanel 或 BufferAnalysisModal 的 'start-rescue' 事件
 */
function onStartRescue() {
  if (!assessment.value) {
    message.warning('请先完成灾情评估')
    return
  }
  if (!supportPoints.value || supportPoints.value.length === 0) {
    message.warning('支援点尚未生成，请先评估灾情')
    return
  }
  showBufferModal.value = false
  // 打开 RoutePlanningModal 时，其内部 watch visible 会调用 flyTo + startDispatch
  showRouteModal.value = true
}

/**
 * 监听 RoutePlanningModal 的 'dispatch-complete' 事件
 */
function onDispatchComplete(payload) {
  message.success('5 步救援调度已完成')
  console.log('[DataDashboardView] dispatch-complete:', payload)
}
</script>

<style scoped>
.dashboard-root {
  height: 100%;
  display: flex;
  background: #0a1628;
  position: relative;
}

.dashboard-map-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.dashboard-map-container {
  width: 100%;
  height: 100%;
}

.map-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 22, 40, 0.8);
  z-index: 10;
}

/* ===== 右侧页签面板 ===== */
.dashboard-panels {
  width: 420px;
  display: flex;
  flex-direction: column;
  background: rgba(10, 22, 40, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
}

.dashboard-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dashboard-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
  padding: 0 8px;
  background: transparent;
}

.dashboard-tabs :deep(.ant-tabs-nav::before) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.dashboard-tabs :deep(.ant-tabs-tab) {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

.dashboard-tabs :deep(.ant-tabs-tab:hover) {
  color: rgba(255, 255, 255, 0.8);
}

.dashboard-tabs :deep(.ant-tabs-tab-active) {
  color: #1890ff;
}

.dashboard-tabs :deep(.ant-tabs-ink-bar) {
  background: #1890ff;
}

.dashboard-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: hidden;
}

.dashboard-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.dashboard-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
  overflow-y: auto;
  padding: 8px;
}

.dashboard-tabs :deep(.ant-tabs-tabpane::-webkit-scrollbar) {
  width: 4px;
}
.dashboard-tabs :deep(.ant-tabs-tabpane::-webkit-scrollbar-track) {
  background: transparent;
}
.dashboard-tabs :deep(.ant-tabs-tabpane::-webkit-scrollbar-thumb) {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

:deep(.mapboxgl-ctrl-bottom-left),
:deep(.mapboxgl-ctrl-bottom-right) {
  display: none;
}
</style>
