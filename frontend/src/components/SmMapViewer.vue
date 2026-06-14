<template>
  <!-- 应用主布局：左侧导航 + 右侧地图 -->
  <div class="app-layout">
    <!-- 左侧导航侧栏 -->
    <NavSidebar
      :active-key="activeKey"
      @update:active-key="onSidebarChange"
    />

    <!-- 地图区域 -->
    <div class="map-container" ref="mapContainer">
      <div id="map" class="map-wrapper"></div>

      <!-- 加载中状态 -->
      <div v-if="store.isLoading" class="map-loading">
        <a-spin :spinning="true" tip="地图加载中..." />
      </div>

      <!-- 加载失败状态 -->
      <div v-if="store.isError" class="map-error">
        <a-result
          status="warning"
          title="地图服务连接失败"
          :sub-title="store.errorMessage"
        >
          <template #extra>
            <a-button type="primary" @click="retryLoadMap">重新加载</a-button>
          </template>
        </a-result>
      </div>

      <!-- 地图工具条（始终可见） -->
      <MapToolbar v-if="!store.isError && store.mapInstance" />

      <!-- 各功能面板：根据 activeKey 条件渲染 -->
      <SpatialQuery
        v-if="!store.isError && store.mapInstance && activeKey === 'spatial-query'"
      />
      <MapMeasure
        v-if="!store.isError && store.mapInstance && activeKey === 'measure'"
      />
      <FeatureSearch
        v-if="!store.isError && store.mapInstance && activeKey === 'thematic-search'"
        @close="activeKey = null"
      />
      <SpatialAnalysis
        v-if="!store.isError && store.mapInstance && activeKey === 'spatial-analysis'"
        @close="activeKey = null"
      />
      <NetworkAnalysis
        v-if="!store.isError && store.mapInstance && activeKey === 'network-analysis'"
        @close="activeKey = null"
      />

      <!-- 图层管理器：通过 v-model 控制显隐，不占用 activeKey -->
      <LayerManager
        v-if="!store.isError && store.mapInstance"
        v-model:visible="layerPanelVisible"
      />

      <!-- 鹰眼视图 -->
      <MapOverview
        v-if="!store.isError && store.mapInstance"
        :visible="activeKey === 'overview'"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '../stores/map'
import { ISERVER_URL, TILE_SIZE, getTileUrl } from '../utils/map'
import NavSidebar from './NavSidebar.vue'
import MapToolbar from './MapToolbar.vue'
import MapOverview from './MapOverview.vue'
import MapMeasure from './MapMeasure.vue'
import FeatureSearch from './FeatureSearch.vue'
import SpatialAnalysis from './SpatialAnalysis.vue'
import NetworkAnalysis from './NetworkAnalysis.vue'
import SpatialQuery from './SpatialQuery.vue'
import LayerManager from './LayerManager.vue'
import mapboxgl from 'mapbox-gl'

const store = useMapStore()
const mapContainer = ref(null)
const activeKey = ref(null)
const layerPanelVisible = ref(false)

let resizeObserver = null

/**
 * 侧栏菜单切换回调
 * 图层管理器特殊处理：通过 v-model:visible 控制，不占用 activeKey
 */
function onSidebarChange(key) {
  if (key === 'layer-manager') {
    layerPanelVisible.value = !layerPanelVisible.value
    if (activeKey.value === 'layer-manager') {
      activeKey.value = null
    }
  } else {
    activeKey.value = key
  }
}

/** 初始化 MapboxGL 地图 */
function loadMap() {
  store.clearError()
  store.setLoading(true)

  try {
    const map = new mapboxgl.Map({
      container: 'map',
      style: {
        version: 8,
        // 数据源：世界底图 + 京津冀专题图（均为 iServer 瓦片服务）
        sources: {
          'world': {
            type: 'raster',
            tiles: [getTileUrl(`${ISERVER_URL}/iserver/services/map-world/rest/maps/World`)],
            tileSize: TILE_SIZE,
          },
          'jingjin': {
            type: 'raster',
            tiles: [getTileUrl(`${ISERVER_URL}/iserver/services/map-jingjin/rest/maps/京津地区地图`)],
            tileSize: TILE_SIZE,
          },
        },
        layers: [
          { id: 'world-layer', type: 'raster', source: 'world', minzoom: 0, maxzoom: 22 },
          { id: 'jingjin-layer', type: 'raster', source: 'jingjin', minzoom: 0, maxzoom: 22 },
        ],
      },
      center: [116.4, 39.9], // 京津冀区域中心
      zoom: 8,
      attributionControl: false,
    })

    // 地图加载完成：更新 Store 状态
    map.on('load', () => {
      store.setMap(map)
      store.setLayers([
        { id: 'world-layer', name: '世界底图', visible: true, opacity: 1 },
        { id: 'jingjin-layer', name: '京津冀专题图', visible: true, opacity: 1 },
      ])
    })

    // 地图错误日志
    map.on('error', (e) => {
      console.error('地图错误:', e)
    })

    // 监听容器尺寸变化，自动触发 map.resize()
    resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(mapContainer.value)

  } catch (err) {
    store.setError(err.message || '无法初始化地图')
  }
}

/** 重新加载地图（错误重试） */
function retryLoadMap() {
  loadMap()
}

onMounted(() => {
  loadMap()
})

onUnmounted(() => {
  // 清理 ResizeObserver，防止内存泄漏
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>

<style scoped>
.app-layout {
  width: 100%;
  height: 100%;
  display: flex;
}

.map-container {
  flex: 1;
  height: 100%;
  position: relative;
}

.map-wrapper {
  width: 100%;
  height: 100%;
}

.map-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.map-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  z-index: 10;
}
</style>
