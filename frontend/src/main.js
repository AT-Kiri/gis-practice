/**
 * 应用入口文件
 * 初始化 Vue 应用，注册 Pinia 状态管理、Router 路由和 Ant Design Vue 组件库
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import App from './App.vue'
import router from './router'
import './assets/style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(Antd)
app.mount('#app')
