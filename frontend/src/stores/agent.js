/**
 * Agent 聊天面板全局状态管理（Pinia Store）
 * 管理对话消息列表、加载状态、面板展开状态及工具调用记录
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 生成唯一消息 ID */
function genId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const useAgentStore = defineStore('agent', () => {
  // ====== 状态定义 ======
  /** 对话消息列表 */
  const messages = ref([])
  /** 是否正在等待 AI 回复 */
  const isLoading = ref(false)
  /** 面板是否展开 */
  const isPanelOpen = ref(false)

  // ====== 操作方法 ======

  /**
   * 新增一条消息并返回其 id
   * @param {Object} partial - 部分字段，缺省字段自动补全
   * @returns {string} 新消息 id
   */
  function addMessage(partial = {}) {
    const msg = {
      id: partial.id || genId(),
      role: partial.role || 'assistant',
      content: partial.content ?? '',
      toolCalls: partial.toolCalls || [],
      timestamp: partial.timestamp ?? Date.now(),
      isStreaming: partial.isStreaming ?? false,
    }
    messages.value.push(msg)
    return msg.id
  }

  /**
   * 按 id 更新消息字段（浅合并）
   * @param {string} id - 消息 id
   * @param {Object} patch - 待合并的字段
   */
  function updateMessage(id, patch) {
    const msg = messages.value.find(m => m.id === id)
    if (!msg) return
    Object.assign(msg, patch)
  }

  /** 清空全部消息 */
  function clearMessages() {
    messages.value = []
  }

  /**
   * 设置加载状态
   * @param {boolean} status
   */
  function setLoading(status) {
    isLoading.value = status
  }

  /** 切换面板展开/收起 */
  function togglePanel() {
    isPanelOpen.value = !isPanelOpen.value
  }

  /**
   * 为指定消息追加一个工具调用记录，返回该工具调用的引用 index
   * @param {string} messageId - 所属消息 id
   * @param {Object} toolCall - { toolName, status, input, result, error }
   * @returns {number} 工具调用在 toolCalls 数组中的下标
   */
  function addToolCall(messageId, toolCall = {}) {
    const msg = messages.value.find(m => m.id === messageId)
    if (!msg) return -1
    const entry = {
      toolName: toolCall.toolName || '',
      status: toolCall.status || 'loading',
      input: toolCall.input ?? null,
      result: toolCall.result ?? null,
      error: toolCall.error ?? null,
    }
    msg.toolCalls.push(entry)
    return msg.toolCalls.length - 1
  }

  /**
   * 按 messageId + index 更新工具调用字段（浅合并）
   * @param {string} messageId - 所属消息 id
   * @param {number} index - toolCalls 数组下标
   * @param {Object} patch - 待合并的字段
   */
  function updateToolCall(messageId, index, patch) {
    const msg = messages.value.find(m => m.id === messageId)
    if (!msg) return
    const tc = msg.toolCalls[index]
    if (!tc) return
    Object.assign(tc, patch)
  }

  // 导出所有状态和方法
  return {
    messages,
    isLoading,
    isPanelOpen,
    addMessage,
    updateMessage,
    clearMessages,
    setLoading,
    togglePanel,
    addToolCall,
    updateToolCall,
  }
})
