<template>
  <!-- 鹰眼视图（小地图）：显示主地图在全球范围内的位置矩形 -->
  <div v-show="visible" id="map-overview" class="map-overview-wrap"></div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useMapStore } from '../stores/map'
import { ISERVER_URL, TILE_SIZE, getTileUrl } from '../utils/map'
import mapboxgl from 'mapbox-gl'

const props = defineProps({
  visible: { type: Boolean, default: false },
})

const store = useMapStore()

let overviewMap = null       // 鹰眼地图实例
let rectSource = null         // 鹰眼矩形数据源
let mainMoveHandler = null    // 主地图 move 事件处理器引用，用于 cleanup

/** 创建鹰眼地图 */
function createOverview() {
  const mainMap = store.mapInstance
  if (!mainMap) return

  overviewMap = new mapboxgl.Map({
    container: 'map-overview',
    style: {
      version: 8,
      sources: {
        'world': {
          type: 'raster',
          tiles: [getTileUrl(`${ISERVER_URL}/iserver/services/map-world/rest/maps/World`)],
          tileSize: TILE_SIZE,
        },
      },
      layers: [
        { id: 'world-bg', type: 'background', paint: { 'background-color': '#e8e8e8' } },
        { id: 'world-layer', type: 'raster', source: 'world', minzoom: 0, maxzoom: 22 },
      ],
    },
    center: [116.4, 39.9],
    zoom: mainMap.getZoom(),
    interactive: true,
    attributionControl: false,
    boxZoom: false,
    doubleClickZoom: false,
    scrollZoom: false,
    dragPan: true,
  })

  overviewMap.on('load', () => {
    // 添加主地图视口范围矩形
    overviewMap.addSource('extent', {
      type: 'geojson',
      data: emptyRect(),
    })
    overviewMap.addLayer({
      id: 'extent-fill',
      type: 'fill',
      source: 'extent',
      paint: { 'fill-color': '#1890ff', 'fill-opacity': 0.1 },
    })
    overviewMap.addLayer({
      id: 'extent-border',
      type: 'line',
      source: 'extent',
      paint: { 'line-color': '#1890ff', 'line-width': 2 },
    })
    rectSource = overviewMap.getSource('extent')

    updateExtent()
  })

  overviewMap.on('error', (e) => {
    console.error('鹰眼地图错误:', e.error ? e.error.message : e)
  })

  // 监听主地图移动，同步更新鹰眼矩形
  mainMoveHandler = updateExtent
  mainMap.on('move', mainMoveHandler)

  // 点击鹰眼地图可让主地图跳转
  overviewMap.on('click', (e) => {
    mainMap.flyTo({ center: e.lngLat, duration: 300 })
  })
}

/** 销毁鹰眼地图，清理事件监听 */
function destroyOverview() {
  if (overviewMap) {
    overviewMap.remove()
    overviewMap = null
    rectSource = null
  }
  // 移除主地图上的 move 事件监听，防止内存泄漏
  if (mainMoveHandler) {
    const mainMap = store.mapInstance
    if (mainMap) {
      mainMap.off('move', mainMoveHandler)
    }
    mainMoveHandler = null
  }
}

/** 更新鹰眼矩形：根据主地图当前视口范围绘制蓝色矩形 */
function updateExtent() {
  if (!rectSource) return
  const mainMap = store.mapInstance
  if (!mainMap) return

  const b = mainMap.getBounds()
  const sw = b.getSouthWest()
  const ne = b.getNorthEast()
  rectSource.setData({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [sw.lng, sw.lat], [ne.lng, sw.lat],
        [ne.lng, ne.lat], [sw.lng, ne.lat], [sw.lng, sw.lat],
      ]],
    },
  })
}

function emptyRect() {
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }
}

// 可视状态变化时创建或销毁鹰眼视图
watch(() => props.visible && store.mapInstance, (show) => {
  if (show && !overviewMap) {
    setTimeout(createOverview, 400)  // 等待主地图渲染完成
  } else if (!show) {
    destroyOverview()
  }
})

onUnmounted(() => {
  destroyOverview()
})
</script>

<style>
.map-overview-wrap {
  position: absolute;
  bottom: 60px;
  right: 10px;
  width: 200px;
  height: 150px;
  border: 2px solid rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  z-index: 5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  background: #f0f0f0;
}
</style>
