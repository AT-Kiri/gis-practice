<template>
  <div class="weather-panel">
    <div class="panel-header">
      <span class="panel-title">
        <CloudOutlined style="margin-right: 6px;" />
        气象灾害监控
      </span>
      <span class="update-time">{{ currentTime }}</span>
    </div>

    <!-- 气象数据表格 -->
    <a-table
      :dataSource="sortedData"
      :columns="columns"
      :pagination="false"
      :scroll="{ y: 252 }"
      size="small"
      class="weather-table"
      @change="onTableChange"
    >
      <!-- 自定义渲染列 -->
      <template #bodyCell="{ column, record }">
        <!-- 风险等级 -->
        <template v-if="column.key === 'riskLevel'">
          <a-tag :color="riskColor(record.riskLevel)">{{ record.riskLevel }}</a-tag>
        </template>

        <!-- 超阈值标红 -->
        <template v-else-if="column.key === 'rainfall'">
          <span :class="{ 'threshold-alert': record.rainfall > 100 }">
            {{ record.rainfall }} mm
          </span>
        </template>

        <template v-else-if="column.key === 'windForce'">
          <span :class="{ 'threshold-alert': record.windForce >= 10 }">
            {{ record.windForce }} 级
          </span>
        </template>

        <template v-else-if="column.key === 'earthquakeIntensity'">
          <span :class="{ 'threshold-alert': record.earthquakeIntensity >= 5 }">
            {{ record.earthquakeIntensity }}
          </span>
        </template>

        <!-- 天气预报（展开行） -->
        <template v-else-if="column.key === 'forecast'">
          <a-popover placement="left" trigger="click">
            <template #content>
              <div class="forecast-popover">
                <div class="forecast-section">
                  <div class="forecast-label">前3天天气</div>
                  <div class="forecast-days">
                    <div v-for="day in record.weatherHistory" :key="day.date" class="forecast-day">
                      <span class="day-date">{{ day.date }}</span>
                      <span class="day-icon">{{ weatherIcon(day.condition) }}</span>
                      <span class="day-temp">{{ day.tempLow }}°~{{ day.tempHigh }}°</span>
                      <span class="day-rain">{{ day.precipitation }}mm</span>
                    </div>
                  </div>
                </div>
                <div class="forecast-section">
                  <div class="forecast-label">后3天预报</div>
                  <div class="forecast-days">
                    <div v-for="day in record.weatherForecast" :key="day.date" class="forecast-day">
                      <span class="day-date">{{ day.date }}</span>
                      <span class="day-icon">{{ weatherIcon(day.condition) }}</span>
                      <span class="day-temp">{{ day.tempLow }}°~{{ day.tempHigh }}°</span>
                      <span class="day-rain">{{ day.precipitation }}mm</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <a-button type="link" size="small">查看天气 <RightOutlined /></a-button>
          </a-popover>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
/**
 * 数据大屏 - 气象监控面板
 * @prop {Array} weatherData - 气象数据数组
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { CloudOutlined, RightOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  weatherData: { type: Array, default: () => [] },
})

// 当前时间
const currentTime = ref('')
let timer = null
function updateTime() {
  const now = new Date()
  currentTime.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
}
onMounted(() => { updateTime(); timer = setInterval(updateTime, 1000) })
onUnmounted(() => { clearInterval(timer) })

// 表格排序状态
const sortKey = ref(null)
const sortOrder = ref(null)

const sortedData = computed(() => {
  const data = [...props.weatherData]
  if (sortKey.value && sortOrder.value) {
    data.sort((a, b) => {
      let va = a[sortKey.value], vb = b[sortKey.value]
      if (typeof va === 'string') va = va.localeCompare(vb, 'zh')
      if (typeof vb === 'string') return va
      return sortOrder.value === 'ascend' ? va - vb : vb - va
    })
  }
  return data.slice(0, 15) // 最多显示15行
})

function onTableChange(pagination, filters, sorter) {
  sortKey.value = sorter.field || null
  sortOrder.value = sorter.order || null
}

// 表格列定义
const columns = [
  { title: '地区', dataIndex: 'countyName', key: 'countyName', width: 80, sorter: true },
  { title: '风险等级', dataIndex: 'riskLevel', key: 'riskLevel', width: 80, sorter: true },
  { title: '大风', dataIndex: 'windForce', key: 'windForce', width: 65, sorter: true },
  { title: '降雨', dataIndex: 'rainfall', key: 'rainfall', width: 70, sorter: true },
  { title: '地震强度', dataIndex: 'earthquakeIntensity', key: 'earthquakeIntensity', width: 80, sorter: true },
  { title: '受困人员', dataIndex: 'trappedPeople', key: 'trappedPeople', width: 75, sorter: true },
  { title: '可用物资', dataIndex: 'availableSupplies', key: 'availableSupplies', width: 110 },
  { title: '天气预报', key: 'forecast', width: 90 },
]

// 风险等级颜色
function riskColor(level) {
  const map = { 低: 'green', 较低: 'lime', 中: 'orange', 高: 'red', 极高: 'volcano' }
  return map[level] || 'default'
}

// 天气图标
function weatherIcon(condition) {
  const map = {
    '晴': '☀️', '多云': '⛅', '阴': '☁️', '小雨': '🌦️',
    '中雨': '🌧️', '大雨': '🌧️', '暴雨': '🌊', '雷阵雨': '⛈️',
    '雾': '🌫️', '小雪': '🌨️', '中雪': '❄️', '大雪': '❄️',
  }
  return map[condition] || '☀️'
}
</script>

<style scoped>
.weather-panel {
  padding: 12px;
  height: 100%;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.panel-title {
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  font-weight: 600;
}

.update-time {
  color: rgba(255, 255, 255, 0.3);
  font-size: 11px;
}

.weather-table :deep(.ant-table) {
  background: transparent;
}

.weather-table :deep(.ant-table-thead > tr > th) {
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  padding: 6px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.weather-table :deep(.ant-table-tbody > tr > td) {
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  padding: 4px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.weather-table :deep(.ant-table-tbody > tr:hover > td) {
  background: rgba(255, 255, 255, 0.05) !important;
}

/* 排序箭头 — 增强可见性 */
.weather-table :deep(.ant-table-column-sorter) {
  color: rgba(255, 255, 255, 0.35);
}
.weather-table :deep(.ant-table-column-sorter-up.active),
.weather-table :deep(.ant-table-column-sorter-down.active) {
  color: #1890ff !important;
}
.weather-table :deep(.ant-table-column-sorter span:hover) {
  color: rgba(255, 255, 255, 0.8);
}

/* 表格滚动条 — 增强可见性 */
.weather-table :deep(.ant-table-body-wrapper)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.weather-table :deep(.ant-table-body-wrapper)::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}
.weather-table :deep(.ant-table-body-wrapper)::-webkit-scrollbar-thumb {
  background: rgba(150, 150, 150, 0.7);
  border-radius: 4px;
}
.weather-table :deep(.ant-table-body-wrapper)::-webkit-scrollbar-thumb:hover {
  background: rgba(150, 150, 150, 0.9);
}

/* 阈值标红 */
.threshold-alert {
  color: #ff4d4f !important;
  font-weight: 600;
  animation: alert-blink 1s ease-in-out infinite;
}

@keyframes alert-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 天气预报弹窗 */
.forecast-popover {
  min-width: 280px;
}

.forecast-section {
  margin-bottom: 8px;
}

.forecast-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  margin-bottom: 4px;
}

.forecast-days {
  display: flex;
  gap: 4px;
}

.forecast-day {
  flex: 1;
  text-align: center;
  padding: 4px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
}

.day-date {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.day-icon {
  display: block;
  font-size: 18px;
  margin: 2px 0;
}

.day-temp {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

.day-rain {
  display: block;
  font-size: 10px;
  color: #1890ff;
}
</style>
