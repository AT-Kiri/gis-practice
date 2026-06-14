/**
 * 地图全局状态管理（Pinia Store）
 * 管理地图实例、加载状态、错误信息和图层列表
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMapStore = defineStore('map', () => {
  // ====== 状态定义 ======
  /** MapboxGL 地图实例 */
  const mapInstance = ref(null)
  /** 地图是否正在加载中 */
  const isLoading = ref(true)
  /** 地图是否加载出错 */
  const isError = ref(false)
  /** 错误信息描述 */
  const errorMessage = ref('')
  /** 图层列表，每个图层包含 id、name、visible、opacity */
  const layers = ref([])

  // ====== 操作方法 ======

  /** 设置地图实例，加载完成后调用 */
  function setMap(map) {
    mapInstance.value = map
    isLoading.value = false
  }

  /** 手动设置加载状态 */
  function setLoading(status) {
    isLoading.value = status
  }

  /** 设置错误状态和错误信息 */
  function setError(message) {
    isError.value = true
    errorMessage.value = message
    isLoading.value = false
  }

  /** 清除错误状态 */
  function clearError() {
    isError.value = false
    errorMessage.value = ''
  }

  /** 设置完整的图层列表 */
  function setLayers(list) {
    layers.value = list
  }

  /** 添加单个图层（避免重复添加） */
  function addLayer(layer) {
    if (!layers.value.find(l => l.id === layer.id)) {
      layers.value.push(layer)
    }
  }

  /** 根据图层 ID 移除图层 */
  function removeLayer(layerId) {
    const idx = layers.value.findIndex(l => l.id === layerId)
    if (idx !== -1) layers.value.splice(idx, 1)
  }

  // 导出所有状态和方法
  return {
    mapInstance,
    isLoading,
    isError,
    errorMessage,
    layers,
    setMap,
    setLoading,
    setError,
    clearError,
    setLayers,
    addLayer,
    removeLayer,
  }
})
