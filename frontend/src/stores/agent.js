/**
 * Agent 聊天面板全局状态管理（Pinia Store）
 * 管理对话消息列表、加载状态、面板展开状态、工具调用记录
 * 以及 P1 多智能体协同的意图/计划/步骤状态
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 生成唯一消息 ID */
function genId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 子 Agent 类型中文名映射 */
export const AGENT_TYPE_LABEL = {
  search: '检索专家',
  analysis: '分析专家',
  route: '路径专家',
  knowledge: '知识专家',
}

/** 意图中文名映射 */
export const INTENT_LABEL = {
  search: '专题检索',
  analysis: '空间分析',
  route: '路径规划',
  knowledge: '知识检索',
  mixed: '综合应急',
  chat: '智能问答',
}

export const useAgentStore = defineStore('agent', () => {
  // ====== 对话状态 ======
  /** 对话消息列表 */
  const messages = ref([])
  /** 是否正在等待 AI 回复 */
  const isLoading = ref(false)
  /** 面板是否展开 */
  const isPanelOpen = ref(false)

  // ====== 多智能体工作流状态（每次发送时重置） ======
  /** 当前意图 */
  const currentIntent = ref('')
  /** 当前意图实体 */
  const currentEntities = ref({})
  /** 任务计划 { tasks, summary, totalSteps } */
  const currentPlan = ref(null)
  /** 当前执行步号（从 1 开始） */
  const currentStep = ref(0)
  /** 总步数 */
  const totalSteps = ref(0)
  /** 各步状态列表 [{ step, agentType, description, status, summary }] */
  const steps = ref([])

  // ====== 对话方法 ======

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

  function setLoading(status) {
    isLoading.value = status
  }

  function togglePanel() {
    isPanelOpen.value = !isPanelOpen.value
  }

  /**
   * 为指定消息追加一个工具调用记录，返回该工具调用的引用 index
   * @param {string} messageId - 所属消息 id
   * @param {Object} toolCall - { toolName, status, input, result, error, step }
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
      step: toolCall.step ?? null,        // P1 多智能体新增：所属步号
      agentType: toolCall.agentType ?? '', // P1 多智能体新增：所属子 Agent 类型
    }
    msg.toolCalls.push(entry)
    return msg.toolCalls.length - 1
  }

  /**
   * 按 messageId + index 更新工具调用字段（浅合并）
   */
  function updateToolCall(messageId, index, patch) {
    const msg = messages.value.find(m => m.id === messageId)
    if (!msg) return
    const tc = msg.toolCalls[index]
    if (!tc) return
    Object.assign(tc, patch)
  }

  // ====== 多智能体工作流方法 ======

  /** 设置意图分类结果 */
  function setIntent(intent, entities = {}) {
    currentIntent.value = intent || ''
    currentEntities.value = entities || {}
  }

  /** 设置任务计划 */
  function setPlan(tasks = [], summary = '') {
    currentPlan.value = {
      tasks: tasks || [],
      summary: summary || '',
      totalSteps: (tasks || []).length,
    }
    totalSteps.value = (tasks || []).length
    currentStep.value = 0
    steps.value = (tasks || []).map((t, idx) => ({
      step: idx + 1,
      agentType: t.agent_type || '',
      description: t.description || '',
      status: 'pending',
      summary: '',
    }))
  }

  /** 标记某步开始 */
  function startStep(step, total, agentType, description) {
    currentStep.value = step
    if (total) totalSteps.value = total
    const idx = steps.value.findIndex(s => s.step === step)
    if (idx >= 0) {
      steps.value[idx].status = 'running'
      if (agentType) steps.value[idx].agentType = agentType
      if (description) steps.value[idx].description = description
    } else {
      steps.value.push({
        step,
        agentType: agentType || '',
        description: description || '',
        status: 'running',
        summary: '',
      })
    }
  }

  /** 标记某步完成 */
  function finishStep(step, success, summary) {
    const idx = steps.value.findIndex(s => s.step === step)
    if (idx >= 0) {
      steps.value[idx].status = success ? 'done' : 'error'
      steps.value[idx].summary = summary || ''
    }
  }

  /** 重置多智能体工作流状态（发送新消息前调用） */
  function resetWorkflow() {
    currentIntent.value = ''
    currentEntities.value = {}
    currentPlan.value = null
    currentStep.value = 0
    totalSteps.value = 0
    steps.value = []
  }

  return {
    // 对话状态
    messages,
    isLoading,
    isPanelOpen,
    // 多智能体状态
    currentIntent,
    currentEntities,
    currentPlan,
    currentStep,
    totalSteps,
    steps,
    // 对话方法
    addMessage,
    updateMessage,
    clearMessages,
    setLoading,
    togglePanel,
    addToolCall,
    updateToolCall,
    // 多智能体方法
    setIntent,
    setPlan,
    startStep,
    finishStep,
    resetWorkflow,
  }
})
