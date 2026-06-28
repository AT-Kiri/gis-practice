<template>
  <div class="agent-chat-root">
    <!-- 悬浮按钮 -->
    <transition name="fab">
      <button
        v-show="!agentStore.isPanelOpen"
        class="fab-btn"
        :aria-label="'打开应急助手'"
        @click="agentStore.togglePanel"
      >
        <RobotOutlined class="fab-icon" />
        <span class="fab-pulse" />
      </button>
    </transition>

    <!-- 聊天面板 -->
    <transition name="slide">
      <section v-if="agentStore.isPanelOpen" class="chat-panel glass-panel">
        <!-- 头部 -->
        <header class="panel-head">
          <div class="head-title">
            <span class="head-avatar">
              <RobotOutlined />
            </span>
            <div class="head-text">
              <span class="title-main">应急助手</span>
              <span class="title-sub">防灾应急智能问答</span>
            </div>
          </div>
          <div class="head-actions">
            <a-tooltip title="清空对话">
              <a-button type="text" size="small" class="head-btn" @click="handleClear">
                <template #icon><ClearOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="收起">
              <a-button type="text" size="small" class="head-btn" @click="agentStore.togglePanel">
                <template #icon><RightOutlined /></template>
              </a-button>
            </a-tooltip>
          </div>
        </header>

        <!-- P1 多智能体工作流进度条 -->
        <div v-if="showWorkflow" class="workflow-bar">
          <div class="wf-header">
            <span class="wf-intent">{{ intentLabel }}</span>
            <span class="wf-progress">第 {{ agentStore.currentStep || 0 }} / {{ agentStore.totalSteps || 0 }} 步</span>
          </div>
          <div class="wf-steps">
            <span
              v-for="s in agentStore.steps"
              :key="s.step"
              class="wf-step"
              :class="[s.status, `agent-${s.agentType || 'default'}`]"
              :title="`步骤${s.step}：${s.description}`"
            >
              <span class="wf-step-num">{{ s.step }}</span>
              <span class="wf-step-name">{{ agentLabel(s.agentType) }}</span>
            </span>
          </div>
        </div>

        <!-- 消息列表 -->
        <div ref="scrollRef" class="msg-list">
          <!-- 欢迎状态 -->
          <div v-if="!agentStore.messages.length" class="welcome">
            <div class="welcome-avatar">
              <RobotOutlined />
            </div>
            <div class="welcome-text">
              你好！我是防灾应急助手，可以帮你查询地点、做空间分析、规划路径等。
            </div>
            <div class="quick-actions">
              <button
                v-for="q in quickActions"
                :key="q"
                class="quick-btn"
                @click="handleSend(q)"
              >
                {{ q }}
              </button>
            </div>
          </div>

          <!-- 消息流 -->
          <ChatMessage
            v-for="msg in agentStore.messages"
            :key="msg.id"
            :message="msg"
          />

          <!-- 等待 AI 首字时的占位 -->
          <div v-if="agentStore.isLoading && !hasStreaming" class="thinking">
            <span class="dot" />
            <span class="dot" />
            <span class="dot" />
          </div>

          <!-- 自动滚动锚点 -->
          <div ref="bottomRef" />
        </div>

        <!-- 底部输入区 -->
        <footer class="panel-foot">
          <a-textarea
            v-model:value="inputText"
            class="input-area"
            placeholder="输入消息，Enter 发送，Shift+Enter 换行"
            :auto-size="{ minRows: 1, maxRows: 4 }"
            :bordered="false"
            @keydown.enter.exact.prevent="handleSend()"
          />
          <div class="foot-actions">
            <a-button
              v-if="!agentStore.isLoading"
              type="primary"
              shape="circle"
              :disabled="!inputText.trim()"
              @click="handleSend()"
            >
              <template #icon><SendOutlined /></template>
            </a-button>
            <a-button
              v-else
              danger
              shape="circle"
              @click="handleStop"
            >
              <template #icon><PauseOutlined /></template>
            </a-button>
          </div>
        </footer>
      </section>
    </transition>
  </div>
</template>

<script setup>
/**
 * Agent 聊天面板
 * 右侧悬浮入口 + 滑入式毛玻璃面板，负责对话 UI；
 * 发送/停止通过 emit 交由父组件处理实际 Agent 交互。
 * @emits send - 用户发送消息 (text: string)
 * @emits stop - 用户点击停止生成
 */
import { ref, computed, watch, nextTick } from 'vue'
import {
  RobotOutlined,
  ClearOutlined,
  RightOutlined,
  SendOutlined,
  PauseOutlined,
} from '@ant-design/icons-vue'
import { useAgentStore, AGENT_TYPE_LABEL, INTENT_LABEL } from '../stores/agent'
import ChatMessage from './agent/ChatMessage.vue'

const emit = defineEmits(['send', 'stop', 'clear'])

const agentStore = useAgentStore()

/** 输入框文本 */
const inputText = ref('')
/** 消息列表滚动容器 */
const scrollRef = ref(null)
/** 列表底部锚点 */
const bottomRef = ref(null)

/** 快捷操作 */
const quickActions = [
  '朝阳区在哪？',
  '做1km缓冲区分析',
  '查找附近医院',
  '朝阳区地震，评估灾情并规划救援',
]

/** 是否存在正在流式输出的消息（用于隐藏 thinking 占位） */
const hasStreaming = computed(() =>
  agentStore.messages.some(m => m.isStreaming),
)

/** 是否显示多智能体工作流进度条：加载中且已规划出步骤 */
const showWorkflow = computed(() =>
  agentStore.isLoading && agentStore.totalSteps > 0,
)

/** 当前意图中文名 */
const intentLabel = computed(() =>
  INTENT_LABEL[agentStore.currentIntent] || agentStore.currentIntent || '处理中',
)

/** 子 Agent 类型中文名 */
function agentLabel(type) {
  return AGENT_TYPE_LABEL[type] || type || ''
}

/** 发送消息 */
function handleSend(text) {
  const content = (text ?? inputText.value).trim()
  if (!content || agentStore.isLoading) return
  emit('send', content)
  if (text === undefined) inputText.value = ''
}

/** 停止生成 */
function handleStop() {
  emit('stop')
}

/** 清空对话 */
function handleClear() {
  emit('clear')
  agentStore.clearMessages()
}

/** 自动滚动到底部 */
function scrollToBottom() {
  nextTick(() => {
    if (bottomRef.value) {
      bottomRef.value.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  })
}

// 监听消息变化（数量 + 最后一条内容/流式状态）触发自动滚动
watch(
  () => [
    agentStore.messages.length,
    agentStore.isLoading,
    agentStore.messages.length
      ? agentStore.messages[agentStore.messages.length - 1].content
      : '',
    agentStore.messages.length
      ? agentStore.messages[agentStore.messages.length - 1].isStreaming
      : false,
  ],
  scrollToBottom,
)
</script>

<style scoped>
.agent-chat-root {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 0;
  z-index: 1000;
  pointer-events: none;
}

/* 悬浮按钮 */
.fab-btn {
  pointer-events: auto;
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.45);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.fab-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 12px 28px rgba(245, 158, 11, 0.55);
}

.fab-btn:active {
  transform: translateY(0) scale(0.98);
}

.fab-icon {
  font-size: 24px;
}

/* 呼吸光晕 */
.fab-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(245, 158, 11, 0.6);
  animation: fab-pulse 2s ease-out infinite;
}

@keyframes fab-pulse {
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(1.6); opacity: 0; }
}

/* 面板 */
.chat-panel {
  pointer-events: auto;
  position: fixed;
  right: 20px;
  top: 20px;
  width: 380px;
  height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glass);
}

/* 头部 */
.panel-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04));
}

.head-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.head-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  font-size: 18px;
  box-shadow: var(--shadow-sm);
}

.head-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  min-width: 0;
}

.title-main {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.title-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.head-btn {
  color: var(--color-text-secondary);
}

/* 消息列表 */
.msg-list {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  scroll-behavior: smooth;
}

/* P1 多智能体工作流进度条 */
.workflow-bar {
  flex-shrink: 0;
  padding: 8px 14px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02));
  border-bottom: 1px solid var(--color-border);
}

.wf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.wf-intent {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-accent-amber);
}

.wf-progress {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.wf-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.wf-step {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}

.wf-step-num {
  font-weight: 700;
}

.wf-step.pending {
  opacity: 0.5;
}

.wf-step.running {
  background: var(--color-primary);
  color: #fff;
  animation: wf-pulse 1.4s ease-in-out infinite;
}

.wf-step.done {
  background: var(--color-accent-green);
  color: #fff;
}

.wf-step.error {
  background: var(--color-accent-red);
  color: #fff;
}

@keyframes wf-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 欢迎状态 */
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 28px 12px 12px;
}

.welcome-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  font-size: 28px;
  margin-bottom: 14px;
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.35);
}

.welcome-text {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 20px;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.quick-btn {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-md);
  background: rgba(245, 158, 11, 0.06);
  color: #b45309;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
  text-align: left;
}

.quick-btn:hover {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.5);
  transform: translateX(2px);
}

/* thinking 占位（等待 AI 首字） */
.thinking {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  margin-bottom: 14px;
}

.thinking .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent-amber);
  opacity: 0.6;
  animation: thinking 1.2s ease-in-out infinite;
}

.thinking .dot:nth-child(2) { animation-delay: 0.2s; }
.thinking .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes thinking {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* 底部输入区 */
.panel-foot {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.5);
}

.input-area {
  flex: 1;
  resize: none;
  font-size: var(--font-size-base);
  line-height: 1.5;
  background: transparent;
}

.input-area :deep(textarea) {
  padding: 6px 8px;
}

.foot-actions {
  flex-shrink: 0;
  padding-bottom: 2px;
}

/* ===== 过渡动画 ===== */

/* 悬浮按钮淡入淡出 */
.fab-enter-active,
.fab-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}
.fab-enter-from,
.fab-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* 面板从右侧滑入 */
.slide-enter-active,
.slide-leave-active {
  transition: transform var(--transition-slow), opacity var(--transition-slow);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(110%);
  opacity: 0;
}
</style>
