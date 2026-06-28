"""
Agent 对话 API 接口
提供 SSE 流式响应
"""
import json
import uuid
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.agent.graph import stream_agent_events
from app.services.session_store import get_history, clear_session

router = APIRouter()


class ChatRequest(BaseModel):
    """对话请求"""
    message: str
    session_id: str = "default"


@router.post("/chat")
async def chat(req: ChatRequest):
    """
    Agent 对话接口（SSE 流式响应）
    返回 Server-Sent Events 流，事件类型：
    - agent_start / tool_start / tool_result / text / agent_end / error
    """
    session_id = req.session_id or str(uuid.uuid4())

    async def event_stream():
        try:
            async for event in stream_agent_events(req.message, session_id):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:
            error_event = {"event": "error", "data": {"message": str(e)}}
            yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/sessions/{session_id}/history")
async def get_history_endpoint(session_id: str):
    """获取会话历史"""
    messages = get_history(session_id)
    return {
        "session_id": session_id,
        "messages": [
            {"role": "user" if m.type == "human" else "assistant", "content": m.content}
            for m in messages
        ],
    }


@router.delete("/sessions/{session_id}/history")
async def clear_history_endpoint(session_id: str):
    """清空会话历史"""
    clear_session(session_id)
    return {"session_id": session_id, "cleared": True}
