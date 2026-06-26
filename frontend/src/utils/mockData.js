/**
 * 数据大屏 - 模拟数据生成模块
 * 生成县区灾害数据、救援资源、物资点和气象数据
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

// ====== 灾害类型 ======
const DISASTER_TYPES = ['洪涝', '大风', '地震', '滑坡', '暴雨', '干旱', '冰雹']
const RESCUE_TYPES = ['冲锋舟、沙袋', '大型机械、帐篷', '医疗队、担架', '挖掘机、生命探测仪', '排水泵、沙袋', '送水车、抗旱设备', '防雹网、保温帐篷']

// ====== 天气状况 ======
const WEATHER_CONDITIONS = ['晴', '多云', '阴', '小雨', '中雨', '大雨', '暴雨', '雷阵雨', '雾', '小雪', '中雪', '大雪']

// ====== 工具函数 ======
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function randFloat(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

// ====== 主要生成函数 ======

/**
 * 生成各县区灾害数据
 * @returns {Object} Map<县区名, 灾害信息>
 */
export function generateCountyDisasters() {
  const data = {}
  COUNTIES.forEach((county, index) => {
    // 确保部分县区无灾害（等级<=2），部分县区有较严重灾害
    const hasDisaster = index % 5 !== 0 // 80% 的县区有灾害
    const level = hasDisaster ? rand(1, 5) : 1
    const disasterType = pick(DISASTER_TYPES)

    data[county] = {
      countyName: county,
      coords: COUNTY_COORDS[county] || [116.4 + randFloat(-0.5, 0.5), 39.9 + randFloat(-0.5, 0.5)],
      disasterType: level >= 3 ? disasterType : '无',
      disasterLevel: level,
      rescuePersonnel: level >= 3 ? rand(20, 200) : rand(5, 20),
      affectedPeople: level >= 3 ? rand(500, 8000) : rand(50, 500),
      description: level >= 3
        ? `${county}${disasterType === '洪涝' ? '部分地区积水严重，河道水位超警戒线' :
           disasterType === '大风' ? '遭遇强风袭击，部分建筑物受损' :
           disasterType === '地震' ? '发生地震，部分房屋倒塌，道路受损' :
           disasterType === '滑坡' ? '山区出现滑坡隐患，部分道路中断' :
           disasterType === '暴雨' ? '持续强降雨，低洼地区内涝' :
           disasterType === '干旱' ? '持续高温少雨，农作物受旱严重' :
           '出现冰雹天气，农作物和车辆受损'}`
        : `${county}目前灾情平稳，无明显灾害影响`,
      requiredRescueType: level >= 3 ? pick(RESCUE_TYPES) : '无',
      // 救援点和物资点（只在有灾害的县区生成）
      rescuePoints: level >= 2 ? generateRescuePoints(county, level) : [],
      supplyPoints: level >= 2 ? generateSupplyPoints(county, level) : [],
    }
  })
  return data
}

/**
 * 生成救援点
 */
function generateRescuePoints(county, level) {
  const coords = COUNTY_COORDS[county] || [116.4, 39.9]
  const count = rand(1, Math.min(3, level))
  const points = []
  for (let i = 0; i < count; i++) {
    points.push({
      name: `${county}${['消防站', '应急救援中心', '武警驻地', '医疗救援站', '民兵训练基地'][i]}`,
      coords: [coords[0] + randFloat(-0.02, 0.02, 4), coords[1] + randFloat(-0.02, 0.02, 4)],
      personnel: rand(10, 50 + level * 30),
      equipment: pick(['消防车3辆', '救护车2辆', '冲锋舟4艘', '挖掘机2台', '救援车5辆']),
    })
  }
  return points
}

/**
 * 生成物资点
 */
function generateSupplyPoints(county, level) {
  const coords = COUNTY_COORDS[county] || [116.4, 39.9]
  const count = rand(1, Math.min(2, Math.ceil(level / 2)))
  const points = []
  const supplyTypes = [
    '饮用水50吨、食品30吨、帐篷200顶',
    '沙袋5000个、救生衣1000件',
    '医疗物资（急救包2000个、药品20箱）',
    '折叠床500张、毛毯1000条、发电机20台',
    '饮用水30吨、方便面5000箱、手电筒500个',
  ]
  for (let i = 0; i < count; i++) {
    points.push({
      name: `${county}${['物资储备库', '应急物资站', '救灾物资点'][i]}`,
      coords: [coords[0] + randFloat(-0.02, 0.02, 4), coords[1] + randFloat(-0.02, 0.02, 4)],
      supplies: pick(supplyTypes),
    })
  }
  return points
}

/**
 * 生成气象数据
 */
export function generateWeatherData() {
  return COUNTIES.map((county) => {
    const riskLevels = ['低', '较低', '中', '高', '极高']
    const riskIndex = rand(0, 4)
    const rainfall = randFloat(0, 180)
    const windForce = rand(2, 14)
    const earthquakeIntensity = randFloat(0, 6.5)

    return {
      countyName: county,
      riskLevel: riskLevels[riskIndex],
      disasterType: riskIndex >= 3 ? pick(['洪涝', '大风', '地震', '暴雨']) : '—',
      windForce,
      rainfall,
      earthquakeIntensity,
      trappedPeople: riskIndex >= 3 ? rand(10, 300) : rand(0, 10),
      availableSupplies: riskIndex >= 2
        ? pick(['帐篷200顶、食品5吨', '沙袋3000个', '医疗包500个', '饮用水20吨'])
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

export default {
  generateCountyDisasters,
  generateWeatherData,
  getCounties,
  getCountyCoords,
  COUNTIES,
  COUNTY_COORDS,
}
