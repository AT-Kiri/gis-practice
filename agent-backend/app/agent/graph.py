"""
Agent 核心逻辑
单点封装 Agent 构造，隔离版本差异
P0 阶段：单 Agent + 多 Tool；P1 阶段升级为多智能体
"""
import json
from typing import AsyncGenerator
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage, SystemMessage
from app.services.llm_service import LLMService
from app.services.session_store import get_history, add_exchange
from app.tools.gis_tools import GIS_TOOLS
from app.tools.rag_tools import RAG_TOOLS


# ==================== 系统提示词 ====================

SYSTEM_PROMPT = """你是京津冀城市综合防灾应急管理系统的 AI 应急助手。

你的职责：
1. 理解用户的自然语言需求，选择合适的 GIS 工具执行操作
2. 将操作结果以清晰的方式反馈给用户
3. 在应急场景下提供专业的分析和建议

可用的 GIS 工具：
- feature_search: 专题检索，按关键字搜索地理要素（京津冀：区县/乡镇/道路/河流等；长春市：公园/医院/学校等POI）。支持 region 参数指定搜索区域：auto(自动，先查京津冀，无结果回退查长春)、jingjin(仅京津冀)、changchun(仅长春)
- spatial_query: 空间查询，在指定范围内查询地物，支持 feature_type 参数过滤要素类型（point/line/polygon/all）
- buffer_analysis: 缓冲区分析，分析某地点周边影响范围
- overlay_analysis: 叠置分析，分析两个图层的叠加关系
- shortest_path: 最短路径分析（长春路网），规划多点间最短路径
- service_area: 服务区分析（长春路网），分析某点可达范围
- fly_to_location: 地图定位，将地图移动到指定地点
- rag_retrieval: 知识检索，从应急救援知识库中检索救援方案、处置流程、应急预案等内容。当用户询问救援知识、应急流程、预案内容时使用

使用规则：
1. 用户询问"XXX在哪"时，使用 feature_search 或 fly_to_location
2. 用户要求"分析XXX周边"时，先用 feature_search 获取坐标，再用 buffer_analysis
2.1. 用户要求"查询范围内的点要素/线要素/面要素"时，spatial_query 的 feature_type 参数分别传 point/line/polygon
3. 用户要求"从A到B的路径"时，先用 feature_search 获取A和B的坐标，再用 shortest_path
4. 用户要求"服务区/可达范围"时，先获取坐标，再用 service_area
5. shortest_path 和 service_area 使用长春市路网，坐标范围在长春市（约 125.15-125.45°E, 43.74-44.00°N）
6. 其他工具使用京津冀数据（约 113-120°E, 36-43°N）
7. 工具返回的 geojson 会自动渲染到地图上，你不需要描述坐标，只需总结结果
8. 如果用户的问题不涉及 GIS 操作，直接用文字回答
9. 长春市地点检索规则：
   - 当用户提到"长春市"或具体的长春市内地点（如"南湖公园"、"长春公园"、"吉林大学"等）时，feature_search 必须传 region="changchun" 以确保从长春数据源检索
   - 当用户要做路径规划/服务区分析且提到长春市内地点时，务必先用 region="changchun" 的 feature_search 查到起点和终点的精确坐标（返回的 geometry 为 WGS84 经纬度），再将坐标传给 shortest_path/service_area
   - 不要用京津冀的近似坐标做长春市路径规划，否则起终点会偏离实际位置

回答风格：
- 简洁专业，直接回答问题
- 如果工具执行成功，总结结果要点
- 如果工具执行失败，说明原因并建议替代方案
- 应急场景下，语气要果断、清晰
"""


# ==================== Agent 构造（单点封装） ====================

def build_agent():
    """
    构造 Agent 实例
    集中适配不同版本的 LangGraph API，业务代码不直接依赖具体构造器细节
    """
    llm = LLMService.get_chat_model(temperature=0.3)
    agent = create_react_agent(
        model=llm,
        tools=GIS_TOOLS + RAG_TOOLS,
        state_modifier=SYSTEM_PROMPT,
    )
    return agent


# 全局 Agent 实例（延迟初始化）
_agent_instance = None


def get_agent():
    """获取全局 Agent 实例（延迟初始化）"""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = build_agent()
    return _agent_instance


# ==================== 事件流生成 ====================

async def stream_agent_events(user_message: str, session_id: str = "default") -> AsyncGenerator[dict, None]:
    """
    执行 Agent 并以事件流形式返回结果
    生成 SSE 事件供前端消费

    事件类型:
    - agent_start: Agent 开始执行
    - tool_start: 工具开始调用
    - tool_result: 工具执行完成
    - text: 流式文本 token
    - agent_end: 全部执行完成
    - error: 出错
    """
    agent = get_agent()

    yield {"event": "agent_start", "data": {"agent_name": "assistant"}}

    try:
        # 读取会话历史，拼接到当前消息前面（实现会话内短期记忆）
        history = get_history(session_id)
        inputs = {"messages": history + [HumanMessage(content=user_message)]}

        current_tool_name = None
        collected_text = []  # 收集 AI 回复文本，用于存入会话历史

        async for event in agent.astream_events(inputs, version="v2"):
            kind = event["event"]
            data = event.get("data", {})

            # 工具开始
            if kind == "on_tool_start":
                tool_input = data.get("input", {})
                if isinstance(tool_input, dict):
                    # 提取关键参数用于展示
                    current_tool_name = event.get("name", "")
                    yield {
                        "event": "tool_start",
                        "data": {
                            "tool_name": current_tool_name,
                            "input": _simplify_tool_input(current_tool_name, tool_input),
                        },
                    }

            # 工具结束
            elif kind == "on_tool_end":
                tool_output = data.get("output", "")
                tool_name = event.get("name", "")

                # LangGraph astream_events v2 返回 ToolMessage 对象，需提取 content
                if hasattr(tool_output, "content"):
                    tool_output = tool_output.content

                # 解析工具输出
                result_data = {}
                geojson = None
                message = ""
                success = True

                if isinstance(tool_output, str):
                    try:
                        parsed = json.loads(tool_output)
                        # 防御：parsed 可能不是 dict（如纯字符串、数字）
                        if not isinstance(parsed, dict):
                            raise ValueError("工具输出不是 JSON 对象")
                        success = parsed.get("success", True)
                        result_data = parsed.get("data", {})
                        geojson = parsed.get("geojson")
                        message = parsed.get("message", "")
                        if not success:
                            message = parsed.get("error", "工具执行失败")
                    except (json.JSONDecodeError, ValueError):
                        success = False
                        message = tool_output[:200]
                elif isinstance(tool_output, dict):
                    success = tool_output.get("success", True)
                    result_data = tool_output.get("data", {})
                    geojson = tool_output.get("geojson")
                    message = tool_output.get("message", "")
                    if not success:
                        message = tool_output.get("error", "工具执行失败")

                yield {
                    "event": "tool_result",
                    "data": {
                        "tool_name": tool_name,
                        "success": success,
                        "result": result_data,
                        "geojson": geojson,
                        "message": message,
                    },
                }
                current_tool_name = None

            # 工具执行错误（参数校验失败、异常等，LangGraph 不会触发 on_tool_end）
            elif kind == "on_tool_error":
                tool_name = event.get("name", "")
                err = data.get("error") or data.get("exception") or "工具执行错误"
                err_msg = str(err)[:300]
                yield {
                    "event": "tool_result",
                    "data": {
                        "tool_name": tool_name,
                        "success": False,
                        "result": {},
                        "geojson": None,
                        "message": f"工具执行错误: {err_msg}",
                    },
                }
                current_tool_name = None

            # 流式文本 token
            elif kind == "on_chat_model_stream":
                chunk = data.get("chunk")
                if chunk and chunk.content:
                    collected_text.append(chunk.content)
                    yield {"event": "text", "data": {"content": chunk.content}}

        # 保存本轮对话到会话历史（仅存纯文本，不含工具调用，避免重复执行）
        add_exchange(session_id, user_message, "".join(collected_text))

        yield {"event": "agent_end", "data": {}}

    except Exception as e:
        yield {"event": "error", "data": {"message": str(e)}}


def _simplify_tool_input(tool_name: str, tool_input: dict) -> dict:
    """简化工具输入参数，避免传输过大的数据"""
    if tool_name == "feature_search":
        return {
            "keyword": tool_input.get("keyword", ""),
            "level": tool_input.get("level", "all"),
            "region": tool_input.get("region", "auto"),
        }
    elif tool_name == "buffer_analysis":
        # LLM 可能把 geometry 以 JSON 字符串形式传入，需安全处理
        geo = tool_input.get("geometry")
        geo_type = ""
        if isinstance(geo, dict):
            geo_type = geo.get("type", "")
        elif isinstance(geo, str):
            try:
                geo_type = json.loads(geo).get("type", "")
            except Exception:
                pass
        return {"distance": tool_input.get("distance", 0), "geometry_type": geo_type}
    elif tool_name == "shortest_path":
        pts = tool_input.get("points", [])
        if isinstance(pts, str):
            try:
                pts = json.loads(pts)
            except Exception:
                pts = []
        return {"pointCount": len(pts) if isinstance(pts, list) else 0}
    elif tool_name == "service_area":
        return {"radius": tool_input.get("radius", 0)}
    elif tool_name == "overlay_analysis":
        return {
            "source": tool_input.get("source_dataset", ""),
            "operate": tool_input.get("operate_dataset", ""),
            "operation": tool_input.get("operation", ""),
        }
    elif tool_name == "fly_to_location":
        return {"location": tool_input.get("location", "")}
    return {"raw": str(tool_input)[:200]}
