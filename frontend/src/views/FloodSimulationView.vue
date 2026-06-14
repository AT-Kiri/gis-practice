<template>
  <div class="flood-simulation">
    <div id="cesiumContainer"></div>

    <!-- 顶部工具栏 -->
    <div class="flood-toolbar">
      <div class="toolbar-title">
        <SafetyCertificateOutlined style="color: #ff4d4f; font-size: 18px;" />
        <span>三维洪水模拟 — 积石山</span>
      </div>

      <div class="toolbar-controls">
        <div class="param-group">
          <label>淹没高度(m)</label>
          <a-input-number
            v-model:value="params.maxHeight"
            :min="10"
            :max="500"
            :step="10"
            size="small"
            style="width: 80px"
            :disabled="isSimulating"
          />
        </div>
        <div class="param-group">
          <label>速度(m/s)</label>
          <a-input-number
            v-model:value="params.speed"
            :min="1"
            :max="100"
            :step="5"
            size="small"
            style="width: 80px"
            :disabled="isSimulating"
          />
        </div>

        <a-button
          type="primary"
          :danger="!isSimulating"
          @click="startSimulation"
          :disabled="isSimulating || isLoading"
        >
          <PlayCircleOutlined /> 开始模拟
        </a-button>
        <a-button @click="pauseSimulation" :disabled="!isSimulating">
          <PauseCircleOutlined /> {{ isPaused ? '继续' : '暂停' }}
        </a-button>
        <a-button @click="resetSimulation" :disabled="isSimulating">
          <ReloadOutlined /> 重置
        </a-button>
      </div>
    </div>

    <!-- 右下角统计面板 -->
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
        <div class="stat-value">{{ stats.submergedBuildings }}<span class="stat-unit">栋</span></div>
      </div>
      <div class="stat-card submerged">
        <div class="stat-label">淹没道路</div>
        <div class="stat-value">{{ stats.submergedRoads }}<span class="stat-unit">条</span></div>
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
  SafetyCertificateOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'

// ====== 配置 ======
const TIANDITU_KEY = 'f8bf399b1e49a8f6a513ff3df0005477'
// 使用本地 SuperMap3D（含 HypsometricSetting）
const SUPERMAP_3D_URL = '/supermap3d/SuperMap3D.js'
const SUPERMAP_3D_BASE = '/supermap3d/'

// ====== 状态 ======
const isLoading = ref(true)
const isSimulating = ref(false)
const isPaused = ref(false)

const params = reactive({ maxHeight: 100, speed: 10 })
const stats = reactive({
  simulatedTime: 0,
  currentHeight: 0,
  submergedBuildings: 0,
  submergedRoads: 0,
})

// Cesium/SuperMap3D 引用
let Cesium = null
let viewer = null
let waterEntity = null
let buildingEntities = []     // 原始建筑实体引用
let buildingEntColors = []    // 每个建筑的原始颜色（用于重置）
let roadEntities = []         // 原始道路实体引用
let buildingCentroids = []    // [{lon, lat, groundHeight}, ...]
let roadCentroids = []        // [{lon, lat, groundHeight}, ...]
let floodBounds = null
let animTimer = null
let startTs = 0
let curHeight = 0
let lastSubmergedBuildings = new Set()  // 缓存上次被淹的建筑索引
let lastSubmergedRoads = new Set()      // 缓存上次被淹的道路索引

// ====== 生命周期 ======
onMounted(() => loadSuperMap3D())
onUnmounted(() => {
  if (animTimer) cancelAnimationFrame(animTimer)
  if (viewer && !viewer.isDestroyed()) viewer.destroy()
})

/** 1. 动态加载 SuperMap3D */
function loadSuperMap3D() {
  window.CESIUM_BASE_URL = SUPERMAP_3D_BASE

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `${SUPERMAP_3D_BASE}Widgets/widgets.css`
  document.head.appendChild(link)

  const script = document.createElement('script')
  script.src = SUPERMAP_3D_URL
  script.onload = () => {
    Cesium = window.SuperMap3D
    initViewer()
  }
  script.onerror = () => {
    isLoading.value = false
    console.error('SuperMap3D 加载失败，请检查 iServer 是否在运行')
  }
  document.head.appendChild(script)
}

/** 2. 初始化 Viewer */
function initViewer() {
  viewer = new Cesium.Viewer('cesiumContainer', {
    animation: false,
    timeline: false,
    fullscreenButton: false,
    homeButton: false,
    geocoder: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    infoBox: false,
    selectionIndicator: false,
  })

  // 使用椭球地形
  viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider()

  // 方法1: 移除所有已有图层
  viewer.imageryLayers.removeAll()
  // 方法2: 遍历移除残留
  while (viewer.imageryLayers.length > 0) {
    viewer.imageryLayers.remove(viewer.imageryLayers.get(0))
  }

  // 天地图影像底图
  const tdtImg = viewer.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: 'http://{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=f8bf399b1e49a8f6a513ff3df0005477',
      subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
      minimumLevel: 1,
      maximumLevel: 18,
    })
  )
  viewer.imageryLayers.lowerToBottom(tdtImg)

  // 天地图注记层
  viewer.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: 'http://{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=f8bf399b1e49a8f6a513ff3df0005477',
      subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
      minimumLevel: 1,
      maximumLevel: 18,
    })
  )

  console.log('底图已添加, 当前图层数:', viewer.imageryLayers.length)

  isLoading.value = false
  loadData()
}

/** 3. 加载 GeoJSON */
async function loadData() {
  try {
    // 建筑
    const bDs = await Cesium.GeoJsonDataSource.load('/data/buildings.geojson', { clampToGround: true })
    viewer.dataSources.add(bDs)
    const bEnts = bDs.entities.values
    buildingEntities = []
    buildingEntColors = []
    for (let i = 0; i < bEnts.length; i++) {
      const e = bEnts[i]
      if (e.polygon) {
        e.polygon.material = Cesium.Color.ORANGE.withAlpha(0.85)
        e.polygon.outline = false
        // 确保描边完全禁用（SuperMap3D 某些版本默认会有半透明描边）
        if (e.polygon.outlineColor) e.polygon.outlineColor = Cesium.Color.TRANSPARENT
        buildingEntities.push(e)
        buildingEntColors.push(Cesium.Color.ORANGE.withAlpha(0.85))
      }
    }

    // 道路
    const rDs = await Cesium.GeoJsonDataSource.load('/data/roads.geojson', { clampToGround: true })
    viewer.dataSources.add(rDs)
    const rEnts = rDs.entities.values
    roadEntities = []
    for (let i = 0; i < rEnts.length; i++) {
      const e = rEnts[i]
      if (e.polyline) {
        e.polyline.width = 3
        e.polyline.material = Cesium.Color.SLATEGRAY
        roadEntities.push(e)
      }
    }

    // 计算包围盒
    const bounds = await fetchBounds('/data/buildings.geojson')
    const pad = 0.005
    floodBounds = {
      west: bounds.west - pad, south: bounds.south - pad,
      east: bounds.east + pad, north: bounds.north + pad,
    }

    // 提取实体中心点，生成模拟地面高程
    buildingCentroids = extractCentroids(buildingEntities, floodBounds)
    roadCentroids = extractCentroids(roadEntities, floodBounds)

    // 创建洪水水面
    waterEntity = createWaterPolygon(floodBounds)

    // 飞入
    flyTo(floodBounds, 3000)
  } catch (e) {
    console.error('数据加载失败:', e)
  }
}

/** 4. 从实体提取中心点，并生成模拟地面高程 */
function extractCentroids(entities, bounds) {
  const result = []
  for (let i = 0; i < entities.length; i++) {
    const center = getEntityCenter(entities[i])
    if (!center) continue
    if (center.lon < bounds.west || center.lon > bounds.east ||
        center.lat < bounds.south || center.lat > bounds.north) continue
    // 根据建筑物在区域内的相对位置生成模拟高程(0~60m)
    // 用经纬度做 hash 让分布自然、不重复
    const dx = (center.lon - bounds.west) / (bounds.east - bounds.west)
    const dy = (center.lat - bounds.south) / (bounds.north - bounds.south)
    // 叠加噪声使地面高低不平：重心低洼区低、边缘高
    const distFromCenter = Math.abs(dx - 0.5) + Math.abs(dy - 0.5)
    const noise = ((center.lon * 37 + center.lat * 53) % 17) / 17 * 15
    const groundHeight = Math.max(0, distFromCenter * 120 + noise - 10)
    result.push({ ...center, groundHeight: Math.round(groundHeight) })
  }
  return result
}

/** 获取实体中心 */
function getEntityCenter(entity) {
  try {
    let positions = null
    if (entity.polygon && entity.polygon.hierarchy) {
      const h = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now())
      positions = h.positions
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

/** 5. 创建洪水水面 Polygon */
function createWaterPolygon(bounds) {
  const positions = [
    Cesium.Cartesian3.fromDegrees(bounds.west, bounds.south, 0),
    Cesium.Cartesian3.fromDegrees(bounds.east, bounds.south, 0),
    Cesium.Cartesian3.fromDegrees(bounds.east, bounds.north, 0),
    Cesium.Cartesian3.fromDegrees(bounds.west, bounds.north, 0),
  ]

  return viewer.entities.add({
    name: '洪水水面',
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(positions),
      material: Cesium.Color.fromAlpha(Cesium.Color.ROYALBLUE, 0.5),
      outline: true,
      outlineColor: Cesium.Color.fromAlpha(Cesium.Color.CYAN, 0.6),
      perPositionHeight: true,
      height: 0,
      extrudedHeight: 0.1,
    },
  })
}

/** 更新水面高度和建筑颜色（优化版——只变更状态切换的实体） */
function updateFloodVisual(height, maxH) {
  // 1. 更新水面高度（轻量操作）
  if (waterEntity && waterEntity.polygon) {
    waterEntity.polygon.extrudedHeight = height
    // 水位越高，水面颜色越深
    const ratio = height / Math.max(maxH, 1)
    const alpha = 0.3 + ratio * 0.4
    waterEntity.polygon.material = Cesium.Color.fromAlpha(
      new Cesium.Color(0.1, 0.3 + ratio * 0.3, 0.9 - ratio * 0.5), alpha
    )
  }

  // 2. 计算当前被淹集合
  const nowSubmergedB = new Set()
  const nowSubmergedR = new Set()
  for (let i = 0; i < buildingCentroids.length; i++) {
    if (buildingCentroids[i].groundHeight <= height) nowSubmergedB.add(i)
  }
  for (let i = 0; i < roadCentroids.length; i++) {
    if (roadCentroids[i].groundHeight <= height) nowSubmergedR.add(i)
  }

  // 3. 只更新状态变化的建筑（新增被淹 vs 刚刚脱淹）
  for (const i of nowSubmergedB) {
    if (!lastSubmergedBuildings.has(i)) {
      const e = buildingEntities[i]
      if (e && e.polygon) e.polygon.material = Cesium.Color.fromAlpha(Cesium.Color.RED, 0.8)
    }
  }
  for (const i of lastSubmergedBuildings) {
    if (!nowSubmergedB.has(i)) {
      const e = buildingEntities[i]
      if (e && e.polygon) e.polygon.material = buildingEntColors[i] || Cesium.Color.ORANGE.withAlpha(0.85)
    }
  }

  // 4. 只更新状态变化的道路
  for (const i of nowSubmergedR) {
    if (!lastSubmergedRoads.has(i)) {
      const e = roadEntities[i]
      if (e && e.polyline) {
        e.polyline.material = Cesium.Color.fromAlpha(Cesium.Color.DARKRED, 0.6)
        e.polyline.width = 2
      }
    }
  }
  for (const i of lastSubmergedRoads) {
    if (!nowSubmergedR.has(i)) {
      const e = roadEntities[i]
      if (e && e.polyline) {
        e.polyline.material = Cesium.Color.SLATEGRAY
        e.polyline.width = 3
      }
    }
  }

  // 5. 更新缓存
  lastSubmergedBuildings = nowSubmergedB
  lastSubmergedRoads = nowSubmergedR
}

/** 重置洪水可视化 */
function resetFloodVisual() {
  // 重置水面
  if (waterEntity && waterEntity.polygon) {
    waterEntity.polygon.extrudedHeight = 0.1
    waterEntity.polygon.material = Cesium.Color.fromAlpha(Cesium.Color.ROYALBLUE, 0.5)
  }
  // 重置建筑颜色
  lastSubmergedBuildings = new Set()
  for (let i = 0; i < buildingEntities.length; i++) {
    const e = buildingEntities[i]
    if (e && e.polygon) {
      e.polygon.material = buildingEntColors[i] || Cesium.Color.ORANGE.withAlpha(0.85)
    }
  }
  // 重置道路颜色
  lastSubmergedRoads = new Set()
  for (let i = 0; i < roadEntities.length; i++) {
    const e = roadEntities[i]
    if (e && e.polyline) {
      e.polyline.material = Cesium.Color.SLATEGRAY
      e.polyline.width = 3
    }
  }
}

/** 统计受淹 */
function countSubmerged(centroids, waterLevel) {
  let submerged = 0
  for (const c of centroids) {
    if (c.groundHeight <= waterLevel) submerged++
  }
  return submerged
}

/** 获取 GeoJSON 包围盒 */
async function fetchBounds(url) {
  const res = await fetch(url)
  const data = await res.json()
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity
  for (const feat of data.features || []) {
    for (const [lng, lat] of extractAllCoords(feat.geometry)) {
      if (lng < west) west = lng
      if (lng > east) east = lng
      if (lat < south) south = lat
      if (lat > north) north = lat
    }
  }
  return { west, south, east, north }
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

/** 飞入视角 */
function flyTo(bounds, height) {
  const clon = (bounds.west + bounds.east) / 2
  const clat = (bounds.south + bounds.north) / 2 - 0.030
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(clon, clat, height),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 },
    duration: 2,
  })
}

// ====== 模拟控制 ======

function startSimulation() {
  if (isSimulating.value) return
  isSimulating.value = true
  isPaused.value = false
  curHeight = 0
  startTs = Date.now()
  stats.simulatedTime = 0
  stats.currentHeight = 0
  runAnimation()
}

function pauseSimulation() {
  isPaused.value = !isPaused.value
  if (!isPaused.value) {
    startTs = Date.now() - stats.simulatedTime * 1000
    runAnimation()
  }
}

function resetSimulation() {
  isSimulating.value = false
  isPaused.value = false
  curHeight = 0
  if (animTimer) { cancelAnimationFrame(animTimer); animTimer = null }
  resetFloodVisual()
  stats.simulatedTime = 0
  stats.currentHeight = 0
  stats.submergedBuildings = 0
  stats.submergedRoads = 0
}

function runAnimation() {
  if (!isSimulating.value || isPaused.value) return

  const elapsed = (Date.now() - startTs) / 1000
  curHeight = Math.min(elapsed * params.speed, params.maxHeight)

  // 更新水面高度和建筑/道路颜色
  updateFloodVisual(curHeight, params.maxHeight)

  // 更新统计
  stats.simulatedTime = elapsed
  stats.currentHeight = curHeight
  stats.submergedBuildings = countSubmerged(buildingCentroids, curHeight)
  stats.submergedRoads = countSubmerged(roadCentroids, curHeight)

  if (curHeight >= params.maxHeight) {
    isSimulating.value = false
    return
  }
  animTimer = requestAnimationFrame(runAnimation)
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
