<template>
  <div class="detail-panel">
    <template v-if="selectedCounty && countyInfo">
      <!-- 面板标题 -->
      <div class="panel-header">
        <span class="panel-title">{{ selectedCounty }} - 灾害详情</span>
      </div>

      <!-- 灾害信息 -->
      <div class="detail-content">
        <div class="detail-row">
          <span class="label">受灾类型</span>
          <span class="value">
            <a-tag :color="levelColor">{{ countyInfo.disasterType || '无' }}</a-tag>
          </span>
        </div>
        <div class="detail-row">
          <span class="label">受灾等级</span>
          <span class="value">
            <a-tag :color="levelColor">等级 {{ countyInfo.disasterLevel }}</a-tag>
          </span>
        </div>
        <div class="detail-row">
          <span class="label">AHP 风险评分</span>
          <span class="value highlight">{{ countyInfo.ahpScore ?? '—' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">AHP 风险等级</span>
          <span class="value">
            <a-tag :color="ahpRiskColor">{{ countyInfo.ahpRiskLevel || '低' }}</a-tag>
          </span>
        </div>
        <div class="ahp-section">
          <div class="ahp-title">AHP 指标分解</div>
          <div class="ahp-grid">
            <div class="ahp-header">指标</div>
            <div class="ahp-header">原始值</div>
            <div class="ahp-header">归一化</div>
            <div class="ahp-header">权重</div>
            <div class="ahp-header">贡献</div>
          </div>
          <div v-for="detail in ahpDetails" :key="detail.key" class="ahp-grid ahp-row">
            <div>{{ detail.label }}</div>
            <div>{{ detail.rawValue }}</div>
            <div>{{ detail.normalizedPercent }}</div>
            <div>{{ detail.weightPercent }}</div>
            <div>
              <div class="ahp-bar">
                <div class="ahp-bar-inner" :style="{ width: detail.contributionPercent }" />
              </div>
              <div class="ahp-contribution-text">{{ detail.contributionPercent }}</div>
            </div>
          </div>
        </div>
        <div class="detail-row">
          <span class="label">救援人员</span>
          <span class="value highlight">{{ countyInfo.rescuePersonnel }} 人</span>
        </div>
        <div class="detail-row">
          <span class="label">受灾人员</span>
          <span class="value highlight-danger">{{ countyInfo.affectedPeople }} 人</span>
        </div>
        <div class="detail-row">
          <span class="label">所需救援</span>
          <span class="value">{{ countyInfo.requiredRescueType }}</span>
        </div>
        <div class="detail-desc">
          <span class="label">备注</span>
          <p class="desc-text">{{ countyInfo.description }}</p>
        </div>
      </div>

      <!-- 联动按钮 -->
      <div class="detail-actions">
        <a-button type="primary" block @click="$emit('buffer-analysis')">
          <template #icon><ApiOutlined /></template>
          救援分析
        </a-button>
      </div>
    </template>

    <!-- 未选中状态 -->
    <template v-else>
      <div class="panel-header">
        <span class="panel-title">灾害详情</span>
      </div>
      <div class="empty-state">
        <EnvironmentOutlined style="font-size: 36px; color: rgba(255,255,255,0.15);" />
        <p>请点击地图上的县区查看灾害详情</p>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * 数据大屏 - 灾害详情面板
 * @prop {String|null} selectedCounty - 选中的县区名称
 * @prop {Object} disasterData - 各县灾害数据 Map
 */
import { computed } from 'vue'
import { ApiOutlined, EnvironmentOutlined } from '@ant-design/icons-vue'
import { AHP_CRITERIA, AHP_CRITERIA_LABELS, calculateAHPWeights, normalizeCriterionValue } from '@/utils/ahp.js'

const props = defineProps({
  selectedCounty: { type: String, default: null },
  disasterData: { type: Object, default: () => ({}) },
})

defineEmits(['buffer-analysis'])

const countyInfo = computed(() => {
  if (!props.selectedCounty) return null
  return props.disasterData[props.selectedCounty] || null
})

// 等级对应颜色
const LEVEL_MAP = { 1: 'green', 2: 'gold', 3: 'orange', 4: 'red', 5: 'volcano' }
const levelColor = computed(() => {
  if (!countyInfo.value) return 'default'
  return LEVEL_MAP[countyInfo.value.disasterLevel] || 'default'
})

const ahpRiskColor = computed(() => {
  if (!countyInfo.value?.ahpRiskLevel) return 'default'
  const map = { 低: 'green', 较低: 'lime', 中: 'orange', 高: 'red', 极高: 'volcano' }
  return map[countyInfo.value.ahpRiskLevel] || 'default'
})

const ahpWeights = computed(() => calculateAHPWeights())

const ahpDetails = computed(() => {
  if (!countyInfo.value) return []
  return AHP_CRITERIA.map((key, idx) => {
    const rawValue = countyInfo.value[key] ?? 0
    const normalized = normalizeCriterionValue(key, rawValue)
    const weight = ahpWeights.value[idx] || 0
    const contribution = normalized * weight
    return {
      key,
      label: AHP_CRITERIA_LABELS[key] || key,
      rawValue,
      normalizedPercent: `${(normalized * 100).toFixed(0)}%`,
      weightPercent: `${(weight * 100).toFixed(1)}%`,
      contributionPercent: `${(contribution * 100).toFixed(1)}%`,
    }
  })
})
</script>

<style scoped>
.detail-panel {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
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
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
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

.highlight-danger {
  color: #ff4d4f;
  font-weight: 600;
}

.detail-desc {
  margin-top: 8px;
}

.detail-desc .label {
  display: block;
  margin-bottom: 4px;
}

.desc-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  line-height: 1.6;
  margin: 0;
}

.detail-actions {
  margin-top: 12px;
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

.ahp-section {
  margin: 12px 0;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.ahp-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 6px;
  font-weight: 600;
}

.ahp-grid {
  display: grid;
  grid-template-columns: 1.8fr 1fr 1fr 1fr 2fr;
  gap: 8px 12px;
  align-items: center;
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
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
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.ahp-bar-inner {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #40a9ff);
}

.ahp-contribution-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}
</style>
