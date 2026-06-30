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
- spatial_query: 空间查询，在指定范围内查询地物。支持 feature_type 参数过滤要素类型（point/line/polygon/all），支持 region 参数选择数据源（jingjin=京津冀默认/changchun=长春）。geometry 参数传 GeoJSON 字符串。
- buffer_analysis: 缓冲区分析，分析某地点周边影响范围
- dual_buffer_analysis: 双缓冲区分析，生成受灾圈(小)和支援圈(大)，用于应急分级响应。返回 inner_geometry_brief(受灾圈) 和 outer_geometry_brief(支援圈)。半径建议：地震 inner=3000/outer=8000，火灾 1000/3000，洪水 2000/5000。步骤3 spatial_query(geometry=inner_geometry_brief, feature_type=point) 查受灾范围内点要素；步骤4 mock_nearby_resources(center=受灾点, inner_radius=小半径, outer_radius=大半径) 在大-小环带生成模拟医院
- overlay_analysis: 叠置分析，分析两个图层的叠加关系
- shortest_path: 最短路径分析（仅长春路网），规划多点间最短路径
- service_area: 服务区分析（仅长春路网），分析某点可达范围
- online_route_planning: 在线路径规划（OSRM 公共服务，覆盖全球）。当起点或终点不在长春市时使用此工具，例如京津冀地区的路径规划。失败时会自动降级为直线距离
- mock_nearby_resources: 模拟周边资源点。仅当真实查询（feature_search/spatial_query）查不到医院/物资点/救援队等关键资源时使用，在中心点周边生成模拟资源点。使用此工具必须在回复中明确告知用户"数据为模拟数据"
- fly_to_location: 地图定位，将地图移动到指定地点
- rag_retrieval: 知识检索，从应急救援知识库中检索救援方案、处置流程、应急预案等内容。当用户询问救援知识、应急流程、预案内容时使用

使用规则：
1. "XXX在哪" → feature_search 查地点坐标。fly_to_location 仅用于移动地图视角，不用于路径规划
2. "XXX周边/范围内查要素" → feature_search 取坐标 → buffer_analysis 生成缓冲区（取 data.geometry_brief）→ spatial_query(geometry=geometry_brief, feature_type=类型)。用户提到"点/线/面要素"时 feature_type 必传 point/line/polygon，不传 all
3. 【路径规划】"从A到B怎么走" → feature_search(region="changchun") 查起终点坐标 → shortest_path（长春市内）或 online_route_planning（非长春市）。路径规划只调 feature_search + 路径工具，禁止调 spatial_query/buffer_analysis/fly_to_location
4. "服务区/可达范围" → feature_search(region="changchun") 取坐标 → service_area（仅长春市）
5. 长春市地点（南湖公园、吉林大学、省体育局等）feature_search 必须传 region="changchun"
6. 模拟数据：仅当真实查询无结果时用 mock_nearby_resources，使用后必须告知用户"模拟数据"
7. 工具返回的 geojson 会自动渲染到地图上，不需要描述坐标
8. 不涉及 GIS 操作的问题直接用文字回答

回答风格：
- 简洁专业，直接回答问题
- 如果工具执行成功，总结结果要点
- 如果工具执行失败，说明原因并建议替代方案
- 应急场景下，语气要果断、清晰
- 使用了模拟数据时，必须显式标注
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
        # 设置用户消息上下文，供 spatial_query 等工具推断 LLM 没传的参数（如 feature_type）
        from app.tools.gis_tools import set_user_message_context, clear_inner_polygon_context
        set_user_message_context(user_message)
        # 清理上一次请求残留的 inner Polygon 缓存，避免跨请求误 fallback
        clear_inner_polygon_context()

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
                        message = parsed.get("message", "")
                        if not success:
                            message = parsed.get("error", "工具执行失败")
                    except (json.JSONDecodeError, ValueError):
                        success = False
                        message = tool_output[:200] if isinstance(tool_output, str) else "工具输出解析失败"
                elif isinstance(tool_output, dict):
                    success = tool_output.get("success", True)
                    result_data = tool_output.get("data", {})
                    message = tool_output.get("message", "")
                    if not success:
                        message = tool_output.get("error", "工具执行失败")

                # 从线程级缓存取完整 geojson（ToolResult.to_dict() 已剥离 geojson 避免token暴涨）
                from app.schemas.tool_result import pop_pending_geojson
                geojson = pop_pending_geojson()

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
    elif tool_name == "dual_buffer_analysis":
        # 双缓冲区分析，提取半径参数（center 是 {"lng":...,"lat":...} 格式）
        return {
            "inner_distance": tool_input.get("inner_distance", 0),
            "outer_distance": tool_input.get("outer_distance", 0),
        }
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
    elif tool_name == "online_route_planning":
        # 在线路径规划，提取起终点几何类型
        origin = tool_input.get("origin")
        dest = tool_input.get("destination")
        return {
            "origin_type": _get_geo_type(origin),
            "destination_type": _get_geo_type(dest),
        }
    elif tool_name == "mock_nearby_resources":
        return {
            "resource_type": tool_input.get("resource_type", "hospital"),
            "count": tool_input.get("count", 5),
            "inner_radius": tool_input.get("inner_radius", 0),
            "outer_radius": tool_input.get("outer_radius", 5000),
        }
    elif tool_name == "spatial_query":
        # spatial_query: geometry 可能很大，只展示要素类型、region、退化标记等关键字段
        geo = tool_input.get("geometry")
        geo_type, point_count, is_degenerate = "", 0, False
        if isinstance(geo, dict):
            geo_type = geo.get("type", "")
            coords = geo.get("coordinates") or []
            try:
                ring = coords[0] if coords and isinstance(coords[0][0], (list, tuple)) else coords
                point_count = len(ring) if ring else 0
                if geo_type == "Polygon" and point_count >= 2:
                    first = (ring[0][0], ring[0][1])
                    is_degenerate = all(
                        abs(p[0] - first[0]) < 1e-9 and abs(p[1] - first[1]) < 1e-9 for p in ring
                    )
            except (IndexError, TypeError, ValueError):
                pass
        elif isinstance(geo, str):
            try:
                g = json.loads(geo)
                geo_type = g.get("type", "")
                coords = g.get("coordinates") or []
                ring = coords[0] if coords and isinstance(coords[0][0], (list, tuple)) else coords
                point_count = len(ring) if ring else 0
            except Exception:
                pass
        result = {
            "feature_type": tool_input.get("feature_type", "all"),
            "region": tool_input.get("region", "jingjin"),
            "geometry_type": geo_type,
            "point_count": point_count,
        }
        if is_degenerate:
            result["degenerate_warning"] = "所有点坐标相同，查询将失效"
        if tool_input.get("exclude_geometry"):
            result["has_exclude_geometry"] = True
        return result
    return {"raw": str(tool_input)[:200]}


def _get_geo_type(geo) -> str:
    """从几何参数中提取类型（兼容 dict 和 JSON 字符串）"""
    if isinstance(geo, dict):
        return geo.get("type", "")
    if isinstance(geo, str):
        try:
            return json.loads(geo).get("type", "")
        except Exception:
            return ""
    return ""
