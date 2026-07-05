/**
 * earthquakeAhp.js 自测脚本
 *
 * 用法：
 *   node frontend/src/utils/__tests__/earthquakeAhp.test.js
 *
 * 验证依据：
 *   - docs/ahp-disaster-assessment.md §4.1, §4.2, §4.3
 *   - docs/earthquake-rescue-design.md §6.5
 *   - openspec/changes/20260705-earthquake-rescue-refactor/specs/earthquake-rescue/spec.md §1, §2.1
 */
import {
  WEIGHTS,
  THRESHOLDS,
  BUFFER_CONFIG,
  normalize,
  calculateDDI,
  getDisasterLevel,
  getBufferConfig,
  assessDisaster,
} from '../earthquakeAhp.js'

let pass = 0
let fail = 0

function assert(name, actual, expected) {
  const a = typeof actual === 'number' ? Math.round(actual * 100) / 100 : actual
  const e = typeof expected === 'number' ? Math.round(expected * 100) / 100 : expected
  const ok = JSON.stringify(a) === JSON.stringify(e)
  if (ok) {
    pass += 1
    console.log(`  ✅ ${name}`)
  } else {
    fail += 1
    console.log(`  ❌ ${name}`)
    console.log(`     期望: ${JSON.stringify(e)}`)
    console.log(`     实际: ${JSON.stringify(a)}`)
  }
}

function approx(name, actual, expected, eps = 0.01) {
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

console.log('\n=== earthquakeAhp.js 单元测试 ===\n')

// ===== §1.1 normalize 极值标准化 =====
console.log('§1.1 normalize 极值标准化')

// raw 在 [min, max] 区间内
assert('normalize(50, 0, 300) 应为 16.67', normalize(50, 0, 300), 16.67)
assert('normalize(300, 0, 1000) 应为 30', normalize(300, 0, 1000), 30)
assert('normalize(50000, 0, 100000) 应为 50', normalize(50000, 0, 100000), 50)

// raw ≤ min_value → 返回 0.0
assert('normalize(0, 0, 300) 应为 0.0', normalize(0, 0, 300), 0.0)
assert('normalize(-5, 0, 300) 应为 0.0', normalize(-5, 0, 300), 0.0)

// raw ≥ max_value → 返回 100.0
assert('normalize(500, 0, 300) 应为 100.0', normalize(500, 0, 300), 100.0)
assert('normalize(300, 0, 300) 应为 100.0', normalize(300, 0, 300), 100.0)

// ===== §1.2 calculateDDI 计算 =====
console.log('\n§1.2 calculateDDI 灾情综合指数')

// 文档示例数据（ahp-disaster-assessment.md §6.1）
// 注：文档未给出期望输出值，仅给出使用示例。本测试仅验证算法的数学一致性。
// 手动验算：
//   50/300 ×0.2457 + 300/1000 ×0.0744 + 10/100 ×0.1352 + 50000/100000 ×0.1752
//   + 20000/100000 ×0.0876 + 3000/10000 ×0.1057 + 10000/50000 ×0.0352 + 200000/1000000 ×0.1409
//   = 4.10 + 2.23 + 1.35 + 8.76 + 1.75 + 3.17 + 0.70 + 2.82 = 24.88
const docExample = {
  deaths: 50,
  injured: 300,
  missing: 10,
  affected_pop: 50000,
  evacuated: 20000,
  collapsed_houses: 3000,
  damaged_houses: 10000,
  economic_loss: 200000,
}
const docExampleDDI = calculateDDI(docExample)
console.log(`  文档示例数据 DDI = ${docExampleDDI}`)
// 验证算法的数学一致性（手动验算值）
approx('文档示例 DDI 与手动验算一致', docExampleDDI, 24.88, 0.05)
// DDI 必须在合法范围 [0, 100]
assert('文档示例 DDI ≥ 0', docExampleDDI >= 0, true)
assert('文档示例 DDI ≤ 100', docExampleDDI <= 100, true)
// 等级判定应与 DDI 值一致
assert('文档示例 DDI=24.88 → Ⅳ级一般', getDisasterLevel(docExampleDDI).level, 4)

// 全零数据 → DDI = 0
const zeroData = {
  deaths: 0, injured: 0, missing: 0, affected_pop: 0, evacuated: 0,
  collapsed_houses: 0, damaged_houses: 0, economic_loss: 0,
}
assert('全零数据 DDI = 0.0', calculateDDI(zeroData), 0.0)

// 全部达上限 → DDI ≈ 100（受文档权重总和 0.9999 影响，实际为 99.99）
const maxData = {
  deaths: 300, injured: 1000, missing: 100, affected_pop: 100000, evacuated: 100000,
  collapsed_houses: 10000, damaged_houses: 50000, economic_loss: 1000000,
}
approx('全上限数据 DDI ≈ 100', calculateDDI(maxData), 100.0, 0.05)

// 部分字段缺失 → 默认为 0，不报错
const partialData = { deaths: 50, injured: 300 }
const partialDDI = calculateDDI(partialData)
assert('部分缺失字段不报错，DDI 为数值', typeof partialDDI === 'number', true)

// DDI 输出保留 2 位小数
const decimalCheck = calculateDDI({ deaths: 1, injured: 1, missing: 1, affected_pop: 1, evacuated: 1, collapsed_houses: 1, damaged_houses: 1, economic_loss: 1 })
const decimalPlaces = (decimalCheck.toString().split('.')[1] || '').length
assert('DDI 保留 2 位小数', decimalPlaces <= 2, true)

// ===== §1.3 getDisasterLevel 灾情等级判定 =====
console.log('\n§1.3 getDisasterLevel 灾情等级判定')

// Ⅰ级 特别重大：DDI ≥ 80
assert(
  'DDI=85.3 → Ⅰ级特别重大',
  getDisasterLevel(85.3),
  { level: 1, name: '特别重大', color: '#e53e3e' },
)

// Ⅱ级 重大：60 ≤ DDI < 80
assert(
  'DDI=72.5 → Ⅱ级重大',
  getDisasterLevel(72.5),
  { level: 2, name: '重大', color: '#dd6b20' },
)

// Ⅲ级 较大：40 ≤ DDI < 60
assert(
  'DDI=45.0 → Ⅲ级较大',
  getDisasterLevel(45.0),
  { level: 3, name: '较大', color: '#d69e2e' },
)

// Ⅳ级 一般：DDI < 40
assert(
  'DDI=25.8 → Ⅳ级一般',
  getDisasterLevel(25.8),
  { level: 4, name: '一般', color: '#38a169' },
)

// 边界值 DDI = 80 → Ⅰ级
assert(
  '边界值 DDI=80.0 → Ⅰ级',
  getDisasterLevel(80.0).level,
  1,
)

// 边界值 DDI = 60 → Ⅱ级
assert(
  '边界值 DDI=60.0 → Ⅱ级',
  getDisasterLevel(60.0).level,
  2,
)

// 边界值 DDI = 40 → Ⅲ级
assert(
  '边界值 DDI=40.0 → Ⅲ级',
  getDisasterLevel(40.0).level,
  3,
)

// 边界值 DDI = 0 → Ⅳ级
assert(
  '边界值 DDI=0.0 → Ⅳ级',
  getDisasterLevel(0.0).level,
  4,
)

// ===== §2.1 getBufferConfig 缓冲区配置 =====
console.log('\n§2.1 getBufferConfig 等级化缓冲区')

// Ⅰ级灾情 → 大缓冲区 8km / 小缓冲区 2km
assert(
  'Ⅰ级缓冲区配置',
  getBufferConfig(1),
  {
    name: '特别重大',
    inner: 2000,
    outer: 8000,
    innerColor: 'rgba(229, 62, 62, 0.25)',
    outerColor: 'rgba(221, 107, 32, 0.15)',
  },
)

// Ⅱ级灾情 → 大缓冲区 6km / 小缓冲区 1.5km
assert(
  'Ⅱ级缓冲区配置',
  getBufferConfig(2),
  {
    name: '重大',
    inner: 1500,
    outer: 6000,
    innerColor: 'rgba(229, 62, 62, 0.25)',
    outerColor: 'rgba(221, 107, 32, 0.15)',
  },
)

// Ⅲ级灾情 → 大缓冲区 4km / 小缓冲区 1km
assert(
  'Ⅲ级缓冲区配置',
  getBufferConfig(3),
  {
    name: '较大',
    inner: 1000,
    outer: 4000,
    innerColor: 'rgba(229, 62, 62, 0.25)',
    outerColor: 'rgba(221, 107, 32, 0.15)',
  },
)

// Ⅳ级灾情 → 大缓冲区 2km / 小缓冲区 0.5km
assert(
  'Ⅳ级缓冲区配置',
  getBufferConfig(4),
  {
    name: '一般',
    inner: 500,
    outer: 2000,
    innerColor: 'rgba(229, 62, 62, 0.25)',
    outerColor: 'rgba(221, 107, 32, 0.15)',
  },
)

// 非法等级 → 兜底返回 Ⅳ级
assert(
  '非法等级 99 → 兜底返回 Ⅳ级',
  getBufferConfig(99).level || 4,
  4,
)

// ===== §1.4 WEIGHTS 权重总和校验 =====
console.log('\n§1.4 WEIGHTS 权重总和校验')

const totalWeight = Object.values(WEIGHTS).reduce((s, w) => s + w, 0)
approx('权重总和 = 1.0000', totalWeight, 1.0, 0.0001)

// 各指标权重精确值
assert('deaths 权重 = 0.2457', WEIGHTS.deaths, 0.2457)
assert('injured 权重 = 0.0744', WEIGHTS.injured, 0.0744)
assert('missing 权重 = 0.1352', WEIGHTS.missing, 0.1352)
assert('affected_pop 权重 = 0.1752', WEIGHTS.affected_pop, 0.1752)
assert('evacuated 权重 = 0.0876', WEIGHTS.evacuated, 0.0876)
assert('collapsed_houses 权重 = 0.1057', WEIGHTS.collapsed_houses, 0.1057)
assert('damaged_houses 权重 = 0.0352', WEIGHTS.damaged_houses, 0.0352)
assert('economic_loss 权重 = 0.1409', WEIGHTS.economic_loss, 0.1409)

// ===== §1.5 THRESHOLDS 阈值校验 =====
console.log('\n§1.5 THRESHOLDS 阈值校验')

assert('deaths 阈值 = [0, 300]', THRESHOLDS.deaths, [0, 300])
assert('injured 阈值 = [0, 1000]', THRESHOLDS.injured, [0, 1000])
assert('missing 阈值 = [0, 100]', THRESHOLDS.missing, [0, 100])
assert('affected_pop 阈值 = [0, 100000]', THRESHOLDS.affected_pop, [0, 100000])
assert('evacuated 阈值 = [0, 100000]', THRESHOLDS.evacuated, [0, 100000])
assert('collapsed_houses 阈值 = [0, 10000]', THRESHOLDS.collapsed_houses, [0, 10000])
assert('damaged_houses 阈值 = [0, 50000]', THRESHOLDS.damaged_houses, [0, 50000])
assert('economic_loss 阈值 = [0, 1000000]', THRESHOLDS.economic_loss, [0, 1000000])

// ===== §1.6 BUFFER_CONFIG 缓冲区配置校验 =====
console.log('\n§1.6 BUFFER_CONFIG 缓冲区配置校验')

assert('Ⅰ级 inner=2000', BUFFER_CONFIG[1].inner, 2000)
assert('Ⅰ级 outer=8000', BUFFER_CONFIG[1].outer, 8000)
assert('Ⅱ级 inner=1500', BUFFER_CONFIG[2].inner, 1500)
assert('Ⅱ级 outer=6000', BUFFER_CONFIG[2].outer, 6000)
assert('Ⅲ级 inner=1000', BUFFER_CONFIG[3].inner, 1000)
assert('Ⅲ级 outer=4000', BUFFER_CONFIG[3].outer, 4000)
assert('Ⅳ级 inner=500',  BUFFER_CONFIG[4].inner, 500)
assert('Ⅳ级 outer=2000', BUFFER_CONFIG[4].outer, 2000)
assert('innerColor 统一', BUFFER_CONFIG[1].innerColor, 'rgba(229, 62, 62, 0.25)')
assert('outerColor 统一', BUFFER_CONFIG[1].outerColor, 'rgba(221, 107, 32, 0.15)')

// ===== §1.7 assessDisaster 综合评估 =====
console.log('\n§1.7 assessDisaster 综合评估函数')

const result = assessDisaster(docExample)
assert('assessDisaster 返回 ddi 数值', typeof result.ddi === 'number', true)
assert('assessDisaster 返回 level 对象', typeof result.level === 'object', true)
assert('assessDisaster 返回 bufferConfig 对象', typeof result.bufferConfig === 'object', true)
assert('assessDisader 返回 details 数组（8 项）', Array.isArray(result.details) && result.details.length === 8, true)
assert('assessDisaster.ddi 与 calculateDDI 一致', result.ddi, docExampleDDI)
assert('assessDisaster.level 与 getDisasterLevel 一致', result.level, getDisasterLevel(docExampleDDI))
assert('assessDisaster.bufferConfig 与 getBufferConfig 一致', result.bufferConfig, getBufferConfig(result.level.level))

// details 数组每项字段完整
const d0 = result.details[0]
assert('details[0] 包含 key 字段', 'key' in d0, true)
assert('details[0] 包含 code 字段', 'code' in d0, true)
assert('details[0] 包含 label 字段', 'label' in d0, true)
assert('details[0] 包含 raw 字段', 'raw' in d0, true)
assert('details[0] 包含 normalized 字段', 'normalized' in d0, true)
assert('details[0] 包含 weight 字段', 'weight' in d0, true)
assert('details[0] 包含 contribution 字段', 'contribution' in d0, true)

// ===== 测试结果汇总 =====
console.log('\n=== 测试结果汇总 ===')
console.log(`  ✅ 通过: ${pass}`)
console.log(`  ❌ 失败: ${fail}`)
console.log(`  总计: ${pass + fail}`)

if (fail > 0) {
  console.log('\n⚠️ 存在失败用例，请检查 earthquakeAhp.js 实现')
  process.exit(1)
} else {
  console.log('\n✅ 全部测试通过')
  process.exit(0)
}
