<template>
  <div class="chat-message" :class="message.role">
    <!-- AI 头像 -->
    <div v-if="message.role === 'assistant'" class="avatar">
      <RobotOutlined class="avatar-icon" />
    </div>

    <div class="bubble-col">
      <!-- 工具调用卡片（显示在文本上方） -->
      <div
        v-if="message.role === 'assistant' && message.toolCalls && message.toolCalls.length"
        class="tool-calls"
      >
        <ToolCallCard
          v-for="(tc, idx) in message.toolCalls"
          :key="idx"
          :toolCall="tc"
        />
      </div>

      <!-- 消息气泡 -->
      <div v-if="message.content || message.isStreaming" class="bubble">
        <span class="content">{{ message.content }}</span>
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
 * AI 消息内可嵌入工具调用卡片，流式输出时显示闪烁光标
 * @prop {Object} message - 消息对象 { id, role, content, toolCalls, timestamp, isStreaming }
 */
import { computed } from 'vue'
import { RobotOutlined, UserOutlined } from '@ant-design/icons-vue'
import ToolCallCard from './ToolCallCard.vue'

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
