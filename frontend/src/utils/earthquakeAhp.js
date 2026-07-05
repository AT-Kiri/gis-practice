/**
 * 地震灾害灾后灾情等级 AHP 评估模型
 *
 * 算法依据：
 *  - SL 579-2012《洪涝灾情评估标准》（水利部，2012）— DDI 阈值 80/60/40
 *  - 《国家地震应急预案》（国办函〔2025〕102号）— 灾害分级 + 子指标权重
 *  - Saaty T.L. (1980) The Analytic Hierarchy Process — AHP 方法论基础
 *
 * 文档参考：
 *  - docs/ahp-disaster-assessment.md §1~§6（权重、阈值、DDI 公式）
 *  - docs/earthquake-rescue-design.md §6.2/§6.5（缓冲区配置）
 */

// ====== 全局组合权重（来源：docs/ahp-disaster-assessment.md §2.1）======
// 权重总和 = 1.0000
export const WEIGHTS = {
  deaths: 0.2457,            // C11 死亡人口
  affected_pop: 0.1752,      // C21 受灾人口
  economic_loss: 0.1409,     // C41 直接经济损失（万元）
  missing: 0.1352,            // C13 失踪人口
  collapsed_houses: 0.1057,  // C31 倒塌房屋
  evacuated: 0.0876,         // C22 紧急转移安置人口
  injured: 0.0744,            // C12 受伤人口
  damaged_houses: 0.0352,    // C32 严重损坏房屋
}

// ====== 指标阈值（来源：docs/ahp-disaster-assessment.md §5）======
// [min_value, max_value] —— 极值标准化的上下界
// min_value 对应 norm=0，max_value 对应 norm=100
export const THRESHOLDS = {
  deaths:           [0, 300],
  injured:          [0, 1000],
  missing:          [0, 100],
  affected_pop:     [0, 100000],
  evacuated:        [0, 100000],
  collapsed_houses: [0, 10000],
  damaged_houses:   [0, 50000],
  economic_loss:    [0, 1000000],
}

// ====== 灾情等级阈值（来源：SL 579-2012 表5 + 国家地震应急预案 §1.4）======
// DDI ≥ 80：Ⅰ级 特别重大
// 60 ≤ DDI < 80：Ⅱ级 重大
// 40 ≤ DDI < 60：Ⅲ级 较大
// DDI < 40：Ⅳ级 一般
const DISASTER_LEVELS = [
  { min: 80, level: 1, name: '特别重大', color: '#e53e3e' },
  { min: 60, level: 2, name: '重大',     color: '#dd6b20' },
  { min: 40, level: 3, name: '较大',     color: '#d69e2e' },
  { min: 0,  level: 4, name: '一般',     color: '#38a169' },
]

// ====== 缓冲区配置（来源：docs/earthquake-rescue-design.md §6.5）======
// 大缓冲区依据：GB 51080-2015《城市消防规划规范》消防站 5 分钟服务半径（~3km）
//              GB/T 44013-2024《应急避难场所 分级及分类》
// 小缓冲区依据：估算值（约为大缓冲区的 1/4），Ⅳ级 500m 与三级避难场所服务半径一致
export const BUFFER_CONFIG = {
  1: {
    name: '特别重大',
    inner: 2000,
    outer: 8000,
    innerColor: 'rgba(229, 62, 62, 0.25)',
    outerColor: 'rgba(221, 107, 32, 0.15)',
  },
  2: {
    name: '重大',
    inner: 1500,
    outer: 6000,
    innerColor: 'rgba(229, 62, 62, 0.25)',
    outerColor: 'rgba(221, 107, 32, 0.15)',
  },
  3: {
    name: '较大',
    inner: 1000,
    outer: 4000,
    innerColor: 'rgba(229, 62, 62, 0.25)',
    outerColor: 'rgba(221, 107, 32, 0.15)',
  },
  4: {
    name: '一般',
    inner: 500,
    outer: 2000,
    innerColor: 'rgba(229, 62, 62, 0.25)',
    outerColor: 'rgba(221, 107, 32, 0.15)',
  },
}

// ====== 8 指标元数据（用于前端展示）======
export const INDICATOR_META = [
  { key: 'deaths',           code: 'C11', label: '死亡人口',         unit: '人',   weight: 0.2457, threshold: [0, 300]     },
  { key: 'affected_pop',     code: 'C21', label: '受灾人口',         unit: '人',   weight: 0.1752, threshold: [0, 100000]   },
  { key: 'economic_loss',    code: 'C41', label: '直接经济损失',     unit: '万元', weight: 0.1409, threshold: [0, 1000000]  },
  { key: 'missing',          code: 'C13', label: '失踪人口',         unit: '人',   weight: 0.1352, threshold: [0, 100]     },
  { key: 'collapsed_houses', code: 'C31', label: '倒塌房屋',         unit: '间',   weight: 0.1057, threshold: [0, 10000]   },
  { key: 'evacuated',        code: 'C22', label: '紧急转移安置人口', unit: '人',   weight: 0.0876, threshold: [0, 100000]   },
  { key: 'injured',          code: 'C12', label: '受伤人口',         unit: '人',   weight: 0.0744, threshold: [0, 1000]    },
  { key: 'damaged_houses',   code: 'C32', label: '严重损坏房屋',     unit: '间',   weight: 0.0352, threshold: [0, 50000]   },
]

// ====== 准则层权重（用于分组展示，来源 §2.2）======
export const CRITERIA_WEIGHTS = {
  B1_personnel:    0.4554, // 人员伤亡（C11+C12+C13）
  B2_scope:         0.2628, // 受灾范围（C21+C22）
  B3_housing:       0.1409, // 房屋损毁（C31+C32）
  B4_economic:      0.1409, // 直接经济损失（C41）
}

/**
 * 极值标准化到 0~100
 *
 * 公式（来源：docs/ahp-disaster-assessment.md §4.2）：
 *   norm_value = (raw_value - min_value) / (max_value - min_value) × 100
 *
 * 边界规则：
 *   - raw_value ≤ min_value → 返回 0.0
 *   - raw_value ≥ max_value → 返回 100.0
 *
 * @param {number} raw - 原始指标值
 * @param {number} minVal - 指标最小值（norm=0）
 * @param {number} maxVal - 指标最大值（norm=100）
 * @returns {number} 标准化值（0~100）
 */
export function normalize(raw, minVal, maxVal) {
  if (raw <= minVal) return 0.0
  if (raw >= maxVal) return 100.0
  return ((raw - minVal) / (maxVal - minVal)) * 100.0
}

/**
 * 计算灾情综合指数 DDI（Disaster Damage Index）
 *
 * 公式（来源：docs/ahp-disaster-assessment.md §4.1）：
 *   DDI = Σ (全局权重_i × 标准化指标值_i)
 *
 * 输出范围：0~100
 *
 * @param {Object} data - 8 项灾情指标
 *   { deaths, injured, missing, affected_pop, evacuated,
 *     collapsed_houses, damaged_houses, economic_loss }
 * @returns {number} DDI 数值，保留 2 位小数
 */
export function calculateDDI(data) {
  let ddi = 0.0
  for (const key of Object.keys(WEIGHTS)) {
    const weight = WEIGHTS[key]
    const [minVal, maxVal] = THRESHOLDS[key]
    const raw = Number(data?.[key] ?? 0) || 0
    const norm = normalize(raw, minVal, maxVal)
    ddi += weight * norm
  }
  return Math.round(ddi * 100) / 100
}

/**
 * 根据 DDI 获取灾情等级
 *
 * 等级划分（来源：SL 579-2012 + 国家地震应急预案 §1.4）：
 *   Ⅰ级 特别重大：DDI ≥ 80
 *   Ⅱ级 重大：60 ≤ DDI < 80
 *   Ⅲ级 较大：40 ≤ DDI < 60
 *   Ⅳ级 一般：DDI < 40
 *
 * 边界值归入上一级（如 DDI=80 归入 Ⅰ级）
 *
 * @param {number} ddi - 灾情综合指数（0~100）
 * @returns {{level:number, name:string, color:string}} 灾情等级对象
 */
export function getDisasterLevel(ddi) {
  for (const item of DISASTER_LEVELS) {
    if (ddi >= item.min) {
      return { level: item.level, name: item.name, color: item.color }
    }
  }
  // 兜底：DDI < 0 视为 Ⅳ级
  const fallback = DISASTER_LEVELS[DISASTER_LEVELS.length - 1]
  return { level: fallback.level, name: fallback.name, color: fallback.color }
}

/**
 * 根据 DDI 等级获取缓冲区配置
 *
 * 配置来源（docs/earthquake-rescue-design.md §6.5）：
 *   Ⅰ级：inner=2000m, outer=8000m
 *   Ⅱ级：inner=1500m, outer=6000m
 *   Ⅲ级：inner=1000m, outer=4000m
 *   Ⅳ级：inner=500m,  outer=2000m
 *
 * @param {number} ddiLevel - 灾情等级（1~4）
 * @returns {Object} 缓冲区配置 { name, inner, outer, innerColor, outerColor }
 */
export function getBufferConfig(ddiLevel) {
  return BUFFER_CONFIG[ddiLevel] || BUFFER_CONFIG[4]
}

/**
 * 完整评估：一次性输出 DDI + 等级 + 缓冲区配置
 *
 * @param {Object} data - 8 项灾情指标
 * @returns {{
 *   ddi: number,
 *   level: {level:number, name:string, color:string},
 *   bufferConfig: Object,
 *   details: Array<{key, code, label, raw, normalized, weight, contribution}>,
 * }}
 */
export function assessDisaster(data) {
  const ddi = calculateDDI(data)
  const level = getDisasterLevel(ddi)
  const bufferConfig = getBufferConfig(level.level)

  // 详细分解：每个指标的原始值、标准化值、权重、贡献度
  const details = INDICATOR_META.map((meta) => {
    const raw = Number(data?.[meta.key] ?? 0) || 0
    const [minVal, maxVal] = meta.threshold
    const normalized = normalize(raw, minVal, maxVal)
    const contribution = Math.round(meta.weight * normalized * 100) / 100
    return {
      key: meta.key,
      code: meta.code,
      label: meta.label,
      unit: meta.unit,
      raw,
      normalized: Math.round(normalized * 100) / 100,
      weight: meta.weight,
      contribution,
    }
  })

  return { ddi, level, bufferConfig, details }
}
