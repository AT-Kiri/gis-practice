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

/** 模拟数据样式（_mock=true 的要素使用紫灰色 + 虚线区分） */
const MOCK_COLORS = {
  point: '#94a3b8',     // slate-400
  line: '#a78bfa',      // violet-400
  fill: '#cbd5e1',      // slate-300
  fillOpacity: 0.10,
  lineOpacity: 0.75,
  pointRadius: 6,
  lineWidth: 2,
  lineDashArray: [2, 2],
}

/** 双缓冲区配色（dual_buffer_analysis 工具专用，按 _bufferRole 区分）
 * inner 用深橙（受灾圈，危险），outer 用淡黄（支援圈，警戒），颜色差明显
 * 避免与受灾中心点（红色）混淆
 */
const BUFFER_COLORS = {
  inner: {  // 受灾圈（小），深橙色，在上层
    fill: '#ea580c',     // orange-600
    outline: '#9a3412',  // orange-800
    fillOpacity: 0.50,
  },
  outer: {  // 支援圈（大），淡黄色，在下层
    fill: '#fde68a',     // amber-200
    outline: '#f59e0b',  // amber-500
    fillOpacity: 0.20,
  },
}

/** 受灾中心点配色（_role='disaster_center' 的 Point 用红色突出，与 spatial_query 普通点区分） */
const DISASTER_CENTER_COLOR = '#ef4444'      // red-500
const DISASTER_CENTER_STROKE = '#7f1d1d'     // red-900

/** 已添加的 Agent 结果图层 ID 列表 */
const addedLayerIds = []
/** 已添加的 Agent 结果 Source ID 列表 */
const addedSourceIds = []
/** 已注册的图层交互处理器，清理时需解绑 */
const layerHandlers = []
/** 当前弹窗实例 */
let popup = null
/** 受灾中心点图层 ID（_role='disaster_center' 所在的 circle layer）
 * 后续点图层 addLayer 时以此为 beforeId，确保受灾中心点始终在所有点图层之上，
 * 不会被后续 spatial_query 返回的点要素盖住红色填充 */
let disasterCenterPointLayerId = null

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
  // 模拟数据标题加 [模拟] 标记，使用紫灰色区分
  const isMock = props._mock === true
  const titlePrefix = isMock
    ? '<span style="color:#a78bfa;font-size:11px;border:1px solid #a78bfa;padding:0 4px;border-radius:3px;margin-right:4px;">模拟</span>'
    : ''
  html += `<div style="font-weight:bold;margin-bottom:6px;">${titlePrefix}${props._displayName || '要素'}</div>`
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
 * 为单个缓冲区角色（inner/outer）创建独立的 source + fill + outline 图层
 * 双缓冲区场景专用：通过拆分独立图层确保 inner 一定盖在 outer 之上，
 * 点击重叠区域优先命中 inner layer（Mapbox hit-testing 从上层开始）
 * @param {Object} map - MapboxGL 地图实例
 * @param {string} sourceId - 数据源 ID（已含角色后缀，如 agent-xxx-inner）
 * @param {Array} features - 该角色的 Polygon features
 * @param {Object} colors - 配色 { fill, outline, fillOpacity }
 * @param {string|undefined} beforeId - 插入到该图层之前（z 顺序控制）
 * @param {boolean} [skipClickHandler=false] - 跳过默认 click handler（dual_buffer 的 outer 用智能 handler）
 * @returns {{fillId: string, outlineId: string}} 创建的图层 ID
 */
function _addSingleBufferLayerSet(map, sourceId, features, colors, beforeId, skipClickHandler = false) {
  map.addSource(sourceId, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
  })
  addedSourceIds.push(sourceId)

  const fillId = `${sourceId}-fill`
  map.addLayer({
    id: fillId,
    type: 'fill',
    source: sourceId,
    paint: {
      'fill-color': colors.fill,
      'fill-opacity': colors.fillOpacity,
    },
  }, beforeId)
  addedLayerIds.push(fillId)
  if (!skipClickHandler) {
    attachLayerInteractions(map, fillId)
  }

  const outlineId = `${sourceId}-outline`
  map.addLayer({
    id: outlineId,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': colors.outline,
      'line-width': AGENT_COLORS.lineWidth,
      'line-opacity': AGENT_COLORS.lineOpacity,
    },
  }, beforeId)
  addedLayerIds.push(outlineId)

  return { fillId, outlineId }
}

/**
 * 双缓冲区 outer-fill 的智能 click handler：
 * 点击 outer 时先查询 inner 是否有要素在此位置，有则跳过（让 inner 的 handler 显示 popup），
 * 无则显示 outer 的 popup。
 *
 * 解决问题：Mapbox 反向触发 layer click 事件（后注册的先触发），导致 outer-fill 的 handler
 * 在 inner-fill 之后触发，覆盖了 inner 的 popup。outer 改用智能 handler 后，
 * 重叠区域由 inner 接管，outer-only 环带区域仍显示 outer 信息。
 * @param {Object} map - MapboxGL 地图实例
 * @param {string} outerLayerId - outer fill 图层 ID
 * @param {string} innerLayerId - inner fill 图层 ID
 */
function _attachOuterBufferClickHandler(map, outerLayerId, innerLayerId) {
  const onClick = (e) => {
    // 检查 inner 是否有要素在此位置（点击的是重叠区域，让 inner 接管）
    const innerFeatures = map.queryRenderedFeatures(e.point, { layers: [innerLayerId] })
    if (innerFeatures.length > 0) return
    if (!e.features || !e.features.length) return
    const f = e.features[0]
    const lngLat = e.lngLat ? [e.lngLat.lng, e.lngLat.lat] : (f.geometry?.coordinates || [0, 0])
    showFeaturePopup(lngLat, f.properties || {})
  }
  const onEnter = () => { map.getCanvas().style.cursor = 'pointer' }
  const onLeave = () => { map.getCanvas().style.cursor = '' }
  map.on('click', outerLayerId, onClick)
  map.on('mouseenter', outerLayerId, onEnter)
  map.on('mouseleave', outerLayerId, onLeave)
  layerHandlers.push({ layerId: outerLayerId, onClick, onEnter, onLeave })
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
    const isDualBuffer = toolName === 'dual_buffer_analysis'
    // 显式 z 控制：把面层插在第一个现有 agent 点图层之前（保证点要素永远在面之上可见）
    const firstAgentPointLayer = addedLayerIds.find(id => id.endsWith('-point'))
    const beforeId = firstAgentPointLayer || undefined

    if (isDualBuffer) {
      // 双缓冲区：拆成两个独立 source + layer
      // 关键：先 addLayer outer（在下层），再 addLayer inner（在上层）
      // 这样 inner 一定盖在 outer 上面，点击重叠区域优先命中 inner（悬浮窗显示受灾圈信息）
      // outer 跳过默认 click handler，改用智能 handler：点击 outer 时先查 inner 是否有要素，
      // 有则跳过（让 inner 接管），无则显示 outer popup。
      // 解决 Mapbox 反向触发 click 事件导致 outer 覆盖 inner popup 的问题
      const outerFeatures = features.filter(f => f.properties?._bufferRole === 'outer')
      const innerFeatures = features.filter(f => f.properties?._bufferRole === 'inner')
      let outerLayerIds = null
      let innerLayerIds = null
      if (outerFeatures.length) {
        outerLayerIds = _addSingleBufferLayerSet(
          map, `${sourceId}-outer`, outerFeatures, BUFFER_COLORS.outer, beforeId, true
        )
      }
      if (innerFeatures.length) {
        innerLayerIds = _addSingleBufferLayerSet(
          map, `${sourceId}-inner`, innerFeatures, BUFFER_COLORS.inner, beforeId, false
        )
      }
      // outer 用智能 click handler（重叠区域让 inner 接管）
      if (outerLayerIds && innerLayerIds) {
        _attachOuterBufferClickHandler(map, outerLayerIds.fillId, innerLayerIds.fillId)
      } else if (outerLayerIds) {
        // 只有 outer（无 inner），直接 attach 默认 handler
        attachLayerInteractions(map, outerLayerIds.fillId)
      }
    } else {
      // 普通面层：单 source + fill + outline，_mock 用紫灰色，否则用主题色
      const fillId = `${sourceId}-fill`
      map.addLayer({
        id: fillId,
        type: 'fill',
        source: sourceId,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': ['case', ['==', ['get', '_mock'], true], MOCK_COLORS.fill, AGENT_COLORS.fill],
          'fill-opacity': ['case', ['==', ['get', '_mock'], true], MOCK_COLORS.fillOpacity, AGENT_COLORS.fillOpacity],
        },
      }, beforeId)
      addedLayerIds.push(fillId)
      attachLayerInteractions(map, fillId)

      const outlineId = `${sourceId}-outline`
      map.addLayer({
        id: outlineId,
        type: 'line',
        source: sourceId,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'line-color': ['case', ['==', ['get', '_mock'], true], MOCK_COLORS.line, AGENT_COLORS.line],
          'line-width': AGENT_COLORS.lineWidth,
          'line-opacity': AGENT_COLORS.lineOpacity,
        },
      }, beforeId)
      addedLayerIds.push(outlineId)
    }
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
        // isPath(最短路径)用红色，_mock 用紫灰色，其他用主题色
        'line-color': [
          'case',
          ['==', ['get', '_mock'], true], MOCK_COLORS.line,
          isPath ? '#ef4444' : AGENT_COLORS.line,
        ],
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
    // 检查是否含受灾中心点（_role='disaster_center'）
    const hasDisasterCenter = features.some(f => f.properties?._role === 'disaster_center')
    // z 顺序控制：后续点图层插入到受灾中心点图层之前（确保受灾中心点始终在顶层，
    // 不会被后续 spatial_query 返回的点要素盖住红色填充）
    const pointBeforeId = (!hasDisasterCenter && disasterCenterPointLayerId) || undefined

    map.addLayer({
      id: pointId,
      type: 'circle',
      source: sourceId,
      filter: ['==', '$type', 'Point'],
      paint: {
        // 受灾中心点(_role='disaster_center')用红色突出，与 spatial_query 普通点(琥珀色)区分
        'circle-radius': [
          'case',
          ['==', ['get', '_role'], 'disaster_center'], 10,  // 受灾中心更大，确保视觉突出
          ['==', ['get', '_mock'], true], MOCK_COLORS.pointRadius,
          AGENT_COLORS.pointRadius,
        ],
        'circle-color': [
          'case',
          ['==', ['get', '_role'], 'disaster_center'], DISASTER_CENTER_COLOR,
          ['==', ['get', '_mock'], true], MOCK_COLORS.point,
          AGENT_COLORS.point,
        ],
        'circle-stroke-color': [
          'case',
          ['==', ['get', '_role'], 'disaster_center'], DISASTER_CENTER_STROKE,
          ['==', ['get', '_mock'], true], MOCK_COLORS.line,
          '#fff',
        ],
        'circle-stroke-width': 2,
        'circle-opacity': 0.9,
      },
    }, pointBeforeId)
    addedLayerIds.push(pointId)
    attachLayerInteractions(map, pointId)

    // 记录受灾中心点图层 ID，后续点图层会插入到它之前（保持在顶层）
    if (hasDisasterCenter) {
      disasterCenterPointLayerId = pointId
    }

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
  disasterCenterPointLayerId = null
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
