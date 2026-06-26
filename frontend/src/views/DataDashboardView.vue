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
        <a-alert
          type="warning"
          :message="mapError"
          closable
          banner
        />
      </div>

      <!-- 分级地图交互 -->
      <DashboardMap
        v-if="mapInstance && !mapLoading"
        :map="mapInstance"
        :disaster-data="disasterData"
        @select-county="onSelectCounty"
      />
    </div>

    <!-- 右侧面板区域 -->
    <div class="dashboard-panels">
      <!-- 上面板：灾害详情 -->
      <div class="panel-section panel-top">
        <DisasterDetailPanel
          :selected-county="selectedCounty"
          :disaster-data="disasterData"
          @buffer-analysis="openBufferAnalysis"
        />
      </div>

      <!-- 下面板：气象监控 -->
      <div class="panel-section panel-bottom">
        <WeatherPanel :weather-data="weatherData" />
      </div>
    </div>

    <!-- 缓冲区分析弹窗 -->
    <BufferAnalysisModal
      v-if="showBufferModal"
      v-model:visible="showBufferModal"
      :map="mapInstance"
      :county-data="selectedCountyData"
      @route-planning="openRoutePlanning"
    />

    <!-- 路径规划弹窗 -->
    <RoutePlanningModal
      v-if="showRouteModal"
      v-model:visible="showRouteModal"
      :map="mapInstance"
      :origin="routeOrigin"
      :destination="routeDestination"
    />
  </div>
</template>

<script setup>
/**
 * 数据大屏 - 主页面容器
 * 半屏面板式布局：左侧独立地图 + 右侧上下两个数据面板
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import mapboxgl from 'mapbox-gl'
import DashboardMap from '@/components/dashboard/DashboardMap.vue'
import DisasterDetailPanel from '@/components/dashboard/DisasterDetailPanel.vue'
import WeatherPanel from '@/components/dashboard/WeatherPanel.vue'
import BufferAnalysisModal from '@/components/dashboard/BufferAnalysisModal.vue'
import RoutePlanningModal from '@/components/dashboard/RoutePlanningModal.vue'
import { generateCountyDisasters, generateWeatherData, getCountyCoords } from '@/utils/mockData.js'

// ====== 状态 ======
const mapContainer = ref(null)
const mapInstance = ref(null)
const mapLoading = ref(true)
const mapError = ref('')
const selectedCounty = ref(null)
const disasterData = ref({})
const weatherData = ref([])
const showBufferModal = ref(false)
const showRouteModal = ref(false)
const routeOrigin = ref(null)
const routeDestination = ref(null)

let loadTimer = null

// 当前选中县区的完整数据
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
  if (mapInstance.value) {
    mapInstance.value.remove()
    mapInstance.value = null
  }
  if (loadTimer) clearTimeout(loadTimer)
})

/**
 * 初始化独立的地图实例
 */
function initMap() {
  if (!mapContainer.value) return

  mapLoading.value = true
  mapError.value = ''

  try {
    // 天地图矢量底图 + 注记，限制可视范围为京津冀区域
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
        {
          id: 'tianditu-vec-layer',
          type: 'raster',
          source: 'tianditu-vec',
          minzoom: 0,
          maxzoom: 18,
        },
        {
          id: 'tianditu-cva-layer',
          type: 'raster',
          source: 'tianditu-cva',
          minzoom: 0,
          maxzoom: 18,
        },
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

    // 统一处理地图加载完成（修复：内联 style 可能同步触发 load）
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

// ====== 事件处理 ======
function onSelectCounty(countyName) {
  selectedCounty.value = countyName
}

// 取消选中时清除缓冲区分析的地图标记
watch(selectedCounty, (val) => {
  if (!val) clearBufferLayers()
})

function clearBufferLayers() {
  const map = mapInstance.value
  if (!map) return
  // 缓冲区图层
  const layers = ['buffer-analysis-circle', 'buffer-rescue-points', 'buffer-supply-points']
  const sources = ['buffer-circle-src', 'buffer-rescue-src', 'buffer-supply-src']
  // 路径规划图层
  layers.push('planning-route-line')
  sources.push('planning-route-src')
  layers.forEach((id) => {
    try { if (map.getLayer(id)) map.removeLayer(id) } catch (e) { /* ignore */ }
  })
  sources.forEach((id) => {
    try { if (map.getSource(id)) map.removeSource(id) } catch (e) { /* ignore */ }
  })
}

function openBufferAnalysis() {
  showBufferModal.value = true
}

function openRoutePlanning(rescuePoint) {
  if (!selectedCounty.value) return
  routeOrigin.value = rescuePoint.coords
  routeDestination.value = getCountyCoords(selectedCounty.value)
  showBufferModal.value = false
  showRouteModal.value = true
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

.dashboard-panels {
  width: 420px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: rgba(10, 22, 40, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  overflow-y: auto;
}

.panel-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  overflow: hidden;
}

.panel-top {
  flex: 0 0 auto;
  min-height: 200px;
}

.panel-bottom {
  flex: 1;
  min-height: 300px;
}

/* 滚动条样式 */
.dashboard-panels::-webkit-scrollbar {
  width: 4px;
}
.dashboard-panels::-webkit-scrollbar-track {
  background: transparent;
}
.dashboard-panels::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

:deep(.mapboxgl-ctrl-bottom-left),
:deep(.mapboxgl-ctrl-bottom-right) {
  display: none;
}
</style>
