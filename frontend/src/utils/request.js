import axios from 'axios'
import { message } from 'ant-design-vue'

export const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 响应拦截器：统一提取 data 并处理业务错误
request.interceptors.response.use(
  (response) => {
    const body = response.data
    // 后端返回格式统一为 { code, message, data }
    if (body && body.code !== undefined && body.code !== 200) {
      message.error(body.message || '请求失败')
      return Promise.reject(new Error(body.message))
    }
    return body
  },
  (error) => {
    const msg = error.response?.data?.message || error.message || '网络错误'
    console.error('Request error:', msg)
    message.error(msg)
    return Promise.reject(error)
  }
)
