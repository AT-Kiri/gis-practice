<template>
  <div class="home-view">
    <!-- 主地图视图 -->
    <SmMapViewer />
  </div>
</template>

<script setup>
// 引入地图主组件
import SmMapViewer from '../components/SmMapViewer.vue'
</script>

<style scoped>
.home-view {
  width: 100%;
  height: 100%;
}
</style>
