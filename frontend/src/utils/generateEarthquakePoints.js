/**
 * 地震救援点位生成器
 *
 * 用途：在双缓冲区环带内生成支援点/物资点，在小缓冲区内生成"已损毁"点位
 *
 * 文档参考：
 *   - spec.md §3 支援点/物资点生成
 *   - tasks.md §T3.2
 *   - checklist.md §3.2, §3.3
 *
 * 算法：
 *   - 环带内随机点位 = 中心点 + 随机方位角(0~360°) + 随机距离[inner, outer]
 *   - 通过 destination(center, bearing, distance) 计算目标经纬度
 *   - 使用 haversine 反算实际距离（断言满足约束）
 */

import { haversine } from './haversine.js'
import { destination } from './circlePolygon.js'
import { nameSupportPoint, nameSupplyPoint } from './earthquakeNaming.js'

// ==================== 类型常量 ====================

/**
 * 支援点 5 类：type → {icon, color}
 *
 * 来源：checklist.md §3.3 / earthquake-rescue-design.md §2.1
 */
export const SUPPORT_POINT_TYPES = [
  { type: 'emergency_management', icon: 'town-hall', color: '#3182ce' },
  { type: 'fire_station', icon: 'fire-station', color: '#e53e3e' },
  { type: 'hospital', icon: 'hospital', color: '#d53f8c' },
  { type: 'supply_depot', icon: 'warehouse', color: '#dd6b20' },
  { type: 'shelter', icon: 'campground', color: '#38a169' },
]

/**
 * 物资点 4 类：type → {icon, color}
 */
export const SUPPLY_POINT_TYPES = [
  { type: 'grain_oil', icon: 'store', color: '#d69e2e' },
  { type: 'supermarket', icon: 'store', color: '#805ad5' },
  { type: 'pharmacy', icon: 'pharmacy', color: '#38a169' },
  { type: 'gas_station', icon: 'fuel', color: '#718096' },
]

/**
 * 物资点的物资清单（用于 popup 显示）
 */
const SUPPLIES_BY_TYPE = {
  grain_oil: ['大米', '食用油', '方便食品', '饮用水'],
  supermarket: ['方便食品', '饮用水', '日用品', '罐头'],
  pharmacy: ['急救药品', '消毒用品', '常用药', '医疗耗材'],
  gas_station: ['92号汽油', '95号汽油', '柴油'],
}

// ==================== 内部工具 ====================

/**
 * 在 [min, max] 区间内生成随机整数（含端点）
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 在 [min, max) 区间内生成随机浮点数
 */
function randFloat(min, max) {
  return Math.random() * (max - min) + min
}

/**
 * 从数组中随机选取一个元素
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * 在环带内生成一个随机点
 *
 * @param {[number, number]} center - 中心点 [lng, lat]
 * @param {number} innerRadius - 内半径（米，不含）
 * @param {number} outerRadius - 外半径（米，含）
 * @returns {[number, number]} 目标点 [lng, lat]
 */
function randomPointInRing(center, innerRadius, outerRadius) {
  const bearing = randFloat(0, 360)
  // 距离区间留 10% 余量，避免点正好落在边界上导致 isInRing 判定不稳定
  const safeInner = innerRadius * 1.05
  const safeOuter = outerRadius * 0.95
  const distance = randFloat(safeInner, safeOuter)
  return destination(center, bearing, distance)
}

// ==================== 公开 API ====================

/**
 * 生成支援点（5~9 个，5 类齐全）
 *
 * @param {[number, number]} center - 受灾点 [lng, lat]
 * @param {number} innerRadius - 小缓冲区半径（米）
 * @param {number} outerRadius - 大缓冲区半径（米）
 * @param {string} [districtName='通用'] - 区县名
 * @returns {Array<{type, name, lng, lat, icon, color, distance}>} 支援点数组
 */
export function generateSupportPoints(
  center,
  innerRadius,
  outerRadius,
  districtName = '通用',
) {
  const points = []

  // Step 1：5 类至少各 1 个（共 5 个）
  const typeCounters = {} // 记录同类型出现次数，用于消防站序号
  SUPPORT_POINT_TYPES.forEach(({ type, icon, color }) => {
    typeCounters[type] = 0
    const [lng, lat] = randomPointInRing(center, innerRadius, outerRadius)
    points.push({
      type,
      name: nameSupportPoint(type, districtName, 0),
      lng,
      lat,
      icon,
      color,
      distance: Math.round(haversine(center, [lng, lat])),
    })
    typeCounters[type] = 1
  })

  // Step 2：随机添加 0~4 个补充点（共 5~9 个）
  const extra = randInt(0, 4)
  for (let i = 0; i < extra; i++) {
    const { type, icon, color } = pickRandom(SUPPORT_POINT_TYPES)
    const [lng, lat] = randomPointInRing(center, innerRadius, outerRadius)
    points.push({
      type,
      name: nameSupportPoint(type, districtName, typeCounters[type] || 0),
      lng,
      lat,
      icon,
      color,
      distance: Math.round(haversine(center, [lng, lat])),
    })
    typeCounters[type] = (typeCounters[type] || 0) + 1
  }

  return points
}

/**
 * 生成物资点（4~8 个，4 类覆盖）
 *
 * 点位落在大缓冲区与小缓冲区之间的内侧环带
 * （innerRadius < d ≤ midRadius，midRadius 通常为 (inner+outer)/2）
 *
 * @param {[number, number]} center - 受灾点 [lng, lat]
 * @param {number} innerRadius - 小缓冲区半径（米）
 * @param {number} midRadius - 环带中点（米）
 * @returns {Array<{type, name, lng, lat, icon, color, supplies, distance}>} 物资点数组
 */
export function generateSupplyPoints(center, innerRadius, midRadius) {
  const points = []

  // Step 1：4 类至少各 1 个
  SUPPLY_POINT_TYPES.forEach(({ type, icon, color }) => {
    const [lng, lat] = randomPointInRing(center, innerRadius, midRadius)
    points.push({
      type,
      name: nameSupplyPoint(type),
      lng,
      lat,
      icon,
      color,
      supplies: [...SUPPLIES_BY_TYPE[type]],
      distance: Math.round(haversine(center, [lng, lat])),
    })
  })

  // Step 2：随机添加 0~4 个补充点（共 4~8 个）
  const extra = randInt(0, 4)
  for (let i = 0; i < extra; i++) {
    const { type, icon, color } = pickRandom(SUPPLY_POINT_TYPES)
    const [lng, lat] = randomPointInRing(center, innerRadius, midRadius)
    points.push({
      type,
      name: nameSupplyPoint(type),
      lng,
      lat,
      icon,
      color,
      supplies: [...SUPPLIES_BY_TYPE[type]],
      distance: Math.round(haversine(center, [lng, lat])),
    })
  }

  return points
}

/**
 * 生成已损毁点位（0~3 个，落在小缓冲区内）
 *
 * @param {[number, number]} center - 受灾点 [lng, lat]
 * @param {number} innerRadius - 小缓冲区半径（米）
 * @returns {Array<{type, name, lng, lat, icon, color, distance, _damaged: true}>} 已损毁点数组
 */
export function generateDamagedPoints(center, innerRadius) {
  const points = []
  const count = randInt(0, 3)

  // 从支援点类型中随机选取（已损毁点本质上是被破坏的支援点）
  for (let i = 0; i < count; i++) {
    const { type, icon, color } = pickRandom(SUPPORT_POINT_TYPES)
    // 在小缓冲区内随机生成（含一定余量）
    const bearing = randFloat(0, 360)
    const distance = randFloat(0, innerRadius * 0.9)
    const [lng, lat] = destination(center, bearing, distance)

    points.push({
      type,
      name: nameSupportPoint(type, '通用', 0),
      lng,
      lat,
      icon,
      color,
      distance: Math.round(haversine(center, [lng, lat])),
      _damaged: true,
    })
  }

  return points
}

/**
 * 按距离受灾点升序排序
 *
 * @param {Array<{distance: number}>} points - 点位数组
 * @param {[number, number]} [center] - 受灾点（可选，用于重新计算距离）
 * @returns {Array} 排序后的新数组（不修改原数组）
 */
export function sortByDistance(points, center) {
  const arr = [...points]
  if (center) {
    // 重新计算距离（保险起见，若 distance 字段不存在）
    arr.forEach((p) => {
      if (typeof p.distance !== 'number') {
        p.distance = Math.round(haversine(center, [p.lng, p.lat]))
      }
    })
  }
  return arr.sort((a, b) => (a.distance || 0) - (b.distance || 0))
}
