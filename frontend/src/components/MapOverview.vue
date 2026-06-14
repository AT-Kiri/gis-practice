<template>
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

let overviewMap = null
let rectSource = null
let mainMoveHandler = null // 保存引用以便移除

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
      layers: [{
        id: 'world-bg',
        type: 'background',
        paint: { 'background-color': '#e8e8e8' },
      }, {
        id: 'world-layer',
        type: 'raster',
        source: 'world',
        minzoom: 0,
        maxzoom: 22,
      }],
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
    // Add extent rectangle source
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
    console.error('Overview map error:', e.error ? e.error.message : e)
  })

  // Update rectangle on main map move — 保存引用以便后续移除
  mainMoveHandler = updateExtent
  mainMap.on('move', mainMoveHandler)

  // Click overview to re-center main
  overviewMap.on('click', (e) => {
    mainMap.flyTo({ center: e.lngLat, duration: 300 })
  })
}

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

// 拆分为两个独立 watch，清晰控制创建和销毁逻辑
watch(() => props.visible && store.mapInstance, (show) => {
  if (show && !overviewMap) {
    setTimeout(createOverview, 400)
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
