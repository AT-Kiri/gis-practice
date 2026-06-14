---
paths: "**/*.vue"
---

# Vue 规则（本项目使用 Vue 3）

## 组件
- 使用 Composition API（`<script setup>` + `ref` / `reactive` / `computed` / `watch`）
- 组件名用 PascalCase 多词命名（如 `UserProfile`）
- Props 用 `defineProps()` 定义，加类型和默认值
- 模板内表达式保持简单，复杂逻辑移到 `computed` 或函数
- `v-for` 必须配 `:key`，优先用唯一 ID

## 生命周期
- `onMounted` 中初始化地图、网络请求等副作用
- `onUnmounted` 中清理事件监听器、定时器、ResizeObserver 等，防止内存泄漏

## 状态管理
- 跨组件状态用 Pinia（已安装 v3.x），统一在 `src/stores/` 中定义
- 组件内状态用 `ref()` / `reactive()` 声明
- 使用 `defineStore('name', () => { ... })` 组合式 store 写法

## 样式
- 组件样式使用 `<style scoped>`，避免全局污染
- 颜色和间距用设计 Token CSS 变量（定义在 `assets/style.css`）
- 布局优先用 Flexbox，不用 `float` 或 `position` 硬算
