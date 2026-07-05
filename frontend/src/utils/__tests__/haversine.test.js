/**
 * haversine.js + circlePolygon.js 自测脚本
 *
 * 用法：
 *   node frontend/src/utils/__tests__/haversine.test.js
 *
 * 验证依据：
 *   - openspec/changes/20260705-earthquake-rescue-refactor/specs/earthquake-rescue/spec.md §2
 *   - docs/earthquake-rescue-design.md §6.3
 */
import {
  haversine,
  isInRing,
  isInDamageZone,
} from '../haversine.js'
import {
  createCirclePolygon,
  verifyCircleRadius,
} from '../circlePolygon.js'

let pass = 0
let fail = 0

function approx(name, actual, expected, tol = 0.5) {
  const ok = Math.abs(actual - expected) <= tol
  if (ok) {
    pass += 1
    console.log(`  ✅ ${name} (实际: ${actual.toFixed(4)})`)
  } else {
    fail += 1
    console.log(`  ❌ ${name}`)
    console.log(`     期望: ${expected} (容差 ±${tol})`)
    console.log(`     实际: ${actual}`)
  }
}

function assert(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    pass += 1
    console.log(`  ✅ ${name}`)
  } else {
    fail += 1
    console.log(`  ❌ ${name}`)
    console.log(`     期望: ${JSON.stringify(expected)}`)
    console.log(`     实际: ${JSON.stringify(actual)}`)
  }
}

console.log('\n=== haversine 距离工具测试 ===\n')

// T1: 同一点距离 = 0
approx('同一点距离应为 0', haversine([116.40, 39.90], [116.40, 39.90]), 0, 0.001)

// T2: 北京到天津约 110km（实际直线距离约 110km）
// 北京天安门 116.4074, 39.9042 / 天津 117.1901, 39.1252
const beijing = [116.4074, 39.9042]
const tianjin = [117.1901, 39.1252]
const bj2tj = haversine(beijing, tianjin)
approx('北京到天津距离约 110km', bj2tj / 1000, 110, 5)

// T3: 短距离验证（1° 纬度约 111km）
const lat1 = [0, 0]
const lat2 = [0, 1] // 同经度，纬度差 1°
approx('纬度差 1° 距离约 111.195km', haversine(lat1, lat2) / 1000, 111.195, 1)

// T4: 经度差 1°（赤道处约 111.195km）
const lng1 = [0, 0]
const lng2 = [1, 0]
approx('赤道处经度差 1° 距离约 111.195km', haversine(lng1, lng2) / 1000, 111.195, 1)

console.log('\n=== 环带判断 ===\n')

// T5: isInRing - 点在环带内
const center = [116.40, 39.90]
const pointInRing = [116.42, 39.91] // 约 2km 外
assert('点在 1km~5km 环带内', isInRing(pointInRing, center, 1000, 5000), true)

// T6: isInRing - 点在小缓冲区内（不在环带内）
const pointInInner = [116.401, 39.901] // 约 130m
assert('点在 1km 内不在 1~5km 环带', isInRing(pointInInner, center, 1000, 5000), false)

// T7: isInRing - 点在大缓冲区外（不在环带内）
const pointOutOuter = [116.50, 39.95] // 约 10km 外
assert('点在 5km 外不在 1~5km 环带', isInRing(pointOutOuter, center, 1000, 5000), false)

// T8: isInDamageZone - 点在小缓冲区内
assert('点在 1km 小缓冲区内', isInDamageZone(pointInInner, center, 1000), true)

// T9: isInDamageZone - 点在环带（不在小缓冲区）
assert('点在环带不在小缓冲区', isInDamageZone(pointInRing, center, 1000), false)

console.log('\n=== circlePolygon 圆形 Polygon 生成测试 ===\n')

// T10: 64 边近似圆，应生成 65 个点（首尾闭合）
const polygon = createCirclePolygon([116.40, 39.90], 2000, 64)
assert('Polygon 类型', polygon.type, 'Polygon')
assert('Polygon coordinates 长度 = 1（外环）', polygon.coordinates.length, 1)
assert('64 边近似圆 → 65 个点（首尾闭合）', polygon.coordinates[0].length, 65)

// T11: 首尾点相同
const ring = polygon.coordinates[0]
assert('首尾点相同（闭合环）', ring[0][0], ring[64][0])
assert('首尾点相同（闭合环 lat）', ring[0][1], ring[64][1])

// T12: 实际半径 ≈ 2000m（haversine 校验）
const actualRadius = verifyCircleRadius(polygon, [116.40, 39.90])
approx('2km 圆周点距中心 ≈ 2000m', actualRadius, 2000, 1)

// T13: Ⅰ级缓冲区（8km / 2km）生成验证
const poly8km = createCirclePolygon([116.40, 39.90], 8000, 64)
const actual8km = verifyCircleRadius(poly8km, [116.40, 39.90])
approx('8km 圆周点距中心 ≈ 8000m', actual8km, 8000, 5)

// T14: Ⅳ级缓冲区（2km / 0.5km）生成验证
const poly500m = createCirclePolygon([116.40, 39.90], 500, 64)
const actual500m = verifyCircleRadius(poly500m, [116.40, 39.90])
approx('500m 圆周点距中心 ≈ 500m', actual500m, 500, 1)

// T15: 自定义段数（32 边）
const poly32 = createCirclePolygon([116.40, 39.90], 2000, 32)
assert('32 边近似圆 → 33 个点', poly32.coordinates[0].length, 33)

console.log('\n=== 测试结论 ===\n')
console.log(`通过: ${pass}/${pass + fail}`)
if (fail === 0) {
  console.log('🎉 全部通过')
} else {
  console.log(`❌ 失败 ${fail} 项`)
  process.exit(1)
}
