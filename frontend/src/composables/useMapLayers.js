/**
 * useMapLayers — Mapbox GL 图层生命周期管理 composable
 *
 * 封装图层的初始化（ensureLayers）、清理（cleanupLayers）和数据设置（setData），
 * 消除各组件中重复的 ensureSources/cleanupLayers/setSourceData 代码。
 *
 * 用法：
 *   const { ensureLayers, cleanupLayers, setData } = useMapLayers(() => store.mapInstance, {
 *     sources: [{ id: 'my-src' }],
 *     layers: [{ id: 'my-layer', source: 'my-src', type: 'circle', paint: {...} }],
 *   })
 *   onMounted(() => ensureLayers())
 *   onUnmounted(() => cleanupLayers())
 */

import { ensureGeoJSONSources, removeLayersSafe, setGeoJSONData } from '@/utils/map'

/**
 * @param {Function|import('vue').Ref} mapRef - 返回地图实例的 getter 函数或 ref
 * @param {{ sources: Array, layers: Array }} config - 数据源和图层配置
 * @returns {{ ensureLayers: Function, cleanupLayers: Function, setData: Function }}
 */
export function useMapLayers(mapRef, config) {
  const getMap = () => (typeof mapRef === 'function' ? mapRef() : mapRef.value)
  const layerIds = (config.layers || []).map(l => l.id)
  const sourceIds = (config.sources || []).map(s => s.id)

  function ensureLayers() {
    ensureGeoJSONSources(getMap(), config.sources || [], config.layers || [])
  }

  function cleanupLayers() {
    removeLayersSafe(getMap(), layerIds, sourceIds)
  }

  function setData(sourceId, features) {
    setGeoJSONData(getMap(), sourceId, features)
  }

  return { ensureLayers, cleanupLayers, setData }
}
