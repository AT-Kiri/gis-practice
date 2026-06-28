<template>
  <div class="chat-message" :class="message.role">
    <!-- AI 头像 -->
    <div v-if="message.role === 'assistant'" class="avatar">
      <RobotOutlined class="avatar-icon" />
    </div>

    <div class="bubble-col">
      <!-- 工具调用卡片（按 step 分组显示，显示在文本上方） -->
      <div
        v-if="message.role === 'assistant' && message.toolCalls && message.toolCalls.length"
        class="tool-calls"
      >
        <div
          v-for="group in groupedToolCalls"
          :key="group.key"
          class="tool-group"
        >
          <!-- 步骤标签（仅多智能体模式且 step 不为 null 时显示） -->
          <div v-if="group.step != null" class="step-label">
            <span class="step-badge" :class="`agent-${group.agentType || 'default'}`">
              步骤 {{ group.step }}
            </span>
            <span v-if="group.agentType" class="agent-label">
              {{ agentLabel(group.agentType) }}
            </span>
          </div>
          <ToolCallCard
            v-for="(tc, idx) in group.toolCalls"
            :key="idx"
            :toolCall="tc"
          />
        </div>
      </div>

      <!-- 消息气泡 -->
      <div v-if="message.content || message.isStreaming" class="bubble">
        <!-- AI 消息：Markdown 渲染 -->
        <span v-if="message.role === 'assistant'" class="content markdown-body" v-html="renderedContent"></span>
        <!-- 用户消息：纯文本 -->
        <span v-else class="content">{{ message.content }}</span>
        <span v-if="message.isStreaming" class="stream-cursor" />
      </div>

      <!-- 时间戳 -->
      <div class="timestamp">{{ timeLabel }}</div>
    </div>

    <!-- 用户头像 -->
    <div v-if="message.role === 'user'" class="avatar user-avatar">
      <UserOutlined class="avatar-icon" />
    </div>
  </div>
</template>

<script setup>
/**
 * 单条对话消息
 * 用户消息靠右（蓝色气泡），AI 消息靠左（灰色气泡）
 * AI 消息内可嵌入工具调用卡片，P1 多智能体模式下按 step 分组展示
 * @prop {Object} message - 消息对象 { id, role, content, toolCalls, timestamp, isStreaming }
 */
import { computed } from 'vue'
import { RobotOutlined, UserOutlined } from '@ant-design/icons-vue'
import ToolCallCard from './ToolCallCard.vue'
import { AGENT_TYPE_LABEL } from '../../stores/agent'
import { renderMarkdown } from '../../utils/agent/markdown'

const props = defineProps({
  message: { type: Object, required: true },
})

/** 时间戳格式化（HH:MM） */
const timeLabel = computed(() => {
  const ts = props.message.timestamp
  if (!ts) return ''
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
})

/** AI 消息 Markdown 渲染结果（缓存） */
const renderedContent = computed(() => renderMarkdown(props.message.content || ''))

/**
 * 将 toolCalls 按 step 分组
 * - step 不为 null 的按 step 分组
 * - step 为 null 的（P0 兼容）归到「默认组」不显示标签
 * 返回 [{ key, step, agentType, toolCalls: [...] }]
 */
const groupedToolCalls = computed(() => {
  const list = props.message.toolCalls || []
  const groups = []
  const map = new Map()

  for (const tc of list) {
    const step = tc.step ?? null
    const key = step == null ? 'default' : `step-${step}`
    if (!map.has(key)) {
      const g = {
        key,
        step,
        agentType: tc.agentType || '',
        toolCalls: [],
      }
      map.set(key, g)
      groups.push(g)
    }
    map.get(key).toolCalls.push(tc)
  }
  return groups
})

/** 子 Agent 类型中文名 */
function agentLabel(type) {
  return AGENT_TYPE_LABEL[type] || type || ''
}
</script>

<style scoped>
.chat-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 14px;
}

/* 用户消息靠右 */
.chat-message.user {
  flex-direction: row-reverse;
}

/* 头像 */
.avatar {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  box-shadow: var(--shadow-sm);
}

.avatar.user-avatar {
  background: linear-gradient(135deg, #1890ff, #096dd9);
}

.avatar-icon {
  font-size: 16px;
}

.bubble-col {
  display: flex;
  flex-direction: column;
  max-width: 78%;
  min-width: 0;
}

.chat-message.user .bubble-col {
  align-items: flex-end;
}

/* 工具调用卡片容器 */
.tool-calls {
  width: 100%;
  margin-bottom: 6px;
}

/* P1 步骤分组 */
.tool-group {
  margin-bottom: 8px;
}

.tool-group:last-child {
  margin-bottom: 0;
}

.step-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: var(--font-size-xs);
}

.step-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: var(--color-text-muted);
}

/* 不同子 Agent 用不同颜色 */
.step-badge.agent-search { background: #1890ff; }
.step-badge.agent-analysis { background: #722ed1; }
.step-badge.agent-route { background: #13c2c2; }
.step-badge.agent-knowledge { background: #52c41a; }

.agent-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* 气泡 */
.bubble {
  display: inline-block;
  padding: 8px 12px;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;
  box-shadow: var(--shadow-sm);
}

.chat-message.assistant .bubble {
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-top-left-radius: 4px;
}

.chat-message.user .bubble {
  background: linear-gradient(135deg, #1890ff, #096dd9);
  color: #fff;
  border-top-right-radius: 4px;
}

.content {
  white-space: pre-wrap;
}

/* AI 消息 Markdown 渲染样式（穿透 scoped） */
.markdown-body :deep() {
  font-size: var(--font-size-base);
  line-height: 1.6;
  word-break: break-word;
}

.markdown-body :deep(p) {
  margin: 0 0 6px 0;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 8px 0 4px 0;
  font-weight: 600;
  line-height: 1.3;
}

.markdown-body :deep(h1) { font-size: 16px; }
.markdown-body :deep(h2) { font-size: 15px; }
.markdown-body :deep(h3) { font-size: 14px; }
.markdown-body :deep(h4) { font-size: 13px; }

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 4px 0;
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin: 2px 0;
}

.markdown-body :deep(strong) {
  font-weight: 600;
  color: var(--color-text-primary);
}

.markdown-body :deep(em) {
  font-style: italic;
}

.markdown-body :deep(code) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  padding: 1px 4px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
}

.markdown-body :deep(pre) {
  background: rgba(0, 0, 0, 0.06);
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 6px 0;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
}

.markdown-body :deep(blockquote) {
  margin: 6px 0;
  padding: 4px 10px;
  border-left: 3px solid var(--color-accent-amber);
  background: rgba(245, 158, 11, 0.06);
  color: var(--color-text-secondary);
}

.markdown-body :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  margin: 6px 0;
  font-size: 12px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--color-border);
  padding: 4px 8px;
}

.markdown-body :deep(th) {
  background: rgba(0, 0, 0, 0.04);
  font-weight: 600;
}

/* 流式输出光标 */
.stream-cursor {
  display: inline-block;
  width: 7px;
  height: 14px;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: var(--color-accent-amber);
  border-radius: 1px;
  animation: blink 1s step-start infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 时间戳 */
.timestamp {
  margin-top: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  line-height: 1;
}

.chat-message.user .timestamp {
  text-align: right;
}
</style>
