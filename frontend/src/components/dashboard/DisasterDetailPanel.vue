<template>
  <div class="detail-panel">
    <template v-if="selectedCounty && countyInfo">
      <!-- 面板标题 -->
      <div class="panel-header">
        <span class="panel-title">{{ selectedCounty }} - 地震灾情评估</span>
      </div>

      <div class="detail-content">
        <!-- 1. 灾情信息概览 -->
        <div class="overview-section">
          <div class="overview-row">
            <span class="label">受灾类型</span>
            <span class="value">
              <a-tag color="red">{{ countyInfo.disasterType || '地震' }}</a-tag>
            </span>
          </div>
          <div class="overview-row">
            <span class="label">初始等级</span>
            <span class="value">
              <a-tag :color="initialLevelColor">
                {{ countyInfo.disasterLevelName || `等级 ${countyInfo.disasterLevel}` }}
              </a-tag>
            </span>
          </div>
          <div class="overview-row">
            <span class="label">初始 DDI</span>
            <span class="value highlight">{{ countyInfo.ddi ?? '—' }}</span>
          </div>
        </div>

        <!-- 2. 8 指标录入区 -->
        <div class="indicator-section">
          <div class="section-title">📊 灾情指标录入（8 项）</div>
          <div
            v-for="group in indicatorGroups"
            :key="group.name"
            class="indicator-group"
          >
            <div class="group-title">{{ group.name }}</div>
            <div class="indicator-grid">
              <div
                v-for="key in group.keys"
                :key="key"
                class="indicator-item"
              >
                <label :title="getMeta(key).label">
                  <span class="indicator-code">{{ getMeta(key).code }}</span>
                  {{ getMeta(key).label }}
                </label>
                <a-input-number
                  v-model:value="formData[key]"
                  :min="0"
                  :max="getMeta(key).threshold[1]"
                  :step="indicatorStep(key)"
                  size="small"
                  class="indicator-input"
                />
                <span class="indicator-unit">{{ getMeta(key).unit }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. 评估结果 -->
        <div v-if="assessment" class="assessment-result">
          <div class="section-title">📈 评估结果</div>
          <div class="result-summary">
            <div class="result-row">
              <span class="label">DDI 综合指数</span>
              <span class="value highlight">{{ assessment.ddi }}</span>
            </div>
            <div class="result-row">
              <span class="label">灾情等级</span>
              <a-tag :color="assessment.level.color">
                {{ assessment.level.level }}级 {{ assessment.level.name }}
              </a-tag>
            </div>
            <div class="result-row">
              <span class="label">缓冲区配置</span>
              <span class="value">
                内 {{ (assessment.bufferConfig.inner / 1000).toFixed(1) }} km
                / 外 {{ (assessment.bufferConfig.outer / 1000).toFixed(1) }} km
              </span>
            </div>
          </div>

          <!-- AHP 8 指标分解 -->
          <div class="ahp-section">
            <div class="ahp-title">AHP 8 指标分解</div>
            <div class="ahp-grid">
              <div class="ahp-header">指标</div>
              <div class="ahp-header">原始值</div>
              <div class="ahp-header">归一化</div>
              <div class="ahp-header">权重</div>
              <div class="ahp-header">贡献</div>
            </div>
            <div
              v-for="d in assessment.details"
              :key="d.key"
              class="ahp-grid ahp-row"
            >
              <div>{{ d.label }}</div>
              <div>{{ formatNumber(d.raw) }}</div>
              <div>{{ d.normalized.toFixed(1) }}</div>
              <div>{{ (d.weight * 100).toFixed(1) }}%</div>
              <div>
                <div class="ahp-bar">
                  <div
                    class="ahp-bar-inner"
                    :style="{ width: (d.weight * d.normalized) + '%' }"
                  />
                </div>
                <div class="ahp-contribution-text">
                  {{ d.contribution.toFixed(2) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. 附近支援点+物资点列表 -->
        <div
          v-if="nearbySupportPoints.length || nearbySupplyPoints.length"
          class="nearby-section"
        >
          <div class="section-title">📍 附近资源点</div>

          <div v-if="nearbySupportPoints.length" class="nearby-group">
            <div class="group-title">支援点（{{ nearbySupportPoints.length }}）</div>
            <div class="nearby-list">
              <div
                v-for="(p, i) in nearbySupportPoints"
                :key="`s-${i}`"
                class="nearby-item"
              >
                <span class="nearby-icon">{{ typeIcon(p.type) }}</span>
                <span class="nearby-name">{{ p.name }}</span>
                <span class="nearby-distance">{{ formatDistance(p.distance) }}</span>
              </div>
            </div>
          </div>

          <div v-if="nearbySupplyPoints.length" class="nearby-group">
            <div class="group-title">物资点（{{ nearbySupplyPoints.length }}）</div>
            <div class="nearby-list">
              <div
                v-for="(p, i) in nearbySupplyPoints"
                :key="`p-${i}`"
                class="nearby-item"
              >
                <span class="nearby-icon">{{ typeIcon(p.type) }}</span>
                <span class="nearby-name">{{ p.name }}</span>
                <span class="nearby-distance">{{ formatDistance(p.distance) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. 操作按钮 -->
        <div class="detail-actions">
          <a-button type="primary" block @click="onAssess">
            <template #icon><ApiOutlined /></template>
            评估灾情
          </a-button>
          <a-button
            type="primary"
            danger
            block
            :disabled="!assessment"
            @click="onStartRescue"
          >
            🆘 一键救援
          </a-button>
        </div>
      </div>
    </template>

    <!-- 未选中状态 -->
    <template v-else>
      <div class="panel-header">
        <span class="panel-title">地震灾情评估</span>
      </div>
      <div class="empty-state">
        <EnvironmentOutlined style="font-size: 36px; color: rgba(255,255,255,0.15);" />
        <p>请点击地图上的县区开始录入灾情</p>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * 数据大屏 - 灾害详情面板（地震灾情评估）
 *
 * 改造说明（20260705-earthquake-rescue-refactor）：
 *  - 内部 AHP 计算从 utils/ahp.js 切换为 utils/earthquakeAhp.js
 *  - 新增 8 指标录入区（4 分组：人员伤亡 / 受灾范围 / 房屋损毁 / 经济损失）
 *  - 新增"评估灾情"按钮 → emit('reassess', formData)
 *  - 新增附近支援点+物资点列表
 *  - 新增"🆘 一键救援"按钮 → emit('start-rescue')
 *
 * @prop {String|null} selectedCounty - 选中的县区名称
 * @prop {Object} disasterData - 各县灾害数据 Map（含 8 指标 + bufferConfig）
 * @prop {Array} supportPoints - 附近支援点数组（按距离升序）
 * @prop {Array} supplyPoints - 附近物资点数组（按距离升序）
 * @prop {Array|null} disasterCenter - 受灾点坐标 [lng, lat]
 *
 * @emits reassess - 用户点击"评估灾情"按钮，传出 indicators/ddi/level/bufferConfig
 * @emits start-rescue - 用户点击"🆘 一键救援"按钮
 */
import { ref, reactive, computed, watch } from 'vue'
import { ApiOutlined, EnvironmentOutlined } from '@ant-design/icons-vue'
import {
  INDICATOR_META,
  assessDisaster,
} from '@/utils/earthquakeAhp.js'

const props = defineProps({
  selectedCounty: { type: String, default: null },
  disasterData: { type: Object, default: () => ({}) },
  supportPoints: { type: Array, default: () => [] },
  supplyPoints: { type: Array, default: () => [] },
  disasterCenter: { type: Array, default: null },
})

const emit = defineEmits(['reassess', 'start-rescue'])

// ==================== 8 指标录入表单 ====================

const formData = reactive({
  deaths: 0,
  injured: 0,
  missing: 0,
  affected_pop: 0,
  evacuated: 0,
  collapsed_houses: 0,
  damaged_houses: 0,
  economic_loss: 0,
})

// 4 类分组（与 earthquakeAhp.js CRITERIA_WEIGHTS 一致）
const indicatorGroups = [
  { name: '人员伤亡', keys: ['deaths', 'injured', 'missing'] },
  { name: '受灾范围', keys: ['affected_pop', 'evacuated'] },
  { name: '房屋损毁', keys: ['collapsed_houses', 'damaged_houses'] },
  { name: '经济损失', keys: ['economic_loss'] },
]

// ==================== 评估结果 ====================

const assessment = ref(null)
// assessment = { ddi, level, bufferConfig, details }

// ==================== 计算属性 ====================

const countyInfo = computed(() => {
  if (!props.selectedCounty) return null
  return props.disasterData[props.selectedCounty] || null
})

const initialLevelColor = computed(() => {
  if (!countyInfo.value?.disasterLevelColor) return 'default'
  return countyInfo.value.disasterLevelColor
})

const nearbySupportPoints = computed(() => {
  return [...props.supportPoints].sort((a, b) => (a.distance || 0) - (b.distance || 0))
})

const nearbySupplyPoints = computed(() => {
  return [...props.supplyPoints].sort((a, b) => (a.distance || 0) - (b.distance || 0))
})

// ==================== 工具函数 ====================

function getMeta(key) {
  return INDICATOR_META.find((m) => m.key === key) || { code: '', label: key, unit: '', threshold: [0, 0] }
}

function indicatorStep(key) {
  // 经济损失以万元为单位，步长 10000；其他以个位步长
  if (key === 'economic_loss') return 10000
  if (key === 'affected_pop' || key === 'evacuated' || key === 'damaged_houses') return 100
  return 1
}

function formatNumber(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + ' 万'
  return String(n)
}

function formatDistance(meters) {
  if (typeof meters !== 'number') return '—'
  return (meters / 1000).toFixed(2) + ' km'
}

const TYPE_ICONS = {
  emergency_management: '🏛️',
  fire_station: '🚒',
  hospital: '🏥',
  supply_depot: '📦',
  shelter: '🏕️',
  grain_oil: '🏪',
  supermarket: '🏪',
  pharmacy: '💊',
  gas_station: '⛽',
}

function typeIcon(type) {
  return TYPE_ICONS[type] || '📍'
}

// ==================== 事件处理 ====================

/**
 * 切换县区时预填表单（用 mock 数据作为初值）
 */
watch(
  () => props.selectedCounty,
  (name) => {
    if (!name || !props.disasterData[name]) {
      // 重置
      Object.keys(formData).forEach((k) => (formData[k] = 0))
      assessment.value = null
      return
    }
    const d = props.disasterData[name]
    Object.assign(formData, {
      deaths: d.deaths ?? 0,
      injured: d.injured ?? 0,
      missing: d.missing ?? 0,
      affected_pop: d.affected_pop ?? 0,
      evacuated: d.evacuated ?? 0,
      collapsed_houses: d.collapsed_houses ?? 0,
      damaged_houses: d.damaged_houses ?? 0,
      economic_loss: d.economic_loss ?? 0,
    })
    // 重置评估结果，让用户重新触发评估
    assessment.value = null
  },
  { immediate: true },
)

function onAssess() {
  const result = assessDisaster({ ...formData })
  assessment.value = result
  emit('reassess', {
    indicators: { ...formData },
    ddi: result.ddi,
    level: result.level,
    bufferConfig: result.bufferConfig,
    details: result.details,
    center: props.disasterCenter,
    countyName: props.selectedCounty,
  })
}

function onStartRescue() {
  if (!assessment.value) return
  emit('start-rescue')
}
</script>

<style scoped>
.detail-panel {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.panel-header {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.panel-title {
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  font-weight: 600;
}

.detail-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.overview-section {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.overview-row,
.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.label {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  flex-shrink: 0;
}

.value {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  text-align: right;
}

.highlight {
  color: #1890ff;
  font-weight: 600;
}

.indicator-section {
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.indicator-group {
  margin-top: 8px;
}

.group-title {
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  padding-bottom: 2px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
}

.indicator-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}

.indicator-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.indicator-item label {
  flex: 1;
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.indicator-code {
  color: rgba(24, 144, 255, 0.7);
  font-size: 10px;
  font-family: 'Courier New', monospace;
  background: rgba(24, 144, 255, 0.1);
  padding: 1px 4px;
  border-radius: 2px;
}

.indicator-input {
  width: 110px;
}

.indicator-unit {
  color: rgba(255, 255, 255, 0.35);
  font-size: 11px;
  width: 28px;
}

.assessment-result {
  padding: 10px;
  background: rgba(24, 144, 255, 0.04);
  border: 1px solid rgba(24, 144, 255, 0.15);
  border-radius: 6px;
}

.result-summary {
  margin-bottom: 8px;
}

.ahp-section {
  margin-top: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
}

.ahp-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 6px;
  font-weight: 600;
}

.ahp-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr 1.6fr;
  gap: 6px 8px;
  align-items: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
}

.ahp-header {
  color: rgba(255, 255, 255, 0.5);
  font-weight: 700;
}

.ahp-row {
  padding: 4px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.ahp-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 2px;
}

.ahp-bar-inner {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #40a9ff);
}

.ahp-contribution-text {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
}

.nearby-section {
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.nearby-group {
  margin-top: 6px;
}

.nearby-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nearby-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
  font-size: 12px;
}

.nearby-icon {
  font-size: 14px;
}

.nearby-name {
  flex: 1;
  color: rgba(255, 255, 255, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nearby-distance {
  color: #1890ff;
  font-size: 11px;
  flex-shrink: 0;
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
}

/* 滚动条样式 */
.detail-panel::-webkit-scrollbar {
  width: 4px;
}
.detail-panel::-webkit-scrollbar-track {
  background: transparent;
}
.detail-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
</style>
