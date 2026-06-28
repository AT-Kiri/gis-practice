<template>
  <div class="dashboard">
    <header class="header">
      <div class="header-left">
        <div class="logo-icon">⛅</div>
        <div class="header-title">
          <h1>京津冀 · 气象灾害监测大屏</h1>
          <span>低风险模式 · 安全运行</span>
        </div>
      </div>
      <div class="header-right">
        <span><span class="status-dot"></span> 系统实时</span>
        <span class="time">{{ clockDisplay }}</span>
      </div>
    </header>

    <section class="kpi-row">
      <div class="kpi-card" :class="{ warning: kpiData.wind >= 5 }">
        <div class="label">🌬️ 大风强度</div>
        <div class="value"><span>{{ kpiData.wind }}</span><span class="unit">级</span></div>
        <div class="trend">{{ kpiData.wind >= 5 ? '⚠️ 接近警戒线' : '✅ 低于警戒线 5 级' }}</div>
        <div class="glow-line"></div>
      </div>
      <div class="kpi-card" :class="{ warning: kpiData.rain >= 60 }">
        <div class="label">🌧️ 降雨深度</div>
        <div class="value"><span>{{ kpiData.rain }}</span><span class="unit">mm</span></div>
        <div class="trend">{{ kpiData.rain >= 60 ? '⚠️ 降水偏多' : '🌤️ 降水偏少' }}</div>
        <div class="glow-line"></div>
      </div>
      <div class="kpi-card">
        <div class="label">🌋 地震强度</div>
        <div class="value"><span>{{ kpiData.quake }}</span><span class="unit">级</span></div>
        <div class="trend">📊 无感地震</div>
        <div class="glow-line"></div>
      </div>
      <div class="kpi-card">
        <div class="label">🧩 受灾类型</div>
        <div class="value" style="font-size:22px; font-family: inherit;">
          <span>{{ kpiData.disaster }}</span>
        </div>
        <div class="trend">🌪️ 影响范围小</div>
        <div class="glow-line"></div>
      </div>
      <div class="kpi-card" :class="{ warning: kpiData.riskIndex === 2 }">
        <div class="label">🚨 综合风险等级</div>
        <div class="value" style="font-size:28px;"><span>{{ kpiData.risk }}</span></div>
        <div class="trend">{{ kpiData.riskIndex === 2 ? '🟡 中风险' : '🟢 低风险 · 正常状态' }}</div>
        <div class="glow-line"></div>
      </div>
    </section>

    <div class="main-grid">
      <aside class="panel-left">
        <div class="panel-title">📍 京津冀城市风险</div>
        <div>
          <div
            v-for="(city, index) in cityData"
            :key="index"
            class="region-item"
          >
            <span class="name">{{ city.name }}</span>
            <span :class="['risk', city.riskClass]">{{ city.risk }}</span>
          </div>
        </div>
      </aside>

      <div class="panel-center">
        <div class="map-box">
          <div class="map-title">
            <span>🗺️ 京津冀灾害风险与监测站</span>
            <div class="map-controls">
              <span class="legend-tip" style="margin-right:8px;">● 风险 ● 监测点</span>
              <button class="toggle-btn" :class="{ active: showStations }" @click="toggleStations">
                📍 {{ showStations ? '监测站' : '隐藏监测站' }}
              </button>
            </div>
          </div>
          <div ref="mapContainer" id="mapContainer"></div>
        </div>

        <div class="chart-row">
          <div class="chart-box">
            <div class="chart-title">📈 未来 7 天气温/降水 (京津冀)</div>
            <div ref="trendChart" id="trendChart"></div>
          </div>
          <div class="chart-box" style="padding:12px 16px; height:150px; display:flex; flex-direction:column; justify-content:center;">
            <div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:8px;">
              <div><span style="color:rgba(160,200,255,0.4);">🚑 救援人员</span> <span style="color:#7abfff; font-size:22px; font-weight:700;">{{ kpiData.rescue.toLocaleString() }}</span></div>
              <div><span style="color:rgba(160,200,255,0.4);">🧑‍🤝‍🧑 受困人员</span> <span style="color:#ffb347; font-size:22px; font-weight:700;">{{ kpiData.trapped.toLocaleString() }}</span></div>
            </div>
            <div>
              <span style="color:rgba(160,200,255,0.4);">📦 可用物资</span>
              <span style="color:#4cd9a0; font-size:22px; font-weight:700;">{{ kpiData.supply.toLocaleString() }}</span>
              <span style="color:rgba(160,200,255,0.3); font-size:13px;">件</span>
              <span style="color:rgba(160,200,255,0.3); font-size:12px; margin-left:12px;">🟢 储备充足</span>
            </div>
            <div class="supply-tags" style="margin-top:10px;">
              <span class="tag">⛑️ 救生衣 3,200</span>
              <span class="tag">🩹 医疗包 2,100</span>
              <span class="tag">🍞 食品 5,000</span>
              <span class="tag">💧 饮水 2,200</span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-right">
        <div class="supply-card">
          <div class="label">📊 应急物资总览</div>
          <div class="value"><span>{{ kpiData.supply.toLocaleString() }}</span><span class="unit">件</span></div>
          <div class="sub">🟢 储备充足 · 可支撑 120 小时</div>
          <div style="display:flex; gap:12px; margin-top:8px; flex-wrap:wrap;">
            <div><span style="color:rgba(160,200,255,0.3);">⛑️</span> <span style="color:#7abfff;">3,200</span></div>
            <div><span style="color:rgba(160,200,255,0.3);">🩹</span> <span style="color:#7abfff;">2,100</span></div>
            <div><span style="color:rgba(160,200,255,0.3);">🍞</span> <span style="color:#7abfff;">5,000</span></div>
            <div><span style="color:rgba(160,200,255,0.3);">💧</span> <span style="color:#7abfff;">2,200</span></div>
          </div>
        </div>

        <div class="weather-box">
          <div class="label">🌤️ 京津冀未来 5 天天气</div>
          <div class="weather-list">
            <div
              v-for="(weather, index) in weatherList"
              :key="index"
              class="weather-item"
              :class="{ current: weather.isCurrent }"
            >
              <span class="day">{{ weather.day }}</span>
              <span class="icon">{{ weather.icon }}</span>
              <span class="temp">{{ weather.temp }}°C</span>
              <span class="desc">{{ weather.desc }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'

const clockDisplay = ref('')
const mapContainer = ref(null)
const trendChart = ref(null)
const showStations = ref(true)

const kpiData = reactive({
  wind: '4.2',
  rain: '35.2',
  quake: '1.5',
  disaster: '局部大风',
  risk: 'Ⅳ级',
  riskIndex: 0,
  rescue: 320,
  trapped: 15,
  supply: 12500
})

const cityData = reactive([
  { name: '北京市', risk: '低', riskClass: 'low' },
  { name: '天津市', risk: '低', riskClass: 'low' },
  { name: '石家庄市', risk: '中', riskClass: 'medium' },
  { name: '唐山市', risk: '低', riskClass: 'low' },
  { name: '保定市', risk: '低', riskClass: 'low' },
  { name: '邯郸市', risk: '低', riskClass: 'low' },
  { name: '张家口市', risk: '中', riskClass: 'medium' },
  { name: '承德市', risk: '低', riskClass: 'low' },
])

const weatherIcons = ['☀️', '⛅', '🌤️', '🌥️', '☁️', '🌦️', '🌧️', '❄️']
const weatherDescs = ['晴', '多云', '晴间多云', '阴', '多云转晴', '阵雨', '小雨', '小雪']
const weatherList = ref([])

let map = null
let stationMarkers = []
let chart = null
let clockTimer = null
let kpiTimer = null
let weatherTimer = null
let dataRefreshTimer = null
let trendTimer = null

function updateClock() {
  const now = new Date()
  const s = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0')
  clockDisplay.value = s
}

function generateWeather() {
  const today = new Date()
  const list = []
  for (let i = -3; i < 0; i++) {
    const idx = Math.floor(Math.random() * 5)
    list.push({
      day: (i === -1 ? '昨天' : (i === -2 ? '前天' : '3天前')),
      icon: weatherIcons[idx],
      temp: (12 + Math.random() * 10).toFixed(1),
      desc: weatherDescs[idx],
      isCurrent: false,
    })
  }
  const idxNow = Math.floor(Math.random() * 4)
  list.push({
    day: '今天',
    icon: weatherIcons[idxNow],
    temp: (15 + Math.random() * 8).toFixed(1),
    desc: weatherDescs[idxNow],
    isCurrent: true,
  })
  for (let i = 1; i <= 4; i++) {
    const idx = Math.floor(Math.random() * 6)
    const dayLabel = i === 1 ? '明天' : i === 2 ? '后天' : `${i + 1}天后`
    list.push({
      day: dayLabel,
      icon: weatherIcons[idx],
      temp: (12 + Math.random() * 12).toFixed(1),
      desc: weatherDescs[idx],
      isCurrent: false,
    })
  }
  return list
}

function renderWeather() {
  weatherList.value = generateWeather()
}

const mapRiskData = [
  { name: '北京市', value: 40 },
  { name: '天津市', value: 35 },
  { name: '河北省', value: 48 },
]

const disasterPoints = [
  { name: '北京·大风', value: 45, coord: [116.4, 39.9] },
  { name: '天津·暴雨', value: 38, coord: [117.2, 39.1] },
  { name: '石家庄·洪涝', value: 42, coord: [114.5, 38.0] },
  { name: '唐山·内涝', value: 30, coord: [118.2, 39.6] },
  { name: '保定·大风', value: 35, coord: [115.5, 38.9] },
]

let stationData = [
  { name: '北京气象站', type: '风速', value: 3.2, unit: 'm/s', status: '正常', coord: [116.2, 40.0] },
  { name: '天津水文站', type: '水位', value: 1.8, unit: 'm', status: '正常', coord: [117.1, 39.2] },
  { name: '石家庄监测站', type: '温度', value: 26.5, unit: '°C', status: '正常', coord: [114.6, 38.2] },
  { name: '唐山气象站', type: '风速', value: 4.5, unit: 'm/s', status: '正常', coord: [118.3, 39.7] },
  { name: '保定水文站', type: '水位', value: 1.2, unit: 'm', status: '正常', coord: [115.4, 38.8] },
  { name: '张家口监测站', type: '温度', value: 20.0, unit: '°C', status: '正常', coord: [114.9, 40.8] },
  { name: '承德气象站', type: '风速', value: 2.8, unit: 'm/s', status: '正常', coord: [117.9, 41.0] },
  { name: '邯郸水文站', type: '水位', value: 1.5, unit: 'm', status: '正常', coord: [114.4, 36.6] },
]

function getRiskColor(value) {
  if (value >= 70) return '#ff4d6a'
  if (value >= 50) return '#f5b342'
  return '#4cd9a0'
}

function initMap() {
  if (typeof AMap === 'undefined') {
    mapContainer.value.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(160,200,255,0.6);font-size:14px;">⚠️ 高德地图加载失败，请检查 Key 和网络。</div>'
    return
  }

  map = new AMap.Map(mapContainer.value, {
    center: [116.4, 39.5],
    zoom: 7,
    mapStyle: 'amap://styles/2a090dfc3cc3d6dfe5f4aef9f7cddda4',
    viewMode: '2D',
    pitch: 0,
    showIndoorMap: false,
    features: ['bg', 'road', 'building', 'point'],
  })

  loadGeoJSONAndDraw()
}

function loadGeoJSONAndDraw() {
  const geoUrls = [
    'https://geojson.cn/api/data/china.json',
    'https://fastly.jsdelivr.net/gh/hxgd/hxgd-json/china.json',
    'https://cdn.jsdelivr.net/gh/hxgd/hxgd-json/china.json',
  ]

  let attempt = 0

  function tryLoad(url) {
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(geoJson => {
        drawRiskPolygons(geoJson)
        drawDisasterMarkers()
        drawStationMarkers()
        startDataRefresh()
      })
      .catch(err => {
        console.warn(`GeoJSON ${url} 加载失败:`, err)
        attempt++
        if (attempt < geoUrls.length) {
          tryLoad(geoUrls[attempt])
        } else {
          alert('地图数据加载失败，请刷新页面重试。')
        }
      })
  }

  tryLoad(geoUrls[0])
}

function drawRiskPolygons(geoJson) {
  const targetNames = ['北京市', '天津市', '河北省']
  const features = geoJson.features.filter(f => targetNames.includes(f.properties.name))

  features.forEach(feature => {
    const name = feature.properties.name
    const risk = mapRiskData.find(d => d.name === name)
    const value = risk ? risk.value : 50
    const color = getRiskColor(value)

    let coords = []
    const geom = feature.geometry
    if (geom.type === 'Polygon') {
      coords = geom.coordinates
    } else if (geom.type === 'MultiPolygon') {
      coords = geom.coordinates.flat()
    } else {
      return
    }

    const paths = coords.map(ring => ring.map(p => [p[0], p[1]]))

    const polygon = new AMap.Polygon({
      path: paths,
      strokeColor: 'rgba(64,164,255,0.5)',
      strokeWeight: 1.5,
      fillColor: color,
      fillOpacity: 0.5,
      strokeStyle: 'solid',
      bubble: true,
      extData: { name, value },
    })

    polygon.setMap(map)

    polygon.on('click', function (e) {
      const info = e.target.getExtData()
      AMap.plugin('AMap.InfoWindow', function () {
        const infoWindow = new AMap.InfoWindow({
          content: `<div style="padding:8px;color:#333;font-size:14px;">
                      <strong>${info.name}</strong><br/>
                      风险指数: ${info.value}
                  </div>`,
          offset: new AMap.Pixel(0, -20),
        })
        infoWindow.open(map, e.lnglat)
      })
    })
  })
}

function drawDisasterMarkers() {
  disasterPoints.forEach(p => {
    const content = document.createElement('div')
    content.className = 'disaster-marker'
    const marker = new AMap.Marker({
      position: p.coord,
      content: content,
      offset: new AMap.Pixel(-15, -15),
      label: {
        content: p.name,
        offset: new AMap.Pixel(0, 20),
        style: {
          color: '#c8dcec',
          fontSize: '10px',
          fontWeight: 'bold',
          textShadow: '0 0 6px #0a0e1a, 0 0 10px #0a0e1a',
          whiteSpace: 'nowrap',
        },
      },
      extData: p,
    })
    marker.setMap(map)

    marker.on('click', function (e) {
      const data = e.target.getExtData()
      AMap.plugin('AMap.InfoWindow', function () {
        const infoWindow = new AMap.InfoWindow({
          content: `<div style="padding:8px;color:#333;font-size:14px;">
                      <strong>${data.name}</strong><br/>
                      强度: ${data.value}
                  </div>`,
          offset: new AMap.Pixel(0, -30),
        })
        infoWindow.open(map, e.lnglat)
      })
    })
  })
}

function drawStationMarkers() {
  stationMarkers = []
  stationData.forEach(s => {
    const content = document.createElement('div')
    content.className = `station-marker ${s.status === '告警' ? 'alarm' : 'normal'}`
    const marker = new AMap.Marker({
      position: s.coord,
      content: content,
      offset: new AMap.Pixel(-8, -8),
      label: {
        content: s.name,
        offset: new AMap.Pixel(0, 16),
        style: {
          color: '#c8dcec',
          fontSize: '9px',
          textShadow: '0 0 6px #0a0e1a, 0 0 10px #0a0e1a',
          whiteSpace: 'nowrap',
        },
      },
      extData: s,
    })
    marker.setMap(map)

    marker.on('click', function (e) {
      const data = e.target.getExtData()
      AMap.plugin('AMap.InfoWindow', function () {
        const infoWindow = new AMap.InfoWindow({
          content: `<div style="padding:8px;color:#333;font-size:14px;">
                      <strong>${data.name}</strong><br/>
                      类型: ${data.type}<br/>
                      数值: ${data.value} ${data.unit}<br/>
                      状态: ${data.status}
                  </div>`,
          offset: new AMap.Pixel(0, -20),
        })
        infoWindow.open(map, e.lnglat)
      })
    })

    stationMarkers.push(marker)
    if (!showStations.value) {
      marker.hide()
    }
  })
}

function toggleStations() {
  showStations.value = !showStations.value
  stationMarkers.forEach(m => {
    if (showStations.value) {
      m.show()
    } else {
      m.hide()
    }
  })
}

function startDataRefresh() {
  dataRefreshTimer = setInterval(() => {
    updateKPI()
    const riskLevels = ['低', '中', '低', '低', '低', '低', '中', '低']
    cityData.forEach((city, idx) => {
      const newRisk = riskLevels[idx % riskLevels.length]
      city.risk = newRisk
      city.riskClass = newRisk === '高' ? 'high' : newRisk === '中' ? 'medium' : 'low'
    })
  }, 8000)
}

function initTrend() {
  if (typeof echarts === 'undefined') {
    trendChart.value.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(160,200,255,0.6);font-size:14px;">⚠️ ECharts 加载失败</div>'
    return
  }

  chart = echarts.init(trendChart.value)
  const days = ['6/20', '6/21', '6/22', '6/23', '6/24', '6/25', '今天']
  const temps = [22, 24, 19, 26, 28, 25, 23]
  const rains = [12, 8, 35, 5, 2, 18, 42]

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10,14,26,0.8)',
      borderColor: 'rgba(64,164,255,0.2)',
      textStyle: { color: '#e0e8f0', fontSize: 11 },
    },
    legend: {
      data: ['温度', '降水'],
      textStyle: { color: 'rgba(160,200,255,0.4)', fontSize: 10 },
      top: 0,
      right: 0,
      icon: 'circle',
      itemWidth: 6,
      itemHeight: 6,
    },
    grid: {
      left: 30,
      right: 10,
      top: 20,
      bottom: 8,
    },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { lineStyle: { color: 'rgba(64,164,255,0.1)' } },
      axisLabel: { color: 'rgba(160,200,255,0.3)', fontSize: 9 },
      axisTick: { show: false },
    },
    yAxis: [{
      type: 'value',
      name: '°C',
      nameTextStyle: { color: 'rgba(160,200,255,0.2)', fontSize: 9 },
      splitLine: { lineStyle: { color: 'rgba(64,164,255,0.04)', type: 'dashed' } },
      axisLabel: { color: 'rgba(160,200,255,0.2)', fontSize: 9 },
    }, {
      type: 'value',
      name: 'mm',
      nameTextStyle: { color: 'rgba(160,200,255,0.2)', fontSize: 9 },
      splitLine: { show: false },
      axisLabel: { color: 'rgba(160,200,255,0.2)', fontSize: 9 },
    }],
    series: [{
      name: '温度',
      type: 'line',
      data: temps,
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: '#ffb347', width: 2 },
      itemStyle: { color: '#ffb347' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(255,180,70,0.15)' },
          { offset: 1, color: 'rgba(255,180,70,0)' }
        ])
      },
    }, {
      name: '降水',
      type: 'bar',
      yAxisIndex: 1,
      data: rains,
      barWidth: '20%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#4dabff' },
          { offset: 1, color: '#1a5ca8' }
        ]),
        borderRadius: [2, 2, 0, 0],
      },
    }]
  }

  chart.setOption(option)
  window.addEventListener('resize', () => chart && chart.resize())
  trendTimer = setInterval(() => {
    const newTemps = temps.map(() => (10 + Math.random() * 18).toFixed(1))
    const newRains = rains.map(() => Math.floor(Math.random() * 30))
    chart.setOption({
      series: [{ data: newTemps.map(Number) }, { data: newRains }]
    })
  }, 10000)
}

function updateKPI() {
  const wind = (2 + Math.random() * 3).toFixed(1)
  kpiData.wind = wind

  const rain = (20 + Math.random() * 40).toFixed(1)
  kpiData.rain = rain

  const quake = (0.5 + Math.random() * 2).toFixed(1)
  kpiData.quake = quake

  const types = ['局部大风', '短时暴雨', '城市内涝', '雷暴', '无明显灾害']
  kpiData.disaster = types[Math.floor(Math.random() * types.length)]

  const risks = ['Ⅳ级', 'Ⅳ级', 'Ⅲ级', 'Ⅳ级']
  const ri = Math.floor(Math.random() * 4)
  kpiData.risk = risks[ri]
  kpiData.riskIndex = ri

  kpiData.rescue = 200 + Math.floor(Math.random() * 200)
  kpiData.trapped = 5 + Math.floor(Math.random() * 20)
  kpiData.supply = 10000 + Math.floor(Math.random() * 5000)
}

function loadExternalScripts() {
  return new Promise((resolve) => {
    const scripts = [
      'https://webapi.amap.com/maps?v=2.0&key=7e4c43fdf04b843f68272cf5606e4777',
      'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js'
    ]

    let loaded = 0
    const loadScript = (url) => {
      const script = document.createElement('script')
      script.src = url
      script.onload = () => {
        loaded++
        if (loaded >= scripts.length) {
          window._AMapSecurityConfig = {
            securityJsCode: '38e7e884a58c6b162fd2c2fba59444d4',
          }
          resolve()
        }
      }
      script.onerror = () => {
        loaded++
        if (loaded >= scripts.length) {
          resolve()
        }
      }
      document.head.appendChild(script)
    }

    scripts.forEach(loadScript)
  })
}

onMounted(async () => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)

  renderWeather()
  weatherTimer = setInterval(renderWeather, 30000)

  updateKPI()
  kpiTimer = setInterval(updateKPI, 5000)

  await loadExternalScripts()

  setTimeout(() => {
    initMap()
    initTrend()
  }, 500)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (kpiTimer) clearInterval(kpiTimer)
  if (weatherTimer) clearInterval(weatherTimer)
  if (dataRefreshTimer) clearInterval(dataRefreshTimer)
  if (trendTimer) clearInterval(trendTimer)
  if (chart) chart.dispose()
  window.removeEventListener('resize', () => chart && chart.resize())
})
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.dashboard {
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 52px);
  background: radial-gradient(ellipse at 50% 0%, #141c2b 0%, #0a0e1a 80%);
  padding: 24px 32px 32px;
  position: relative;
  overflow: hidden;
}

.dashboard::before,
.dashboard::after {
  content: '';
  position: absolute;
  pointer-events: none;
}

.dashboard::before {
  top: -20%;
  left: -10%;
  width: 60%;
  height: 60%;
  background: radial-gradient(ellipse, rgba(0, 120, 255, 0.04) 0%, transparent 70%);
}

.dashboard::after {
  bottom: -20%;
  right: -10%;
  width: 50%;
  height: 50%;
  background: radial-gradient(ellipse, rgba(0, 200, 255, 0.03) 0%, transparent 70%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(64, 164, 255, 0.12);
  margin-bottom: 24px;
  position: relative;
  z-index: 2;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left .logo-icon {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #00a6ff, #0066ff);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 0 30px rgba(0, 102, 255, 0.3);
}

.header-title h1 {
  font-size: 26px;
  font-weight: 700;
  background: linear-gradient(90deg, #60b0ff, #a0d4ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 4px;
}

.header-title span {
  font-size: 13px;
  color: rgba(160, 200, 255, 0.6);
  letter-spacing: 2px;
  margin-left: 12px;
  -webkit-text-fill-color: rgba(160, 200, 255, 0.6);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
  font-size: 14px;
  color: rgba(160, 200, 255, 0.7);
}

.header-right .time {
  background: rgba(0, 80, 200, 0.15);
  padding: 6px 18px;
  border-radius: 20px;
  border: 1px solid rgba(64, 164, 255, 0.15);
  font-family: 'Courier New', monospace;
  font-size: 15px;
  color: #7abfff;
}

.header-right .status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  background: #00ff88;
  border-radius: 50%;
  margin-right: 6px;
  animation: pulse-dot 2s infinite;
  box-shadow: 0 0 12px rgba(0, 255, 136, 0.4);
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  position: relative;
  z-index: 2;
}

.kpi-card {
  background: rgba(16, 32, 56, 0.6);
  backdrop-filter: blur(4px);
  border-radius: 16px;
  padding: 18px 20px;
  border: 1px solid rgba(64, 164, 255, 0.08);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.kpi-card:hover {
  border-color: rgba(64, 164, 255, 0.25);
  background: rgba(20, 44, 76, 0.7);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 40, 120, 0.2);
}

.kpi-card .label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 1px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.kpi-card .value {
  font-size: 32px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: #ffffff;
}

.kpi-card .value .unit {
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 2px;
}

.kpi-card .trend {
  font-size: 12px;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.6);
}

.kpi-card.warning .value {
  color: #ffb347;
  text-shadow: 0 0 30px rgba(255, 180, 70, 0.2);
}

.kpi-card.warning {
  border-color: rgba(255, 180, 70, 0.2);
  background: rgba(255, 180, 70, 0.06);
}

.kpi-card .glow-line {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 60%;
  background: linear-gradient(90deg, #0066ff, transparent);
  border-radius: 0 4px 0 0;
  opacity: 0.4;
}

.kpi-card.warning .glow-line {
  background: linear-gradient(90deg, #ffb347, transparent);
}

.main-grid {
  display: grid;
  grid-template-columns: 260px 1fr 300px;
  gap: 20px;
  position: relative;
  z-index: 2;
}

.panel-left {
  background: rgba(16, 32, 56, 0.5);
  backdrop-filter: blur(4px);
  border-radius: 16px;
  padding: 20px 16px;
  border: 1px solid rgba(64, 164, 255, 0.06);
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #8ab8ff;
  letter-spacing: 2px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-title::before {
  content: '';
  width: 4px;
  height: 18px;
  background: linear-gradient(180deg, #00a6ff, #0066ff);
  border-radius: 4px;
}

.region-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 6px;
  border-radius: 10px;
  background: rgba(0, 40, 80, 0.2);
  border-left: 3px solid rgba(64, 164, 255, 0.2);
  transition: all 0.25s ease;
  cursor: default;
}

.region-item:hover {
  background: rgba(0, 60, 120, 0.25);
}

.region-item .name {
  font-size: 14px;
  color: #c8dcec;
}

.region-item .risk {
  font-size: 13px;
  font-weight: 600;
  padding: 2px 12px;
  border-radius: 20px;
  background: rgba(0, 200, 100, 0.15);
  color: #4cd9a0;
}

.region-item .risk.high {
  background: rgba(255, 77, 106, 0.2);
  color: #ff4d6a;
}

.region-item .risk.medium {
  background: rgba(255, 180, 70, 0.2);
  color: #ffb347;
}

.region-item .risk.low {
  background: rgba(0, 200, 100, 0.12);
  color: #4cd9a0;
}

.panel-center {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.map-box {
  background: rgba(16, 32, 56, 0.5);
  backdrop-filter: blur(4px);
  border-radius: 16px;
  padding: 12px 12px 4px;
  border: 1px solid rgba(64, 164, 255, 0.06);
  height: 320px;
  position: relative;
  overflow: hidden;
}

.map-box .map-title {
  font-size: 13px;
  color: rgba(160, 200, 255, 0.5);
  letter-spacing: 1px;
  margin-bottom: 4px;
  padding-left: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.map-box .map-title .legend-tip {
  font-size: 11px;
  color: rgba(160, 200, 255, 0.3);
}

.map-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.map-controls .toggle-btn {
  background: rgba(0, 80, 200, 0.15);
  border: 1px solid rgba(64, 164, 255, 0.15);
  color: #7abfff;
  padding: 2px 14px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.map-controls .toggle-btn:hover {
  background: rgba(0, 80, 200, 0.25);
  border-color: #4dabff;
}

.map-controls .toggle-btn.active {
  background: rgba(0, 200, 100, 0.15);
  border-color: #4cd9a0;
  color: #4cd9a0;
}

#mapContainer {
  width: 100%;
  height: 280px;
  border-radius: 12px;
  overflow: hidden;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-box {
  background: rgba(16, 32, 56, 0.5);
  backdrop-filter: blur(4px);
  border-radius: 16px;
  padding: 12px 12px 4px;
  border: 1px solid rgba(64, 164, 255, 0.06);
  height: 150px;
}

.chart-box .chart-title {
  font-size: 12px;
  color: rgba(160, 200, 255, 0.4);
  letter-spacing: 1px;
  margin-bottom: 2px;
  padding-left: 4px;
}

#trendChart {
  width: 100%;
  height: 115px;
}

.panel-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.supply-card {
  background: rgba(16, 32, 56, 0.5);
  backdrop-filter: blur(4px);
  border-radius: 16px;
  padding: 16px 18px;
  border: 1px solid rgba(64, 164, 255, 0.06);
}

.supply-card .label {
  font-size: 13px;
  color: rgba(160, 200, 255, 0.5);
  letter-spacing: 1px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.supply-card .value {
  font-size: 28px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: #7abfff;
}

.supply-card .value .unit {
  font-size: 14px;
  font-weight: 400;
  color: rgba(160, 200, 255, 0.4);
  margin-left: 4px;
}

.supply-card .sub {
  font-size: 12px;
  color: rgba(160, 200, 255, 0.35);
  margin-top: 4px;
}

.supply-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.supply-tags .tag {
  background: rgba(0, 80, 200, 0.12);
  padding: 2px 12px;
  border-radius: 20px;
  font-size: 12px;
  color: #7abfff;
  border: 1px solid rgba(64, 164, 255, 0.06);
}

.weather-box {
  background: rgba(16, 32, 56, 0.5);
  backdrop-filter: blur(4px);
  border-radius: 16px;
  padding: 16px 18px;
  border: 1px solid rgba(64, 164, 255, 0.06);
  flex: 1;
}

.weather-box .label {
  font-size: 13px;
  color: rgba(160, 200, 255, 0.5);
  letter-spacing: 1px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.weather-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.weather-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(0, 40, 80, 0.1);
  font-size: 13px;
}

.weather-item .day {
  color: rgba(160, 200, 255, 0.5);
  min-width: 40px;
}

.weather-item .icon {
  font-size: 16px;
}

.weather-item .temp {
  color: #7abfff;
  font-weight: 500;
}

.weather-item .desc {
  color: rgba(160, 200, 255, 0.5);
  font-size: 12px;
}

.weather-item.current {
  background: rgba(0, 80, 200, 0.15);
  border: 1px solid rgba(64, 164, 255, 0.1);
}

.weather-item.current .day {
  color: #7abfff;
  font-weight: 600;
}

.disaster-marker {
  width: 30px;
  height: 30px;
  background: radial-gradient(circle, rgba(255, 180, 70, 0.9) 0%, rgba(255, 180, 70, 0.2) 70%);
  border-radius: 50%;
  border: 2px solid #f5b342;
  box-shadow: 0 0 20px rgba(255, 180, 70, 0.4);
  animation: pulse-marker 1.5s ease-in-out infinite;
  position: relative;
}

.disaster-marker::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: #f5b342;
  border-radius: 50%;
}

@keyframes pulse-marker {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.7;
  }
}

.station-marker {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
}

.station-marker.normal {
  background: #4cd9a0;
}

.station-marker.alarm {
  background: #ffb347;
  animation: pulse-station 1s ease-in-out infinite;
}

@keyframes pulse-station {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(255, 180, 70, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(255, 180, 70, 0);
  }
}

.marker-label {
  color: #c8dcec;
  font-size: 10px;
  font-weight: bold;
  text-shadow: 0 0 6px #0a0e1a, 0 0 10px #0a0e1a;
  white-space: nowrap;
}

.amap-container {
  background: transparent !important;
}

.amap-logo,
.amap-copyright {
  display: none !important;
}

::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 20, 40, 0.3);
}

::-webkit-scrollbar-thumb {
  background: rgba(64, 164, 255, 0.3);
  border-radius: 4px;
}

@media (max-width: 1400px) {
  .main-grid {
    grid-template-columns: 220px 1fr 240px;
    gap: 16px;
  }
  .kpi-row {
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
  }
  .kpi-card .value {
    font-size: 26px;
  }
}

@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .panel-left {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .panel-left .panel-title {
    grid-column: 1 / -1;
  }
  .kpi-row {
    grid-template-columns: repeat(3, 1fr);
  }
  .chart-row {
    grid-template-columns: 1fr 1fr;
  }
  .map-box {
    height: 280px;
  }
  #mapContainer {
    height: 240px;
  }
}

@media (max-width: 768px) {
  .dashboard {
    padding: 16px;
  }
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .kpi-row {
    grid-template-columns: 1fr 1fr;
  }
  .chart-row {
    grid-template-columns: 1fr;
  }
  .panel-left {
    grid-template-columns: 1fr;
  }
  .header-title h1 {
    font-size: 20px;
  }
  .kpi-card .value {
    font-size: 22px;
  }
  .map-box {
    height: 220px;
  }
  #mapContainer {
    height: 180px;
  }
  .map-controls .toggle-btn {
    font-size: 10px;
    padding: 1px 10px;
  }
}
</style>