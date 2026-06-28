/**
 * Agent 结果地图渲染器
 * 将 Agent 工具返回的 GeoJSON 自动渲染到地图上
 * 使用橙色系配色，与用户手动操作结果区分
 */
import mapboxgl from 'mapbox-gl'
import { useMapStore } from '../../stores/map'
import { ensureChangchunBasemap } from './changchunBasemap'

/** Agent 结果主题色系 */
const AGENT_COLORS = {
  point: '#f59e0b',     // 琥珀色
  line: '#fb923c',      // 橙色
  fill: '#fbbf24',      // 金色
  fillOpacity: 0.15,
  lineOpacity: 0.9,
  pointRadius: 7,
  lineWidth: 3,
}

/** 已添加的 Agent 结果图层 ID 列表 */
const addedLayerIds = []
/** 已添加的 Agent 结果 Source ID 列表 */
const addedSourceIds = []
/** 已注册的图层交互处理器，清理时需解绑 */
const layerHandlers = []
/** 当前弹窗实例 */
let popup = null

/**
 * 显示要素属性弹窗
 * @param {number[]} lngLat - [lng, lat] 弹窗锚点
 * @param {Object} props - 要素属性
 */
function showFeaturePopup(lngLat, props) {
  const mapStore = useMapStore()
  const map = mapStore.mapInstance
  if (!map) return
  if (popup) popup.remove()

  let html = '<div style="max-height:280px;overflow-y:auto;font-size:12px;">'
  html += `<div style="font-weight:bold;margin-bottom:6px;">${props._displayName || '要素'}</div>`
  html += '<table style="width:100%;border-collapse:collapse;">'
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('_')) continue
    html += `<tr><td style="padding:2px 6px;color:#666;border-bottom:1px solid #f0f0f0;">${k}</td>
               <td style="padding:2px 6px;border-bottom:1px solid #f0f0f0;">${v != null ? v : '-'}</td></tr>`
  }
  html += '</table></div>'

  popup = new mapboxgl.Popup({ closeOnClick: true, maxWidth: '320px' })
    .setLngLat(lngLat)
    .setHTML(html)
    .addTo(map)
}

/**
 * 为图层绑定点击/悬停交互
 * @param {Object} map - MapboxGL 地图实例
 * @param {string} layerId - 图层 ID
 */
function attachLayerInteractions(map, layerId) {
  const onClick = (e) => {
    if (!e.features || !e.features.length) return
    const f = e.features[0]
    const lngLat = e.lngLat ? [e.lngLat.lng, e.lngLat.lat] : (f.geometry?.coordinates || [0, 0])
    showFeaturePopup(lngLat, f.properties || {})
  }
  const onEnter = () => { map.getCanvas().style.cursor = 'pointer' }
  const onLeave = () => { map.getCanvas().style.cursor = '' }

  map.on('click', layerId, onClick)
  map.on('mouseenter', layerId, onEnter)
  map.on('mouseleave', layerId, onLeave)
  layerHandlers.push({ layerId, onClick, onEnter, onLeave })
}

/**
 * 将 Agent 工具返回的 GeoJSON 渲染到地图上
 * @param {string} toolName - 工具名称
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @param {Object} [options] - 额外选项
 * @param {boolean} [options.fitBounds=true] - 是否自动缩放到结果范围
 */
export function renderAgentResult(toolName, geojson, options = {}) {
  const mapStore = useMapStore()
  const map = mapStore.mapInstance
  if (!map || !geojson || !geojson.features || geojson.features.length === 0) return

  const { fitBounds = true } = options
  const timestamp = Date.now()
  const sourceId = `agent-${toolName}-${timestamp}`
  const isPath = toolName === 'shortest_path'
  const isArea = toolName === 'buffer_analysis' || toolName === 'overlay_analysis' || toolName === 'service_area'

  // 长春路网工具（最短路径/服务区）需要先加载长春底图，否则路径画在京津冀底图上
  if (toolName === 'shortest_path' || toolName === 'service_area') {
    ensureChangchunBasemap(map)
  }

  // 添加数据源
  map.addSource(sourceId, { type: 'geojson', data: geojson })
  addedSourceIds.push(sourceId)

  // 根据几何类型添加图层
  const features = geojson.features
  const hasPoint = features.some(f => f.geometry?.type === 'Point')
  const hasLine = features.some(f => f.geometry?.type === 'LineString')
  const hasPolygon = features.some(f => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')

  // 面图层
  if (hasPolygon) {
    const fillId = `${sourceId}-fill`
    map.addLayer({
      id: fillId,
      type: 'fill',
      source: sourceId,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': AGENT_COLORS.fill,
        'fill-opacity': AGENT_COLORS.fillOpacity,
      },
    })
    addedLayerIds.push(fillId)
    attachLayerInteractions(map, fillId)

    const outlineId = `${sourceId}-outline`
    map.addLayer({
      id: outlineId,
      type: 'line',
      source: sourceId,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'line-color': AGENT_COLORS.line,
        'line-width': AGENT_COLORS.lineWidth,
        'line-opacity': AGENT_COLORS.lineOpacity,
      },
    })
    addedLayerIds.push(outlineId)
  }

  // 线图层
  if (hasLine) {
    const lineId = `${sourceId}-line`
    map.addLayer({
      id: lineId,
      type: 'line',
      source: sourceId,
      filter: ['==', '$type', 'LineString'],
      paint: {
        'line-color': isPath ? '#ef4444' : AGENT_COLORS.line,
        'line-width': isPath ? 4 : AGENT_COLORS.lineWidth,
        'line-opacity': AGENT_COLORS.lineOpacity,
      },
    })
    addedLayerIds.push(lineId)
    attachLayerInteractions(map, lineId)
  }

  // 点图层
  if (hasPoint) {
    const pointId = `${sourceId}-point`
    map.addLayer({
      id: pointId,
      type: 'circle',
      source: sourceId,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': AGENT_COLORS.pointRadius,
        'circle-color': AGENT_COLORS.point,
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2,
        'circle-opacity': 0.9,
      },
    })
    addedLayerIds.push(pointId)
    attachLayerInteractions(map, pointId)

    // 点标签
    const labelId = `${sourceId}-label`
    map.addLayer({
      id: labelId,
      type: 'symbol',
      source: sourceId,
      filter: ['==', '$type', 'Point'],
      layout: {
        'text-field': ['get', '_displayName'],
        'text-size': 12,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#b45309',
        'text-halo-color': '#fff',
        'text-halo-width': 2,
      },
    })
    addedLayerIds.push(labelId)
  }

  // 自动缩放到结果范围
  if (fitBounds) {
    fitToResult(geojson)
  }

  return sourceId
}

/**
 * 缩放地图到 GeoJSON 结果范围
 * 点要素使用 flyTo 定位（zoom 11），线/面要素使用 fitBounds
 */
export function fitToResult(geojson) {
  const mapStore = useMapStore()
  const map = mapStore.mapInstance
  if (!map || !geojson) return

  const features = geojson.features || []
  // 全部为点要素时按点定位，否则按范围缩放
  const allPoints = features.length > 0 && features.every(f => f.geometry?.type === 'Point')

  if (allPoints) {
    // 与 FeatureSearch.vue 的 doFlyTo 行为一致：zoom 取 max(当前zoom, 11)
    const first = features[0].geometry.coordinates
    map.flyTo({
      center: [first[0], first[1]],
      zoom: Math.max(map.getZoom(), 11),
      duration: 1000,
    })
    return
  }

  // 计算所有坐标的边界
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity

  function processCoords(coords) {
    if (typeof coords[0] === 'number') {
      minLng = Math.min(minLng, coords[0])
      maxLng = Math.max(maxLng, coords[0])
      minLat = Math.min(minLat, coords[1])
      maxLat = Math.max(maxLat, coords[1])
    } else {
      for (const c of coords) processCoords(c)
    }
  }

  for (const feature of features) {
    if (feature.geometry?.coordinates) {
      processCoords(feature.geometry.coordinates)
    }
  }

  if (minLng !== Infinity) {
    map.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding: 50, duration: 1000, maxZoom: 14 }
    )
  }
}

/**
 * 清除所有 Agent 结果图层
 */
export function clearAllAgentResults() {
  const mapStore = useMapStore()
  const map = mapStore.mapInstance
  if (!map) return

  // 关闭弹窗
  if (popup) { popup.remove(); popup = null }

  // 解绑事件处理器
  for (const { layerId, onClick, onEnter, onLeave } of layerHandlers) {
    if (map.getLayer(layerId)) {
      map.off('click', layerId, onClick)
      map.off('mouseenter', layerId, onEnter)
      map.off('mouseleave', layerId, onLeave)
    }
  }
  layerHandlers.length = 0

  // 先移除图层，再移除数据源
  for (const layerId of addedLayerIds) {
    if (map.getLayer(layerId)) map.removeLayer(layerId)
  }
  for (const sourceId of addedSourceIds) {
    if (map.getSource(sourceId)) map.removeSource(sourceId)
  }

  addedLayerIds.length = 0
  addedSourceIds.length = 0
}

/**
 * 飞行定位到指定坐标
 * @param {number[]} center - [lng, lat]
 * @param {number} [zoom=11] - 缩放级别
 */
export function flyToLocation(center, zoom = 11) {
  const mapStore = useMapStore()
  const map = mapStore.mapInstance
  if (!map || !center) return
  map.flyTo({ center, zoom, duration: 1500 })
}
