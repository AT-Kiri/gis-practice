<template>
  <a-modal
    :open="visible"
    title="缓冲区联动分析"
    @cancel="closeModal"
    @ok="closeModal"
    ok-text="关闭"
    cancel-text="取消"
    :width="520"
    :destroyOnClose="true"
    wrap-class-name="buffer-modal"
  >
    <div class="buffer-content">
      <!-- 评估摘要 -->
      <div v-if="assessment" class="summary-section">
        <div class="summary-row">
          <span class="label">DDI 综合指数</span>
          <span class="value highlight">{{ assessment.ddi }}</span>
        </div>
        <div class="summary-row">
          <span class="label">灾情等级</span>
          <a-tag :color="assessment.level.color">
            {{ assessment.level.level }}级 {{ assessment.level.name }}
          </a-tag>
        </div>
        <div class="summary-row">
          <span class="label">缓冲区配置</span>
          <span class="value">
            内 {{ (assessment.bufferConfig.inner / 1000).toFixed(1) }} km
            / 外 {{ (assessment.bufferConfig.outer / 1000).toFixed(1) }} km
          </span>
        </div>
        <div class="summary-row">
          <span class="label">支援点</span>
          <span class="value">{{ supportPoints.length }} 个</span>
        </div>
        <div class="summary-row">
          <span class="label">物资点</span>
          <span class="value">{{ supplyPoints.length }} 个</span>
        </div>
        <div v-if="damagedPoints.length" class="summary-row">
          <span class="label">已损毁点</span>
          <span class="value danger">{{ damagedPoints.length }} 个</span>
        </div>
      </div>

      <!-- 双缓冲区说明 -->
      <div class="legend-section">
        <div class="legend-item">
          <span class="legend-color outer-color"></span>
          <span>应急支援范围（{{ outerKm }} km）</span>
        </div>
        <div class="legend-item">
          <span class="legend-color inner-color"></span>
          <span>灾害影响范围（{{ innerKm }} km）</span>
        </div>
      </div>

      <!-- 提示：缓冲区图层和支援点图层已常驻主地图（DataDashboardView.vue 顶层），
           不再随弹窗关闭而销毁，方便在调度阶段继续查看 -->

      <!-- 操作按钮 -->
      <div class="action-section">
        <a-button
          type="primary"
          danger
          block
          :disabled="!canStartRescue"
          @click="onStartRescue"
        >
          🆘 启动 5 步救援调度
        </a-button>
        <p v-if="!canStartRescue" class="hint-text">
          需先生成支援点（含消防/医院/物资库/避难场所）后才能启动调度
        </p>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
/**
 * 数据大屏 - 缓冲区联动分析弹窗
 *
 * 改造说明（20260705-earthquake-rescue-refactor）：
 *  - 移除"用户输入半径"逻辑，改为接收父组件传入的 bufferConfig props
 *  - 移除内/外圈简单平面坐标计算，改用 BufferZoneLayer 组件（haversine 距离 + 64 边近似圆）
 *  - 新增内/外双圈叠加渲染（外圈橙 rgba(221,107,32,0.15) + 内圈红 rgba(229,62,62,0.25)）
 *  - 新增 SupportPointLayer 集成（渲染支援点/物资点/已损毁点/受灾点）
 *  - 移除原救援点/物资点列表（由 SupportPointLayer 在地图上展示）
 *  - 新增"🆘 启动 5 步救援调度"按钮
 *
 * @prop {Boolean} visible - 弹窗显隐
 * @prop {Object} map - MapboxGL 地图实例
 * @prop {Object} assessment - 评估结果 { ddi, level, bufferConfig, details }
 * @prop {Array|null} disasterCenter - 受灾点坐标 [lng, lat]
 * @prop {Object|null} bufferConfig - 缓冲区配置 { inner, outer, innerColor, outerColor, name }
 * @prop {Array} supportPoints - 支援点数组
 * @prop {Array} supplyPoints - 物资点数组
 * @prop {Array} damagedPoints - 已损毁点数组
 */
import { computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  map: { type: Object, default: null },
  assessment: { type: Object, default: null },
  disasterCenter: { type: Array, default: null },
  bufferConfig: { type: Object, default: null },
  supportPoints: { type: Array, default: () => [] },
  supplyPoints: { type: Array, default: () => [] },
  damagedPoints: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:visible', 'start-rescue'])

const innerKm = computed(() => {
  if (!props.bufferConfig) return '0.0'
  return (props.bufferConfig.inner / 1000).toFixed(1)
})

const outerKm = computed(() => {
  if (!props.bufferConfig) return '0.0'
  return (props.bufferConfig.outer / 1000).toFixed(1)
})

// 是否可启动调度：支援点至少 4 类齐全（消防/医院/物资库/避难场所）
const canStartRescue = computed(() => {
  if (!props.supportPoints || props.supportPoints.length === 0) return false
  const requiredTypes = ['fire_station', 'hospital', 'supply_depot', 'shelter']
  return requiredTypes.every((t) => props.supportPoints.some((p) => p.type === t))
})

function closeModal() {
  emit('update:visible', false)
}

function onStartRescue() {
  if (!canStartRescue.value) return
  emit('start-rescue')
}
</script>

<style scoped>
.buffer-content {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-section {
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.summary-row:last-child {
  border-bottom: none;
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
  font-size: 15px;
}

.danger {
  color: #ff4d4f;
  font-weight: 600;
}

.legend-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
}

.legend-color {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 2px;
}

.outer-color {
  background: rgba(221, 107, 32, 0.5);
  border: 1px solid rgba(221, 107, 32, 0.8);
}

.inner-color {
  background: rgba(229, 62, 62, 0.5);
  border: 1px solid rgba(229, 62, 62, 0.8);
}

.action-section {
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.hint-text {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  margin-top: 6px;
  text-align: center;
}
</style>

<style>
/* 弹窗深色背景 - 覆盖 Ant Design 默认白色背景 */
.buffer-modal .ant-modal-content {
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.buffer-modal .ant-modal-header {
  background: #141414;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.buffer-modal .ant-modal-title {
  color: rgba(255, 255, 255, 0.85);
}
.buffer-modal .ant-modal-close {
  color: rgba(255, 255, 255, 0.45);
}
/* 按钮区 */
.buffer-modal .ant-modal-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: #141414;
}
</style>
