/**
 * haversine 距离工具
 *
 * 用途：计算两个经纬度坐标点之间的球面距离（米）
 *      判断点是否在环带内 / 小缓冲区内
 *
 * 算法依据：haversine 公式
 *   a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
 *   c = 2 × atan2(√a, √(1−a))
 *   d = R × c
 *   其中 R = 6371000 m（地球平均半径）
 *
 * 文档参考：docs/earthquake-rescue-design.md §6.4
 */

// 地球平均半径（米）
const EARTH_RADIUS_M = 6371000

// 角度转弧度
const toRad = (deg) => (deg * Math.PI) / 180

/**
 * 计算两个经纬度点之间的球面距离
 *
 * @param {[number, number]} p1 - 点1 [lng, lat]
 * @param {[number, number]} p2 - 点2 [lng, lat]
 * @returns {number} 距离（米）
 */
export function haversine(p1, p2) {
  const [lng1, lat1] = p1
  const [lng2, lat2] = p2

  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δφ = toRad(lat2 - lat1)
  const Δλ = toRad(lng2 - lng1)

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_M * c
}

/**
 * 判断点是否在环带内（innerRadius < d ≤ outerRadius）
 *
 * 用于支援点/物资点生成：点位必须落在大缓冲区与小缓冲区之间的环带
 *
 * @param {[number, number]} point - 待判断的点 [lng, lat]
 * @param {[number, number]} center - 中心点 [lng, lat]
 * @param {number} innerRadius - 内半径（米）
 * @param {number} outerRadius - 外半径（米）
 * @returns {boolean} true 表示点在环带内
 */
export function isInRing(point, center, innerRadius, outerRadius) {
  const d = haversine(point, center)
  return d > innerRadius && d <= outerRadius
}

/**
 * 判断点是否在小缓冲区内（d ≤ innerRadius）
 *
 * 用于生成"已损毁"点位：点位必须落在小缓冲区内
 *
 * @param {[number, number]} point - 待判断的点 [lng, lat]
 * @param {[number, number]} center - 中心点 [lng, lat]
 * @param {number} innerRadius - 内半径（米）
 * @returns {boolean} true 表示点在小缓冲区内
 */
export function isInDamageZone(point, center, innerRadius) {
  const d = haversine(point, center)
  return d <= innerRadius
}
