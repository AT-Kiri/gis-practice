"""
Tool 结果统一格式定义
所有 GIS 工具和 RAG 工具的输出必须符合此契约
"""
from pydantic import BaseModel
from typing import Optional, Any


class ToolResult(BaseModel):
    """工具执行结果的统一格式"""
    success: bool
    data: dict = {}
    geojson: Optional[dict] = None
    message: str = ""
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return self.model_dump()
