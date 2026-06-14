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
const CC = {
  lngMin: 125.1, lngMax: 125.5,
  latMin: 43.7, latMax: 44.0,
  xMin: 47, xMax: 8958,
  yMin: -7669, yMax: -55,
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
