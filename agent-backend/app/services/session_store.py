"""
内存级会话存储
P0 Task 4 子任务：session_id 与会话管理（内存级，简单实现）

每个 session_id 维护一个消息列表（HumanMessage / AIMessage），
重启后丢失（P2 Task 16 负责前端 localStorage 持久化）。

注意：只存 HumanMessage 和最终 AIMessage（纯文本），
不存 ToolMessage / 含 tool_calls 的 AIMessage，避免 Agent 重复执行工具。
"""
from collections import defaultdict
from langchain_core.messages import HumanMessage, AIMessage

# 会话存储：session_id -> list[BaseMessage]
_sessions: dict[str, list] = defaultdict(list)

# 每个会话最多保留的消息数（防止上下文膨胀）
MAX_HISTORY = 20


def get_history(session_id: str) -> list:
    """获取指定会话的历史消息列表"""
    return list(_sessions.get(session_id, []))


def add_exchange(session_id: str, user_message: str, ai_response: str):
    """
    追加一轮对话到会话历史
    同时存 HumanMessage 和 AIMessage，保持对话配对完整
    """
    messages = _sessions[session_id]
    messages.append(HumanMessage(content=user_message))
    messages.append(AIMessage(content=ai_response))
    # 裁剪旧消息（保留最近 MAX_HISTORY 条）
    if len(messages) > MAX_HISTORY:
        _sessions[session_id] = messages[-MAX_HISTORY:]


def clear_session(session_id: str):
    """清空指定会话历史"""
    _sessions.pop(session_id, None)
