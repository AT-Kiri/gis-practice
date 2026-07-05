/**
 * useShortestPath — 路径规划 composable
 *
 * 用途：封装 OSRM 在线路径规划调用，提供统一的接口供调度流程使用
 *
 * 文档参考：
 *   - tasks.md §T4.1
 *   - spec.md §4 调度流程
 *   - 与 RoutePlanningModal.vue 的 callOSRM 调用方式一致
 *
 * 行为：
 *   - 调用 OSRM 公共 API（https://router.project-osrm.org/）
 *   - 成功返回 { geometry, distance, duration, isFallback: false }
 *   - 失败降级为直线连接，返回 { geometry, distance, duration: null, isFallback: true }
 *   - 不抛出异常
 */

import { ref } from 'vue'
import { haversine } from '@/utils/haversine.js'

const OSRM_TIMEOUT_MS = 5000

/**
 * 调用 OSRM 公共路由 API
 * https://router.project-osrm.org/ - 免费、无需 Key
 *
 * @param {[number, number]} origin - 起点 [lng, lat]
 * @param {[number, number]} destination - 终点 [lng, lat]
 * @returns {Promise<{geometry: object, distance: number, duration: number}|null>}
 */
async function callOSRM(origin, destination) {
  const coordStr = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`

  const res = await fetch(url, { signal: AbortSignal.timeout(OSRM_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`OSRM service error: ${res.status}`)
  const data = await res.json()

  if (data && data.routes && data.routes.length > 0) {
    return {
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
      geometry: data.routes[0].geometry,
    }
  }
  return null
}

/**
 * 降级路径：直线连接
 */
function fallbackLineString(origin, destination) {
  return {
    type: 'LineString',
    coordinates: [
      [origin[0], origin[1]],
      [destination[0], destination[1]],
    ],
  }
}

/**
 * 路径规划 composable
 *
 * @returns {{
 *   planPath: (origin: [number, number], destination: [number, number]) => Promise<{
 *     geometry: object,        // GeoJSON LineString
 *     distance: number,        // 米
 *     duration: number|null,   // 秒（降级时为 null）
 *     isFallback: boolean,     // 是否降级
 *   }|null>,
 *   loading: import('vue').Ref<boolean>,
 *   error: import('vue').Ref<string|null>,
 * }}
 */
export function useShortestPath() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * 规划路径
   *
   * @param {[number, number]} origin - 起点 [lng, lat]
   * @param {[number, number]} destination - 终点 [lng, lat]
   * @returns {Promise<object|null>} 路径结果，失败时返回降级直线（不返回 null）
   */
  async function planPath(origin, destination) {
    if (!origin || !destination) {
      error.value = '起点或终点坐标缺失'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const result = await callOSRM(origin, destination)
      if (result) {
        return {
          geometry: result.geometry,
          distance: result.distance,
          duration: result.duration,
          isFallback: false,
        }
      }
      throw new Error('OSRM returned empty result')
    } catch (e) {
      // 降级：直线连接
      const straightDistance = haversine(origin, destination)
      return {
        geometry: fallbackLineString(origin, destination),
        distance: straightDistance,
        duration: null,
        isFallback: true,
      }
    } finally {
      loading.value = false
    }
  }

  return { planPath, loading, error }
}
