/**
 * 圆形 GeoJSON Polygon 生成工具
 *
 * 用途：根据中心点 + 半径生成 64 边近似的圆形 Polygon
 *      用于双缓冲区图层渲染（内圈/外圈）
 *
 * 算法依据：球面.destination 公式
 *   φ2 = asin(sin(φ1)·cos(δ) + cos(φ1)·sin(δ)·cos(θ))
 *   λ2 = λ1 + atan2(sin(θ)·sin(δ)·cos(φ1), cos(δ) − sin(φ1)·sin(φ2))
 *   其中 δ = radius / R（角距离），θ = bearing（弧度，0=北，π/2=东）
 *
 * 文档参考：docs/earthquake-rescue-design.md §6.3
 */

import { haversine } from './haversine.js'

// 地球平均半径（米）
const EARTH_RADIUS_M = 6371000

// 角度转弧度
const toRad = (deg) => (deg * Math.PI) / 180

// 弧度转角度
const toDeg = (rad) => (rad * 180) / Math.PI

/**
 * 根据中心点、方位角、距离计算目标点坐标
 *
 * @param {[number, number]} center - 中心点 [lng, lat]
 * @param {number} bearing - 方位角（度，0=正北，顺时针）
 * @param {number} distance - 距离（米）
 * @returns {[number, number]} 目标点 [lng, lat]
 */
export function destination(center, bearing, distance) {
  const [lng1, lat1] = center
  const φ1 = toRad(lat1)
  const λ1 = toRad(lng1)
  const θ = toRad(bearing)
  const δ = distance / EARTH_RADIUS_M

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
  )
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    )

  return [toDeg(λ2), toDeg(φ2)]
}

/**
 * 生成圆形 GeoJSON Polygon
 *
 * @param {[number, number]} center - 中心点 [lng, lat]
 * @param {number} radiusMeters - 半径（米）
 * @param {number} [segments=64] - 圆周等分段数（默认 64，越大越圆滑）
 * @returns {{type: 'Polygon', coordinates: [number[][]]}} GeoJSON Polygon
 */
export function createCirclePolygon(center, radiusMeters, segments = 64) {
  const ring = []
  for (let i = 0; i < segments; i++) {
    const bearing = (360 / segments) * i
    ring.push(destination(center, bearing, radiusMeters))
  }
  // 闭合：首尾点相同
  ring.push(ring[0])

  return {
    type: 'Polygon',
    coordinates: [ring],
  }
}

/**
 * 校验生成的圆形 Polygon 的实际半径
 *
 * 用于自测：取圆周第 0 个点与中心点计算 haversine 距离，应等于 radiusMeters
 *
 * @param {{type:'Polygon', coordinates:[number[][]]}} polygon - createCirclePolygon 输出
 * @param {[number, number]} center - 中心点
 * @returns {number} 实际半径（米）
 */
export function verifyCircleRadius(polygon, center) {
  const ring = polygon.coordinates[0]
  const firstPoint = ring[0]
  return haversine(center, firstPoint)
}
