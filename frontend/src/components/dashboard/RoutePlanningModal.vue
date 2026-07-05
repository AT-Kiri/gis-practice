<template>
  <RescueDispatchPanel
    ref="panelRef"
    :visible="visible"
    :map="map"
    :disaster-data="disasterData"
    :support-points="supportPoints"
    :disaster-center="disasterCenter"
    @update:visible="onUpdateVisible"
    @dispatch-complete="onDispatchComplete"
  />
</template>

<script setup>
/**
 * 数据大屏 - 5 步救援调度弹窗
 *
 * 改造说明（20260705-earthquake-rescue-refactor）：
 *  - 移除原"单条 OSRM 路径规划"逻辑
 *  - 集成 RescueDispatchPanel 组件，实现 5 步顺序调度
 *  - 4 路彩色并行：fire(#e53e3e) / medical(#d53f8c) / supply(#dd6b20) / shelter(#38a169)
 *  - 每步间隔 3 秒，单步失败降级处理
 *  - 调度中按钮 disabled
 *  - 组件卸载时清理所有定时器
 *
 * @prop {Boolean} visible - 弹窗显隐
 * @prop {Object} map - MapboxGL 地图实例
 * @prop {Object} disasterData - 灾情数据
 * @prop {Array} supportPoints - 支援点数组
 * @prop {Array|null} disasterCenter - 受灾点坐标 [lng, lat]
 *
 * @emits update:visible - 弹窗显隐变化
 * @emits dispatch-complete - 调度完成事件
 */
import { ref, watch, nextTick } from 'vue'
import RescueDispatchPanel from '@/components/earthquake/RescueDispatchPanel.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  map: { type: Object, default: null },
  disasterData: { type: Object, default: () => ({}) },
  supportPoints: { type: Array, default: () => [] },
  disasterCenter: { type: Array, default: null },
})

const emit = defineEmits(['update:visible', 'dispatch-complete'])

const panelRef = ref(null)

// 弹窗打开时自动启动 5 步调度
watch(
  () => props.visible,
  async (open) => {
    if (open) {
      // 先聚焦视角到受灾点（zoom=13 适配 8km 缓冲区范围）
      if (props.map && props.disasterCenter) {
        props.map.flyTo({
          center: props.disasterCenter,
          zoom: 13,
          duration: 1500,
        })
      }
      // 等待子组件挂载完成 + flyTo 启动
      await nextTick()
      // 给 Modal 内部一个渲染周期
      setTimeout(() => {
        if (panelRef.value?.startDispatch) {
          panelRef.value.startDispatch()
        }
      }, 200)
    }
  },
  { immediate: true },
)

function onUpdateVisible(v) {
  emit('update:visible', v)
}

function onDispatchComplete(e) {
  emit('dispatch-complete', e)
}

// 暴露给父组件的方法（必要时可手动触发）
defineExpose({
  startDispatch: () => panelRef.value?.startDispatch?.(),
  cancelDispatch: () => panelRef.value?.cancelDispatch?.(),
  clearRoutes: () => panelRef.value?.clearRoutes?.(),
})
</script>
