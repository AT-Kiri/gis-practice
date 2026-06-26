<template>
  <!-- 纯逻辑组件：通过 map 实例渲染分级圆点标记 -->
  <div />
</template>

<script setup>
/**
 * 数据大屏 - 分级地图交互组件
 * 使用 COUNTY_COORDS 点标记 + 灾害等级着色，不依赖 iServer
 * @prop {Object} map - MapboxGL 地图实例
 * @prop {Object} disasterData - 各县灾害数据
 */
import { onMounted, onUnmounted } from 'vue'
import { COUNTY_COORDS } from '@/utils/mockData.js'

const props = defineProps({
  map: { type: Object, required: true },
  disasterData: { type: Object, required: true },
})

const emit = defineEmits(['select-county'])

// 灾害等级对应颜色
const LEVEL_COLORS = {
  1: '#52c41a',
  2: '#fadb14',
  3: '#fa8c16',
  4: '#f5222d',
  5: '#a8071a',
}

let tooltipEl = null
let initialized = false

/**
 * 初始化分级点标记图层
 */
function initLayers(map, data) {
  if (initialized) {
    console.log('[DashboardMap] 已初始化，跳过')
    return
  }
  initialized = true
  console.log('[DashboardMap] 开始初始化图层')

  const features = []
  Object.entries(COUNTY_COORDS).forEach(([name, coords]) => {
    const countyData = data[name]
    if (!countyData) return
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coords },
      properties: {
        countyName: name,
        disasterLevel: countyData.disasterLevel || 1,
        disasterType: countyData.disasterType || '无',
        requiredRescueType: countyData.requiredRescueType || '—',
        description: countyData.description || '',
        affectedPeople: countyData.affectedPeople || 0,
        rescuePersonnel: countyData.rescuePersonnel || 0,
      },
    })
  })

  const geojson = { type: 'FeatureCollection', features }
  console.log('[DashboardMap] 生成', features.length, '个县区要素')

  // 清理旧图层（如果存在）
  try {
    if (map.getSource('dashboard-counties')) {
      ;['county-dot', 'county-label'].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id)
      })
      map.removeSource('dashboard-counties')
    }
  } catch (e) { /* ignore */ }

  map.addSource('dashboard-counties', { type: 'geojson', data: geojson })

  // 底图圆点（默认无边框，点中时动态添加白色描边作为高亮）
  map.addLayer({
    id: 'county-dot',
    type: 'circle',
    source: 'dashboard-counties',
    paint: {
      'circle-radius': ['step', ['to-number', ['get', 'disasterLevel']],
        8, 1, 8, 2, 10, 3, 12, 4, 14, 5, 16],
      'circle-color': ['step', ['to-number', ['get', 'disasterLevel']],
        LEVEL_COLORS[1],
        1, LEVEL_COLORS[1], 2, LEVEL_COLORS[2],
        3, LEVEL_COLORS[3], 4, LEVEL_COLORS[4], 5, LEVEL_COLORS[5]],
      'circle-opacity': 0.9,
      // 默认无描边，点击后通过动态修改来显示高亮
      'circle-stroke-width': 0,
      'circle-stroke-color': '#fff',
    },
  })

  // 名称标注
  map.addLayer({
    id: 'county-label',
    type: 'symbol',
    source: 'dashboard-counties',
    layout: {
      'text-field': ['get', 'countyName'],
      'text-size': 11,
      'text-offset': [0, 1.8],
      'text-optional': true,
    },
    paint: {
      'text-color': '#333',
      'text-halo-color': '#fff',
      'text-halo-width': 2,
    },
  })

  console.log('[DashboardMap] 图层添加完成')
  registerInteractions(map)
}

onMounted(() => {
  const { map, disasterData } = props
  if (!map || !disasterData || Object.keys(disasterData).length === 0) {
    console.warn('[DashboardMap] 缺少必要 props', { map: !!map, data: !!disasterData })
    return
  }

  console.log('[DashboardMap] mounted，map.isStyleLoaded():', map.isStyleLoaded?.())

  if (map.isStyleLoaded && map.isStyleLoaded()) {
    initLayers(map, disasterData)
  } else {
    map.once('style.load', () => {
      console.log('[DashboardMap] style.load 触发')
      initLayers(map, disasterData)
    })
  }
})

/**
 * 注册鼠标交互事件
 */
function registerInteractions(map) {
  tooltipEl = document.createElement('div')
  tooltipEl.className = 'dashboard-tooltip'
  tooltipEl.style.cssText = `
    display: none; position: fixed; z-index: 30;
    background: rgba(0,0,0,0.85); color: #fff;
    padding: 8px 12px; border-radius: 6px;
    font-size: 12px; line-height: 1.5;
    pointer-events: none; max-width: 260px;
    border: 1px solid rgba(255,255,255,0.1);
  `
  document.body.appendChild(tooltipEl)

  const targetLayer = 'county-dot'

  map.on('mouseenter', targetLayer, (e) => {
    map.getCanvas().style.cursor = 'pointer'
    const p = e.features[0].properties
    tooltipEl.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;">${p.countyName || ''}</div>
      <div>灾害类型：${p.disasterType || '无'} ｜ 等级：${p.disasterLevel}</div>
      <div>救援人员：${p.rescuePersonnel || 0} 人</div>
      <div style="color:rgba(255,255,255,0.6);font-size:11px;margin-top:2px;">${p.description || ''}</div>
    `
    tooltipEl.style.display = 'block'
  })

  map.on('mousemove', targetLayer, (e) => {
    tooltipEl.style.left = `${e.originalEvent.clientX + 14}px`
    tooltipEl.style.top = `${e.originalEvent.clientY - 10}px`
  })

  map.on('mouseleave', targetLayer, () => {
    map.getCanvas().style.cursor = ''
    tooltipEl.style.display = 'none'
  })

  // 总览视角参数
  const OVERVIEW_CENTER = [116.4, 39.9]
  const OVERVIEW_ZOOM = 7
  let selectedCounty = null

  // click 选中县区：聚焦放大 + 仅显示该圆点
  map.on('click', targetLayer, (e) => {
    const p = e.features[0].properties
    const name = p.countyName
    if (!name) return
    selectedCounty = name

    // 只显示选中的圆点 + 白色高亮描边
    map.setPaintProperty(targetLayer, 'circle-stroke-width', 3.5)
    map.setFilter(targetLayer, ['==', ['get', 'countyName'], name])

    // 视角聚焦到该县区
    const coords = e.features[0].geometry.coordinates
    map.flyTo({
      center: coords,
      zoom: 10,
      duration: 1200,
    })

    emit('select-county', name)
  })

  // 点击空白 → 取消选中 + 回到总览
  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [targetLayer] })
    if (features.length === 0 && selectedCounty) {
      selectedCounty = null
      map.setPaintProperty(targetLayer, 'circle-stroke-width', 0)
      map.setFilter(targetLayer, null)

      // 视角回到京津冀总览
      map.flyTo({
        center: OVERVIEW_CENTER,
        zoom: OVERVIEW_ZOOM,
        duration: 1200,
      })

      emit('select-county', null)
    }
  })
}

onUnmounted(() => {
  if (tooltipEl && tooltipEl.parentNode) {
    tooltipEl.parentNode.removeChild(tooltipEl)
  }
  const map = props.map
  if (map) {
    try {
      ;['county-dot', 'county-label'].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id)
      })
      if (map.getSource('dashboard-counties')) map.removeSource('dashboard-counties')
    } catch (e) { /* ignore */ }
  }
})
</script>

<style>
.dashboard-tooltip {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
