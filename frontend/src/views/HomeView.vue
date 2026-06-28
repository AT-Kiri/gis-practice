<template>
  <div class="home-view">
    <!-- 主地图视图 -->
    <SmMapViewer />
    <!-- Agent 应急助手面板 -->
    <AgentChatPanel @send="handleSend" @stop="handleStop" @clear="handleClear" />
  </div>
</template>

<script setup>
/**
 * 主页视图
 * 集成地图组件和 Agent 聊天面板，处理 Agent SSE 事件流
 */
import SmMapViewer from '../components/SmMapViewer.vue'
import AgentChatPanel from '../components/AgentChatPanel.vue'
import { useAgentStore } from '../stores/agent'
import { sendAgentMessage } from '../utils/agent/sse'
import {
  renderAgentResult,
  clearAllAgentResults,
  flyToLocation,
} from '../utils/agent/mapRenderer'

const agentStore = useAgentStore()

/** 当前 SSE 请求的 AbortController */
let abortController = null

/**
 * 处理用户发送消息
 * 创建 AI 消息占位，建立 SSE 连接，处理事件流
 */
function handleSend(text) {
  // 添加用户消息
  agentStore.addMessage({ role: 'user', content: text })

  // 创建 AI 消息占位
  const aiMsgId = agentStore.addMessage({
    role: 'assistant',
    content: '',
    isStreaming: true,
  })

  agentStore.setLoading(true)

  // 建立 SSE 连接
  abortController = sendAgentMessage(text, {
    onAgentStart: () => {
      // Agent 开始执行
    },

    onToolStart: (data) => {
      // 工具开始调用，添加工具卡片
      agentStore.addToolCall(aiMsgId, {
        toolName: data.tool_name,
        status: 'loading',
        input: data.input,
      })
    },

    onToolResult: (data) => {
      // 工具执行完成，更新工具卡片
      const msg = agentStore.messages.find(m => m.id === aiMsgId)
      if (!msg) return

      // 找到最后一个 loading 状态的同名工具
      let lastIndex = -1
      for (let i = msg.toolCalls.length - 1; i >= 0; i--) {
        if (msg.toolCalls[i].toolName === data.tool_name && msg.toolCalls[i].status === 'loading') {
          lastIndex = i
          break
        }
      }

      // 优先使用后端返回的 success 字段，回退到 message 文本判断
      const isSuccess = data.success !== undefined
        ? data.success
        : !!(data.message && !data.message.includes('失败') && !data.message.includes('错误'))
      agentStore.updateToolCall(aiMsgId, lastIndex, {
        status: isSuccess ? 'done' : 'error',
        result: data.result,
        error: isSuccess ? null : data.message,
      })

      // 渲染 GeoJSON 到地图
      if (data.geojson) {
        renderAgentResult(data.tool_name, data.geojson)
      }

      // fly_to_location 特殊处理：飞行定位
      if (data.tool_name === 'fly_to_location' && data.result?.center) {
        flyToLocation(data.result.center, data.result.zoom || 11)
      }
    },

    onText: (content) => {
      // 流式文本，追加到 AI 消息
      const msg = agentStore.messages.find(m => m.id === aiMsgId)
      if (msg) {
        msg.content += content
      }
    },

    onAgentEnd: () => {
      // 全部完成
      agentStore.updateMessage(aiMsgId, { isStreaming: false })
      agentStore.setLoading(false)
      abortController = null
    },

    onError: (message) => {
      // 出错
      agentStore.updateMessage(aiMsgId, {
        content: `抱歉，处理过程中出现了错误：${message}`,
        isStreaming: false,
      })
      agentStore.setLoading(false)
      abortController = null
    },
  })
}

/**
 * 处理停止生成
 */
function handleStop() {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  // 标记最后一条消息为已完成
  const lastMsg = agentStore.messages[agentStore.messages.length - 1]
  if (lastMsg && lastMsg.isStreaming) {
    lastMsg.isStreaming = false
  }
  agentStore.setLoading(false)
}

/**
 * 处理清空对话，同步清除地图上的 Agent 结果
 */
function handleClear() {
  clearAllAgentResults()
}
</script>

<style scoped>
.home-view {
  width: 100%;
  height: 100%;
}
</style>
