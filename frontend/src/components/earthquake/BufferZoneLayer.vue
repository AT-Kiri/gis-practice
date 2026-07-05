<script setup>
/**
 * 双缓冲区图层组件
 *
 * 在 MapboxGL 地图上渲染两个同心圆 Polygon：
 *   - 外圈（earthquake-buffer-outer）：橙色填充 rgba(221,107,32,0.15)，应急支援范围
 *   - 内圈（earthquake-buffer-inner）：红色填充 rgba(229,62,62,0.25)，灾害影响范围
 *
 * z-order：外圈先添加（下层），内圈后添加（上层），内圈视觉上遮罩外圈中心
 *
 * Props:
 *   - map: MapboxGL 地图实例
 *   - center: 受灾点坐标 [lng, lat]
 *   - bufferConfig: 缓冲区配置 { inner, outer, innerColor, outerColor, name }
 *
 * 文档参考：docs/earthquake-rescue-design.md §6.3 / §6.5
 */
import { watch, onUnmounted } from 'vue'
import mapboxgl from 'mapbox-gl'
import { createCirclePolygon } from '@/utils/circlePolygon'

const props = defineProps({
  map: { type: Object, required: true },
  center: { type: Array, required: true }, // [lng, lat]
  bufferConfig: {
    type: Object,
    required: true,
    // 期望字段：{ inner, outer, innerColor, outerColor, name }
  },
})

const OUTER_SOURCE = 'earthquake-buffer-outer-source'
const OUTER_LAYER = 'earthquake-buffer-outer'
const INNER_SOURCE = 'earthquake-buffer-inner-source'
const INNER_LAYER = 'earthquake-buffer-inner'

/**
 * 渲染双缓冲区图层
 *
 * 顺序：
 *   1. cleanup() 清理旧图层
 *   2. 添加外圈 source + layer（下层）
 *   3. 添加内圈 source + layer（上层）
 *   4. 绑定鼠标悬停 tooltip
 */
function render() {
  if (!props.map || !props.center || !props.bufferConfig) return

  cleanup()

  const { inner, outer, innerColor, outerColor } = props.bufferConfig

  // 外圈 Polygon（应急支援范围）
  const outerPolygon = createCirclePolygon(props.center, outer, 64)
  // 内圈 Polygon（灾害影响范围）
  const innerPolygon = createCirclePolygon(props.center, inner, 64)

  // 添加外圈 source + layer（先添加，处于下层）
  props.map.addSource(OUTER_SOURCE, {
    type: 'geojson',
    data: outerPolygon,
  })
  props.map.addLayer({
    id: OUTER_LAYER,
    type: 'fill',
    source: OUTER_SOURCE,
    paint: {
      'fill-color': outerColor || 'rgba(221,107,32,0.15)',
      'fill-opacity': 1,
    },
  })

  // 添加内圈 source + layer（后添加，处于上层）
  props.map.addSource(INNER_SOURCE, {
    type: 'geojson',
    data: innerPolygon,
  })
  props.map.addLayer({
    id: INNER_LAYER,
    type: 'fill',
    source: INNER_SOURCE,
    paint: {
      'fill-color': innerColor || 'rgba(229,62,62,0.25)',
      'fill-opacity': 1,
    },
  })

  bindTooltips()
}

/**
 * 绑定鼠标悬停 tooltip
 *
 * 外圈悬停："应急支援范围（Xkm）"
 * 内圈悬停："灾害影响范围（Xkm），设施已损毁"
 *
 * 使用 mouseenter 切换光标 + mousemove 跟踪鼠标位置 + mouseleave 移除 tooltip
 */
function bindTooltips() {
  if (!props.map || !props.bufferConfig) return
  const outerKm = (props.bufferConfig.outer / 1000).toFixed(1)
  const innerKm = (props.bufferConfig.inner / 1000).toFixed(1)

  const outerTooltip = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
  })
  const innerTooltip = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
  })

  // 外圈 mouseenter / mousemove / mouseleave
  props.map.on('mouseenter', OUTER_LAYER, () => {
    props.map.getCanvas().style.cursor = 'pointer'
  })
  props.map.on('mousemove', OUTER_LAYER, (e) => {
    outerTooltip
      .setLngLat(e.lngLat)
      .setHTML(`<div class="buffer-tooltip">应急支援范围（${outerKm}km）</div>`)
      .addTo(props.map)
  })
  props.map.on('mouseleave', OUTER_LAYER, () => {
    props.map.getCanvas().style.cursor = ''
    outerTooltip.remove()
  })

  // 内圈 mouseenter / mousemove / mouseleave
  props.map.on('mouseenter', INNER_LAYER, () => {
    props.map.getCanvas().style.cursor = 'pointer'
  })
  props.map.on('mousemove', INNER_LAYER, (e) => {
    innerTooltip
      .setLngLat(e.lngLat)
      .setHTML(
        `<div class="buffer-tooltip">灾害影响范围（${innerKm}km），设施已损毁</div>`,
      )
      .addTo(props.map)
  })
  props.map.on('mouseleave', INNER_LAYER, () => {
    props.map.getCanvas().style.cursor = ''
    innerTooltip.remove()
  })
}

/**
 * 清理旧的 source 和 layer
 *
 * 必须先移除 layer 再移除 source（MapboxGL 限制：source 被 layer 引用时无法删除）
 */
function cleanup() {
  if (!props.map) return

  // 内圈先清理（后添加的先清理）
  if (props.map.getLayer(INNER_LAYER)) {
    props.map.off('mouseenter', INNER_LAYER)
    props.map.off('mousemove', INNER_LAYER)
    props.map.off('mouseleave', INNER_LAYER)
    props.map.removeLayer(INNER_LAYER)
  }
  if (props.map.getSource(INNER_SOURCE)) {
    props.map.removeSource(INNER_SOURCE)
  }

  // 外圈后清理
  if (props.map.getLayer(OUTER_LAYER)) {
    props.map.off('mouseenter', OUTER_LAYER)
    props.map.off('mousemove', OUTER_LAYER)
    props.map.off('mouseleave', OUTER_LAYER)
    props.map.removeLayer(OUTER_LAYER)
  }
  if (props.map.getSource(OUTER_SOURCE)) {
    props.map.removeSource(OUTER_SOURCE)
  }
}

// 暴露 cleanup 给父组件调用
defineExpose({ cleanup, render })

// 监听 props 变化重新渲染
watch(
  () => [props.center, props.bufferConfig],
  () => render(),
  { deep: true },
)

// 初次进入时若 map 已存在则立即渲染
watch(
  () => props.map,
  (map) => {
    if (map && props.center && props.bufferConfig) {
      render()
    }
  },
  { immediate: true },
)

// 组件卸载时清理
onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <!-- 纯图层组件，不渲染 DOM -->
  <div class="buffer-zone-layer" style="display: none"></div>
</template>

<style scoped>
.buffer-zone-layer {
  display: none;
}
</style>

<style>
/* tooltip 全局样式（不 scoped 以便 MapboxGL Popup 实例能引用） */
.buffer-tooltip {
  padding: 4px 8px;
  font-size: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 4px;
}
</style>
