/**
 * Agent SSE 连接管理
 * 负责与后端 Agent API 建立 SSE 连接，解析事件流，回调分发
 *
 * 支持两种模式：
 * - P0 单 Agent：POST /agent-api/agent/chat
 * - P1 多智能体：POST /agent-api/agent/chat/multi（默认）
 */

/**
 * 发送消息到 Agent 后端，通过 SSE 接收流式响应
 * @param {string} message - 用户消息文本
 * @param {Object} callbacks - 事件回调
 * @param {boolean} [options.useMulti=true] - 是否使用多智能体模式
 * @param {string} [options.sessionId='default'] - 会话 ID
 * @param {Function} [callbacks.onAgentStart] - Agent 开始执行
 * @param {Function} [callbacks.onIntentClassified] - 意图分类完成 (data) => void  [multi only]
 * @param {Function} [callbacks.onPlanCreated] - 任务规划完成 (data) => void  [multi only]
 * @param {Function} [callbacks.onStepStart] - 某步开始 (data) => void  [multi only]
 * @param {Function} [callbacks.onStepDone] - 某步完成 (data) => void  [multi only]
 * @param {Function} [callbacks.onToolStart] - 工具开始调用 (data) => void
 * @param {Function} [callbacks.onToolResult] - 工具执行完成 (data) => void
 * @param {Function} [callbacks.onText] - 流式文本 token (content) => void
 * @param {Function} [callbacks.onAgentEnd] - 全部执行完成
 * @param {Function} [callbacks.onError] - 出错 (message) => void
 * @returns {AbortController} 用于中止请求
 */
export function sendAgentMessage(message, callbacks = {}, options = {}) {
  const controller = new AbortController()
  const useMulti = options.useMulti !== false // 默认 true
  const sessionId = options.sessionId || 'default'
  const url = useMulti ? '/agent-api/agent/chat/multi' : '/agent-api/agent/chat'

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE 格式：data: {...}\n\n
        const lines = buffer.split('\n')
        buffer = lines.pop() // 保留最后不完整的行

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue

          const jsonStr = trimmed.slice(5).trim()
          if (!jsonStr) continue

          try {
            const event = JSON.parse(jsonStr)
            handleEvent(event, callbacks)
          } catch (e) {
            // JSON 解析失败，跳过
            console.warn('SSE parse error:', e, jsonStr)
          }
        }
      }

      // 处理 buffer 中剩余的数据
      if (buffer.trim().startsWith('data:')) {
        try {
          const event = JSON.parse(buffer.trim().slice(5).trim())
          handleEvent(event, callbacks)
        } catch (e) {
          // 忽略
        }
      }
    })
    .catch((err) => {
      if (err.name === 'AbortError') return
      callbacks.onError?.(err.message || '连接失败')
    })

  return controller
}

/**
 * 分发 SSE 事件到对应回调
 */
function handleEvent(event, callbacks) {
  const { event: type, data } = event
  switch (type) {
    case 'agent_start':
      callbacks.onAgentStart?.(data)
      break
    // ===== P1 多智能体新增事件 =====
    case 'intent_classified':
      callbacks.onIntentClassified?.(data)
      break
    case 'plan_created':
      callbacks.onPlanCreated?.(data)
      break
    case 'step_start':
      callbacks.onStepStart?.(data)
      break
    case 'step_done':
      callbacks.onStepDone?.(data)
      break
    // ===== 通用事件 =====
    case 'tool_start':
      callbacks.onToolStart?.(data)
      break
    case 'tool_result':
      callbacks.onToolResult?.(data)
      break
    case 'text':
      callbacks.onText?.(data.content)
      break
    case 'agent_end':
      callbacks.onAgentEnd?.(data)
      break
    case 'error':
      callbacks.onError?.(data.message)
      break
  }
}
