// iServer 服务地址，集中配置
export const ISERVER_URL = 'http://localhost:8090'

// 瓦片尺寸
export const TILE_SIZE = 256

/**
 * 生成 iServer ZXY 瓦片 URL
 */
export function getTileUrl(serviceUrl) {
  return `${serviceUrl}/zxyTileImage.png?z={z}&x={x}&y={y}&width=${TILE_SIZE}&height=${TILE_SIZE}&transparent=true`
}

/**
 * 将 iServer 返回的 feature 转换为标准 GeoJSON FeatureCollection
 * iServer 返回格式: { "features": [{ "geometry": {...}, "properties": {...} }, ...] }
 */
export function toGeoJSON(data) {
  if (!data) return { type: 'FeatureCollection', features: [] }

  let features = []
  if (Array.isArray(data)) {
    features = data
  } else if (data.features) {
    features = data.features
  } else if (data.recordsets) {
    // 从 map service queryResults 响应中提取
    for (const rs of data.recordsets) {
      if (rs.features && rs.features.features) {
        features = features.concat(rs.features.features)
      }
    }
  }

  return {
    type: 'FeatureCollection',
    features: features.map((f) => ({
      type: 'Feature',
      geometry: f.geometry || f.fieldGeometries?.SMGEOMETRY,
      properties: f.properties || {},
    })),
  }
}

/**
 * Changchun 平面坐标 ↔ WGS84 的映射范围
 * 平面坐标源: RoadNet@Changchun 数据集 datasetInfo.bounds
 * WGS84 对应: 长春市区地理范围
 */
const CC = {
  lngMin: 125.1, lngMax: 125.5,
  latMin: 43.7, latMax: 44.0,
  xMin: 47, xMax: 8958,
  yMin: -7669, yMax: -55,
}

/**
 * 将 iServer 返回的平面坐标点 {x, y} 转为 WGS84 [lng, lat]
 */
export function changchunToWgs84(x, y) {
  const lng = (x - CC.xMin) / (CC.xMax - CC.xMin) * (CC.lngMax - CC.lngMin) + CC.lngMin
  const lat = (y - CC.yMin) / (CC.yMax - CC.yMin) * (CC.latMax - CC.latMin) + CC.latMin
  return [lng, lat]
}

/**
 * 将 WGS84 [lng, lat] 转为 Changchun 平面坐标 [x, y]
 */
export function wgs84ToChangchun(lng, lat) {
  const x = (lng - CC.lngMin) / (CC.lngMax - CC.lngMin) * (CC.xMax - CC.xMin) + CC.xMin
  const y = (lat - CC.latMin) / (CC.latMax - CC.latMin) * (CC.yMax - CC.yMin) + CC.yMin
  return [x, y]
}

/**
 * 将 iServer 几何（POINT/LINE/REGION）的 points 数组全部转为 WGS84
 */
export function convertGeometry(geometry) {
  if (!geometry || !geometry.points) return geometry
  const type = geometry.type
  if (type === 'POINT' || type === 'NODE') {
    const [lng, lat] = changchunToWgs84(geometry.points[0].x, geometry.points[0].y)
    return { type: 'Point', coordinates: [lng, lat] }
  }
  if (type === 'LINE') {
    const coords = geometry.points.map(p => changchunToWgs84(p.x, p.y))
    return { type: 'LineString', coordinates: coords }
  }
  if (type === 'REGION' || type === 'POLYGON') {
    const rings = geometry.parts ? splitParts(geometry.points, geometry.parts) : [geometry.points]
    const coords = rings.map(ring => ring.map(p => changchunToWgs84(p.x, p.y)))
    return { type: 'Polygon', coordinates: coords }
  }
  return geometry
}

function splitParts(points, parts) {
  const result = []
  let idx = 0
  for (const count of parts) {
    result.push(points.slice(idx, idx + count))
    idx += count
  }
  return result
}
