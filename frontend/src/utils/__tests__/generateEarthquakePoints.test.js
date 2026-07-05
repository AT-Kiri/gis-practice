/**
 * generateEarthquakePoints.js 自测脚本
 *
 * 用法：
 *   node frontend/src/utils/__tests__/generateEarthquakePoints.test.js
 *
 * 验证依据：
 *   - spec.md §3 支援点/物资点生成
 *   - checklist.md §3.2 点位生成器, §3.3 图标颜色映射
 */
import {
  generateSupportPoints,
  generateSupplyPoints,
  generateDamagedPoints,
  sortByDistance,
  SUPPORT_POINT_TYPES,
  SUPPLY_POINT_TYPES,
} from '../generateEarthquakePoints.js'
import { haversine, isInRing, isInDamageZone } from '../haversine.js'

let pass = 0
let fail = 0

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

function approx(name, actual, expected, eps = 1) {
  const ok = Math.abs(actual - expected) < eps
  if (ok) {
    pass += 1
    console.log(`  ✅ ${name} (实际=${actual})`)
  } else {
    fail += 1
    console.log(`  ❌ ${name}`)
    console.log(`     期望约: ${expected}`)
    console.log(`     实际:   ${actual}`)
  }
}

function assertTrue(name, actual) {
  assert(name, !!actual, true)
}

console.log('\n=== generateEarthquakePoints.js 单元测试 ===\n')

// ===== §1 类型常量映射 =====
console.log('§1 类型常量映射')

const expectedSupportTypes = [
  { type: 'emergency_management', icon: 'town-hall', color: '#3182ce' },
  { type: 'fire_station', icon: 'fire-station', color: '#e53e3e' },
  { type: 'hospital', icon: 'hospital', color: '#d53f8c' },
  { type: 'supply_depot', icon: 'warehouse', color: '#dd6b20' },
  { type: 'shelter', icon: 'campground', color: '#38a169' },
]
const expectedSupplyTypes = [
  { type: 'grain_oil', icon: 'store', color: '#d69e2e' },
  { type: 'supermarket', icon: 'store', color: '#805ad5' },
  { type: 'pharmacy', icon: 'pharmacy', color: '#38a169' },
  { type: 'gas_station', icon: 'fuel', color: '#718096' },
]
assert('5 类支援点类型映射', SUPPORT_POINT_TYPES, expectedSupportTypes)
assert('4 类物资点类型映射', SUPPLY_POINT_TYPES, expectedSupplyTypes)

// ===== §2 generateSupportPoints 数量与类型 =====
console.log('\n§2 generateSupportPoints 数量与类型')

const center = [116.4074, 39.9042] // 北京
const innerR = 1500
const outerR = 6000
const support = generateSupportPoints(center, innerR, outerR, '朝阳区')

assertTrue('支援点数组非空', support.length > 0)
assertTrue('支援点数量 ≥ 5', support.length >= 5)
assertTrue('支援点数量 ≤ 9', support.length <= 9)

// 5 类至少各 1 个
const supportTypes = new Set(support.map((p) => p.type))
expectedSupportTypes.forEach((t) => {
  assertTrue(`支援点包含类型 ${t.type}`, supportTypes.has(t.type))
})

// 每个点字段完整
const s0 = support[0]
assertTrue('支援点字段 type', 'type' in s0)
assertTrue('支援点字段 name', 'name' in s0)
assertTrue('支援点字段 lng', 'lng' in s0)
assertTrue('支援点字段 lat', 'lat' in s0)
assertTrue('支援点字段 icon', 'icon' in s0)
assertTrue('支援点字段 color', 'color' in s0)
assertTrue('支援点字段 distance', 'distance' in s0)

// ===== §3 generateSupportPoints 距离约束 =====
console.log('\n§3 generateSupportPoints 距离约束')

support.forEach((p, i) => {
  const d = haversine(center, [p.lng, p.lat])
  assertTrue(`支援点 #${i} 距离 > inner`, d > innerR)
  assertTrue(`支援点 #${i} 距离 ≤ outer`, d <= outerR)
  // distance 字段与实际距离误差 < 1m
  approx(`支援点 #${i} distance 字段准确`, p.distance, d, 1)
})

// ===== §4 generateSupplyPoints 数量与类型 =====
console.log('\n§4 generateSupplyPoints 数量与类型')

const midR = (innerR + outerR) / 2 // 3750
const supply = generateSupplyPoints(center, innerR, midR)

assertTrue('物资点数量 ≥ 4', supply.length >= 4)
assertTrue('物资点数量 ≤ 8', supply.length <= 8)

const supplyTypes = new Set(supply.map((p) => p.type))
expectedSupplyTypes.forEach((t) => {
  assertTrue(`物资点包含类型 ${t.type}`, supplyTypes.has(t.type))
})

// 物资点字段包含 supplies
const sup0 = supply[0]
assertTrue('物资点字段 supplies', 'supplies' in sup0)
assertTrue('物资点 supplies 是数组', Array.isArray(sup0.supplies))
assertTrue('物资点 supplies 非空', sup0.supplies.length > 0)

// ===== §5 generateSupplyPoints 距离约束（环带内侧）=====
console.log('\n§5 generateSupplyPoints 距离约束')

supply.forEach((p, i) => {
  const d = haversine(center, [p.lng, p.lat])
  assertTrue(`物资点 #${i} 距离 > inner`, d > innerR)
  assertTrue(`物资点 #${i} 距离 ≤ mid`, d <= midR)
})

// ===== §6 generateDamagedPoints 数量与约束 =====
console.log('\n§6 generateDamagedPoints 数量与约束')

// 多次调用确保数量在 0~3 范围内
for (let i = 0; i < 20; i++) {
  const damaged = generateDamagedPoints(center, innerR)
  assertTrue(`第 ${i + 1} 次调用数量 ≥ 0`, damaged.length >= 0)
  assertTrue(`第 ${i + 1} 次调用数量 ≤ 3`, damaged.length <= 3)
  damaged.forEach((p, j) => {
    assertTrue(`已损毁点 #${j} _damaged=true`, p._damaged === true)
    const d = haversine(center, [p.lng, p.lat])
    assertTrue(`已损毁点 #${j} 距离 ≤ inner`, d <= innerR)
  })
}

// ===== §7 sortByDistance 升序排序 =====
console.log('\n§7 sortByDistance 升序排序')

const unsorted = [
  { lng: 116.41, lat: 39.91, distance: 1500 },
  { lng: 116.40, lat: 39.90, distance: 200 },
  { lng: 116.42, lat: 39.92, distance: 3000 },
  { lng: 116.405, lat: 39.905, distance: 800 },
]
const sorted = sortByDistance(unsorted, center)
assertTrue('排序后数组长度不变', sorted.length === unsorted.length)
assertTrue('排序后第 1 项 distance=200', sorted[0].distance === 200)
assertTrue('排序后第 2 项 distance=800', sorted[1].distance === 800)
assertTrue('排序后第 3 项 distance=1500', sorted[2].distance === 1500)
assertTrue('排序后第 4 项 distance=3000', sorted[3].distance === 3000)

// 不修改原数组
assertTrue('sortByDistance 不修改原数组', unsorted[0].distance === 1500)

// ===== §8 不同区县名生成支援点 =====
console.log('\n§8 不同区县名生成支援点')

const support1 = generateSupportPoints(center, innerR, outerR, '海淀区')
const emergencyPoint = support1.find((p) => p.type === 'emergency_management')
assertTrue('海淀区应急管理局名正确', emergencyPoint && emergencyPoint.name === '海淀区应急管理局')

const firePoint = support1.find((p) => p.type === 'fire_station')
assertTrue('海淀区消防救援站名正确', firePoint && firePoint.name === '海淀区消防救援站')

// ===== §9 极端情况：Ⅳ级小环带 inner=500, outer=2000 =====
console.log('\n§9 极端情况：Ⅳ级小环带')

const smallSupport = generateSupportPoints(center, 500, 2000, '通州区')
assertTrue('小环带支援点 ≥ 5', smallSupport.length >= 5)
smallSupport.forEach((p, i) => {
  const d = haversine(center, [p.lng, p.lat])
  assertTrue(`小环带支援点 #${i} 在 [500, 2000] 区间`, d > 500 && d <= 2000)
})

// ===== §10 受灾点在边缘（地理边界正常生成）=====
console.log('\n§10 受灾点在边缘')

const edgeCenter = [73.5, 39.5] // 中国最西边附近
const edgeSupport = generateSupportPoints(edgeCenter, innerR, outerR, '喀什')
assertTrue('边缘受灾点支援点 ≥ 5', edgeSupport.length >= 5)
edgeSupport.forEach((p, i) => {
  const d = haversine(edgeCenter, [p.lng, p.lat])
  assertTrue(`边缘支援点 #${i} 距离合法`, d > innerR && d <= outerR)
})

// ===== 测试结果汇总 =====
console.log('\n=== 测试结果汇总 ===')
console.log(`  ✅ 通过: ${pass}`)
console.log(`  ❌ 失败: ${fail}`)
console.log(`  总计: ${pass + fail}`)

if (fail > 0) {
  console.log('\n⚠️ 存在失败用例，请检查 generateEarthquakePoints.js 实现')
  process.exit(1)
} else {
  console.log('\n✅ 全部测试通过')
  process.exit(0)
}
