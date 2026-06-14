<template>
  <div class="flood-simulation">
    <div id="cesiumContainer"></div>

    <div class="flood-toolbar">
      <div class="toolbar-title">
        <SafetyCertificateOutlined style="color: #ff4d4f; font-size: 18px;" />
        <span>三维洪水模拟 — 积石山</span>
      </div>
      <div class="toolbar-controls">
        <div class="param-group">
          <label>淹没高度(m)</label>
          <a-input-number v-model:value="params.maxHeight" :min="10" :max="500" :step="10" size="small" style="width:80px" :disabled="isSimulating" />
        </div>
        <div class="param-group">
          <label>速度(m/s)</label>
          <a-input-number v-model:value="params.speed" :min="1" :max="100" :step="5" size="small" style="width:80px" :disabled="isSimulating" />
        </div>
        <a-button type="primary" :danger="!isSimulating" @click="startFlood" :disabled="isSimulating || isLoading">
          <PlayCircleOutlined /> 开始模拟
        </a-button>
        <a-button @click="togglePause" :disabled="!isSimulating">
          <PauseCircleOutlined /> {{ isPaused ? '继续' : '暂停' }}
        </a-button>
        <a-button @click="resetFlood" :disabled="isSimulating">
          <ReloadOutlined /> 重置
        </a-button>
      </div>
    </div>

    <div class="flood-stats">
      <div class="stat-card">
        <div class="stat-label">模拟时间</div>
        <div class="stat-value">{{ stats.simulatedTime.toFixed(1) }}<span class="stat-unit">s</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">当前水位</div>
        <div class="stat-value">{{ stats.currentHeight.toFixed(1) }}<span class="stat-unit">m</span></div>
      </div>
      <div class="stat-card submerged">
        <div class="stat-label">淹没房屋</div>
        <div class="stat-value">{{ stats.submergedBuildings }}<span class="stat-unit">/{{ stats.totalBuildings }} 栋</span></div>
      </div>
      <div class="stat-card submerged">
        <div class="stat-label">淹没道路</div>
        <div class="stat-value">{{ stats.submergedRoads }}<span class="stat-unit">/{{ stats.totalRoads }} 条</span></div>
      </div>
    </div>

    <div v-if="isLoading" class="loading-mask">
      <a-spin />
      <div class="loading-text">正在加载三维场景...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import {
  SafetyCertificateOutlined, PlayCircleOutlined,
  PauseCircleOutlined, ReloadOutlined,
} from '@ant-design/icons-vue'

const CESIUM_CDN = 'https://cdn.jsdelivr.net/npm/cesium@1.124/Build/Cesium'

const isLoading = ref(true)
const isSimulating = ref(false)
const isPaused = ref(false)
const params = reactive({ maxHeight: 100, speed: 10 })
const stats = reactive({
  simulatedTime: 0, currentHeight: 0,
  submergedBuildings: 0, totalBuildings: 0,
  submergedRoads: 0, totalRoads: 0,
})

let viewer = null
let waterEntity = null
let buildingEntities = []
let roadEntities = []
let buildingCentroids = []
let roadCentroids = []
let floodBounds = null
let animTimer = null
let startTs = 0
let curHeight = 0
let lastSubB = new Set()
let lastSubR = new Set()

onMounted(() => loadCesium())
onUnmounted(() => {
  if (animTimer) cancelAnimationFrame(animTimer)
  if (viewer && !viewer.isDestroyed()) viewer.destroy()
})

function loadCesium() {
  window.CESIUM_BASE_URL = CESIUM_CDN + '/'
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `${CESIUM_CDN}/Widgets/widgets.css`
  document.head.appendChild(link)
  const script = document.createElement('script')
  script.src = `${CESIUM_CDN}/Cesium.js`
  script.onload = () => initViewer()
  script.onerror = () => { isLoading.value = false }
  document.head.appendChild(script)
}

function initViewer() {
  viewer = new Cesium.Viewer('cesiumContainer', {
    imageryProvider: false,
    baseLayerPicker: false, geocoder: false, homeButton: false,
    sceneModePicker: false, navigationHelpButton: false,
    animation: false, timeline: false,
    fullscreenButton: false, infoBox: false, selectionIndicator: false,
  })

  // 天地图影像底图
  viewer.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: 'http://{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=f8bf399b1e49a8f6a513ff3df0005477',
      subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
      minimumLevel: 1, maximumLevel: 18,
    })
  )
  // 天地图注记
  viewer.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: 'http://{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=f8bf399b1e49a8f6a513ff3df0005477',
      subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
      minimumLevel: 1, maximumLevel: 18,
    })
  )

  // 先定位到积石山区域（数据加载后会精确飞到建筑区）
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(102.85, 35.72, 8000),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-30), roll: 0 },
  })

  isLoading.value = false
  loadData()
}

async function loadData() {
  try {
    const bDs = await Cesium.GeoJsonDataSource.load('/data/buildings.geojson', { clampToGround: true })
    viewer.dataSources.add(bDs)
    buildingEntities = []
    const bEnts = bDs.entities.values
    for (let i = 0; i < bEnts.length; i++) {
      const e = bEnts[i]
      if (e.polygon) {
        e.polygon.material = Cesium.Color.YELLOW.withAlpha(0.6)
        e.polygon.outline = false
        buildingEntities.push(e)
      }
    }

    const rDs = await Cesium.GeoJsonDataSource.load('/data/roads.geojson', { clampToGround: true })
    viewer.dataSources.add(rDs)
    roadEntities = []
    const rEnts = rDs.entities.values
    for (let i = 0; i < rEnts.length; i++) {
      const e = rEnts[i]
      if (e.polyline) {
        e.polyline.material = Cesium.Color.CYAN
        e.polyline.width = 2
        roadEntities.push(e)
      }
    }

    // 计算建筑区域的包围盒
    const bounds = await fetchBounds('/data/buildings.geojson')
    const pad = 0.005
    floodBounds = {
      west: bounds.west - pad, south: bounds.south - pad,
      east: bounds.east + pad, north: bounds.north + pad,
    }

    // 提取中心点 + 模拟高程（只取 floodBounds 内的）
    buildingCentroids = extractCentroids(buildingEntities, floodBounds)
    roadCentroids = extractCentroids(roadEntities, floodBounds)
    stats.totalBuildings = buildingCentroids.length
    stats.totalRoads = roadCentroids.length

    // 创建洪水水面
    waterEntity = createWater(floodBounds)

    // 飞入到建筑区域
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        (floodBounds.west + floodBounds.east) / 2,
        (floodBounds.south + floodBounds.north) / 2 - 0.03,
        2500
      ),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-40), roll: 0 },
      duration: 2,
    })

    console.log('加载完成:', { buildings: buildingEntities.length, roads: roadEntities.length })
  } catch (e) {
    console.error('加载失败:', e)
  }
}

function extractCentroids(entities, bounds) {
  const result = []
  for (let i = 0; i < entities.length; i++) {
    const center = getCenter(entities[i])
    if (!center) continue
    if (center.lon < bounds.west || center.lon > bounds.east ||
        center.lat < bounds.south || center.lat > bounds.north) continue
    // 模拟高程：区域内按位置分布 0~60m
    const dx = (center.lon - bounds.west) / (bounds.east - bounds.west)
    const dy = (center.lat - bounds.south) / (bounds.north - bounds.south)
    const dCenter = Math.abs(dx - 0.5) + Math.abs(dy - 0.5)
    const noise = ((center.lon * 37 + center.lat * 53) % 17) / 17 * 15
    const h = Math.max(0, dCenter * 120 + noise - 10)
    result.push({ ...center, groundHeight: Math.round(h) })
  }
  return result
}

function getCenter(entity) {
  try {
    let positions = null
    if (entity.polygon && entity.polygon.hierarchy) {
      positions = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now()).positions
    } else if (entity.polyline && entity.polyline.positions) {
      positions = entity.polyline.positions.getValue(Cesium.JulianDate.now())
    }
    if (!positions || positions.length === 0) return null
    let lon = 0, lat = 0
    for (const p of positions) {
      const c = Cesium.Cartographic.fromCartesian(p)
      lon += Cesium.Math.toDegrees(c.longitude)
      lat += Cesium.Math.toDegrees(c.latitude)
    }
    return { lon: lon / positions.length, lat: lat / positions.length }
  } catch { return null }
}

/** 从 GeoJSON 文件计算包围盒 */
async function fetchBounds(url) {
  const res = await fetch(url)
  const data = await res.json()
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity
  for (const feat of data.features || []) {
    for (const [lng, lat] of extractAllCoords(feat.geometry)) {
      if (lng < w) w = lng
      if (lng > e) e = lng
      if (lat < s) s = lat
      if (lat > n) n = lat
    }
  }
  return { west: w, south: s, east: e, north: n }
}
function extractAllCoords(geo) {
  if (!geo) return []
  const c = geo.coordinates
  if (geo.type === 'Polygon') return c.flat()
  if (geo.type === 'MultiPolygon') return c.flat(2)
  if (geo.type === 'LineString') return c
  if (geo.type === 'MultiLineString') return c.flat()
  return []
}

function createWater(bounds) {
  const positions = [
    Cesium.Cartesian3.fromDegrees(bounds.west, bounds.south),
    Cesium.Cartesian3.fromDegrees(bounds.east, bounds.south),
    Cesium.Cartesian3.fromDegrees(bounds.east, bounds.north),
    Cesium.Cartesian3.fromDegrees(bounds.west, bounds.north),
  ]
  return viewer.entities.add({
    show: false,
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(positions),
      material: Cesium.Color.fromAlpha(Cesium.Color.ROYALBLUE, 0.45),
      outline: true,
      outlineColor: Cesium.Color.fromAlpha(Cesium.Color.CYAN, 0.5),
      height: 0,
      extrudedHeight: 0.1,
    },
  })
}

// ====== 模拟控制 ======

function startFlood() {
  if (isSimulating.value) return
  isSimulating.value = true
  isPaused.value = false
  curHeight = 0
  startTs = Date.now()
  // 显示水面并重置高度
  if (waterEntity) {
    waterEntity.show = true
    waterEntity.polygon.extrudedHeight = 0.1
  }
  tick()
}

function togglePause() {
  isPaused.value = !isPaused.value
  if (!isPaused.value) {
    startTs = Date.now() - stats.simulatedTime * 1000
    tick()
  }
}

function resetFlood() {
  isSimulating.value = false
  isPaused.value = false
  curHeight = 0
  if (animTimer) { cancelAnimationFrame(animTimer); animTimer = null }
  if (waterEntity) {
    waterEntity.show = false
    waterEntity.polygon.extrudedHeight = 0.1
    waterEntity.polygon.material = Cesium.Color.fromAlpha(Cesium.Color.ROYALBLUE, 0.45)
  }
  // 重置建筑颜色
  for (let i = 0; i < buildingEntities.length; i++) {
    if (buildingEntities[i]?.polygon) {
      buildingEntities[i].polygon.material = Cesium.Color.YELLOW.withAlpha(0.6)
    }
  }
  for (let i = 0; i < roadEntities.length; i++) {
    if (roadEntities[i]?.polyline) {
      roadEntities[i].polyline.material = Cesium.Color.CYAN
      roadEntities[i].polyline.width = 2
    }
  }
  lastSubB = new Set()
  lastSubR = new Set()
  stats.simulatedTime = 0
  stats.currentHeight = 0
  stats.submergedBuildings = 0
  stats.submergedRoads = 0
}

function tick() {
  if (!isSimulating.value || isPaused.value) return

  const elapsed = (Date.now() - startTs) / 1000
  curHeight = Math.min(elapsed * params.speed, params.maxHeight)

  // 更新水面高度和颜色
  if (waterEntity) {
    waterEntity.polygon.extrudedHeight = curHeight
    // 水位越高颜色越深（浅蓝→深蓝）
    const ratio = curHeight / Math.max(params.maxHeight, 1)
    const r = 0.05 + ratio * 0.1
    const g = 0.25 + ratio * 0.15
    const b = 0.65 + ratio * 0.25
    const a = 0.3 + ratio * 0.35
    waterEntity.polygon.material = Cesium.Color.fromAlpha(new Cesium.Color(r, g, b), a)
  }

  // 统计 + 颜色更新
  const nowSubB = new Set()
  const nowSubR = new Set()
  for (let i = 0; i < buildingCentroids.length; i++) {
    if (buildingCentroids[i].groundHeight <= curHeight) nowSubB.add(i)
  }
  for (let i = 0; i < roadCentroids.length; i++) {
    if (roadCentroids[i].groundHeight <= curHeight) nowSubR.add(i)
  }

  // 建筑变色
  for (const i of nowSubB) {
    if (!lastSubB.has(i) && buildingEntities[i]?.polygon) {
      buildingEntities[i].polygon.material = Cesium.Color.fromAlpha(Cesium.Color.RED, 0.8)
    }
  }
  for (const i of lastSubB) {
    if (!nowSubB.has(i) && buildingEntities[i]?.polygon) {
      buildingEntities[i].polygon.material = Cesium.Color.YELLOW.withAlpha(0.6)
    }
  }
  // 道路变色
  for (const i of nowSubR) {
    if (!lastSubR.has(i) && roadEntities[i]?.polyline) {
      roadEntities[i].polyline.material = Cesium.Color.fromAlpha(Cesium.Color.DARKRED, 0.6)
      roadEntities[i].polyline.width = 2
    }
  }
  for (const i of lastSubR) {
    if (!nowSubR.has(i) && roadEntities[i]?.polyline) {
      roadEntities[i].polyline.material = Cesium.Color.CYAN
      roadEntities[i].polyline.width = 2
    }
  }
  lastSubB = nowSubB
  lastSubR = nowSubR

  stats.simulatedTime = elapsed
  stats.currentHeight = curHeight
  stats.submergedBuildings = nowSubB.size
  stats.submergedRoads = nowSubR.size

  if (curHeight >= params.maxHeight) {
    isSimulating.value = false
    return
  }
  animTimer = requestAnimationFrame(tick)
}
</script>

<style scoped>
.flood-simulation { width: 100%; height: 100%; position: relative; overflow: hidden; }
#cesiumContainer { width: 100%; height: 100%; }

.flood-toolbar {
  position: absolute; top: 12px; left: 12px; right: 12px;
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); border-radius: 8px;
  padding: 10px 16px; z-index: 100; box-shadow: 0 2px 12px rgba(0,0,0,0.3);
}
.toolbar-title {
  display: flex; align-items: center; gap: 8px;
  color: #fff; font-size: 15px; font-weight: 600; white-space: nowrap;
}
.toolbar-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.param-group { display: flex; align-items: center; gap: 6px; }
.param-group label { color: rgba(255,255,255,0.8); font-size: 12px; white-space: nowrap; }

.flood-stats {
  position: absolute; bottom: 24px; right: 24px;
  display: flex; gap: 10px; z-index: 100;
}
.stat-card {
  background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); border-radius: 8px;
  padding: 10px 16px; text-align: center; min-width: 90px;
  border: 1px solid rgba(255,255,255,0.1);
}
.stat-label { color: rgba(255,255,255,0.6); font-size: 11px; margin-bottom: 4px; }
.stat-value { color: #fff; font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.stat-unit { font-size: 12px; font-weight: 400; color: rgba(255,255,255,0.5); margin-left: 2px; }
.stat-card.submerged .stat-value { color: #ff6b6b; }

.loading-mask {
  position: absolute; inset: 0; background: #1a1a2e;
  display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1000;
}
.loading-text { color: rgba(255,255,255,0.6); margin-top: 16px; font-size: 14px; }
</style>
