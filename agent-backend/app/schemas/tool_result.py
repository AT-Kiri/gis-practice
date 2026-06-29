"""
Tool 结果统一格式定义
所有 GIS 工具和 RAG 工具的输出必须符合此契约
"""
import threading
from pydantic import BaseModel
from typing import Optional, Any


# 线程级 geojson 缓存：工具返回时把完整 geojson 存这里，
# graph.py / agents.py 的 on_tool_end 从 pop_pending_geojson() 取出传给前端。
# 这样工具返回给 LLM 的 dict 不含 geojson，避免 token 暴涨。
_local = threading.local()


def _set_pending_geojson(geojson):
    """存储当前工具的完整 geojson（线程安全）"""
    if not hasattr(_local, 'geojson_queue'):
        _local.geojson_queue = []
    _local.geojson_queue.append(geojson)


def pop_pending_geojson():
    """取出最后一个工具的完整 geojson（FIFO）"""
    if hasattr(_local, 'geojson_queue') and _local.geojson_queue:
        return _local.geojson_queue.pop()
    return None


class ToolResult(BaseModel):
    """工具执行结果的统一格式"""
    success: bool
    data: dict = {}
    geojson: Optional[dict] = None
    message: str = ""
    error: Optional[str] = None

    def to_dict(self) -> dict:
        """返回 dict 给 LLM。
        geojson 会被剥离存到 threading.local（避免 token 暴涨），
        graph.py / agents.py 的 on_tool_end 通过 pop_pending_geojson() 取出传给前端。
        """
        d = self.model_dump()
        # 把完整 geojson 存到线程级缓存，返回给 LLM 的 dict 中 geojson=None
        _set_pending_geojson(d.get("geojson"))
        d["geojson"] = None
        return d
