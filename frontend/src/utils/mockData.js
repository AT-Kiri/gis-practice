/**
 * 数据大屏 - 模拟数据生成模块
 * 仅生成地震灾种数据，对齐 8 指标 DDI 模型
 *
 * 改造说明（20260705-earthquake-rescue-refactor）：
 *  - 移除暴雨/大风/沙尘/强对流/洪水/火灾等 6 种非地震灾种
 *  - 地震灾种数据字段对齐 8 指标 DDI 模型（earthquakeAhp.js）
 *  - 县区列表、坐标、CRUD mock 数据保持不变
 */
// ====== 京津冀县区列表 ======
const COUNTIES = [
  // 北京市
  '东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区',
  '通州区', '大兴区', '房山区', '门头沟区', '昌平区', '顺义区',
  '平谷区', '怀柔区', '密云区', '延庆区',
  // 天津市
  '和平区', '河东区', '河西区', '南开区', '河北区', '红桥区',
  '滨海新区', '东丽区', '西青区', '津南区', '北辰区',
  '武清区', '宝坻区', '宁河区', '静海区', '蓟州区',
  // 河北省（环京津）
  '三河市', '大厂县', '香河县', '固安县', '永清县', '霸州市',
  '文安县', '大城县', '涿州市', '高碑店市', '定兴县', '易县',
  '涞水县', '涞源县', '唐县', '阜平县', '曲阳县', '顺平县',
  '张家口市区', '宣化区', '下花园区', '怀来县', '涿鹿县', '蔚县',
  '阳原县', '怀安县', '万全区', '崇礼区', '赤城县', '沽源县',
  '康保县', '尚义县', '张北县',
]

// ====== 县区中心坐标（近似值） ======
const COUNTY_COORDS = {
  '东城区': [116.416, 39.928], '西城区': [116.366, 39.912],
  '朝阳区': [116.443, 39.921], '海淀区': [116.298, 39.959],
  '丰台区': [116.287, 39.858], '石景山区': [116.223, 39.906],
  '通州区': [116.662, 39.902], '大兴区': [116.338, 39.726],
  '房山区': [116.143, 39.736], '门头沟区': [116.102, 39.940],
  '昌平区': [116.231, 40.221], '顺义区': [116.654, 40.130],
  '平谷区': [117.121, 40.140], '怀柔区': [116.642, 40.316],
  '密云区': [116.843, 40.377], '延庆区': [115.975, 40.457],
  '和平区': [117.215, 39.117], '河东区': [117.251, 39.128],
  '河西区': [117.223, 39.109], '南开区': [117.150, 39.138],
  '河北区': [117.197, 39.148], '红桥区': [117.151, 39.167],
  '滨海新区': [117.681, 39.017], '东丽区': [117.314, 39.086],
  '西青区': [117.009, 39.141], '津南区': [117.357, 38.937],
  '北辰区': [117.135, 39.224], '武清区': [117.044, 39.384],
  '宝坻区': [117.310, 39.717], '宁河区': [117.825, 39.330],
  '静海区': [116.974, 38.947], '蓟州区': [117.408, 40.046],
  '三河市': [117.078, 39.983], '大厂县': [116.989, 39.886],
  '香河县': [117.006, 39.761], '固安县': [116.299, 39.438],
  '永清县': [116.499, 39.322], '霸州市': [116.392, 39.126],
  '文安县': [116.458, 38.873], '大城县': [116.654, 38.705],
  '涿州市': [115.974, 39.485], '高碑店市': [115.874, 39.327],
  '定兴县': [115.808, 39.263], '易县': [115.498, 39.349],
  '涞水县': [115.715, 39.394], '涞源县': [114.694, 39.360],
  '唐县': [114.983, 38.748], '阜平县': [114.195, 38.849],
  '曲阳县': [114.745, 38.622], '顺平县': [115.135, 38.838],
  '张家口市区': [114.884, 40.768], '宣化区': [115.099, 40.609],
  '下花园区': [115.287, 40.502], '怀来县': [115.518, 40.415],
  '涿鹿县': [115.220, 40.376], '蔚县': [114.589, 39.840],
  '阳原县': [114.150, 40.103], '怀安县': [114.386, 40.674],
  '万全区': [114.741, 40.767], '崇礼区': [115.282, 40.975],
  '赤城县': [115.831, 40.913], '沽源县': [115.689, 41.670],
  '康保县': [114.600, 41.852], '尚义县': [113.969, 41.080],
  '张北县': [114.720, 41.158],
}

// ====== 地震灾种 4 级指标区间（来源 earthquakeAhp.js THRESHOLDS）======
// Level 1: 特别重大（DDI ≥ 80）
// Level 2: 重大（60 ≤ DDI < 80）
// Level 3: 较大（40 ≤ DDI < 60）
// Level 4: 一般（DDI < 40）
const EARTHQUAKE_PROFILES = {
  1: { // 特别重大
    deaths: [200, 300], injured: [800, 1000], missing: [50, 100],
    affected_pop: [80000, 100000], evacuated: [50000, 100000],
    collapsed_houses: [5000, 10000], damaged_houses: [30000, 50000],
    economic_loss: [500000, 1000000],
  },
  2: { // 重大
    deaths: [100, 200], injured: [500, 800], missing: [20, 50],
    affected_pop: [50000, 80000], evacuated: [20000, 50000],
    collapsed_houses: [2000, 5000], damaged_houses: [15000, 30000],
    economic_loss: [200000, 500000],
  },
  3: { // 较大
    deaths: [30, 100], injured: [200, 500], missing: [5, 20],
    affected_pop: [20000, 50000], evacuated: [5000, 20000],
    collapsed_houses: [500, 2000], damaged_houses: [5000, 15000],
    economic_loss: [50000, 200000],
  },
  4: { // 一般
    deaths: [0, 30], injured: [50, 200], missing: [0, 5],
    affected_pop: [5000, 20000], evacuated: [1000, 5000],
    collapsed_houses: [100, 500], damaged_houses: [1000, 5000],
    economic_loss: [10000, 50000],
  },
}

// 等级分布权重：5% Ⅰ级 / 15% Ⅱ级 / 30% Ⅲ级 / 50% Ⅳ级
const LEVEL_DISTRIBUTION = [
  { level: 1, weight: 0.05 },
  { level: 2, weight: 0.15 },
  { level: 3, weight: 0.30 },
  { level: 4, weight: 0.50 },
]

// 救援类型映射（按等级）
const RESCUE_TYPES_BY_LEVEL = {
  1: '生命探测仪、挖掘机、医疗队、帐篷、物资运输车',
  2: '医疗队、担架、挖掘机、生命探测仪',
  3: '医疗队、担架、生命探测仪',
  4: '担架、医疗队',
}

// ====== 天气状况 ======
const WEATHER_CONDITIONS = ['晴', '多云', '阴', '小雨', '中雨', '大雨', '暴雨', '雷阵雨', '雾', '小雪', '中雪', '大雪']

import { assessDisaster } from './earthquakeAhp.js'

// ====== 工具函数 ======
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function randFloat(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

/**
 * 根据权重数组随机选择地震等级
 */
function pickEarthquakeLevel() {
  const r = Math.random()
  let acc = 0
  for (const { level, weight } of LEVEL_DISTRIBUTION) {
    acc += weight
    if (r <= acc) return level
  }
  return 4
}

/**
 * 生成指定等级的地震 8 指标数据
 */
function generateEarthquakeIndicators(level) {
  const profile = EARTHQUAKE_PROFILES[level] || EARTHQUAKE_PROFILES[4]
  const data = {}
  for (const key of Object.keys(profile)) {
    const [min, max] = profile[key]
    data[key] = rand(min, max)
  }
  return data
}

/**
 * 生成县区灾害描述
 */
function buildDescription(county, level, ddi) {
  if (level === 1) {
    return `${county}发生特别重大地震灾害，DDI=${ddi}，房屋大面积倒塌，人员伤亡严重，需立即启动一级应急响应`
  } else if (level === 2) {
    return `${county}发生重大地震灾害，DDI=${ddi}，部分房屋倒塌，人员伤亡较大，需启动二级应急响应`
  } else if (level === 3) {
    return `${county}发生较大地震灾害，DDI=${ddi}，部分房屋受损，少量人员伤亡，启动三级应急响应`
  } else {
    return `${county}发生一般地震灾害，DDI=${ddi}，个别房屋受损，无重大人员伤亡，启动四级应急响应`
  }
}

// ====== 主要生成函数 ======

/**
 * 生成各县区地震灾害数据
 *
 * 每个县区数据包含：
 *   - 8 DDI 指标：deaths/injured/missing/affected_pop/evacuated/collapsed_houses/damaged_houses/economic_loss
 *   - 评估结果：ddi（灾情综合指数）/ disasterLevel（1-4）/ disasterLevelName / bufferConfig
 *   - 兼容字段：affectedPeople（= affected_pop）、rescuePersonnel、requiredRescueType、description
 *
 * @returns {Object} Map<县区名, 灾害信息>
 */
export function generateCountyDisasters() {
  const data = {}
  COUNTIES.forEach((county) => {
    const level = pickEarthquakeLevel()
    const indicators = generateEarthquakeIndicators(level)
    const { ddi, level: levelInfo, bufferConfig } = assessDisaster(indicators)

    data[county] = {
      countyName: county,
      coords: COUNTY_COORDS[county] || [116.4 + randFloat(-0.5, 0.5), 39.9 + randFloat(-0.5, 0.5)],
      // 灾种信息
      disasterType: '地震',
      disasterLevel: levelInfo.level, // 1-4
      disasterLevelName: levelInfo.name, // 特别重大/重大/较大/一般
      disasterLevelColor: levelInfo.color,
      ddi,
      // 8 DDI 指标
      ...indicators,
      // 兼容字段（DashboardMap tooltip / DisasterDetailPanel 旧字段）
      affectedPeople: indicators.affected_pop,
      rescuePersonnel: rand(50, 200 + level * 50),
      requiredRescueType: RESCUE_TYPES_BY_LEVEL[level] || '担架、医疗队',
      description: buildDescription(county, level, ddi),
      // 旧 AHP 字段（兼容 WeatherPanel 排序）
      ahpScore: ddi,
      ahpRiskLevel: levelInfo.name,
      // 缓冲区配置（供 BufferAnalysisModal 直接使用）
      bufferConfig,
    }
  })
  return data
}

/**
 * 生成气象数据（保留 WeatherPanel 兼容字段，灾种仅地震）
 *
 * 字段说明：
 *   - riskLevel / ahpScore / ahpRiskLevel：保留字段名以兼容 WeatherPanel
 *   - disasterType：仅 '地震' 或 '—'
 */
export function generateWeatherData() {
  return COUNTIES.map((county) => {
    const level = pickEarthquakeLevel()
    const indicators = generateEarthquakeIndicators(level)
    const { ddi, level: levelInfo } = assessDisaster(indicators)
    const rainfall = randFloat(0, 50) // 地震场景下降雨减弱
    const windForce = rand(2, 8)
    const earthquakeIntensity = randFloat(3.0, 7.5)

    // 风险等级（5 档，与 WeatherPanel 颜色映射保持一致）
    const riskLevel = level === 1 ? '极高' : level === 2 ? '高' : level === 3 ? '中' : '较低'

    return {
      countyName: county,
      riskLevel,
      disasterType: level <= 3 ? '地震' : '—',
      windForce,
      rainfall,
      earthquakeIntensity,
      trappedPeople: level <= 3 ? rand(10, 300) : rand(0, 10),
      ahpScore: ddi, // 兼容 WeatherPanel 字段名
      ahpRiskLevel: levelInfo.name,
      availableSupplies: level <= 3
        ? pick(['帐篷200顶、食品5吨', '医疗包500个', '饮用水20吨'])
        : '充足',
      weatherHistory: generateWeatherHistory(),
      weatherForecast: generateWeatherForecast(),
    }
  })
}

/**
 * 生成前3天天气历史
 */
function generateWeatherHistory() {
  const days = []
  for (let i = 3; i >= 1; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      condition: pick(WEATHER_CONDITIONS),
      tempHigh: rand(25, 38),
      tempLow: rand(18, 26),
      precipitation: randFloat(0, 120),
    })
  }
  return days
}

/**
 * 生成后3天天气预报
 */
function generateWeatherForecast() {
  const days = []
  for (let i = 1; i <= 3; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      condition: pick(WEATHER_CONDITIONS),
      tempHigh: rand(24, 36),
      tempLow: rand(16, 24),
      precipitation: randFloat(0, 100),
    })
  }
  return days
}

/**
 * 获取所有县区名称列表
 */
export function getCounties() {
  return COUNTIES
}

/**
 * 获取县区坐标
 */
export function getCountyCoords(county) {
  return COUNTY_COORDS[county] || [116.4, 39.9]
}

export { COUNTIES, COUNTY_COORDS }

// ====== 数据库表格模块 - 模拟数据生成 ======
// 预警信息主表、协同处置响应表、物资调度表的初始数据，供 WarnInfoView/CoordResponseView/SupplyDispatchView 使用

export function generateSupplyDispatchData() {
  return [
    {
      dispatch_id: 'DSP-20260629-001',
      warn_id: 'WARN-20260629-01',
      storage_addr: '北京市朝阳区应急储备库（116.46, 39.92）',
      supply_type: '排水',
      supply_num: 320,
      demand_area: '河北涿州',
      transport_route: '朝阳区 → 京港澳高速 → 涿州',
      distance: 88.4,
      depart_time: '2026-06-29 08:10',
      plan_arrive: '2026-06-29 10:20',
      transport_team: '应急运输一队',
      dispatch_state: 1,
    },
    {
      dispatch_id: 'DSP-20260629-002',
      warn_id: 'WARN-20260629-02',
      storage_addr: '天津滨海新区物资中心（117.68, 39.02）',
      supply_type: '救生',
      supply_num: 180,
      demand_area: '天津静海',
      transport_route: '滨海新区 → 津静公路 → 静海',
      distance: 62.7,
      depart_time: '2026-06-29 07:40',
      plan_arrive: '2026-06-29 09:10',
      transport_team: '海上救援小队',
      dispatch_state: 2,
    },
    {
      dispatch_id: 'DSP-20260629-003',
      warn_id: 'WARN-20260629-03',
      storage_addr: '河北廊坊应急仓库（116.70, 39.52）',
      supply_type: '医疗',
      supply_num: 260,
      demand_area: '河北霸州',
      transport_route: '廊坊 → G45高速 → 霸州',
      distance: 54.3,
      depart_time: '2026-06-29 09:30',
      plan_arrive: '2026-06-29 11:00',
      transport_team: '医疗支援队',
      dispatch_state: 0,
    },
    {
      dispatch_id: 'DSP-20260629-004',
      warn_id: 'WARN-20260629-04',
      storage_addr: '北京市海淀区储备站（116.30, 39.96）',
      supply_type: '食品',
      supply_num: 450,
      demand_area: '北京延庆',
      transport_route: '海淀 → 六环 → 延庆',
      distance: 76.1,
      depart_time: '2026-06-29 06:50',
      plan_arrive: '2026-06-29 08:40',
      transport_team: '后勤保障队',
      dispatch_state: 2,
    },
    {
      dispatch_id: 'DSP-20260629-005',
      warn_id: 'WARN-20260629-05',
      storage_addr: '天津河东区物资库（117.23, 39.13）',
      supply_type: '排水',
      supply_num: 280,
      demand_area: '天津武清',
      transport_route: '河东 → 津滨大道 → 武清',
      distance: 82.7,
      depart_time: '2026-06-29 08:50',
      plan_arrive: '2026-06-29 11:10',
      transport_team: '市政排水队',
      dispatch_state: 1,
    },
    {
      dispatch_id: 'DSP-20260629-006',
      warn_id: 'WARN-20260629-06',
      storage_addr: '河北保定应急仓库（115.48, 38.87）',
      supply_type: '医疗',
      supply_num: 320,
      demand_area: '河北涞水',
      transport_route: '保定 → G4京港澳 → 涞水',
      distance: 95.0,
      depart_time: '2026-06-29 09:15',
      plan_arrive: '2026-06-29 11:25',
      transport_team: '医疗援助队',
      dispatch_state: 0,
    },
    {
      dispatch_id: 'DSP-20260629-007',
      warn_id: 'WARN-20260629-07',
      storage_addr: '河北廊坊物资中心（116.70, 39.52）',
      supply_type: '救生',
      supply_num: 220,
      demand_area: '河北安次区',
      transport_route: '廊坊 → S260 → 安次',
      distance: 42.3,
      depart_time: '2026-06-29 07:20',
      plan_arrive: '2026-06-29 08:30',
      transport_team: '救援二队',
      dispatch_state: 2,
    },
    {
      dispatch_id: 'DSP-20260629-008',
      warn_id: 'WARN-20260629-08',
      storage_addr: '河北石家庄应急库（114.48, 38.03）',
      supply_type: '食品',
      supply_num: 520,
      demand_area: '石家庄鹿泉',
      transport_route: '石家庄 → 104国道 → 鹿泉',
      distance: 63.5,
      depart_time: '2026-06-29 06:30',
      plan_arrive: '2026-06-29 08:00',
      transport_team: '后勤三队',
      dispatch_state: 1,
    },
    {
      dispatch_id: 'DSP-20260629-009',
      warn_id: 'WARN-20260629-09',
      storage_addr: '北京市顺义区物资站（116.65, 40.13）',
      supply_type: '医疗',
      supply_num: 140,
      demand_area: '北京怀柔',
      transport_route: '顺义 → G101 → 怀柔',
      distance: 58.8,
      depart_time: '2026-06-29 09:05',
      plan_arrive: '2026-06-29 10:40',
      transport_team: '医疗紧急小组',
      dispatch_state: 0,
    },
    {
      dispatch_id: 'DSP-20260629-010',
      warn_id: 'WARN-20260629-10',
      storage_addr: '天津西青区应急库（117.00, 39.14）',
      supply_type: '排水',
      supply_num: 360,
      demand_area: '天津南开',
      transport_route: '西青 → 津塘公路 → 南开',
      distance: 35.2,
      depart_time: '2026-06-29 08:00',
      plan_arrive: '2026-06-29 09:00',
      transport_team: '排水队',
      dispatch_state: 1,
    },
    {
      dispatch_id: 'DSP-20260629-011',
      warn_id: 'WARN-20260629-11',
      storage_addr: '河北霸州物资库（116.39, 39.13）',
      supply_type: '救生',
      supply_num: 210,
      demand_area: '河北三河',
      transport_route: '霸州 → S101 → 三河',
      distance: 54.8,
      depart_time: '2026-06-29 10:10',
      plan_arrive: '2026-06-29 11:45',
      transport_team: '急救三队',
      dispatch_state: 0,
    },
    {
      dispatch_id: 'DSP-20260629-012',
      warn_id: 'WARN-20260629-12',
      storage_addr: '北京昌平应急站（116.23, 40.22）',
      supply_type: '食品',
      supply_num: 460,
      demand_area: '北京顺义',
      transport_route: '昌平 → 京承高速 → 顺义',
      distance: 39.2,
      depart_time: '2026-06-29 09:20',
      plan_arrive: '2026-06-29 10:05',
      transport_team: '后勤保障一队',
      dispatch_state: 1,
    },
    {
      dispatch_id: 'DSP-20260629-013',
      warn_id: 'WARN-20260629-13',
      storage_addr: '河北廊坊应急仓（116.70, 39.52）',
      supply_type: '医疗',
      supply_num: 310,
      demand_area: '河北固安',
      transport_route: '廊坊 → 京开高速 → 固安',
      distance: 48.6,
      depart_time: '2026-06-29 09:50',
      plan_arrive: '2026-06-29 11:10',
      transport_team: '医疗支援二队',
      dispatch_state: 2,
    },
    {
      dispatch_id: 'DSP-20260629-014',
      warn_id: 'WARN-20260629-14',
      storage_addr: '天津塘沽应急库（117.70, 39.03）',
      supply_type: '排水',
      supply_num: 400,
      demand_area: '天津滨海新区',
      transport_route: '塘沽 → 滨海大道 → 滨海新区',
      distance: 22.4,
      depart_time: '2026-06-29 10:45',
      plan_arrive: '2026-06-29 11:30',
      transport_team: '排水保障队',
      dispatch_state: 0,
    },
  ]
}

export function generateCoordResponseData() {
  return [
    {
      response_id: 'RESP-20260629-001',
      warn_id: 'WARN-20260629-01',
      union_area: '通武廊',
      duty_user: '张强',
      contact_phone: '13912345678',
      call_mode: 2,
      response_state: 1,
      dispose_task: '组织跨区域会商，安排排涝和交通管控',
      joint_cmd: '启动联防联控机制，协调京津冀资源调配',
      feedback_time: '2026-06-29 08:55:00',
    },
    {
      response_id: 'RESP-20260629-002',
      warn_id: 'WARN-20260629-02',
      union_area: '津冀',
      duty_user: '李梅',
      contact_phone: '13887654321',
      call_mode: 1,
      response_state: 2,
      dispose_task: '启动双重叫应机制，对重点区域开展巡查',
      joint_cmd: '对接市县应急值班，实施跨区域调度',
      feedback_time: '2026-06-29 09:10:00',
    },
    {
      response_id: 'RESP-20260629-003',
      warn_id: 'WARN-20260629-03',
      union_area: '京津冀',
      duty_user: '王华',
      contact_phone: '13798761234',
      call_mode: 3,
      response_state: 0,
      dispose_task: '启动直达基层叫应，督促尽快落实处置方案',
      joint_cmd: '发布跨区域联防指令，明确责任单位',
      feedback_time: '2026-06-29 09:25:00',
    },
    {
      response_id: 'RESP-20260629-004',
      warn_id: 'WARN-20260629-04',
      union_area: '京津冀',
      duty_user: '赵鹏',
      contact_phone: '13655559999',
      call_mode: 2,
      response_state: 1,
      dispose_task: '联动水利、公安、交通部门，开辟应急通道',
      joint_cmd: '启动24小时值班调度，确保物资及时输送',
      feedback_time: '2026-06-29 09:40:00',
    },
    {
      response_id: 'RESP-20260629-005',
      warn_id: 'WARN-20260629-05',
      union_area: '津冀',
      duty_user: '孙丽',
      contact_phone: '13966668888',
      call_mode: 1,
      response_state: 2,
      dispose_task: '组织危险区域人员转移，监控堤坝水位变化',
      joint_cmd: '启动区域应急指挥系统，调配救援物资',
      feedback_time: '2026-06-29 10:10:00',
    },
    {
      response_id: 'RESP-20260629-006',
      warn_id: 'WARN-20260629-06',
      union_area: '京',
      duty_user: '刘涛',
      contact_phone: '13744443333',
      call_mode: 3,
      response_state: 1,
      dispose_task: '督促基层单位核查隐患点，安排夜间巡逻',
      joint_cmd: '下发现场处置方案，并汇总区域反馈',
      feedback_time: '2026-06-29 10:35:00',
    },
  ]
}

export function generateWarnInfoData() {
  return [
    {
      warn_id: 'WARN-20260629-01',
      district_code: '京',
      disaster_type: 1,
      warn_level: 4,
      real_meteor_data: '降雨120mm/h、风速13m/s、气压998hPa',
      risk_score: 8.6,
      release_time: '2026-06-29 07:30:00',
      valid_end_time: '2026-06-29 12:00:00',
      warn_content: '京津冀部分地区将出现强对流和暴雨，需加强转移和排水保障。',
      push_status: 1,
      create_user: 'user_zhang',
    },
    {
      warn_id: 'WARN-20260629-02',
      district_code: '津',
      disaster_type: 2,
      warn_level: 3,
      real_meteor_data: '风速10m/s、降雨80mm/h、气压1002hPa',
      risk_score: 7.4,
      release_time: '2026-06-29 06:50:00',
      valid_end_time: '2026-06-29 11:00:00',
      warn_content: '天津沿海地区出现大风预警，可能导致设施损坏。',
      push_status: 1,
      create_user: 'user_li',
    },
    {
      warn_id: 'WARN-20260629-03',
      district_code: '冀',
      disaster_type: 4,
      warn_level: 2,
      real_meteor_data: '降雨55mm/h、风速8m/s、气压1005hPa',
      risk_score: 6.1,
      release_time: '2026-06-29 08:05:00',
      valid_end_time: '2026-06-29 14:00:00',
      warn_content: '河北部分地区出现强对流天气，注意防雷防风。',
      push_status: 0,
      create_user: 'user_wang',
    },
    {
      warn_id: 'WARN-20260629-04',
      district_code: '京',
      disaster_type: 3,
      warn_level: 2,
      real_meteor_data: '沙尘影响，能见度下降至3km',
      risk_score: 5.8,
      release_time: '2026-06-29 08:40:00',
      valid_end_time: '2026-06-29 16:00:00',
      warn_content: '北京北部出现沙尘天气，建议暂停高空作业。',
      push_status: 1,
      create_user: 'user_chen',
    },
    {
      warn_id: 'WARN-20260629-05',
      district_code: '津',
      disaster_type: 1,
      warn_level: 4,
      real_meteor_data: '雷暴+暴雨，累计雨量达150mm',
      risk_score: 9.1,
      release_time: '2026-06-29 09:05:00',
      valid_end_time: '2026-06-29 13:00:00',
      warn_content: '天津市区暴雨成灾，需注意低洼地段积水。',
      push_status: 0,
      create_user: 'user_liu',
    },
    {
      warn_id: 'WARN-20260629-06',
      district_code: '冀',
      disaster_type: 2,
      warn_level: 3,
      real_meteor_data: '大风天气，风力8-10级',
      risk_score: 7.0,
      release_time: '2026-06-29 08:55:00',
      valid_end_time: '2026-06-29 18:00:00',
      warn_content: '河北部分地区发布大风预警，注意设施防护。',
      push_status: 1,
      create_user: 'user_zhang',
    },
  ]
}

export default {
  generateCountyDisasters,
  generateWeatherData,
  generateSupplyDispatchData,
  generateCoordResponseData,
  generateWarnInfoData,
  getCounties,
  getCountyCoords,
  COUNTIES,
  COUNTY_COORDS,
}
