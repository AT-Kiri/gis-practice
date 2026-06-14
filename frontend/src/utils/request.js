/**
 * Axios 请求封装
 * 统一处理 API 请求的响应拦截和错误提示
 */
import axios from 'axios'
import { message } from 'ant-design-vue'

/** 创建 Axios 实例，默认请求前缀 /api，超时 60 秒 */
export const request = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

/**
 * 响应拦截器：统一提取 data 并处理业务错误
 * 后端返回格式统一为 { code, message, data }
 */
request.interceptors.response.use(
  (response) => {
    const body = response.data
    // 业务状态码非 200 时视为错误，弹出错误提示
    if (body && body.code !== undefined && body.code !== 200) {
      message.error(body.message || '请求失败')
      return Promise.reject(new Error(body.message))
    }
    return body
  },
  // 网络层面错误处理
  (error) => {
    const msg = error.response?.data?.message || error.message || '网络错误'
    console.error('请求错误:', msg)
    message.error(msg)
    return Promise.reject(error)
  }
)
