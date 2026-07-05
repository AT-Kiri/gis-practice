/**
 * earthquakeNaming.js 自测脚本
 *
 * 用法：
 *   node frontend/src/utils/__tests__/earthquakeNaming.test.js
 *
 * 验证依据：
 *   - spec.md §3.1 支援点命名策略
 *   - spec.md §3.2 物资点命名策略
 *   - checklist.md §3.1 命名工具
 */
import {
  nameSupportPoint,
  nameSupplyPoint,
  getNamePools,
} from '../earthquakeNaming.js'

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

function assertIncludes(name, actual, substr) {
  const ok = String(actual).includes(substr)
  if (ok) {
    pass += 1
    console.log(`  ✅ ${name} (实际=${actual})`)
  } else {
    fail += 1
    console.log(`  ❌ ${name}`)
    console.log(`     期望包含: ${substr}`)
    console.log(`     实际: ${actual}`)
  }
}

function assertInPool(name, actual, pool) {
  const ok = pool.includes(actual)
  if (ok) {
    pass += 1
    console.log(`  ✅ ${name} (实际=${actual})`)
  } else {
    fail += 1
    console.log(`  ❌ ${name}`)
    console.log(`     期望在池中: ${JSON.stringify(pool)}`)
    console.log(`     实际: ${actual}`)
  }
}

console.log('\n=== earthquakeNaming.js 单元测试 ===\n')

// ===== §1 名称池齐全性 =====
console.log('§1 名称池齐全性')

const pools = getNamePools()
assert('医院名称池至少 3 个', pools.hospital.length >= 3, true)
assert('物资库名称池至少 3 个', pools.supply_depot.length >= 3, true)
assert('避难场所名称池至少 3 个', pools.shelter.length >= 3, true)
assert('粮油店名称池至少 3 个', pools.grain_oil.length >= 3, true)
assert('超市名称池至少 3 个', pools.supermarket.length >= 3, true)
assert('药店名称池至少 3 个', pools.pharmacy.length >= 3, true)
assert('加油站名称池至少 3 个', pools.gas_station.length >= 3, true)

// 超市名称池必须包含文档示例的 4 个品牌
const expectedSupermarkets = ['永辉超市', '物美超市', '华润万家', '大润发']
expectedSupermarkets.forEach((s) => {
  assert(`超市池包含 "${s}"`, pools.supermarket.includes(s), true)
})

// ===== §2 nameSupportPoint — emergency_management =====
console.log('\n§2 nameSupportPoint — emergency_management')

assert(
  '朝阳区应急管理局',
  nameSupportPoint('emergency_management', '朝阳区'),
  '朝阳区应急管理局',
)
assert(
  '海淀区应急管理局',
  nameSupportPoint('emergency_management', '海淀区'),
  '海淀区应急管理局',
)
// districtName 缺失降级为通用
assert(
  '通用应急管理局（缺失 districtName）',
  nameSupportPoint('emergency_management'),
  '通用应急管理局',
)

// ===== §3 nameSupportPoint — fire_station =====
console.log('\n§3 nameSupportPoint — fire_station')

assert(
  '朝阳区消防救援站（index=0）',
  nameSupportPoint('fire_station', '朝阳区', 0),
  '朝阳区消防救援站',
)
assert(
  '朝阳区第二消防救援站（index=1）',
  nameSupportPoint('fire_station', '朝阳区', 1),
  '朝阳区第二消防救援站',
)
assert(
  '朝阳区第三消防救援站（index=2）',
  nameSupportPoint('fire_station', '朝阳区', 2),
  '朝阳区第三消防救援站',
)
// index 缺失默认为 0
assert(
  '消防救援站（index 缺失）',
  nameSupportPoint('fire_station', '朝阳区'),
  '朝阳区消防救援站',
)

// ===== §4 nameSupportPoint — hospital（无前缀，从池中随机选）=====
console.log('\n§4 nameSupportPoint — hospital')

const hospitalName = nameSupportPoint('hospital', '朝阳区')
assertInPool('医院名从池中选取', hospitalName, pools.hospital)
assertIncludes('医院名包含"急救中心"', hospitalName, '急救中心')

// 多次调用应有随机性（10 次调用至少出现 2 种结果）
const hospitalSet = new Set()
for (let i = 0; i < 10; i++) {
  hospitalSet.add(nameSupportPoint('hospital', '朝阳区'))
}
assert('10 次调用医院名至少 2 种', hospitalSet.size >= 2, true)

// ===== §5 nameSupportPoint — supply_depot（从池中随机选）=====
console.log('\n§5 nameSupportPoint — supply_depot')

const depotName = nameSupportPoint('supply_depot', '朝阳区')
assertInPool('物资库名从池中选取', depotName, pools.supply_depot)
assertIncludes('物资库名包含"物资"', depotName, '物资')

// ===== §6 nameSupportPoint — shelter（从池中随机选）=====
console.log('\n§6 nameSupportPoint — shelter')

const shelterName = nameSupportPoint('shelter', '朝阳区')
assertInPool('避难场所名从池中选取', shelterName, pools.shelter)
assertIncludes('避难场所名包含"应急避难场所"', shelterName, '应急避难场所')

// ===== §7 nameSupplyPoint — 4 类物资点 =====
console.log('\n§7 nameSupplyPoint — 4 类物资点')

const grainName = nameSupplyPoint('grain_oil')
assertInPool('粮油店名从池中选取', grainName, pools.grain_oil)

const superName = nameSupplyPoint('supermarket')
assertInPool('超市名从池中选取', superName, pools.supermarket)

const pharmacyName = nameSupplyPoint('pharmacy')
assertInPool('药店名从池中选取', pharmacyName, pools.pharmacy)

const gasName = nameSupplyPoint('gas_station')
assertInPool('加油站名从池中选取', gasName, pools.gas_station)

// 超市名必须是文档示例品牌之一
assertInPool(
  '超市名是文档示例品牌之一',
  nameSupplyPoint('supermarket'),
  expectedSupermarkets,
)

// ===== §8 随机性验证 =====
console.log('\n§8 随机性验证')

// 多次调用同一类型应有随机性
const set = new Set()
for (let i = 0; i < 20; i++) {
  set.add(nameSupplyPoint('supermarket'))
}
assert('20 次调用超市名至少 2 种', set.size >= 2, true)

// ===== §9 非法 type 兜底 =====
console.log('\n§9 非法 type 兜底')

const unknownSupport = nameSupportPoint('unknown_type', '朝阳区')
assertIncludes('非法支援点 type 兜底含"应急救援点"', unknownSupport, '应急救援点')

const unknownSupply = nameSupplyPoint('unknown_type')
assert('非法物资点 type 兜底', unknownSupply, '通用物资点')

// ===== 测试结果汇总 =====
console.log('\n=== 测试结果汇总 ===')
console.log(`  ✅ 通过: ${pass}`)
console.log(`  ❌ 失败: ${fail}`)
console.log(`  总计: ${pass + fail}`)

if (fail > 0) {
  console.log('\n⚠️ 存在失败用例，请检查 earthquakeNaming.js 实现')
  process.exit(1)
} else {
  console.log('\n✅ 全部测试通过')
  process.exit(0)
}
