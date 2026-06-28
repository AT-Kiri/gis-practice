<template>
  <div class="tool-call-card" :class="`status-${toolCall.status}`">
    <!-- 左侧彩色竖条 -->
    <span class="accent-bar" />

    <div class="card-body">
      <!-- 卡片头部：图标 + 名称 + 状态 -->
      <div class="card-head" @click="toggleExpand">
        <span class="head-left">
          <!-- 状态图标 -->
          <LoadingOutlined v-if="toolCall.status === 'loading'" class="icon-loading" spin />
          <CheckCircleFilled v-else-if="toolCall.status === 'done'" class="icon-done" />
          <CloseCircleFilled v-else-if="toolCall.status === 'error'" class="icon-error" />

          <span class="tool-name">{{ displayName }}</span>
        </span>

        <span class="head-right">
          <span class="status-text" :class="`text-${toolCall.status}`">
            {{ statusText }}
          </span>
          <a-tooltip v-if="hasDetail" :title="expanded ? '收起详情' : '查看输入参数'">
            <RightOutlined class="expand-icon" :class="{ 'expand-open': expanded }" />
          </a-tooltip>
        </span>
      </div>

      <!-- 结果摘要 / 错误信息 -->
      <div v-if="toolCall.status === 'done' && summary" class="result-summary">
        {{ summary }}
      </div>
      <div v-else-if="toolCall.status === 'error' && toolCall.error" class="error-text">
        {{ toolCall.error }}
      </div>

      <!-- 可展开的输入参数详情 -->
      <transition name="detail">
        <div v-if="expanded && hasDetail" class="detail-wrap">
          <div class="detail-label">输入参数</div>
          <pre class="detail-code">{{ formattedInput }}</pre>

          <template v-if="toolCall.status === 'done' && toolCall.result != null">
            <div class="detail-label">执行结果</div>
            <pre class="detail-code">{{ formattedResult }}</pre>
          </template>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
/**
 * 工具调用卡片
 * 在 AI 消息气泡内展示一次工具调用的状态与结果
 * @prop {Object} toolCall - { toolName, status, input, result, error }
 */
import { ref, computed } from 'vue'
import {
  LoadingOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  RightOutlined,
} from '@ant-design/icons-vue'

const props = defineProps({
  toolCall: { type: Object, required: true },
})

/** 工具名称中英文映射 */
const TOOL_NAME_MAP = {
  feature_search: '专题检索',
  spatial_query: '空间查询',
  buffer_analysis: '缓冲区分析',
  overlay_analysis: '叠置分析',
  shortest_path: '最短路径',
  service_area: '服务区分析',
  fly_to_location: '地图定位',
  rag_retrieval: '知识检索',
}

/** 展示名称：优先取映射，缺失时回退到原始名 */
const displayName = computed(() => {
  const name = props.toolCall.toolName || ''
  return TOOL_NAME_MAP[name] || name || '工具调用'
})

/** 状态文案 */
const statusText = computed(() => {
  switch (props.toolCall.status) {
    case 'loading': return '正在执行...'
    case 'done': return '已完成'
    case 'error': return '执行失败'
    default: return ''
  }
})

/** 是否存在可展开的详情（输入或结果） */
const hasDetail = computed(() => {
  return props.toolCall.input != null || props.toolCall.result != null
})

const expanded = ref(false)
function toggleExpand() {
  if (hasDetail.value) expanded.value = !expanded.value
}

/** 格式化输入参数为可读字符串 */
const formattedInput = computed(() => safeStringify(props.toolCall.input))
/** 格式化结果为可读字符串 */
const formattedResult = computed(() => safeStringify(props.toolCall.result))

function safeStringify(val) {
  if (val == null) return ''
  if (typeof val === 'string') return val
  try {
    return JSON.stringify(val, null, 2)
  } catch {
    return String(val)
  }
}

/** 结果摘要：取 result 的简短描述，最多 80 字 */
const summary = computed(() => {
  const r = props.toolCall.result
  if (r == null) return ''
  let text = ''
  if (typeof r === 'string') {
    text = r
  } else if (typeof r.summary === 'string') {
    text = r.summary
  } else if (typeof r.message === 'string') {
    text = r.message
  } else if (typeof r.count === 'number') {
    text = `共 ${r.count} 条结果`
  } else {
    try {
      text = JSON.stringify(r)
    } catch {
      text = String(r)
    }
  }
  return text.length > 80 ? text.slice(0, 80) + '...' : text
})
</script>

<style scoped>
.tool-call-card {
  display: flex;
  align-items: stretch;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.18);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: 6px;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.tool-call-card:hover {
  background: rgba(245, 158, 11, 0.1);
}

/* 左侧彩色竖条 */
.accent-bar {
  width: 3px;
  flex-shrink: 0;
  background: var(--color-accent-amber);
}

.tool-call-card.status-loading .accent-bar { background: var(--color-primary); }
.tool-call-card.status-done .accent-bar { background: var(--color-accent-green); }
.tool-call-card.status-error .accent-bar { background: var(--color-accent-red); }

.card-body {
  flex: 1;
  padding: 6px 8px;
  min-width: 0;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  gap: 6px;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.icon-loading { color: var(--color-primary); font-size: 13px; }
.icon-done { color: var(--color-accent-green); font-size: 13px; }
.icon-error { color: var(--color-accent-red); font-size: 13px; }

.tool-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-text {
  font-size: var(--font-size-xs);
  line-height: 1;
}
.text-loading { color: var(--color-primary); }
.text-done { color: var(--color-accent-green); }
.text-error { color: var(--color-accent-red); }

.expand-icon {
  font-size: 10px;
  color: var(--color-text-muted);
  transition: transform var(--transition-fast);
}
.expand-icon.expand-open {
  transform: rotate(90deg);
}

.result-summary {
  margin-top: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.5;
  word-break: break-word;
}

.error-text {
  margin-top: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-accent-red);
  line-height: 1.5;
  word-break: break-word;
}

/* 可展开详情 */
.detail-wrap {
  margin-top: 6px;
  border-top: 1px dashed var(--color-border);
  padding-top: 6px;
}

.detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-bottom: 2px;
}

.detail-code {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-sm);
  padding: 4px 6px;
  margin: 0 0 6px 0;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 160px;
  overflow: auto;
  font-family: 'Consolas', 'Monaco', monospace;
}

/* 展开/收起过渡 */
.detail-enter-active,
.detail-leave-active {
  transition: opacity var(--transition-fast), max-height var(--transition-fast);
  overflow: hidden;
  max-height: 400px;
}
.detail-enter-from,
.detail-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
