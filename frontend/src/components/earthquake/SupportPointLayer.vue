<script setup>
/**
 * 支援点/物资点/已损毁点图层组件
 *
 * 在 MapboxGL 地图上渲染 4 类要素：
 *   - 受灾点（earthquake-disaster-center）：红色大圆 #ef4444，z-order 最高
 *   - 支援点（earthquake-support-points）：5 类图标，按类型颜色着色
 *   - 物资点（earthquake-supply-points）：4 类图标，按类型颜色着色
 *   - 已损毁点（earthquake-damaged-points）：灰显（opacity=0.4），最下层
 *
 * 交互：
 *   - 点击支援点/物资点 → popup 显示名称、类型、距离、物资列表
 *   - 鼠标悬停 → 光标切换为 pointer
 *
 * 文档参考：spec.md §3 / checklist.md §3.4
 */
import { watch, onUnmounted } from 'vue'
import mapboxgl from 'mapbox-gl'

const props = defineProps({
  /** MapboxGL 地图实例 */
  map: { type: Object, required: true },
  /** 支援点数组：[{type, name, lng, lat, icon, color, distance}] */
  supportPoints: { type: Array, default: () => [] },
  /** 物资点数组：[{type, name, lng, lat, icon, color, supplies, distance}] */
  supplyPoints: { type: Array, default: () => [] },
  /** 已损毁点数组：[{type, name, lng, lat, icon, color, distance, _damaged}] */
  damagedPoints: { type: Array, default: () => [] },
  /** 受灾点坐标 [lng, lat] */
  disasterCenter: { type: Array, default: null },
})

// ==================== 图层 ID 常量 ====================

const SUPPORT_SOURCE = 'earthquake-support-source'
const SUPPORT_LAYER = 'earthquake-support-points'
const SUPPORT_LABEL_LAYER = 'earthquake-support-labels'

const SUPPLY_SOURCE = 'earthquake-supply-source'
const SUPPLY_LAYER = 'earthquake-supply-points'
const SUPPLY_LABEL_LAYER = 'earthquake-supply-labels'

const DAMAGED_SOURCE = 'earthquake-damaged-source'
const DAMAGED_LAYER = 'earthquake-damaged-points'

const DISASTER_SOURCE = 'earthquake-disaster-source'
const DISASTER_LAYER = 'earthquake-disaster-center'

const TYPE_LABELS = {
  emergency_management: '应急管理局',
  fire_station: '消防救援站',
  hospital: '医院急救中心',
  supply_depot: '物资储备库',
  shelter: '应急避难场所',
  grain_oil: '粮油店',
  supermarket: '超市',
  pharmacy: '药店',
  gas_station: '加油站',
}

// ==================== 数据转换 ====================

function toFeature(p) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    properties: {
      name: p.name,
      type: p.type,
      typeLabel: TYPE_LABELS[p.type] || p.type,
      icon: p.icon || '',
      color: p.color || '#3182ce',
      distance: p.distance || 0,
      supplies: Array.isArray(p.supplies) ? p.supplies.join('、') : '',
      _damaged: p._damaged === true,
    },
  }
}

function toFeatureCollection(points) {
  return {
    type: 'FeatureCollection',
    features: (points || []).map(toFeature),
  }
}

function disasterFeature(center) {
  if (!center) return null
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: center },
        properties: { name: '受灾点', _role: 'disaster_center' },
      },
    ],
  }
}

// ==================== 渲染 ====================

function render() {
  if (!props.map) return
  cleanup()

  // 1. 已损毁点（最下层）
  if (props.damagedPoints.length > 0) {
    props.map.addSource(DAMAGED_SOURCE, {
      type: 'geojson',
      data: toFeatureCollection(props.damagedPoints),
    })
    props.map.addLayer({
      id: DAMAGED_LAYER,
      type: 'circle',
      source: DAMAGED_SOURCE,
      paint: {
        'circle-radius': 6,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff',
        'circle-stroke-opacity': 0.4,
      },
    })
  }

  // 2. 物资点（circle + symbol label）
  if (props.supplyPoints.length > 0) {
    props.map.addSource(SUPPLY_SOURCE, {
      type: 'geojson',
      data: toFeatureCollection(props.supplyPoints),
    })
    props.map.addLayer({
      id: SUPPLY_LAYER,
      type: 'circle',
      source: SUPPLY_SOURCE,
      paint: {
        'circle-radius': 7,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    })
    props.map.addLayer({
      id: SUPPLY_LABEL_LAYER,
      type: 'symbol',
      source: SUPPLY_SOURCE,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#1a202c',
        'text-halo-color': '#fff',
        'text-halo-width': 1.5,
      },
    })
  }

  // 3. 支援点（circle + symbol label）
  if (props.supportPoints.length > 0) {
    props.map.addSource(SUPPORT_SOURCE, {
      type: 'geojson',
      data: toFeatureCollection(props.supportPoints),
    })
    props.map.addLayer({
      id: SUPPORT_LAYER,
      type: 'circle',
      source: SUPPORT_SOURCE,
      paint: {
        'circle-radius': 8,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.95,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    })
    props.map.addLayer({
      id: SUPPORT_LABEL_LAYER,
      type: 'symbol',
      source: SUPPORT_SOURCE,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#1a202c',
        'text-halo-color': '#fff',
        'text-halo-width': 1.5,
      },
    })
  }

  // 4. 受灾点（最上层，红色大圆 #ef4444）
  if (props.disasterCenter) {
    const fc = disasterFeature(props.disasterCenter)
    if (fc) {
      props.map.addSource(DISASTER_SOURCE, { type: 'geojson', data: fc })
      props.map.addLayer({
        id: DISASTER_LAYER,
        type: 'circle',
        source: DISASTER_SOURCE,
        paint: {
          'circle-radius': 11,
          'circle-color': '#ef4444',
          'circle-opacity': 1,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fff',
        },
      })
    }
  }

  bindInteractions()
}

// ==================== 交互 ====================

let popup = null

function buildPopupHTML(props) {
  const distanceKm = (props.distance / 1000).toFixed(2)
  let html = `<div class="support-popup">
    <div class="popup-title">${props.name}</div>
    <div class="popup-row"><span class="popup-label">类型</span><span>${props.typeLabel}</span></div>
    <div class="popup-row"><span class="popup-label">距离</span><span>${distanceKm} km</span></div>`
  if (props.supplies) {
    html += `<div class="popup-row"><span class="popup-label">物资</span><span>${props.supplies}</span></div>`
  }
  if (props._damaged) {
    html += `<div class="popup-row damaged-tag">⚠️ 该点已损毁，无法提供服务</div>`
  }
  html += `</div>`
  return html
}

function onPointClick(e) {
  if (!e.features || !e.features.length) return
  const f = e.features[0]
  const coordinates = f.geometry.coordinates.slice()
  // 防止跨日界线时 popup 异常
  while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360
  }

  if (popup) popup.remove()
  popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
    .setLngLat(coordinates)
    .setHTML(buildPopupHTML(f.properties))
    .addTo(props.map)
}

function onPointEnter() {
  props.map.getCanvas().style.cursor = 'pointer'
}

function onPointLeave() {
  props.map.getCanvas().style.cursor = ''
}

function bindInteractions() {
  if (!props.map) return
  const interactiveLayers = [SUPPORT_LAYER, SUPPLY_LAYER, DAMAGED_LAYER]
  interactiveLayers.forEach((id) => {
    if (!props.map.getLayer(id)) return
    props.map.on('click', id, onPointClick)
    props.map.on('mouseenter', id, onPointEnter)
    props.map.on('mouseleave', id, onPointLeave)
  })
}

function unbindInteractions() {
  if (!props.map) return
  const interactiveLayers = [SUPPORT_LAYER, SUPPLY_LAYER, DAMAGED_LAYER]
  interactiveLayers.forEach((id) => {
    if (!props.map.getLayer(id)) return
    props.map.off('click', id, onPointClick)
    props.map.off('mouseenter', id, onPointEnter)
    props.map.off('mouseleave', id, onPointLeave)
  })
}

// ==================== 清理 ====================

function cleanup() {
  if (!props.map) return
  unbindInteractions()
  if (popup) {
    popup.remove()
    popup = null
  }

  const layers = [
    DISASTER_LAYER,
    SUPPORT_LABEL_LAYER,
    SUPPORT_LAYER,
    SUPPLY_LABEL_LAYER,
    SUPPLY_LAYER,
    DAMAGED_LAYER,
  ]
  const sources = [
    DISASTER_SOURCE,
    SUPPORT_SOURCE,
    SUPPLY_SOURCE,
    DAMAGED_SOURCE,
  ]

  layers.forEach((id) => {
    if (props.map.getLayer(id)) props.map.removeLayer(id)
  })
  sources.forEach((id) => {
    if (props.map.getSource(id)) props.map.removeSource(id)
  })
}

defineExpose({ cleanup, render })

// ==================== 响应式监听 ====================

watch(
  () => [
    props.map,
    props.supportPoints,
    props.supplyPoints,
    props.damagedPoints,
    props.disasterCenter,
  ],
  () => render(),
  { deep: true },
)

watch(
  () => props.map,
  (map) => {
    if (map) render()
  },
  { immediate: true },
)

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <!-- 纯图层组件，不渲染 DOM -->
  <div class="support-point-layer" style="display: none"></div>
</template>

<style scoped>
.support-point-layer {
  display: none;
}
</style>

<style>
/* popup 全局样式（不 scoped 以便 MapboxGL Popup 实例能引用） */
.support-popup {
  min-width: 200px;
  font-size: 12px;
}

.support-popup .popup-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a202c;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e2e8f0;
}

.support-popup .popup-row {
  display: flex;
  justify-content: space-between;
  margin: 4px 0;
  color: #2d3748;
}

.support-popup .popup-label {
  color: #718096;
  margin-right: 12px;
}

.support-popup .damaged-tag {
  margin-top: 6px;
  padding: 4px 6px;
  background: rgba(245, 101, 101, 0.15);
  border-radius: 4px;
  color: #c53030;
  font-weight: 500;
  display: block;
  justify-content: flex-start;
}
</style>
