/**
 * 地图工具函数
 * 提供 iServer 瓦片 URL 生成、GeoJSON 转换、Changchun 平面坐标 ↔ WGS84 坐标转换等功能
 */

/** iServer 服务地址，集中管理以便统一修改 */
export const ISERVER_URL = 'http://localhost:8090'

/** 瓦片图片尺寸（像素） */
export const TILE_SIZE = 256

/**
 * 生成 iServer ZXY 风格瓦片 URL（用于 MapboxGL raster 数据源）
 * @param {string} serviceUrl - iServer 地图服务地址
 * @returns {string} 瓦片 URL 模板，包含 {z}/{x}/{y} 占位符
 */
export function getTileUrl(serviceUrl) {
  return `${serviceUrl}/zxyTileImage.png?z={z}&x={x}&y={y}&width=${TILE_SIZE}&height=${TILE_SIZE}&transparent=true`
}

/**
 * 将 iServer 返回的 feature 数据转换为标准 GeoJSON FeatureCollection
 * iServer 可能返回多种格式：数组、{features: [...]} 或 {recordsets: [{features: {features: [...]}}]}
 * @param {object|array} data - iServer 返回的原始数据
 * @returns {object} 标准 GeoJSON FeatureCollection
 */
export function toGeoJSON(data) {
  if (!data) return { type: 'FeatureCollection', features: [] }

  let features = []
  if (Array.isArray(data)) {
    // 直接是数组格式
    features = data
  } else if (data.features) {
    // 标准 { features: [...] } 格式
    features = data.features
  } else if (data.recordsets) {
    // map service queryResults 响应格式，遍历 recordsets 提取
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
 * 平面坐标来源: RoadNet@Changchun 数据集 datasetInfo.bounds
 * WGS84 对应: 长春市区地理范围
 */
// 平面坐标范围来自 iServer RoadNet@Changchun 数据集的 bounds（47.51 ~ 8958.04, -7668.98 ~ -54.74）。
// 与 NetworkAnalysis 中底图 viewBounds 请求保持一致，确保底图与矢量路网精确对齐。
// 经纬度范围按平面宽高比 (8910.53 : 7614.24 ≈ 1.1705) 构造，以长春中心 (125.3°E, 43.87°N) 为参考点：
//   经度宽 0.30° → 纬度高 0.30° / 1.1705 ≈ 0.2563°，这样 image.png 中的地物与道路线在 Mapbox 画布上等比映射。
const CC = {
  lngMin: 125.15, lngMax: 125.45,
  latMin: 43.74185, latMax: 43.99815,
  xMin: 47.5066, xMax: 8958.0372,
  yMin: -7668.9829, yMax: -54.7406,
}

/**
 * 将 iServer 返回的平面坐标点 {x, y} 转换为 WGS84 经纬度 [lng, lat]
 * 使用线性插值映射（适用于 RoadNet@Changchun 的非标准平面坐标系）
 * @param {number} x - 平面 X 坐标
 * @param {number} y - 平面 Y 坐标
 * @returns {number[]} [经度, 纬度]
 */
export function changchunToWgs84(x, y) {
  const lng = (x - CC.xMin) / (CC.xMax - CC.xMin) * (CC.lngMax - CC.lngMin) + CC.lngMin
  const lat = (y - CC.yMin) / (CC.yMax - CC.yMin) * (CC.latMax - CC.latMin) + CC.latMin
  return [lng, lat]
}

/**
 * 将 WGS84 经纬度 [lng, lat] 转换为 Changchun 平面坐标 [x, y]
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @returns {number[]} [平面X, 平面Y]
 */
export function wgs84ToChangchun(lng, lat) {
  const x = (lng - CC.lngMin) / (CC.lngMax - CC.lngMin) * (CC.xMax - CC.xMin) + CC.xMin
  const y = (lat - CC.latMin) / (CC.latMax - CC.latMin) * (CC.yMax - CC.yMin) + CC.yMin
  return [x, y]
}

/**
 * 将 iServer 几何对象（POINT/LINE/REGION）的 points 数组全部转换为 WGS84 坐标
 * 返回标准的 GeoJSON Geometry 对象
 * @param {object} geometry - iServer 格式的几何对象，包含 type 和 points 字段
 * @returns {object} GeoJSON Geometry 对象
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

/**
 * 将 iServer Server JSON geometry 转为 GeoJSON geometry（不做坐标变换，坐标保持原值）
 * 适用于 WGS84 坐标数据（如 Jingjin 数据源）
 * @param {object} g - Server JSON Geometry，如 {type:"POINT", points:[{x,y}], parts:[n]}
 * @returns {object|null} GeoJSON Geometry 对象
 */
export function serverGeoToGeoJSON(g) {
  if (!g || !g.points) return null
  if (g.type === 'POINT' || g.type === 'NODE') {
    return { type: 'Point', coordinates: [g.points[0].x, g.points[0].y] }
  }
  if (g.type === 'LINE') {
    return { type: 'LineString', coordinates: g.points.map(p => [p.x, p.y]) }
  }
  if (g.type === 'REGION' || g.type === 'POLYGON') {
    if (g.parts && g.parts.length > 1) {
      const rings = []
      let idx = 0
      for (const count of g.parts) {
        rings.push(g.points.slice(idx, idx + count).map(p => [p.x, p.y]))
        idx += count
      }
      return { type: 'Polygon', coordinates: rings }
    }
    return { type: 'Polygon', coordinates: [g.points.map(p => [p.x, p.y])] }
  }
  return null
}

/**
 * 将 GeoJSON Geometry 转为 iServer Server JSON 格式
 * 支持 Point / LineString / Polygon 三种类型
 * @param {object} g - GeoJSON Geometry
 * @returns {object} Server JSON Geometry
 */
export function geoJSONToServerGeo(g) {
  if (!g || !g.type) return null
  if (g.type === 'Point') {
    return { type: 'POINT', points: [{ x: g.coordinates[0], y: g.coordinates[1] }] }
  }
  if (g.type === 'LineString') {
    return { type: 'LINE', points: g.coordinates.map(([x, y]) => ({ x, y })) }
  }
  if (g.type === 'Polygon') {
    const ring = g.coordinates[0]
    return { type: 'REGION', points: ring.map(([x, y]) => ({ x, y })), parts: [ring.length] }
  }
  return g
}

/**
 * 计算两经纬度点之间的近似距离（Haversine 公式）
 * @param {number[]} p1 - [lng, lat]
 * @param {number[]} p2 - [lng, lat]
 * @returns {number} 距离，单位 km
 */
export function calcDistance(p1, p2) {
  if (!p1 || !p2) return 0
  const R = 6371
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180
  const dLon = ((p2[0] - p1[0]) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[1] * Math.PI) / 180) *
      Math.cos((p2[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * 按 parts 数组将 points 列表拆分为多个环（用于 REGION 几何类型）
 * @param {object[]} points - 所有点的数组
 * @param {number[]} parts - 每个环包含的点数
 * @returns {object[][]} 拆分后的二维点数组
 */
function splitParts(points, parts) {
  const result = []
  let idx = 0
  for (const count of parts) {
    result.push(points.slice(idx, idx + count))
    idx += count
  }
  return result
}
