<template>
  <div class="earthquake-command">
    <header class="header-bar">


      <div class="quake-info">
        <div class="quake-item">
          <span class="label">区域</span>
          <span class="value">{{ earthquakeData.nodeName }}</span>
        </div>
        <div class="quake-item">
          <span class="label">震级</span>
          <span class="value magnitude">{{ earthquakeData.magnitude }}</span>
          <span class="unit">级</span>
        </div>
        <div class="quake-item">
          <span class="label">时间</span>
          <span class="value">{{ currentTime }}</span>
        </div>
        <div class="quake-item">
          <span class="label">位置</span>
          <span class="value">{{ earthquakeData.location }}</span>
        </div>
        <div class="emergency-level">
          <span :class="['level-tag', `level-${earthquakeData.level}`]">{{ earthquakeData.levelText }}</span>
          <span class="link-tag">跨区域联动</span>
        </div>
      </div>

      <div class="view-switch">
        <button
          v-for="view in viewOptions"
          :key="view.key"
          :class="['view-btn', { active: currentView === view.key }]"
          @click="switchView(view.key)"
        >
          {{ view.label }}
        </button>
      </div>

      <div class="alarm-scroll">
        <div class="alarm-content">
          <span class="alarm-icon">🔴</span>
          <span>【盲区预警】涿州部分区域信号中断 · </span>
          <span>【未应答】3个乡镇未反馈 · </span>
          <span>【物资缺口】帐篷缺口500顶 · </span>
          <span>【道路阻断】G4高速部分路段封闭</span>
        </div>
      </div>

      <button class="conference-btn" :class="{ recording: conference.active }" @click="toggleConference">
        <span class="btn-icon">🤝</span>
        <span>{{ conference.active ? '结束会商归档' : '三地联合会商' }}</span>
      </button>
    </header>

    <div class="main-content">
      <aside class="left-tree">
        <div class="tree-header">
          <span class="tree-title">📊 组织层级</span>
          <button class="collapse-btn" @click="toggleTreeCollapse">
            {{ isTreeCollapsed ? "展开" : "折叠" }}
          </button>
        </div>
        <div v-show="!isTreeCollapsed" class="tree-content">
          <div class="tree-node root">
            <div class="node-header" @click="toggleNode('national')">
              <span class="expand-icon">{{ expandedNodes.includes('national') ? '▼' : '▶' }}</span>
              <span class="node-icon">🏛️</span>
              <span class="node-name">国家应急指挥中心</span>
              <span class="status-dot normal"></span>
            </div>
            <div v-show="expandedNodes.includes('national')" class="children">
              <div class="tree-node">
                <div class="node-header" @click="toggleNode('jingjinji')">
                  <span class="expand-icon">{{ expandedNodes.includes('jingjinji') ? '▼' : '▶' }}</span>
                  <span class="node-icon">🤝</span>
                  <span class="node-name">京津冀联合指挥部</span>
                  <span class="status-dot collaborative"></span>
                </div>
                <div v-show="expandedNodes.includes('jingjinji')" class="children">
                  <div v-for="city in cities" :key="city.name" class="tree-node">
                    <div class="node-header" @click="handleNodeClick(city)">
                      <span class="expand-icon">{{ expandedNodes.includes(city.name) ? '▼' : '▶' }}</span>
                      <span class="node-icon">🏙️</span>
                      <span :class="['node-name', { 'alarm-top': city.isAlarm }]">{{ city.name }}</span>
                      <span :class="['status-dot', city.status]"></span>
                    </div>
                    <div v-show="expandedNodes.includes(city.name)" class="children">
                      <div v-for="district in city.districts" :key="district.name" class="tree-node">
                        <div class="node-header" @click="handleNodeClick(district)">
                          <span class="expand-icon">{{ expandedNodes.includes(district.name) ? '▼' : '▶' }}</span>
                          <span class="node-icon">📍</span>
                          <span :class="['node-name', { 'alarm-top': district.isAlarm }]">{{ district.name }}</span>
                          <span :class="['status-dot', district.status]"></span>
                        </div>
                        <div v-show="expandedNodes.includes(district.name)" class="children">
                          <div v-for="town in district.towns" :key="town.name" class="tree-node">
                            <div class="node-header" @click="handleNodeClick(town)">
                              <span class="node-icon">🏠</span>
                              <span :class="['node-name', { 'alarm-top': town.isAlarm }]">{{ town.name }}</span>
                              <span :class="['status-dot', town.status]"></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div class="center-map">
        <div class="map-header">
          <span class="map-title">{{ mapTitles[currentView] }}</span>
          <div class="map-legend">
            <span class="legend-item"><span class="legend-dot intensity-1"></span> 外围区（{{ ringRadii.outer }}km）</span>
            <span class="legend-item"><span class="legend-dot intensity-2"></span> 影响区（{{ ringRadii.middle }}km）</span>
            <span class="legend-item"><span class="legend-dot intensity-3"></span> 极震区（{{ ringRadii.inner }}km）</span>
            <span class="legend-item"><span class="legend-dot rescue"></span> 救援点</span>
            <span class="legend-item"><span class="legend-dot shelter"></span> 避难场所</span>
          </div>
          <div class="ring-controls">
            <span class="control-label">圆圈半径调节</span>
            <div class="control-group">
              <span>极震区</span>
              <input type="range" v-model.number="ringRadii.inner" min="1" max="10" step="1" @input="updateRingRadii" />
              <span>{{ ringRadii.inner }}km</span>
            </div>
            <div class="control-group">
              <span>影响区</span>
              <input type="range" v-model.number="ringRadii.middle" min="5" max="25" step="1" @input="updateRingRadii" />
              <span>{{ ringRadii.middle }}km</span>
            </div>
            <div class="control-group">
              <span>外围区</span>
              <input type="range" v-model.number="ringRadii.outer" min="10" max="50" step="1" @input="updateRingRadii" />
              <span>{{ ringRadii.outer }}km</span>
            </div>
          </div>
        </div>
        <div class="map-container" ref="mapContainer" id="earthquake-map">
          <div class="conference-map-tools">
            <div class="record-badge" :class="{ active: conference.active }">
              <span class="record-dot"></span>
              <span>{{ conference.active ? `会商录屏中 ${recordingDuration}` : '会商未开启' }}</span>
            </div>
            <div class="route-level-card">
              <span>路径规划层级</span>
              <strong>{{ routeLevelText }}</strong>
            </div>
            <div class="plot-tools">
              <button
                v-for="tool in plotTools"
                :key="tool.key"
                :class="['plot-tool-btn', { active: plotMode === tool.key }]"
                @click.stop="plotMode = tool.key"
              >
                {{ tool.label }}
              </button>
            </div>
            <button class="clear-route-btn" @click.stop="resetConferenceRoute">
              清空路径
            </button>
          </div>
        </div>
        <div class="map-stats">
          <div class="stat-item">
            <span class="stat-value">{{ mapStats.rescueTeams }}</span>
            <span class="stat-label">救援队伍</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ mapStats.shelters }}</span>
            <span class="stat-label">避难场所</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ mapStats.affected }}</span>
            <span class="stat-label">受影响区域</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ mapStats.routes }}</span>
            <span class="stat-label">救援路线</span>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="tabs-header">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['tab-btn', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.label }}</span>
          </button>
        </div>

        <div class="tabs-content">
          <div v-show="activeTab === 'drill-review'" class="panel-content">
            <div v-if="conferenceArchives.length" class="panel-section">
              <div class="section-title">🎥 历史会商归档</div>
              <div class="archive-list">
                <div v-for="archive in conferenceArchives" :key="archive.id" class="archive-card">
                  <div class="archive-head">
                    <span>{{ archive.id }}</span>
                    <strong>{{ archive.routeLevel }}</strong>
                  </div>
                  <video v-if="archive.videoUrl" :src="archive.videoUrl" controls class="archive-video"></video>
                  <div class="archive-meta">
                    <span>意见 {{ archive.opinions.length }} 条</span>
                    <span>路径点 {{ archive.routePoints.length }} 个</span>
                    <span>操作 {{ archive.operations.length }} 条</span>
                   </div>
                  <div class="archive-opinions">
                    <p v-for="opinion in archive.opinions" :key="opinion.id">{{ opinion.party }}：{{ opinion.text }}</p>
                  </div>
                  <div class="archive-record-log">
                    <div v-for="item in archive.operations" :key="item.id">
                      <span>{{ item.time }}</span>
                      <p>{{ item.text }}</p>
                    </div>
                  </div>
                  <div class="archive-actions">
                    <button @click="downloadArchiveVideo(archive)">下载视频</button>
                    <button @click="downloadArchiveText(archive)">下载意见</button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div v-show="activeTab === 'consultation'" class="panel-content">
            <div class="panel-section">
              <div class="section-title">🤝 三地会商管理</div>
              <div class="consult-status" :class="{ active: conference.active }">
                <strong>{{ conference.active ? '会商进行中' : '等待开始会商' }}</strong>
                <span>{{ conference.active ? `地图操作全程录屏 · ${recordingDuration}` : '点击顶部"三地联合会商"后开启标绘、录屏和意见同步' }}</span>
              </div>
              <div class="party-switch">
                <button
                  v-for="party in conferenceParties"
                  :key="party.key"
                  :class="['party-btn', party.key, { active: activeParty === party.key }]"
                  @click="activeParty = party.key"
                >
                  {{ party.name }}
                </button>
              </div>
              <div class="route-summary">
                <div>
                  <span>起点</span>
                  <strong>{{ routeState.start ? routeState.start.name : '未设置' }}</strong>
                </div>
                <div>
                  <span>拐点</span>
                  <strong>{{ routeState.waypoints.length }} 个</strong>
                </div>
                <div>
                  <span>终点</span>
                  <strong>{{ routeState.end ? routeState.end.name : '未设置' }}</strong>
                </div>
              </div>
              <textarea
                v-model="consultationDraft"
                class="opinion-input"
                :disabled="!conference.active"
                placeholder="填写会商意见、资源缺口、路径调整建议或跨区协同指令"
              ></textarea>
              <button class="support-btn" :disabled="!conference.active || !consultationDraft.trim()" @click="submitConsultationOpinion">
                同步会商意见
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'

const currentTime = ref('')
const currentView = ref('global')
const isTreeCollapsed = ref(false)
const expandedNodes = ref(['national', 'jingjinji', '北京市'])
const activeTab = ref('coordination')
const mapContainer = ref(null)

let map = null
let resizeObserver = null
let recordingTimer = null
let mediaRecorder = null
let recordingChunks = []
let activeRouteMarkers = []
let intensityOverlays = []
let resourceOverlays = []
let epicenterOverlay = null
let conferenceRouteLine = null
let rescueRouteLine = null
let routePlanSeq = 0
let drivingService = null

const GAODE_MAP_KEY = '52ab7fedfb56a60d546029dc30b23ee6'

const earthquakeData = reactive({
  magnitude: '5.8',
  location: '116.5°E, 39.9°N',
  level: 'orange',
  levelText: '二级响应',
  nodeName: '震中区域'
})

const ringRadii = reactive({
  inner: 5,
  middle: 15,
  outer: 30
})

const viewOptions = [
  { key: 'global', label: '全域总览' },
  { key: 'city', label: '市级指挥' },
  { key: 'district', label: '区县执行' },
]

const mapTitles = {
  global: '🗺️ 京津冀全域震情监测',
  city: '🏙️ 市级详细灾害视图',
  district: '📍 区县基层点位视图',
}

const tabs = [
  { key: 'consultation', label: '会商管理', icon: '🎥' },
  { key: 'drill-review', label: '演练复盘', icon: '⏱️' },
]

const cities = reactive([
  {
    name: '北京市',
    status: 'normal',
    isAlarm: false,
    coords: [116.4074, 39.9042],
    magnitude: 3.2,
    districts: [
      {
        name: '朝阳区',
        status: 'warning',
        isAlarm: true,
        coords: [116.47, 39.94],
        magnitude: 4.1,
        towns: [
          { name: '望京街道', status: 'normal', isAlarm: false, coords: [116.47, 39.99], magnitude: 2.8 },
          { name: '三里屯街道', status: 'orange', isAlarm: true, coords: [116.46, 39.93], magnitude: 4.5 },
          { name: 'CBD商圈', status: 'warning', isAlarm: true, coords: [116.47, 39.91], magnitude: 3.8 },
        ],
      },
      {
        name: '海淀区',
        status: 'normal',
        isAlarm: false,
        coords: [116.29, 39.98],
        magnitude: 2.5,
        towns: [
          { name: '中关村街道', status: 'normal', isAlarm: false, coords: [116.31, 39.98], magnitude: 2.2 },
          { name: '清华园街道', status: 'warning', isAlarm: false, coords: [116.32, 40.00], magnitude: 3.1 },
        ],
      },
    ],
  },
  {
    name: '天津市',
    status: 'warning',
    isAlarm: true,
    coords: [117.2008, 39.0842],
    magnitude: 3.7,
    districts: [
      {
        name: '滨海新区',
        status: 'orange',
        isAlarm: true,
        coords: [117.60, 39.02],
        magnitude: 4.3,
        towns: [
          { name: '塘沽街道', status: 'orange', isAlarm: true, coords: [117.60, 39.02], magnitude: 4.6 },
          { name: '大港街道', status: 'warning', isAlarm: false, coords: [117.45, 38.85], magnitude: 3.5 },
        ],
      },
    ],
  },
  {
    name: '石家庄市',
    status: 'orange',
    isAlarm: true,
    coords: [114.4792, 38.0423],
    magnitude: 5.2,
    districts: [
      {
        name: '桥西区',
        status: 'red',
        isAlarm: true,
        coords: [114.48, 38.03],
        magnitude: 5.5,
        towns: [
          { name: '中山街道', status: 'red', isAlarm: true, coords: [114.49, 38.04], magnitude: 5.8 },
          { name: '维明街道', status: 'orange', isAlarm: true, coords: [114.48, 38.03], magnitude: 4.8 },
        ],
      },
      {
        name: '长安区',
        status: 'warning',
        isAlarm: false,
        coords: [114.50, 38.05],
        magnitude: 3.6,
        towns: [
          { name: '育才街道', status: 'normal', isAlarm: false, coords: [114.52, 38.05], magnitude: 2.9 },
          { name: '跃进街道', status: 'warning', isAlarm: false, coords: [114.54, 38.03], magnitude: 3.4 },
        ],
      },
    ],
  },
])

const mapStats = reactive({
  rescueTeams: 48,
  shelters: 156,
  affected: 12,
  routes: 28,
})

const epicenterCoords = [116.5, 39.9]

const earthquakeMarkers = reactive([
  { id: 'rescue-A', name: '救援队A', type: 'rescue', coords: [116.35, 39.85], personnel: 150, equipment: '救护车5辆、挖掘机3台' },
  { id: 'rescue-B', name: '消防中队', type: 'rescue', coords: [116.48, 39.82], personnel: 80, equipment: '消防车4辆、云梯车2台' },
  { id: 'shelter-A', name: '避难所B', type: 'shelter', coords: [116.62, 39.88], capacity: 2000, current: 1200 },
  { id: 'supply-A', name: '物资点', type: 'supply', coords: [116.68, 39.78], supplies: '帐篷500顶、食品20吨、药品10箱' },
])

const callResponseData = reactive([
  { id: 1, level: '市级', unit: '北京市应急局', status: 'answered', time: '09:15' },
  { id: 2, level: '市级', unit: '天津市应急局', status: 'answered', time: '09:18' },
  { id: 3, level: '市级', unit: '河北省应急厅', status: 'answered', time: '09:20' },
  { id: 4, level: '区县', unit: '朝阳区应急办', status: 'answered', time: '09:22' },
  { id: 5, level: '区县', unit: '桥西区应急办', status: 'unanswered', time: '09:25' },
  { id: 6, level: '乡镇', unit: '望京街道', status: 'answered', time: '09:28' },
  { id: 7, level: '乡镇', unit: '中山街道', status: 'unanswered', time: '09:30' },
  { id: 8, level: '乡镇', unit: '育才街道', status: 'answered', time: '09:32' },
])

const commandData = reactive([
  { id: 1, status: 'completed', statusText: '已完成', time: '09:05', content: '启动二级应急响应，各单位立即行动', source: '国家应急指挥中心' },
  { id: 2, status: 'executing', statusText: '执行中', time: '09:10', content: '调配京津冀三地救援力量支援震中区域', source: '京津冀联合指挥部' },
  { id: 3, status: 'executing', statusText: '执行中', time: '09:15', content: '开辟应急通道，保障救援车辆通行', source: '北京市交通委' },
  { id: 4, status: 'pending', statusText: '待执行', time: '09:20', content: '准备第二批物资调运方案', source: '河北省物资局' },
])

const timelineEvents = reactive([
  { time: '09:00', desc: '地震发生，自动触发预警' },
  { time: '09:02', desc: '启动应急响应机制' },
  { time: '09:05', desc: '首批救援队伍出发' },
  { time: '09:10', desc: '京津冀协同联动启动' },
  { time: '09:15', desc: '物资调配方案制定完成' },
  { time: '09:20', desc: '道路抢修队伍到位' },
  { time: '09:25', desc: '首批伤员转移完成' },
])

const conference = reactive({
  active: false,
  eventId: 'CONSULT-20260704-001',
  seconds: 0,
})

const plotMode = ref('start')
const activeParty = ref('beijing')
const consultationDraft = ref('')

const plotTools = [
  { key: 'start', label: '设置起点', short: '起' },
  { key: 'waypoint', label: '设置拐点', short: '拐' },
  { key: 'end', label: '设置终点', short: '终' },
]

const conferenceParties = [
  { key: 'beijing', name: '北京' },
  { key: 'tianjin', name: '天津' },
  { key: 'hebei', name: '河北' },
]

const routeState = reactive({
  start: null,
  end: null,
  waypoints: [],
})

const consultationOpinions = reactive([
  { id: 1, party: '北京', time: '09:12:06', text: '建议优先保障通州至震中方向应急通道，医疗队先行进入。' },
  { id: 2, party: '河北', time: '09:13:18', text: '廊坊可作为跨区补给中转点，承接物资汇集后分拨。' },
])

const operationLogs = reactive([
  { id: 1, time: '09:12:00', text: '会商准备：全域震情底图、资源点位、阻断路段已加载。' },
])

const conferenceArchives = reactive([])

const recordingDuration = computed(() => {
  const min = String(Math.floor(conference.seconds / 60)).padStart(2, '0')
  const sec = String(conference.seconds % 60).padStart(2, '0')
  return `${min}:${sec}`
})

const routeLevelText = computed(() => {
  if (currentView.value === 'global') return '全域：跨省高速应急通道优先'
  if (currentView.value === 'city') return '市级：市域主干道与应急联络线优先'
  return '区县：街镇末端接驳与避险绕行优先'
})

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function switchView(view) {
  currentView.value = view
  if (view === 'global') {
    mapStats.rescueTeams = 48
    mapStats.shelters = 156
    mapStats.affected = 12
    mapStats.routes = 28
    if (map) {
      map.setZoomAndCenter(8, epicenterCoords)
      updateIntensityLayers(epicenterCoords)
    }
  } else if (view === 'city') {
    mapStats.rescueTeams = 18
    mapStats.shelters = 45
    mapStats.affected = 4
    mapStats.routes = 12
    if (map) {
      map.setZoomAndCenter(10, epicenterCoords)
      updateIntensityLayers(epicenterCoords)
    }
  } else {
    mapStats.rescueTeams = 8
    mapStats.shelters = 15
    mapStats.affected = 2
    mapStats.routes = 5
    if (map) {
      map.setZoomAndCenter(12, epicenterCoords)
      updateIntensityLayers(epicenterCoords)
    }
  }
  updateConferenceRoute()
  recordOperation(`切换到${mapTitles[view]}，按${routeLevelText.value}重新规划路径。`)
}

function toggleTreeCollapse() {
  isTreeCollapsed.value = !isTreeCollapsed.value
}

function toggleNode(nodeName) {
  const idx = expandedNodes.value.indexOf(nodeName)
  if (idx > -1) {
    expandedNodes.value.splice(idx, 1)
  } else {
    expandedNodes.value.push(nodeName)
  }
}

function handleNodeClick(node) {
  if (node.districts || node.towns) {
    toggleNode(node.name)
  }
  if (node.coords && map) {
    map.setZoomAndCenter(14, node.coords)
    updateIntensityLayers(node.coords)
    
    earthquakeData.nodeName = node.name
    earthquakeData.location = `${node.coords[0].toFixed(4)}°E, ${node.coords[1].toFixed(4)}°N`
    
    const levelMap = { normal: { level: 'green', text: '正常' }, warning: { level: 'yellow', text: '预警' }, orange: { level: 'orange', text: '二级响应' }, red: { level: 'red', text: '一级响应' } }
    const levelInfo = levelMap[node.status] || { level: 'green', text: '正常' }
    earthquakeData.level = levelInfo.level
    earthquakeData.levelText = levelInfo.text
    
    earthquakeData.magnitude = node.status === 'normal' ? '-' : (node.magnitude || (Math.random() * 2 + 3).toFixed(1))
  }
}

function updateIntensityLayers(centerCoords) {
  if (!map) return
  intensityOverlays.forEach(overlay => overlay.setMap(null))
  intensityOverlays = []
  
  const rings = [
    { radius: ringRadii.inner * 1000, fill: '#ff2d55', fillOpacity: 0.35, stroke: '#ff6b8a', intensity: '极震区', label: `极震区（${ringRadii.inner}km）` },
    { radius: ringRadii.middle * 1000, fill: '#ff9500', fillOpacity: 0.28, stroke: '#ffb852', intensity: '影响区', label: `影响区（${ringRadii.middle}km）` },
    { radius: ringRadii.outer * 1000, fill: '#00ff88', fillOpacity: 0.22, stroke: '#6affb3', intensity: '外围区', label: `外围区（${ringRadii.outer}km）` },
  ]
  
  rings.forEach((ring, index) => {
    const circle = new window.AMap.Circle({
      center: centerCoords,
      radius: ring.radius,
      fillColor: ring.fill,
      fillOpacity: ring.fillOpacity,
      strokeColor: ring.stroke,
      strokeWeight: index === 0 ? 4 : 3,
      strokeOpacity: 0.95,
      zIndex: 20 + index,
      bubble: true,
    })
    circle.setMap(map)
    intensityOverlays.push(circle)
  })
}

function updateRingRadii() {
  if (map && map.getCenter) {
    updateIntensityLayers(lngLatToArray(map.getCenter()))
  }
}

function initiateSupport() {
  drawRescueRoute()
}

function toggleConference() {
  if (conference.active) {
    finishConference()
  } else {
    startConference()
  }
}

function startConference() {
  conference.active = true
  conference.seconds = 0
  activeTab.value = 'consultation'
  recordOperation('三地联合会商开启，地图画布录屏、标绘、路径规划、意见同步开始。')
  startMapRecording()
  recordingTimer = setInterval(() => {
    conference.seconds += 1
  }, 1000)
}

async function finishConference() {
  conference.active = false
  if (recordingTimer) clearInterval(recordingTimer)
  const videoUrl = await stopMapRecording()
  const archive = {
    id: conference.eventId,
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    routeLevel: routeLevelText.value,
    videoUrl,
    opinions: consultationOpinions.map(item => ({ ...item })),
    operations: operationLogs.map(item => ({ ...item })),
    routePoints: await getPlannedRouteCoords(),
  }
  conferenceArchives.unshift(archive)
  timelineEvents.unshift({ time: archive.time, desc: `三地联合会商归档：录屏、意见、路径打包至 ${archive.id}` })
  activeTab.value = 'drill-review'
  recordOperation('会商结束，录屏视频、会商意见、路径点位和操作日志已打包归档。')
}

function startMapRecording() {
  recordingChunks = []
  try {
    const canvas = mapContainer.value?.querySelector?.('canvas')
    const stream = canvas?.captureStream?.(12)
    if (!stream || typeof MediaRecorder === 'undefined') return
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    mediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) recordingChunks.push(event.data)
    }
    mediaRecorder.start(1000)
  } catch (error) {
    mediaRecorder = null
  }
}

function stopMapRecording() {
  return new Promise((resolve) => {
    if (!mediaRecorder) {
      resolve(createFallbackRecordingUrl())
      return
    }
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordingChunks, { type: 'video/webm' })
      resolve(blob.size ? URL.createObjectURL(blob) : createFallbackRecordingUrl())
      mediaRecorder = null
    }
    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    } else {
      resolve(createFallbackRecordingUrl())
    }
  })
}

function createFallbackRecordingUrl() {
  const text = operationLogs.map(item => `${item.time} ${item.text}`).join('\n')
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  return URL.createObjectURL(blob)
}

function handleConferenceMapClick(event) {
  const coords = getEventCoords(event)
  if (!coords) return
  const tool = plotTools.find(item => item.key === plotMode.value)
  const point = {
    id: `${plotMode.value}-${Date.now()}`,
    name: `${tool.label}-${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`,
    type: plotMode.value,
    short: tool.short,
    party: conferenceParties.find(item => item.key === activeParty.value)?.name || '北京',
    coords,
  }
  if (plotMode.value === 'start') {
    removeRouteMarker(routeState.start)
    routeState.start = point
  } else if (plotMode.value === 'end') {
    removeRouteMarker(routeState.end)
    routeState.end = point
  } else {
    routeState.waypoints.push(point)
  }
  addRouteMarker(point)
  updateConferenceRoute()
}

function addRouteMarker(point) {
  if (!map) return
  const el = document.createElement('div')
  el.className = `consult-route-marker ${point.type} ${activeParty.value}`
  el.textContent = point.short
  el.title = `${point.party} ${point.name}`
  const marker = new window.AMap.Marker({
    content: el,
    position: point.coords,
    draggable: true,
    offset: new window.AMap.Pixel(-12, -12),
    anchor: 'top-left',
  })
  marker.setMap(map)
  marker.on('dragend', (event) => {
    point.coords = lngLatToArray(event.lnglat)
    updateConferenceRoute()
    recordOperation(`${point.party}拖拽${point.name}，系统根据拐点重新规划${routeLevelText.value}。`)
  })
  point.marker = marker
  activeRouteMarkers.push(marker)
}

function removeRouteMarker(point) {
  if (point?.marker) {
    point.marker.setMap(null)
  }
}

function resetConferenceRoute() {
  activeRouteMarkers.forEach(marker => marker.remove())
  activeRouteMarkers = []
  routeState.start = null
  routeState.end = null
  routeState.waypoints = []
  removeConferenceRouteLayer()
  recordOperation('清空会商路径标绘，起点、终点和所有手动拐点已移除。')
}

async function updateConferenceRoute() {
  if (!map || !routeState.start || !routeState.end) {
    console.log('updateConferenceRoute: missing map or route points')
    return
  }
  const seq = ++routePlanSeq
  
  try {
    const start = routeState.start.coords
    const end = routeState.end.coords
    
    let url = `https://restapi.amap.com/v3/direction/driving?key=${GAODE_MAP_KEY}&origin=${start[0]},${start[1]}&destination=${end[0]},${end[1]}&output=json&extensions=all`
    
    if (routeState.waypoints.length > 0) {
      const waypoints = routeState.waypoints.map(wp => `${wp.coords[0]},${wp.coords[1]}`).join('|')
      url += `&waypoints=${waypoints}`
    }
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status === '1' && data.route?.paths?.length > 0) {
      const path = data.route.paths[0]
      const coords = []
      
      path.steps.forEach(step => {
        const polyline = step.polyline
        if (polyline) {
          const points = polyline.split(';')
          points.forEach(point => {
            const [lng, lat] = point.split(',').map(Number)
            coords.push([lng, lat])
          })
        }
      })
      
      if (coords.length >= 2) {
        drawRouteOnMap(coords)
      }
    }
    
  } catch (error) {
    console.error('ERROR in updateConferenceRoute:', error)
  }
}

function drawRouteOnMap(coords) {
  if (!map) return
  const routeStyle = {
    strokeWeight: currentView.value === 'global' ? 7 : currentView.value === 'city' ? 6 : 5,
    strokeStyle: currentView.value === 'global' ? 'dashed' : 'solid',
    strokeOpacity: currentView.value === 'global' ? 0.9 : 0.95,
  }
  if (conferenceRouteLine) {
    conferenceRouteLine.setPath(coords)
    conferenceRouteLine.setOptions(routeStyle)
  } else {
    conferenceRouteLine = new window.AMap.Polyline({
      path: coords,
      strokeColor: '#35f0bd',
      ...routeStyle,
      lineJoin: 'round',
      zIndex: 80,
    })
    conferenceRouteLine.setMap(map)
  }
}

function removeConferenceRouteLayer() {
  if (!map) return
  routePlanSeq += 1
  if (conferenceRouteLine) {
    conferenceRouteLine.setMap(null)
    conferenceRouteLine = null
  }
}

// 确保驾车导航服务已加载
function ensureDrivingService() {
  if (!window.AMap) {
    return Promise.reject(new Error('AMap not loaded'))
  }
  if (drivingService) return Promise.resolve()
  return new Promise((resolve, reject) => {
    window.AMap.plugin('AMap.Driving', () => {
      drivingService = new window.AMap.Driving({
        policy: 'LEAST_TIME',
        hideMarkers: true,
        autoFitView: false,
      })
      resolve()
    }, (error) => {
      reject(new Error('Failed to load Driving plugin'))
    })
  })
}

async function getPlannedRouteCoords() {
  if (!routeState.start || !routeState.end) return []
  return [
    routeState.start.coords,
    ...routeState.waypoints.map(wp => wp.coords),
    routeState.end.coords,
  ]
}

function optimizeWaypoints(startCoords, waypoints) {
  const pending = [...waypoints]
  const ordered = []
  let cursor = startCoords
  while (pending.length) {
    pending.sort((a, b) => distance(cursor, a.coords) - distance(cursor, b.coords))
    const next = pending.shift()
    ordered.push(next)
    cursor = next.coords
  }
  return ordered
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function dedupeCoords(coords) {
  return coords.filter((coord, index) => {
    const prev = coords[index - 1]
    return !prev || prev[0] !== coord[0] || prev[1] !== coord[1]
  })
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

function submitConsultationOpinion() {
  const party = conferenceParties.find(item => item.key === activeParty.value)?.name || '北京'
  consultationOpinions.unshift({
    id: Date.now(),
    party,
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    text: consultationDraft.value.trim(),
  })
  recordOperation(`${party}提交会商意见：${consultationDraft.value.trim()}`)
  consultationDraft.value = ''
}

function recordOperation(text) {
  if (!conference.active && !text.includes('归档')) return
  operationLogs.unshift({
    id: Date.now() + Math.random(),
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    text,
  })
}

function downloadArchiveVideo(archive) {
  downloadUrl(archive.videoUrl, `${archive.id}-map-record.webm`)
}

function downloadArchiveText(archive) {
  const content = [
    `会商事件：${archive.id}`,
    `路径层级：${archive.routeLevel}`,
    '',
    '会商意见：',
    ...archive.opinions.map(item => `${item.time} ${item.party}：${item.text}`),
    '',
    '地图操作：',
    ...archive.operations.map(item => `${item.time} ${item.text}`),
  ].join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  downloadUrl(URL.createObjectURL(blob), `${archive.id}-opinions.txt`)
}

function downloadUrl(url, filename) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function loadAmap() {
  if (window.AMap) return Promise.resolve()
  const existing = document.querySelector('script[data-amap-loader="earthquake-command"]')
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', reject, { once: true })
    })
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.dataset.amapLoader = 'earthquake-command'
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${GAODE_MAP_KEY}&plugin=AMap.Scale,AMap.ToolBar,AMap.Walking,AMap.Driving`
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

function getEventCoords(event) {
  if (!event?.lnglat) return null
  return lngLatToArray(event.lnglat)
}

function lngLatToArray(lnglat) {
  if (!lnglat) return null
  if (Array.isArray(lnglat)) return lnglat
  if (typeof lnglat.getLng === 'function') return [lnglat.getLng(), lnglat.getLat()]
  return [lnglat.lng, lnglat.lat]
}

function openInfoWindow(coords, html) {
  if (!map || !window.AMap) return
  const infoWindow = new window.AMap.InfoWindow({
    content: `<div class="amap-popup-content">${html}</div>`,
    offset: new window.AMap.Pixel(0, -24),
  })
  infoWindow.open(map, coords)
}

function drawRescueRoute() {
  if (!map) return
  
  const routeCoords = [
    [116.35, 39.85],
    [116.42, 39.88],
    [116.5, 39.9]
  ]
  
  if (rescueRouteLine) {
    rescueRouteLine.setMap(null)
  }
  rescueRouteLine = new window.AMap.Polyline({
    path: routeCoords,
    strokeColor: '#00d9a6',
    strokeWeight: 5,
    strokeOpacity: 0.85,
    strokeStyle: 'dashed',
    zIndex: 70,
  })
  rescueRouteLine.setMap(map)
  
  setTimeout(() => {
    if (rescueRouteLine) {
      rescueRouteLine.setMap(null)
      rescueRouteLine = null
    }
  }, 10000)
}

async function initMap() {
  drivingService = null
  await loadAmap()
  if (!window.AMap || !mapContainer.value) {
    mapContainer.value.innerHTML = '<div class="map-load-error">高德地图加载失败，请检查 Key、网络或服务类型。</div>'
    return
  }

  map = new window.AMap.Map('earthquake-map', {
    center: epicenterCoords,
    zoom: 8,
    pitch: 0,
    viewMode: '2D',
    resizeEnable: true,
    mapStyle: 'amap://styles/normal',
  })

  map.addControl(new window.AMap.Scale())
  map.addControl(new window.AMap.ToolBar({ position: 'RB' }))
  updateIntensityLayers(epicenterCoords)
  addMarkerLayers()
  addEpicenterMarker()
  map.on('click', handleConferenceMapClick)
}

function addMarkerLayers() {
  resourceOverlays.forEach(marker => marker.setMap(null))
  resourceOverlays = []
  earthquakeMarkers.forEach((item) => {
    const marker = new window.AMap.Marker({
      position: item.coords,
      content: `<div class="amap-resource-marker ${item.type}">${item.type === 'rescue' ? '救' : item.type === 'shelter' ? '避' : '物'}</div>`,
      offset: new window.AMap.Pixel(-10, -10),
      zIndex: 50,
    })
    marker.setMap(map)
    resourceOverlays.push(marker)
  })
}

function addEpicenterMarker() {
  const epicenterEl = document.createElement('div')
  epicenterEl.className = 'epicenter-marker'
  epicenterEl.innerHTML = `<div class="epicenter-ring"></div><div class="epicenter-inner"></div>`
  if (epicenterOverlay) epicenterOverlay.setMap(null)
  epicenterOverlay = new window.AMap.Marker({
    content: epicenterEl,
    position: epicenterCoords,
    offset: new window.AMap.Pixel(-12, -12),
    zIndex: 90,
  })
  epicenterOverlay.setMap(map)
}

let clockTimer = null

onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  
  setTimeout(() => {
    initMap()
  }, 100)
  
  resizeObserver = new ResizeObserver(() => {
    if (map) map.resize()
  })
  if (mapContainer.value) {
    resizeObserver.observe(mapContainer.value)
  }
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (recordingTimer) clearInterval(recordingTimer)
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
  activeRouteMarkers.forEach(marker => marker.setMap(null))
  intensityOverlays.forEach(overlay => overlay.setMap(null))
  resourceOverlays.forEach(marker => marker.setMap(null))
  if (epicenterOverlay) epicenterOverlay.setMap(null)
  if (conferenceRouteLine) conferenceRouteLine.setMap(null)
  if (rescueRouteLine) rescueRouteLine.setMap(null)
  if (resizeObserver) resizeObserver.disconnect()
  if (map?.destroy) map.destroy()
})

watch(currentView, () => {
  switchView(currentView.value)
})
</script>

<style scoped>
.earthquake-command {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0a0e1a;
  color: #e0e8f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

.header-bar {
  height: 70px;
  background: linear-gradient(180deg, #141c2b 0%, #0d1320 100%);
  border-bottom: 1px solid rgba(64, 164, 255, 0.12);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 24px;
  position: relative;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
}

.title-group h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(90deg, #ff9a9a, #ff6b6b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sub-title {
  font-size: 12px;
  color: rgba(255, 180, 180, 0.6);
  margin-left: 8px;
}

.quake-info {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 16px;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 107, 107, 0.2);
}

.quake-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.quake-item .label {
  font-size: 12px;
  color: rgba(255, 180, 180, 0.6);
}

.quake-item .value {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.quake-item .value.magnitude {
  font-size: 20px;
  color: #ff6b6b;
  font-weight: 700;
}

.quake-item .unit {
  font-size: 12px;
  color: rgba(255, 180, 180, 0.5);
}

.emergency-level {
  display: flex;
  gap: 8px;
}

.level-tag {
  padding: 2px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.level-orange {
  background: rgba(255, 180, 70, 0.2);
  color: #ffb347;
  border: 1px solid rgba(255, 180, 70, 0.3);
}

.level-red {
  background: rgba(255, 77, 106, 0.2);
  color: #ff4d6a;
  border: 1px solid rgba(255, 77, 106, 0.3);
}

.level-yellow {
  background: rgba(255, 230, 109, 0.2);
  color: #ffe066;
  border: 1px solid rgba(255, 230, 109, 0.3);
}

.level-green {
  background: rgba(82, 196, 26, 0.2);
  color: #52c41a;
  border: 1px solid rgba(82, 196, 26, 0.3);
}

.link-tag {
  padding: 2px 12px;
  border-radius: 4px;
  font-size: 12px;
  background: rgba(0, 166, 255, 0.15);
  color: #00a6ff;
  border: 1px solid rgba(0, 166, 255, 0.3);
}

.view-switch {
  display: flex;
  background: rgba(0, 40, 80, 0.3);
  border-radius: 8px;
  padding: 4px;
}

.view-btn {
  padding: 6px 18px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn:hover {
  background: rgba(64, 164, 255, 0.1);
}

.view-btn.active {
  background: linear-gradient(135deg, #0066ff, #00a6ff);
  color: #fff;
}

.alarm-scroll {
  flex: 1;
  overflow: hidden;
  padding: 6px 16px;
  background: rgba(255, 77, 106, 0.08);
  border-radius: 6px;
  border: 1px solid rgba(255, 77, 106, 0.15);
}

.alarm-content {
  display: inline-block;
  animation: scroll-left 20s linear infinite;
  white-space: nowrap;
  color: #ff9a9a;
}

@keyframes scroll-left {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.alarm-icon {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.conference-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: linear-gradient(135deg, #00d9a6, #00b894);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 217, 166, 0.3);
}

.conference-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 217, 166, 0.4);
}

.conference-btn.recording {
  background: linear-gradient(135deg, #ff8a4c, #ff5d5d);
  box-shadow: 0 4px 14px rgba(255, 93, 93, 0.35);
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.left-tree {
  width: 260px;
  background: rgba(16, 32, 56, 0.8);
  border-right: 1px solid rgba(64, 164, 255, 0.08);
  display: flex;
  flex-direction: column;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(64, 164, 255, 0.08);
}

.tree-title {
  font-size: 14px;
  font-weight: 600;
  color: #8ab8ff;
}

.collapse-btn {
  padding: 4px 12px;
  background: rgba(64, 164, 255, 0.1);
  border: 1px solid rgba(64, 164, 255, 0.2);
  border-radius: 4px;
  color: #7abfff;
  font-size: 12px;
  cursor: pointer;
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.tree-node {
  margin-bottom: 2px;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.node-header:hover {
  background: rgba(64, 164, 255, 0.1);
}

.expand-icon {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.3);
  width: 14px;
}

.node-icon {
  font-size: 14px;
}

.node-name {
  flex: 1;
  font-size: 13px;
  color: #c8dcec;
}

.node-name.alarm-top {
  color: #ff6b6b;
  font-weight: 600;
  animation: alarm-blink 1s infinite;
}

@keyframes alarm-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-dot.normal {
  background: #4cd9a0;
  box-shadow: 0 0 8px rgba(76, 217, 160, 0.4);
}

.status-dot.warning {
  background: #ffb347;
  box-shadow: 0 0 8px rgba(255, 180, 70, 0.4);
}

.status-dot.orange {
  background: #ff8c42;
  box-shadow: 0 0 8px rgba(255, 140, 66, 0.4);
}

.status-dot.collaborative {
  background: #00a6ff;
  box-shadow: 0 0 8px rgba(0, 166, 255, 0.4);
}

.children {
  padding-left: 20px;
  margin-top: 2px;
}

.center-map {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(10, 14, 26, 0.9);
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(64, 164, 255, 0.08);
}

.map-title {
  font-size: 14px;
  font-weight: 600;
  color: #8ab8ff;
}

.map-legend {
  display: flex;
  gap: 16px;
  flex: 1;
}

.ring-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 20px;
  border-left: 1px solid rgba(64, 164, 255, 0.12);
}

.control-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 4px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.control-group input[type="range"] {
  width: 80px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  cursor: pointer;
}

.control-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: #40a4ff;
  border-radius: 50%;
  cursor: pointer;
}

.control-group span:last-child {
  width: 30px;
  text-align: right;
  color: #8ab8ff;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.intensity-1 {
  background: rgba(76, 217, 160, 0.6);
}

.legend-dot.intensity-2 {
  background: rgba(255, 180, 70, 0.6);
}

.legend-dot.intensity-3 {
  background: rgba(255, 107, 107, 0.6);
}

.legend-dot.rescue {
  background: #00a6ff;
}

.legend-dot.shelter {
  background: #00d9a6;
}

.map-container {
  flex: 1;
  position: relative;
  background: radial-gradient(ellipse at center, #141c2b 0%, #0a0e1a 100%);
}

.conference-map-tools {
  position: absolute;
  left: 14px;
  right: 14px;
  top: 14px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.conference-map-tools > * {
  pointer-events: auto;
}

.record-badge,
.route-level-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(8, 18, 32, 0.86);
  border: 1px solid rgba(126, 230, 196, 0.22);
  color: #b7c9df;
  font-size: 12px;
  backdrop-filter: blur(8px);
}

.record-badge.active {
  color: #fff;
  border-color: rgba(255, 93, 93, 0.5);
}

.record-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #73849a;
}

.record-badge.active .record-dot {
  background: #ff5d5d;
  box-shadow: 0 0 0 6px rgba(255, 93, 93, 0.16);
}

.route-level-card {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.route-level-card strong {
  color: #7ee6c4;
  font-size: 12px;
  max-width: 210px;
}

.plot-tools {
  display: flex;
  gap: 6px;
}

.plot-tool-btn,
.clear-route-btn {
  height: 34px;
  border: 1px solid rgba(126, 230, 196, 0.24);
  border-radius: 7px;
  padding: 0 10px;
  color: #dcecff;
  background: rgba(8, 18, 32, 0.88);
  cursor: pointer;
}

.plot-tool-btn.active {
  color: #06111f;
  background: #7ee6c4;
  border-color: #7ee6c4;
}

.plot-tool-btn:disabled,
.clear-route-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.map-container :deep(.consult-route-marker) {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1.5px solid #fff;
  color: #07111f;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  cursor: grab;
}

.map-container :deep(.consult-route-marker.start) {
  background: #4ea5ff;
}

.map-container :deep(.consult-route-marker.waypoint) {
  background: #ffb84d;
}

.map-container :deep(.consult-route-marker.end) {
  background: #16c79a;
}

.map-container :deep(.amap-resource-marker) {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1.5px solid #fff;
  color: #06111f;
  font-size: 10px;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.map-container :deep(.amap-resource-marker.rescue) {
  background: #00a6ff;
}

.map-container :deep(.amap-resource-marker.shelter) {
  background: #00d9a6;
}

.map-container :deep(.amap-resource-marker.supply) {
  background: #ffb347;
}

.map-container :deep(.amap-popup-content) {
  color: #fff !important;
  font-family: "Microsoft YaHei", Arial, sans-serif;
  background: linear-gradient(135deg, rgba(16, 32, 56, 0.98) 0%, rgba(26, 48, 80, 0.98) 100%);
  border-radius: 6px;
  padding: 6px 10px;
  border: 1px solid rgba(64, 164, 255, 0.3);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  min-width: 80px;
  max-width: 150px;
}

.map-container :deep(.amap-popup-content h4) {
  color: #fff !important;
  font-size: 12px !important;
  margin: 0 0 4px 0 !important;
}

.map-container :deep(.amap-popup-content p) {
  color: rgba(255, 255, 255, 0.85) !important;
  font-size: 10px !important;
  margin: 0 !important;
}

.map-container :deep(.amap-info-window) {
  border-radius: 6px;
}

.map-container :deep(.amap-info-window::after) {
  border-top-color: rgba(16, 32, 56, 0.98) !important;
}

.map-container :deep(.amap-logo),
.map-container :deep(.amap-copyright) {
  opacity: 0.35;
}

.map-load-error {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.66);
  font-size: 14px;
}

.epicenter-marker {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.epicenter-inner {
  width: 20px;
  height: 20px;
  background: radial-gradient(circle, #ff6b6b 0%, #ee5a5a 100%);
  border-radius: 50%;
  box-shadow: 0 0 15px rgba(255, 107, 107, 0.8);
  animation: epicenter-pulse 1.5s infinite;
  border: 2px solid rgba(255, 255, 255, 0.8);
}

.epicenter-ring {
  position: absolute;
  width: 32px;
  height: 32px;
  border: 2px solid rgba(255, 107, 107, 0.4);
  border-radius: 50%;
  animation: epicenter-ring 1.5s infinite;
}

@keyframes epicenter-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.7; }
}

@keyframes epicenter-ring {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}

.map-stats {
  display: flex;
  justify-content: space-around;
  padding: 12px 16px;
  background: rgba(16, 32, 56, 0.6);
  border-top: 1px solid rgba(64, 164, 255, 0.08);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #7abfff;
  font-family: 'Courier New', monospace;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.right-panel {
  width: 320px;
  background: rgba(16, 32, 56, 0.8);
  border-left: 1px solid rgba(64, 164, 255, 0.08);
  display: flex;
  flex-direction: column;
}

.tabs-header {
  display: flex;
  flex-wrap: wrap;
  padding: 8px;
  gap: 4px;
  border-bottom: 1px solid rgba(64, 164, 255, 0.08);
}

.tab-btn {
  flex: 1;
  min-width: calc(33.33% - 4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 6px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: rgba(64, 164, 255, 0.1);
}

.tab-btn.active {
  background: rgba(0, 102, 255, 0.2);
  color: #7abfff;
}

.tab-icon {
  font-size: 16px;
}

.tab-label {
  font-size: 11px;
}

.tabs-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-section {
  background: rgba(0, 40, 80, 0.2);
  border-radius: 10px;
  padding: 14px;
  border: 1px solid rgba(64, 164, 255, 0.06);
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #8ab8ff;
  margin-bottom: 12px;
}

.progress-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  width: 70px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(0, 40, 80, 0.4);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00a6ff, #00d9a6);
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-value {
  font-size: 12px;
  color: #7abfff;
  width: 36px;
  text-align: right;
}

.force-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.force-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: rgba(0, 40, 80, 0.2);
  border-radius: 8px;
}

.force-value {
  font-size: 18px;
  font-weight: 700;
  color: #7abfff;
}

.force-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

.coop-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.coop-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: rgba(0, 40, 80, 0.2);
  border-radius: 6px;
}

.coop-city {
  font-size: 13px;
  color: #c8dcec;
}

.coop-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}

.coop-status.ready {
  background: rgba(0, 217, 166, 0.15);
  color: #4cd9a0;
}

.coop-status.pending {
  background: rgba(255, 180, 70, 0.15);
  color: #ffb347;
}

.support-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #0066ff, #00a6ff);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.support-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 102, 255, 0.3);
}

.support-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

.consult-status {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 217, 166, 0.08);
  border: 1px solid rgba(0, 217, 166, 0.16);
}

.consult-status.active {
  border-color: rgba(255, 93, 93, 0.42);
  background: rgba(255, 93, 93, 0.1);
}

.consult-status span {
  color: rgba(255, 255, 255, 0.66);
  font-size: 12px;
}

.party-switch {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}

.party-btn {
  flex: 1;
  height: 32px;
  border: 1px solid rgba(64, 164, 255, 0.22);
  border-radius: 7px;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(0, 40, 80, 0.32);
  cursor: pointer;
}

.party-btn.active.beijing {
  color: #66b7ff;
  border-color: #66b7ff;
}

.party-btn.active.tianjin {
  color: #00d9a6;
  border-color: #00d9a6;
}

.party-btn.active.hebei {
  color: #ffb347;
  border-color: #ffb347;
}

.route-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.route-summary div {
  padding: 10px;
  border-radius: 8px;
  background: rgba(0, 40, 80, 0.26);
}

.route-summary span,
.archive-meta span {
  display: block;
  color: rgba(255, 255, 255, 0.54);
  font-size: 12px;
}

.route-summary strong {
  display: block;
  margin-top: 6px;
  color: #7ee6c4;
  font-size: 13px;
  word-break: break-all;
}

.opinion-input {
  width: 100%;
  min-height: 92px;
  resize: vertical;
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(64, 164, 255, 0.18);
  color: #e0e8f0;
  background: rgba(4, 12, 22, 0.72);
  font-family: inherit;
}

.opinion-input:disabled {
  opacity: 0.5;
}

.opinion-list,
.record-log,
.archive-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.opinion-item,
.archive-card {
  padding: 10px;
  border-radius: 8px;
  background: rgba(0, 40, 80, 0.24);
  border: 1px solid rgba(64, 164, 255, 0.1);
}

.opinion-item div,
.archive-head,
.archive-meta,
.archive-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.opinion-item span,
.archive-head span {
  color: rgba(255, 255, 255, 0.54);
  font-size: 12px;
}

.opinion-item p,
.archive-opinions p,
.record-log p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  line-height: 1.55;
}

.record-log {
  max-height: 220px;
  overflow: auto;
}

.record-log div {
  padding: 8px 0;
  border-bottom: 1px solid rgba(64, 164, 255, 0.08);
}

.record-log span {
  color: #7ee6c4;
  font-size: 12px;
}

.archive-video {
  width: 100%;
  height: 120px;
  margin: 10px 0;
  border-radius: 8px;
  background: #06111f;
}

.archive-meta {
  justify-content: flex-start;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.archive-actions {
  margin-top: 10px;
  justify-content: flex-start;
}

.archive-actions button {
  height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(126, 230, 196, 0.3);
  border-radius: 6px;
  color: #7ee6c4;
  background: rgba(0, 217, 166, 0.08);
  cursor: pointer;
}

.response-table {
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  padding: 8px 10px;
  background: rgba(0, 40, 80, 0.3);
  border-radius: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.table-header span {
  flex: 1;
}

.table-row {
  display: flex;
  padding: 10px;
  border-bottom: 1px solid rgba(64, 164, 255, 0.06);
  font-size: 12px;
}

.table-row span {
  flex: 1;
}

.status-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-tag.answered {
  background: rgba(0, 217, 166, 0.15);
  color: #4cd9a0;
}

.status-tag.unanswered {
  background: rgba(255, 77, 106, 0.15);
  color: #ff4d6a;
}

.command-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.command-item {
  padding: 12px;
  background: rgba(0, 40, 80, 0.2);
  border-radius: 8px;
}

.cmd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.cmd-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}

.cmd-status.completed {
  background: rgba(0, 217, 166, 0.15);
  color: #4cd9a0;
}

.cmd-status.executing {
  background: rgba(0, 166, 255, 0.15);
  color: #00a6ff;
}

.cmd-status.pending {
  background: rgba(255, 180, 70, 0.15);
  color: #ffb347;
}

.cmd-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.cmd-content {
  font-size: 13px;
  color: #c8dcec;
  margin-bottom: 4px;
}

.cmd-source {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.resource-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resource-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 40, 80, 0.2);
  border-radius: 8px;
  border-left: 3px solid #00a6ff;
}

.resource-card.warning {
  border-left-color: #ffb347;
}

.resource-icon {
  font-size: 24px;
}

.resource-info {
  flex: 1;
}

.resource-value {
  font-size: 20px;
  font-weight: 700;
  color: #7abfff;
}

.resource-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.resource-detail {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
}

.gap-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gap-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(255, 77, 106, 0.1);
  border-radius: 6px;
  border-left: 3px solid #ff4d6a;
}

.gap-icon {
  font-size: 16px;
}

.gap-text {
  font-size: 12px;
  color: #ff9a9a;
}

.timeline {
  display: flex;
  flex-direction: column;
  padding-left: 12px;
  border-left: 2px solid rgba(64, 164, 255, 0.2);
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #00a6ff;
  margin-top: 4px;
  flex-shrink: 0;
}

.timeline-content {
  flex: 1;
}

.timeline-time {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #7abfff;
  margin-bottom: 2px;
}

.timeline-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.compare-chart {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.compare-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.compare-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  width: 70px;
}

.compare-bar {
  flex: 1;
  height: 12px;
  background: rgba(0, 40, 80, 0.4);
  border-radius: 6px;
  overflow: hidden;
}

.compare-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s;
}

.compare-fill.collaborative {
  background: linear-gradient(90deg, #0066ff, #00a6ff);
}

.compare-fill.independent {
  background: linear-gradient(90deg, #ff8c42, #ffb347);
}

.compare-value {
  font-size: 12px;
  color: #7abfff;
  width: 50px;
  text-align: right;
}

.efficiency-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.efficiency-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: rgba(0, 40, 80, 0.2);
  border-radius: 8px;
}

.efficiency-value {
  font-size: 20px;
  font-weight: 700;
  color: #7abfff;
}

.efficiency-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

.distribution-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dist-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: rgba(0, 40, 80, 0.2);
  border-radius: 6px;
}

.dist-label {
  flex: 1;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.dist-value {
  font-size: 12px;
  font-weight: 600;
  color: #7abfff;
}
</style>
