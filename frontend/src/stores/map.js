import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMapStore = defineStore('map', () => {
  const mapInstance = ref(null)
  const isLoading = ref(true)
  const isError = ref(false)
  const errorMessage = ref('')
  const layers = ref([])

  function setMap(map) {
    mapInstance.value = map
    isLoading.value = false
  }

  function setLoading(status) {
    isLoading.value = status
  }

  function setError(message) {
    isError.value = true
    errorMessage.value = message
    isLoading.value = false
  }

  function clearError() {
    isError.value = false
    errorMessage.value = ''
  }

  function setLayers(list) {
    layers.value = list
  }

  function addLayer(layer) {
    if (!layers.value.find(l => l.id === layer.id)) {
      layers.value.push(layer)
    }
  }

  function removeLayer(layerId) {
    const idx = layers.value.findIndex(l => l.id === layerId)
    if (idx !== -1) layers.value.splice(idx, 1)
  }

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
