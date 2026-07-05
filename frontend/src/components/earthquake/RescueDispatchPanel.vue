<script setup>
/**
 * 5 步救援调度面板
 *
 * 实现地震救援的 5 步顺序调度流程：
 *   Step 1: 应急指令下达（无路径）
 *   Step 2: 消防搜救（红色路径 #e53e3e）
 *   Step 3: 医疗救治（粉色路径 #d53f8c）
 *   Step 4: 物资调拨（橙色路径 #dd6b20）
 *   Step 5: 人员安置（绿色路径 #38a169）
 *
 * 4 路彩色路径并行显示，每步间隔 3 秒，单步失败降级处理。
 *
 * 文档参考：
 *   - spec.md §4 5 步救援调度流程
 *   - tasks.md §T4.2, §T4.3
 *   - checklist.md §4
 */
import { ref, computed, onUnmounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useShortestPath } from '@/composables/useShortestPath.js'
import { haversine } from '@/utils/haversine.js'

const props = defineProps({
  /** MapboxGL 地图实例 */
  map: { type: Object, default: null },
  /** 灾情数据（含 districtName） */
  disasterData: { type: Object, default: () => ({}) },
  /** 支援点数组（按类型筛选最近的） */
  supportPoints: { type: Array, default: () => [] },
  /** 受灾点坐标 [lng, lat] */
  disasterCenter: { type: Array, default: null },
  /** 是否显示调度面板 */
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible', 'dispatch-complete'])

// ==================== 状态 ====================

const currentStep = ref('idle') // idle | step1 | step2 | step3 | step4 | step5 | done
const isDispatching = ref(false)
const currentMessage = ref('') // 当前步骤弹窗消息
const stepMessages = ref([]) // 所有步骤的消息历史
const timerIds = ref([]) // 待清理的定时器

const { planPath } = useShortestPath()

// ==================== 路径图层常量 ====================

const ROUTE_LAYERS = {
  fire: { source: 'rescue-route-fire-src', layer: 'rescue-route-fire', color: '#e53e3e' },
  medical: { source: 'rescue-route-medical-src', layer: 'rescue-route-medical', color: '#d53f8c' },
  supply: { source: 'rescue-route-supply-src', layer: 'rescue-route-supply', color: '#dd6b20' },
  shelter: { source: 'rescue-route-shelter-src', layer: 'rescue-route-shelter', color: '#38a169' },
}

const STEP_TYPE_MAP = {
  step2: 'fire_station',
  step3: 'hospital',
  step4: 'supply_depot',
  step5: 'shelter',
}

const STEP_LABELS = {
  step1: { icon: '🚨', label: '应急指令' },
  step2: { icon: '🚒', label: '消防搜救' },
  step3: { icon: '🚑', label: '医疗救治' },
  step4: { icon: '📦', label: '物资调拨' },
  step5: { icon: '🏕️', label: '人员安置' },
}

// ==================== 工具函数 ====================

function sleep(ms) {
  return new Promise((resolve) => {
    const id = setTimeout(resolve, ms)
    timerIds.value.push(id)
  })
}

function findNearestPoint(type) {
  if (!props.supportPoints || props.supportPoints.length === 0) return null
  const candidates = props.supportPoints.filter((p) => p.type === type)
  if (candidates.length === 0) return null
  // 按距离升序
  return [...candidates].sort(
    (a, b) => (a.distance || 0) - (b.distance || 0),
  )[0]
}

function formatDuration(distanceMeters) {
  // 假设平均车速 40 km/h → 11.1 m/s
  const minutes = Math.max(1, Math.round(distanceMeters / 1000 / 40 * 60))
  return minutes
}

function pushMessage(text) {
  currentMessage.value = text
  stepMessages.value.push({ step: currentStep.value, text, time: Date.now() })
}

// ==================== 路径渲染 ====================

function clearAllRoutes() {
  const map = props.map
  if (!map) return
  Object.values(ROUTE_LAYERS).forEach(({ source, layer }) => {
    if (map.getLayer(layer)) map.removeLayer(layer)
    if (map.getSource(source)) map.removeSource(source)
  })
}

function renderRoute(routeKey, geometry, origin, destination) {
  const map = props.map
  if (!map || !geometry) return

  const { source, layer, color } = ROUTE_LAYERS[routeKey]

  // 清理旧路径（如存在）
  if (map.getLayer(layer)) map.removeLayer(layer)
  if (map.getSource(source)) map.removeSource(source)

  // 拼接坐标：起点 + 路径坐标 + 终点（确保与圆点相连）
  let coords = [...(geometry.coordinates || [])]
  const TOLERANCE = 0.0001
  if (origin && coords.length > 0) {
    const dx = coords[0][0] - origin[0]
    const dy = coords[0][1] - origin[1]
    if (Math.abs(dx) > TOLERANCE || Math.abs(dy) > TOLERANCE) {
      coords = [origin, ...coords]
    }
  }
  if (destination && coords.length > 0) {
    const last = coords[coords.length - 1]
    const dx = last[0] - destination[0]
    const dy = last[1] - destination[1]
    if (Math.abs(dx) > TOLERANCE || Math.abs(dy) > TOLERANCE) {
      coords = [...coords, destination]
    }
  }

  map.addSource(source, {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {},
    },
  })
  // 插入到点位圆图层下方，确保圆点始终可见
  const beforeLayer = map.getLayer('eq-points-circle') ? 'eq-points-circle' : undefined
  map.addLayer({
    id: layer,
    type: 'line',
    source,
    paint: {
      'line-color': color,
      'line-width': 4,
      'line-opacity': 0.85,
    },
  }, beforeLayer)
}

// ==================== 5 步调度 ====================

async function executeStep1() {
  currentStep.value = 'step1'
  const district = props.disasterData?.countyName || props.disasterData?.districtName || '受灾'
  pushMessage(`🚨 ${district}应急管理局已启动应急响应，正在下达调度指令`)
  await sleep(3000)
}

async function executeStep2() {
  currentStep.value = 'step2'
  const fire = findNearestPoint('fire_station')
  if (!fire) {
    pushMessage('⚠️ 未找到消防救援站，跳过消防搜救步骤')
    await sleep(1000)
    return
  }

  const distance = fire.distance || haversine(props.disasterCenter, [fire.lng, fire.lat])
  const minutes = formatDuration(distance)
  pushMessage(`🚒 ${fire.name}已出发，预计${minutes}分钟抵达`)

  // 路径规划（失败降级为直线）
  const origin = [fire.lng, fire.lat]
  const result = await planPath(origin, props.disasterCenter)
  if (result && result.geometry) {
    renderRoute('fire', result.geometry, origin, props.disasterCenter)
  }

  await sleep(3000)
  pushMessage('🚒 消防救援队已抵达受灾点，开始搜救被困人员')
  await sleep(1000)
}

async function executeStep3() {
  currentStep.value = 'step3'
  const hospital = findNearestPoint('hospital')
  if (!hospital) {
    pushMessage('⚠️ 未找到医院，跳过医疗救治步骤')
    await sleep(1000)
    return
  }

  const distance = hospital.distance || haversine(props.disasterCenter, [hospital.lng, hospital.lat])
  const minutes = formatDuration(distance)
  pushMessage(`🚑 ${hospital.name}已出发，预计${minutes}分钟抵达`)

  const origin = [hospital.lng, hospital.lat]
  const result = await planPath(origin, props.disasterCenter)
  if (result && result.geometry) {
    renderRoute('medical', result.geometry, origin, props.disasterCenter)
  }

  await sleep(3000)
  pushMessage('🚑 医疗救护队已抵达受灾点，开始现场救治')
  await sleep(1000)
}

async function executeStep4() {
  currentStep.value = 'step4'
  const depot = findNearestPoint('supply_depot')
  if (!depot) {
    pushMessage('⚠️ 未找到物资储备库，跳过物资调拨步骤')
    await sleep(1000)
    return
  }

  const distance = depot.distance || haversine(props.disasterCenter, [depot.lng, depot.lat])
  const minutes = formatDuration(distance)
  pushMessage(`📦 ${depot.name}已发出物资，包含帐篷、棉被、食品、饮用水等`)

  const origin = [depot.lng, depot.lat]
  const result = await planPath(origin, props.disasterCenter)
  if (result && result.geometry) {
    renderRoute('supply', result.geometry, origin, props.disasterCenter)
  }

  await sleep(3000)
  pushMessage('📦 救灾物资已送达受灾点，开始分发')
  await sleep(1000)
}

async function executeStep5() {
  currentStep.value = 'step5'
  const shelter = findNearestPoint('shelter')
  if (!shelter) {
    pushMessage('⚠️ 未找到避难场所，跳过人员安置步骤')
    await sleep(1000)
    return
  }

  const distance = shelter.distance || haversine(props.disasterCenter, [shelter.lng, shelter.lat])
  const minutes = formatDuration(distance)
  pushMessage(`🏕️ ${shelter.name}已开放，正在转移受灾群众`)

  const origin = [shelter.lng, shelter.lat]
  const result = await planPath(origin, props.disasterCenter)
  if (result && result.geometry) {
    renderRoute('shelter', result.geometry, origin, props.disasterCenter)
  }

  await sleep(3000)
  pushMessage('✅ 受灾群众已安全转移至应急避难场所')
  await sleep(1000)
}

async function startDispatch() {
  if (isDispatching.value) return
  if (!props.disasterCenter) {
    message.warning('请先录入灾情数据并评估')
    return
  }
  if (!props.supportPoints || props.supportPoints.length === 0) {
    message.warning('请先生成支援点')
    return
  }

  isDispatching.value = true
  stepMessages.value = []
  clearAllRoutes()

  try {
    await executeStep1()
    await executeStep2()
    await executeStep3()
    await executeStep4()
    await executeStep5()

    currentStep.value = 'done'
    const summary = '📋 救援调度全部完成！本次共出动5支救援力量，调拨物资X件，转移群众X人'
    pushMessage(summary)

    Modal.success({
      title: '救援调度完成',
      content: summary,
      okText: '确认',
    })
    emit('dispatch-complete', { success: true })
  } catch (e) {
    console.error('调度流程异常:', e)
    pushMessage(`⚠️ 调度流程异常：${e?.message || '未知错误'}`)
    emit('dispatch-complete', { success: false, error: e?.message })
  } finally {
    isDispatching.value = false
  }
}

function cancelDispatch() {
  // 清理所有定时器
  timerIds.value.forEach((id) => clearTimeout(id))
  timerIds.value = []
  isDispatching.value = false
  currentStep.value = 'idle'
  emit('update:visible', false)
}

function clearRoutes() {
  clearAllRoutes()
}

defineExpose({ startDispatch, cancelDispatch, clearRoutes })

// ==================== 计算属性 ====================

const stepProgress = computed(() => {
  const steps = ['step1', 'step2', 'step3', 'step4', 'step5']
  if (currentStep.value === 'idle') return 0
  if (currentStep.value === 'done') return 5
  const idx = steps.indexOf(currentStep.value)
  return idx >= 0 ? idx + 1 : 0
})

const stepList = computed(() => {
  return [
    { key: 'step1', label: '应急指令', icon: '🚨' },
    { key: 'step2', label: '消防搜救', icon: '🚒' },
    { key: 'step3', label: '医疗救治', icon: '🚑' },
    { key: 'step4', label: '物资调拨', icon: '📦' },
    { key: 'step5', label: '人员安置', icon: '🏕️' },
  ]
})

// ==================== 清理 ====================

onUnmounted(() => {
  timerIds.value.forEach((id) => clearTimeout(id))
  timerIds.value = []
  clearAllRoutes()
})
</script>

<template>
  <a-modal
    :open="visible"
    title="🆘 一键救援调度"
    :footer="null"
    :width="560"
    :mask-closable="false"
    :closable="!isDispatching"
    @cancel="cancelDispatch"
    wrap-class-name="rescue-dispatch-modal"
  >
    <div class="dispatch-panel">
      <!-- 步骤进度条 -->
      <a-steps :current="stepProgress" size="small" class="dispatch-steps">
        <a-step v-for="s in stepList" :key="s.key" :title="`${s.icon} ${s.label}`" />
      </a-steps>

      <!-- 当前消息 -->
      <div v-if="currentMessage" class="current-message">
        <a-alert :message="currentMessage" type="info" show-icon />
      </div>

      <!-- 历史消息 -->
      <div v-if="stepMessages.length > 0" class="message-history">
        <div class="history-title">调度记录</div>
        <div class="history-list">
          <div v-for="(m, i) in stepMessages" :key="i" class="history-item">
            <span class="history-time">{{ new Date(m.time).toLocaleTimeString() }}</span>
            <span class="history-text">{{ m.text }}</span>
          </div>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="dispatch-actions">
        <a-button
          type="primary"
          :loading="isDispatching"
          :disabled="isDispatching"
          @click="startDispatch"
        >
          {{ isDispatching ? '调度中...' : '启动救援调度' }}
        </a-button>
        <a-button v-if="isDispatching" danger @click="cancelDispatch">
          中止调度
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.dispatch-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dispatch-steps {
  margin-bottom: 4px;
}

.current-message {
  min-height: 44px;
}

.message-history {
  max-height: 220px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  padding: 8px 12px;
}

.history-title {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 6px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
}

.history-time {
  color: rgba(0, 0, 0, 0.35);
  flex-shrink: 0;
}

.history-text {
  flex: 1;
}

.dispatch-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
</style>

<style>
.rescue-dispatch-modal .ant-modal-content {
  background: #fff;
}
</style>
