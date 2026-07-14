---
title: 地图状态管理 MapStore
type: component
tech: store
status: stable
created: 2026-07-14
updated: 2026-07-14
tags: [service, store, map, pinia, state]

references: []

related:
  - pages/components/sm-map-viewer.md

source:
  - frontend/src/stores/map.js

summary: Pinia 地图状态管理，管理地图实例、加载状态、错误信息和图层列表
---

# 地图状态管理 MapStore

## 1. 概述

Pinia Store，管理 MapboxGL 地图实例的生命周期、加载状态、错误信息和图层列表。

## 2. 状态定义

| 状态 | 类型 | 说明 |
|------|------|------|
| `mapInstance` | `Ref<Map\|null>` | MapboxGL 地图实例 |
| `isLoading` | `Ref<boolean>` | 地图是否正在加载中 |
| `isError` | `Ref<boolean>` | 地图是否加载出错 |
| `errorMessage` | `Ref<string>` | 错误信息描述 |
| `layers` | `Ref<Array>` | 图层列表（id、name、visible、opacity） |

## 3. 方法

| 方法 | 说明 |
|------|------|
| `setMap(map)` | 设置地图实例，标记加载完成 |
| `setLoading(status)` | 手动设置加载状态 |
| `setError(message)` | 设置错误状态和信息 |
| `clearError()` | 清除错误状态 |
| `setLayers(list)` | 设置完整图层列表 |
| `addLayer(layer)` | 添加单个图层（去重） |
| `removeLayer(layerId)` | 根据 ID 移除图层 |

## 4. 使用方式

```js
import { useMapStore } from '@/stores/map'

const mapStore = useMapStore()

// 监听地图加载
watch(() => mapStore.isLoading, (val) => {
  if (!val && !mapStore.isError) {
    console.log('地图加载完成')
  }
})

// 添加图层
mapStore.addLayer({ id: 'rainfall', name: '降雨量', visible: true, opacity: 1 })
```

## 5. 关联组件

几乎所有地图相关组件都依赖此 Store：
- `SmMapViewer` - 创建地图后调用 `setMap()`
- `MapToolbar` - 操作地图实例
- `MapMeasure` - 量算时访问地图实例
- `LayerManager` - 管理 `layers` 状态

## 6. 代码位置

| 文件 | 路径 |
|------|------|
| 地图状态 | `frontend/src/stores/map.js` |
