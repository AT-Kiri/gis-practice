"""
多智能体状态定义与 Schema
强约束：所有结构化输出都通过 JSON Schema 校验
"""
from typing import TypedDict, Literal
from pydantic import BaseModel, Field


# ==================== 意图类型枚举 ====================

IntentType = Literal["search", "analysis", "route", "knowledge", "mixed", "chat"]


# ==================== 意图分类 Schema ====================

class IntentResult(BaseModel):
    """意图分类结果"""
    intent: IntentType = Field(description="意图类型")
    entities: dict = Field(
        default_factory=dict,
        description="提取的实体，如 location/disaster/radius/dataset 等",
    )
    reasoning: str = Field(default="", description="分类理由（简要）")


# ==================== 任务规划 Schema ====================

class TaskStep(BaseModel):
    """单步任务"""
    step: int = Field(description="步骤序号，从1开始")
    agent_type: Literal["search", "analysis", "route", "knowledge"] = Field(
        description="执行的子 Agent 类型"
    )
    description: str = Field(description="任务描述，将作为子 Agent 的输入指令")
    tool_hint: str = Field(default="", description="建议使用的工具")


class TaskPlan(BaseModel):
    """任务规划结果"""
    tasks: list[TaskStep] = Field(description="任务步骤列表")
    summary: str = Field(default="", description="整体计划说明")


# ==================== 全局状态 ====================

class AgentState(TypedDict):
    """Coordinator 全局状态"""
    user_input: str               # 用户原始输入
    session_id: str               # 会话 ID
    intent: str                   # 识别出的意图
    entities: dict                # 提取的实体
    task_plan: list[dict]         # 拆解后的任务计划
    current_step: int             # 当前执行到第几步
    step_results: list[dict]      # 每步的执行结果
    tool_events: list[dict]       # 工具执行事件（用于前端分步展示）
    final_answer: str             # 最终回答


# ==================== 子 Agent 输出契约 ====================

class SubAgentResult(BaseModel):
    """子 Agent 执行结果契约"""
    agent_type: str               # search/analysis/route/knowledge
    success: bool                 # 是否成功
    summary: str                  # 结果摘要（供 Coordinator 汇总用）
    geojson: dict | None = None   # 可选的 GeoJSON 结果
    data: dict = {}               # 详细数据


# ==================== 常量 ====================

MAX_STEPS = 5  # 最大执行步数保护
MAX_RETRY = 3  # JSON Schema 校验失败最大重试次数
