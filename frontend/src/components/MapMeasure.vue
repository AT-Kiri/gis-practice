<template>
  <div class="measure-toolbar">
    <a-tooltip title="距离量算" placement="left">
      <a-button
        :type="activeMode === 'distance' ? 'primary' : 'default'"
        shape="circle"
        @click="toggleMode('distance')"
      >
        <template #icon><LineOutlined /></template>
      </a-button>
    </a-tooltip>
    <a-tooltip title="面积量算" placement="left">
      <a-button
        :type="activeMode === 'area' ? 'primary' : 'default'"
        shape="circle"
        @click="toggleMode('area')"
      >
        <template #icon><BorderOutlined /></template>
      </a-button>
    </a-tooltip>
    <a-tooltip title="清除标注" placement="left">
      <a-button shape="circle" @click="clearAll">
        <template #icon><DeleteOutlined /></template>
      </a-button>
    </a-tooltip>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { LineOutlined, BorderOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { useMapStore } from '../stores/map'
import mapboxgl from 'mapbox-gl'

const store = useMapStore()
const activeMode = ref(null)

let pts = []
let markers = []
let labels = []

// Layers created in activate:
//   source 'measure-main' → layers: 'measure-line', 'measure-fill', 'measure-outline'
//   source 'measure-preview' → layers: 'measure-preview'

function safeRemove(id, type) {
  const map = store.mapInstance
  if (!map) return
  try {
    if (type === 'layer' && map.getLayer(id)) map.removeLayer(id)
    if (type === 'source' && map.getSource(id)) map.removeSource(id)
  } catch (e) { /* ignore */ }
}

function toggleMode(mode) {
  if (activeMode.value === mode) {
    deactivate()
    return
  }
  deactivate()
  activeMode.value = mode
  activate()
}

function activate() {
  const map = store.mapInstance
  if (!map) return

  // Clear previous measurement artifacts
  clearLabels()
  markers.forEach(m => { try { m.remove() } catch(e) {} })
  markers = []
  if (map.getSource('measure-main')) map.getSource('measure-main').setData(emptyFC())

  map.getCanvas().style.cursor = 'crosshair'
  // Disable dblclick zoom during measurement
  map.doubleClickZoom.disable()
  pts = []

  // Shared drawing source
  if (!map.getSource('measure-main')) {
    map.addSource('measure-main', { type: 'geojson', data: emptyFC() })
    map.addLayer({ id: 'measure-line', type: 'line', source: 'measure-main',
      paint: { 'line-color': '#ff4d4f', 'line-width': 2, 'line-dasharray': [4, 2] },
      filter: ['==', '$type', 'LineString'] })
    map.addLayer({ id: 'measure-fill', type: 'fill', source: 'measure-main',
      paint: { 'fill-color': '#ff4d4f', 'fill-opacity': 0.15 },
      filter: ['==', '$type', 'Polygon'] })
    map.addLayer({ id: 'measure-outline', type: 'line', source: 'measure-main',
      paint: { 'line-color': '#ff4d4f', 'line-width': 2 },
      filter: ['==', '$type', 'Polygon'] })
  }

  // Preview line (mouse follow)
  if (!map.getSource('measure-preview')) {
    map.addSource('measure-preview', { type: 'geojson', data: emptyFC() })
    map.addLayer({ id: 'measure-preview', type: 'line', source: 'measure-preview',
      paint: { 'line-color': '#ff4d4f', 'line-width': 2, 'line-opacity': 0.5, 'line-dasharray': [2, 2] } })
  }

  map.on('mousemove', onMove)
  map.on('click', addPoint)
  map.on('dblclick', finish)
}

function deactivate() {
  const map = store.mapInstance
  if (!map) return
  map.off('click', addPoint)
  map.off('dblclick', finish)
  map.off('mousemove', onMove)
  map.getCanvas().style.cursor = ''
  // Clear preview
  if (map.getSource('measure-preview')) map.getSource('measure-preview').setData(emptyFC())
}

function addPoint(e) {
  const map = store.mapInstance
  if (!map) return

  const pt = [e.lngLat.lng, e.lngLat.lat]
  pts.push(pt)

  // Marker
  const el = document.createElement('div')
  el.className = 'm-dot'
  el.style.cssText = 'width:8px;height:8px;background:#ff4d4f;border-radius:50%;border:2px solid #fff;'
  const m = new mapboxgl.Marker({ element: el }).setLngLat(e.lngLat).addTo(map)
  markers.push(m)

  updateDraw()
}

function onMove(e) {
  const map = store.mapInstance
  if (!map || pts.length === 0) return
  const src = map.getSource('measure-preview')
  if (!src) return
  const last = pts[pts.length - 1]
  src.setData({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [last, [e.lngLat.lng, e.lngLat.lat]] },
    }],
  })
}

function finish() {
  const map = store.mapInstance
  if (!map) return

  // Clear preview
  if (map.getSource('measure-preview')) map.getSource('measure-preview').setData(emptyFC())

  if (pts.length < 2) {
    deactivate()
    setTimeout(() => {
      const m = store.mapInstance
      if (m) m.doubleClickZoom.enable()
    }, 200)
    activeMode.value = null
    return
  }

  if (activeMode.value === 'distance') {
    const total = totalDist(pts)
    const last = pts[pts.length - 1]
    addLabel([last[0], last[1] + 0.015], '总计: ' + fmtDist(total))
  } else if (pts.length >= 3) {
    // Close+draw polygon
    const closed = [...pts, pts[0]]
    if (map.getSource('measure-main')) {
      map.getSource('measure-main').setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [closed] },
        }],
      })
    }
    const area = calcArea(pts)
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
    addLabel([cx, cy], '面积: ' + fmtArea(area))
  }

  deactivate()
  // Defer re-enabling dblclick zoom so it doesn't trigger on this dblclick
  setTimeout(() => {
    const m = store.mapInstance
    if (m) m.doubleClickZoom.enable()
  }, 200)
  activeMode.value = null
}

function updateDraw() {
  const map = store.mapInstance
  if (!map) return
  const src = map.getSource('measure-main')
  if (!src) return

  if (activeMode.value === 'distance') {
    const features = []
    for (let i = 1; i < pts.length; i++) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [pts[i - 1], pts[i]] },
      })
    }
    src.setData({ type: 'FeatureCollection', features })

    clearLabels()
    for (let i = 1; i < pts.length; i++) {
      const seg = haversine(pts[i - 1], pts[i])
      const mid = [(pts[i - 1][0] + pts[i][0]) / 2, (pts[i - 1][1] + pts[i][1]) / 2]
      addLabel(mid, fmtDist(seg))
    }
  } else {
    // Area mode: show polygon in progress
    const closed = [...pts]
    src.setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [closed] },
      }],
    })
  }
}

function addLabel(coords, text) {
  const el = document.createElement('div')
  el.textContent = text
  el.style.cssText = 'background:rgba(255,255,255,0.9);padding:2px 6px;border-radius:3px;font-size:12px;color:#ff4d4f;border:1px solid #ff4d4f;white-space:nowrap;font-weight:bold;pointer-events:none;'
  const m = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(coords).addTo(store.mapInstance)
  labels.push(m)
}

function clearLabels() {
  labels.forEach(m => { try { m.remove() } catch(e) {} })
  labels = []
}

function clearAll() {
  const map = store.mapInstance
  if (!map) return

  deactivate()

  ;['measure-main', 'measure-preview'].forEach(id => {
    safeRemove('measure-line', 'layer')
    safeRemove('measure-fill', 'layer')
    safeRemove('measure-outline', 'layer')
    safeRemove('measure-preview', 'layer')
    safeRemove(id, 'source')
  })

  markers.forEach(m => { try { m.remove() } catch(e) {} })
  markers = []
  clearLabels()
  pts = []
  activeMode.value = null
  const m = store.mapInstance
  if (m) m.doubleClickZoom.enable()
}

function emptyFC() { return { type: 'FeatureCollection', features: [] } }

function haversine(a, b) {
  const R = 6371000
  const dLat = ((b[1] - a[1]) * Math.PI) / 180
  const dLon = ((b[0] - a[0]) * Math.PI) / 180
  const la1 = (a[1] * Math.PI) / 180
  const la2 = (b[1] * Math.PI) / 180
  return R * 2 * Math.asin(Math.sqrt(
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  ))
}

function totalDist(p) {
  let t = 0
  for (let i = 1; i < p.length; i++) t += haversine(p[i - 1], p[i])
  return t
}

function calcArea(p) {
  let a = 0
  const R = 6371000
  const n = p.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const x1 = (p[i][0] * Math.PI) / 180
    const y1 = (p[i][1] * Math.PI) / 180
    const x2 = (p[j][0] * Math.PI) / 180
    const y2 = (p[j][1] * Math.PI) / 180
    a += (x2 - x1) * (2 + Math.sin(y1) + Math.sin(y2))
  }
  return Math.abs((a * R * R) / 2)
}

function fmtDist(m) { return m < 1000 ? m.toFixed(1) + ' m' : (m / 1000).toFixed(2) + ' km' }
function fmtArea(s) { return s < 1e6 ? s.toFixed(1) + ' m²' : (s / 1e6).toFixed(2) + ' km²' }

onUnmounted(() => {
  clearAll()
})
</script>

<style scoped>
.measure-toolbar {
  position: absolute;
  top: 80px;
  right: 20px;
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
</style>
