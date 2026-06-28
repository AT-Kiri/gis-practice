/**
 * 长春市底图加载器（可复用）
 *
 * 从 NetworkAnalysis.vue 抽取的长春底图加载逻辑，供 Agent 渲染器和网络分析组件共用。
 * 当 Agent 执行 shortest_path / service_area 时，结果坐标在长春市范围内，
 * 需要先加载长春底图（栅格图 + 矢量路网），否则路径会画在京津冀底图上。
 *
 * 图层层级（从下到上）：
 *   na-bg-image  → 长春市区栅格底图（iServer image.png）
 *   na-road-line  → 矢量路网（RoadNet@Changchun，灰色细线）
 *   agent-xxx     → Agent 渲染的结果图层（由 mapRenderer 添加）
 */
import { useMapStore } from '../../stores/map'
import { changchunToWgs84, convertGeometry } from '../map'
import { QueryService } from '@supermap/iclient-mapboxgl'
import { DataFormat } from '@supermap/iclient-common/REST'
import { QueryBySQLParameters } from '@supermap/iclient-common/iServer/QueryBySQLParameters'

const ISERVER_URL = 'http://localhost:8090'
const MAP_NAME = encodeURIComponent('长春市区图')

const NA_BG_IMAGE = 'na-bg-image'
const NA_ROAD_SRC = 'na-road'
const NA_ROAD_LINE = 'na-road-line'

/**
 * 确保长春底图已加载：若未加载则添加栅格底图 + 矢量路网，并隐藏京津冀底图。
 * 已加载则跳过（幂等）。同步返回，路网数据异步加载。
 *
 * @param {Object} [map] - MapboxGL 地图实例，不传则从 store 获取
 * @returns {boolean} 是否执行了加载（false 表示已加载过）
 */
export function ensureChangchunBasemap(map) {
  if (!map) {
    const store = useMapStore()
    map = store.mapInstance
  }
  if (!map) return false

  // 已加载则跳过
  if (map.getSource(NA_BG_IMAGE)) return false

  // 隐藏世界底图和京津冀图层
  ;['world-layer', 'jingjin-layer'].forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none')
  })

  // 找到第一个 agent 图层，将长春底图插入到其下方，避免覆盖已渲染的 agent 结果（如起终点圆点）
  const firstAgentLayer = map.getStyle().layers.find(l => l.id.startsWith('agent-'))
  const beforeId = firstAgentLayer ? firstAgentLayer.id : undefined

  // 1. 先添加矢量路网图层（空数据，后续异步填充），插入到 agent 图层下方
  if (!map.getSource(NA_ROAD_SRC)) {
    map.addSource(NA_ROAD_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
    map.addLayer({
      id: NA_ROAD_LINE,
      source: NA_ROAD_SRC,
      type: 'line',
      paint: { 'line-color': '#888', 'line-width': 1, 'line-opacity': 0.6 },
    }, beforeId)
  }

  // 2. 添加栅格底图（插入到路网图层下方）
  loadChangchunTile(map)

  // 3. 异步加载矢量路网数据（不阻塞渲染）
  loadRoadNetwork(map)

  return true
}

/**
 * 判断长春底图是否已加载
 */
export function isChangchunBasemapLoaded(map) {
  if (!map) {
    const store = useMapStore()
    map = store.mapInstance
  }
  return !!(map && map.getSource(NA_BG_IMAGE))
}

/**
 * 加载长春市区图作为底图背景
 * 使用 iServer image.png + viewBounds 显式指定平面坐标范围，
 * 四角映射到 WGS84，确保与矢量路网对齐。
 */
function loadChangchunTile(map) {
  // 平面坐标范围：与 utils/map.js 中 CC 保持一致
  const xMin = 47.5066, xMax = 8958.0372
  const yMin = -7668.9829, yMax = -54.7406
  const basePx = 4096

  const dx = xMax - xMin
  const dy = yMax - yMin
  const imgW = Math.round(basePx)
  const imgH = Math.round(basePx * dy / dx)

  const vb = encodeURIComponent(JSON.stringify({
    leftBottom: { x: xMin, y: yMin },
    rightTop: { x: xMax, y: yMax },
  }))
  const url = `${ISERVER_URL}/iserver/services/map-changchun/rest/maps/${MAP_NAME}/image.png`
    + `?width=${imgW}&height=${imgH}&viewBounds=${vb}&transparent=false&cacheEnabled=false`

  // 四角坐标（NW → NE → SE → SW）
  const nw = changchunToWgs84(xMin, yMax)
  const ne = changchunToWgs84(xMax, yMax)
  const se = changchunToWgs84(xMax, yMin)
  const sw = changchunToWgs84(xMin, yMin)
  const coords = [[nw[0], nw[1]], [ne[0], ne[1]], [se[0], se[1]], [sw[0], sw[1]]]

  map.addSource(NA_BG_IMAGE, { type: 'image', url, coordinates: coords })
  map.addLayer({
    id: NA_BG_IMAGE,
    type: 'raster',
    source: NA_BG_IMAGE,
    paint: {
      'raster-opacity': 1,
      'raster-brightness-min': 0,
      'raster-brightness-max': 1,
    },
  }, NA_ROAD_LINE) // 插入到路网图层下方

  // 更新图层管理器
  const store = useMapStore()
  store.addLayer({ id: NA_BG_IMAGE, name: '长春市区底图', visible: true, opacity: 1 })
}

/**
 * 通过 SuperMap SDK 加载 RoadNet 矢量路网数据
 * 坐标为长春平面坐标，需转为 WGS84
 */
async function loadRoadNetwork(map) {
  try {
    const url = `/iserver/services/map-changchun/rest/maps/${MAP_NAME}`
    const data = await queryBySQLAsync(url, {
      queryParams: [
        { name: 'RoadNet@Changchun@@长春市区图', attributeFilter: '' },
      ],
      returnAttribute: true,
      returnGeometry: true,
      expectCount: 2000,
    })

    let rawFeatures = []
    if (data.recordsets) {
      for (const rs of data.recordsets) {
        if (rs.features?.features) {
          rawFeatures = rawFeatures.concat(rs.features.features)
        }
      }
    }
    if (!rawFeatures.length) return

    const features = rawFeatures.map(f => {
      const rawGeo = f.geometry || f.fieldGeometries?.SMGEOMETRY
      if (!rawGeo) return null
      let geo
      if (rawGeo.type === 'LineString' && rawGeo.coordinates) {
        geo = {
          type: 'LineString',
          coordinates: rawGeo.coordinates.map(([x, y]) => changchunToWgs84(x, y)),
        }
      } else {
        geo = convertGeometry(rawGeo)
      }
      if (!geo || geo.type !== 'LineString') return null
      return { type: 'Feature', geometry: geo, properties: { name: (f.fieldValues?.length > 6 && f.fieldValues[6]) || '' } }
    }).filter(Boolean)

    if (map.getSource(NA_ROAD_SRC)) {
      map.getSource(NA_ROAD_SRC).setData({ type: 'FeatureCollection', features })
    }
  } catch (e) {
    console.warn('[长春底图] 路网加载失败:', e)
  }
}

/** SQL 查询 Promise 包装 */
function queryBySQLAsync(url, params) {
  return new Promise((resolve, reject) => {
    try {
      new QueryService(url).queryBySQL(
        new QueryBySQLParameters(params),
        (response) => {
          if (response.type === 'processFailed' || response.error) {
            reject(new Error(response.error?.error || response.error || '查询失败'))
          } else {
            resolve(response.result)
          }
        },
        DataFormat.GEOJSON,
      )
    } catch (e) {
      reject(e)
    }
  })
}
