/**
 * 地震救援点位命名工具
 *
 * 用途：为支援点（应急管理局/消防/医院/物资库/避难场所）
 *      和物资点（粮油/超市/药店/加油站）生成符合现实场景的名称
 *
 * 文档参考：
 *   - openspec/changes/20260705-earthquake-rescue-refactor/specs/earthquake-rescue/spec.md §3.1, §3.2
 *   - openspec/changes/20260705-earthquake-rescue-refactor/tasks.md §T3.1
 *
 * 命名策略：
 *   - emergency_management → "{区县}应急管理局"（前缀策略）
 *   - fire_station         → "{区县}消防救援站" 或 "{区县}第二消防救援站"（多个加序号）
 *   - hospital             → 通用医院名池（无前缀）
 *   - supply_depot         → 物资库名池（含城市名前缀）
 *   - shelter              → 公园应急避难场所名池
 *   - grain_oil            → 粮油品牌/连锁名
 *   - supermarket          → 超市品牌名（永辉/物美/华润万家/大润发）
 *   - pharmacy             → 药店品牌名（国大药房/同仁堂/益丰药房）
 *   - gas_station          → 加油站品牌名（中国石化/中国石油）
 */

// ==================== 名称池 ====================

/**
 * 支援点名称池
 *
 * 前 2 类（应急管理局/消防）使用函数生成（需 districtName 前缀）；
 * 后 3 类（医院/物资库/避难场所）使用静态池，随机选取。
 */
const HOSPITAL_NAMES = [
  '市人民医院急救中心',
  '中日友好医院急救中心',
  '中心医院急救中心',
  '第一人民医院急救中心',
  '协和医院急救中心',
]

const SUPPLY_DEPOT_NAMES = [
  '中央救灾物资储备库',
  '市级应急物资储备库',
  '区级综合物资储备库',
  '民政局救灾物资储备中心',
]

const SHELTER_NAMES = [
  '人民公园应急避难场所',
  '奥林匹克森林公园应急避难场所',
  '城市公园应急避难场所',
  '体育中心应急避难场所',
  '中心广场应急避难场所',
]

/**
 * 物资点名称池（4 类）
 */
const SUPPLY_POINT_NAMES = {
  grain_oil: [
    '中粮粮油直营店',
    '金龙鱼粮油专卖店',
    '京粮集团直营店',
    '益海嘉里粮油店',
  ],
  supermarket: ['永辉超市', '物美超市', '华润万家', '大润发'],
  pharmacy: [
    '国大药房',
    '同仁堂',
    '益丰药房',
    '大参林药房',
    '老百姓大药房',
  ],
  gas_station: [
    '中国石化加油站',
    '中国石油加油站',
    '中海油加油站',
    '壳牌加油站',
  ],
}

// 中文序号（用于多个消防救援站时加序号）
const CN_ORDINAL = ['二', '三', '四', '五']

// ==================== 内部工具 ====================

/**
 * 从数组中随机选取一个元素
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * 生成"消防救援站"序号
 *
 * index=0 → 无序号（"{区县}消防救援站"）
 * index=1 → "{区县}第二消防救援站"
 * index=2 → "{区县}第三消防救援站"
 */
function fireStationSuffix(index) {
  if (index === 0) return ''
  const ordinal = CN_ORDINAL[index - 1] || CN_ORDINAL[CN_ORDINAL.length - 1]
  return `第${ordinal}`
}

// ==================== 公开 API ====================

/**
 * 生成支援点名称
 *
 * @param {string} type - 支援点类型
 *   emergency_management / fire_station / hospital / supply_depot / shelter
 * @param {string} [districtName='通用'] - 区县名（用于前缀策略；缺失时降级为通用名）
 * @param {number} [index=0] - 同类点的序号（用于多个消防站）
 * @returns {string} 名称
 */
export function nameSupportPoint(type, districtName = '通用', index = 0) {
  switch (type) {
    case 'emergency_management':
      return `${districtName}应急管理局`

    case 'fire_station': {
      const suffix = fireStationSuffix(index)
      return suffix
        ? `${districtName}${suffix}消防救援站`
        : `${districtName}消防救援站`
    }

    case 'hospital':
      return pickRandom(HOSPITAL_NAMES)

    case 'supply_depot':
      return pickRandom(SUPPLY_DEPOT_NAMES)

    case 'shelter':
      return pickRandom(SHELTER_NAMES)

    default:
      return `${districtName}应急救援点`
  }
}

/**
 * 生成物资点名称
 *
 * @param {string} type - 物资点类型
 *   grain_oil / supermarket / pharmacy / gas_station
 * @returns {string} 名称（品牌名，无前缀）
 */
export function nameSupplyPoint(type) {
  const pool = SUPPLY_POINT_NAMES[type]
  if (!pool || pool.length === 0) return '通用物资点'
  return pickRandom(pool)
}

/**
 * 获取名称池（用于测试与自检）
 *
 * 不参与命名逻辑，仅供单测断言"名称池齐全"。
 */
export function getNamePools() {
  return {
    hospital: [...HOSPITAL_NAMES],
    supply_depot: [...SUPPLY_DEPOT_NAMES],
    shelter: [...SHELTER_NAMES],
    grain_oil: [...SUPPLY_POINT_NAMES.grain_oil],
    supermarket: [...SUPPLY_POINT_NAMES.supermarket],
    pharmacy: [...SUPPLY_POINT_NAMES.pharmacy],
    gas_station: [...SUPPLY_POINT_NAMES.gas_station],
  }
}
