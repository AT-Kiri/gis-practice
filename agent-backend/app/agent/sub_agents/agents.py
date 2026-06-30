"""
子 Agent 定义与执行
4 个专业子 Agent：SearchAgent / AnalysisAgent / RouteAgent / KnowledgeAgent
每个子 Agent 用 create_react_agent 创建，有独立的工具集和系统提示词
"""
import json
import logging
from typing import AsyncGenerator
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage
from app.services.llm_service import LLMService
from app.tools.gis_tools import (
    feature_search, spatial_query, fly_to_location,
    buffer_analysis, overlay_analysis,
    shortest_path, service_area,
    online_route_planning, mock_nearby_resources,
)
from app.tools.rag_tools import rag_retrieval
from app.tools.algo_tools import pareto_resource_optimize, aco_multi_vehicle_route

logger = logging.getLogger(__name__)


# ==================== 子 Agent 系统提示词 ====================

SEARCH_PROMPT = """你是检索专家，专门负责地理要素检索和空间查询。

可用工具：
- feature_search: 按关键字搜索地理要素。支持 region 参数（auto/jingjin/changchun）
- spatial_query: 在指定几何范围内查询地物。支持 feature_type 过滤。geometry 参数直接传前序注入的 GeoJSON
- fly_to_location: 按地名定位地图
- mock_nearby_resources: 生成模拟资源点（医院/物资点/救援队）。仅当真实查询无结果时使用，结果会标注为模拟数据

执行规则：
1. 根据任务描述选择合适的工具
2. 如果任务提到长春市地点，feature_search 必须传 region="changchun"
3. 工具返回的 geojson 会自动渲染到地图上
4. 执行完成后，简要总结检索结果（找到几个要素、主要名称等）
5. 不要编造结果，只基于工具返回的数据回答
6. 如果前序步骤已提供坐标或几何数据，直接复用，不要重复查询
   - 前序步骤中的 center 值（{"lng":...,"lat":...}）可直接传给 mock_nearby_resources 的 center 参数
   - 前序步骤中单独一行的 inner_geometry_brief 值（受灾圈 Polygon JSON 字符串）可直接原样复制给 spatial_query 的 geometry 参数
7. 当真实数据查询无结果时，可用 mock_nearby_resources 生成模拟数据，但必须说明是模拟数据
8. 多个匹配结果时，优先取名字与查询关键字完全匹配的要素（如查询"朝阳区"时，"朝阳区"优先于"朝阳区人民政府"）
9. 如果任务要求"取前N条"，直接取返回结果的前N条（按返回顺序），无需按距离排序
10. spatial_query 查询长春市数据时，需传 region="changchun"（默认查京津冀）
11. 【重要】应急救援场景查询周边资源（医院/物资点/救援队/避难所等）时，spatial_query 必须传 feature_type="point"（只查点要素），不要传 all/line/polygon。线要素（道路/河流）和面要素（湖泊/土地）不是救援资源
12. 【重要】禁止对同一参数重复调用同一工具。第一次调用返回结果（即使是空）即为最终结果，不要重新尝试。如果结果为空，说明数据源中无匹配，应直接进入下一步或使用 mock_nearby_resources
13. 【spatial_query】当前序步骤含单独一行的 inner_geometry_brief 时，必须原样复制该行 = 号后的完整 JSON 字符串作 geometry 参数值，禁止修改、截断、或用单一坐标重复构造 Polygon。feature_type 按任务描述传（双缓冲区场景必传 point）
14. 【mock_nearby_resources 必传 inner_radius】双缓冲区场景下，必须传 inner_radius 参数（值=前序 dual_buffer_analysis 返回的 inner_distance），禁止用默认 0。否则 mock 点会落在小缓冲区受灾圈内。outer_radius 同步传 outer_distance 值"""

ANALYSIS_PROMPT = """你是空间分析专家，专门负责缓冲区分析和叠置分析。

可用工具：
- buffer_analysis: 对几何对象做缓冲区分析。参数 geometry（GeoJSON 字符串）和 distance（米）
- overlay_analysis: 对两个数据集做叠置分析

执行规则：
1. 如果任务需要坐标但没有提供，说明需要先获取坐标
2. geometry 参数请传 JSON 字符串格式，如 '{"type":"Point","coordinates":[116.4,39.9]}'
3. distance 参数单位是米
4. 工具返回的 geojson 会自动渲染到地图上
5. 执行完成后，总结分析结果（缓冲区面积、叠置要素数量等）"""

ROUTE_PROMPT = """你是路径规划专家，专门负责最短路径、服务区分析和资源调度优化。

可用工具：
- shortest_path: 在长春路网中计算多点间最短路径。参数 points 是 JSON 字符串，如 '[{"lng":125.3,"lat":43.8},{"lng":125.4,"lat":43.9}]'
- service_area: 分析中心点可达范围。参数 center 是 JSON 字符串，如 '{"lng":125.3,"lat":43.8}'，radius 单位米
- online_route_planning: 在线路径规划（OSRM），用于京津冀等非长春地区。参数 origin/destination 是坐标 JSON，如 '{"lng":116.28,"lat":39.85}'
- pareto_resource_optimize: Pareto 多目标资源优选。当有2个以上资源点（医院/物资点/救援队）需要在距离和容量间权衡时使用。参数 resources 是 JSON 字符串列表
- aco_multi_vehicle_route: ACO 蚁群多车路径分配。当有多个救援队需要分配多个受灾点时使用，替代逐个规划路径。参数 vehicles/targets 是 JSON 字符串列表

执行规则：
1. shortest_path/service_area 使用长春市路网，坐标范围约 125.15-125.45°E, 43.74-44.00°N
2. online_route_planning 使用在线路网，适用于京津冀等非长春地区
3. 如果前序步骤已提供起终点坐标，直接复用，不要重复查询
4. points/center/origin/destination 参数请传 JSON 字符串格式
5. 工具返回的 geojson 会自动渲染到地图上
6. 执行完成后，总结路径结果（距离、时间等）
7. 如果任务要求"对多个资源点分别规划路径"，逐个调用 online_route_planning，每次 origin=资源点坐标, destination=受灾点坐标
8. 【Pareto 优化】当有 2 个以上资源点且需要在距离和容量间权衡时，优先调用 pareto_resource_optimize 做多目标筛选，而非逐个规划路径。resources 参数需包含 name/lng/lat/distance_m/capacity 字段
9. 【ACO 多车分配】当有 2 个以上救援队且 2 个以上受灾点时，优先调用 aco_multi_vehicle_route 做整体最优分配，而非逐个规划。vehicles 和 targets 参数需包含 name/lng/lat 字段
10. 算法工具的输出已包含最优方案和可视化，直接总结结果即可，不要重复规划"""

KNOWLEDGE_PROMPT = """你是应急救援知识专家，专门负责从知识库中检索应急救援方案和处置流程。

可用工具：
- rag_retrieval: 从应急救援知识库中检索相关文档。参数 query 是检索查询文本

执行规则：
1. 根据任务描述构造合适的检索查询
2. 将检索到的知识整合为清晰的建议
3. 如果检索结果为空，说明知识库中暂无相关内容
4. 回答要专业、准确，符合中国应急管理体系
5. 适当引用知识来源"""


# ==================== 子 Agent 构建 ====================

def _build_sub_agents() -> dict:
    """构建 4 个专业子 Agent"""
    llm = LLMService.get_chat_model(temperature=0.3)

    return {
        "search": create_react_agent(
            model=llm,
            tools=[feature_search, spatial_query, fly_to_location, mock_nearby_resources],
            state_modifier=SEARCH_PROMPT,
        ),
        "analysis": create_react_agent(
            model=llm,
            tools=[buffer_analysis, overlay_analysis],
            state_modifier=ANALYSIS_PROMPT,
        ),
        "route": create_react_agent(
            model=llm,
            tools=[shortest_path, service_area, online_route_planning, pareto_resource_optimize, aco_multi_vehicle_route],
            state_modifier=ROUTE_PROMPT,
        ),
        "knowledge": create_react_agent(
            model=llm,
            tools=[rag_retrieval],
            state_modifier=KNOWLEDGE_PROMPT,
        ),
    }


# 全局子 Agent 实例（延迟初始化）
_sub_agents: dict | None = None


def get_sub_agents() -> dict:
    """获取全局子 Agent 实例"""
    global _sub_agents
    if _sub_agents is None:
        _sub_agents = _build_sub_agents()
    return _sub_agents


# ==================== 子 Agent 执行 ====================

async def execute_sub_agent(agent_type: str, task_description: str) -> AsyncGenerator[dict, None]:
    """
    执行指定子 Agent，以事件流形式返回结果

    Yields:
        {"type": "tool_start", "tool_name": str, "input": dict}
        {"type": "tool_result", "tool_name": str, "success": bool, "result": dict, "geojson": dict|None, "message": str}
        {"type": "done", "summary": str, "success": bool}
    """
    agents = get_sub_agents()
    agent = agents.get(agent_type)
    if not agent:
        yield {"type": "done", "summary": f"未知子 Agent 类型: {agent_type}", "success": False}
        return

    # 设置用户消息上下文，供 spatial_query 等工具推断 LLM 没传的参数（如 feature_type）
    from app.tools.gis_tools import set_user_message_context
    set_user_message_context(task_description)

    inputs = {"messages": [HumanMessage(content=task_description)]}
    collected_text = []

    try:
        async for event in agent.astream_events(inputs, version="v2"):
            kind = event["event"]
            data = event.get("data", {})

            # 工具开始
            if kind == "on_tool_start":
                tool_input = data.get("input", {})
                tool_name = event.get("name", "")
                if isinstance(tool_input, dict):
                    yield {
                        "type": "tool_start",
                        "tool_name": tool_name,
                        "input": _simplify_input(tool_name, tool_input),
                    }

            # 工具结束
            elif kind == "on_tool_end":
                tool_output = data.get("output", "")
                tool_name = event.get("name", "")

                if hasattr(tool_output, "content"):
                    tool_output = tool_output.content

                result_data, message, success = _parse_tool_output(tool_output)
                # 从线程级缓存取完整 geojson（ToolResult.to_dict() 已剥离 geojson 避免token暴涨）
                from app.schemas.tool_result import pop_pending_geojson
                geojson = pop_pending_geojson()

                yield {
                    "type": "tool_result",
                    "tool_name": tool_name,
                    "success": success,
                    "result": result_data,
                    "geojson": geojson,
                    "message": message,
                }

            # 工具错误
            elif kind == "on_tool_error":
                tool_name = event.get("name", "")
                err = data.get("error") or data.get("exception") or "工具执行错误"
                yield {
                    "type": "tool_result",
                    "tool_name": tool_name,
                    "success": False,
                    "result": {},
                    "geojson": None,
                    "message": f"工具执行错误: {str(err)[:300]}",
                }

            # 子 Agent 的 LLM 文本（收集但不转发，这些是中间推理）
            elif kind == "on_chat_model_stream":
                chunk = data.get("chunk")
                if chunk and chunk.content:
                    collected_text.append(chunk.content)

        summary = "".join(collected_text).strip()
        if not summary:
            summary = "执行完成（无文本输出）"

        yield {"type": "done", "summary": summary, "success": True}

    except Exception as e:
        logger.error(f"子 Agent {agent_type} 执行异常: {e}")
        yield {"type": "done", "summary": f"执行异常: {e}", "success": False}


# ==================== 工具函数 ====================

def _parse_tool_output(tool_output) -> tuple:
    """解析工具输出，返回 (result_data, message, success)
    geojson 不在返回值中（已由 ToolResult.to_dict() 剥离到线程级缓存，
    调用方通过 pop_pending_geojson() 取出）。
    """
    result_data = {}
    message = ""
    success = True

    if isinstance(tool_output, str):
        try:
            parsed = json.loads(tool_output)
            if not isinstance(parsed, dict):
                raise ValueError("工具输出不是 JSON 对象")
            success = parsed.get("success", True)
            result_data = parsed.get("data", {})
            message = parsed.get("message", "")
            if not success:
                message = parsed.get("error", "工具执行失败")
        except (json.JSONDecodeError, ValueError):
            success = False
            message = tool_output[:200]
    elif isinstance(tool_output, dict):
        success = tool_output.get("success", True)
        result_data = tool_output.get("data", {})
        message = tool_output.get("message", "")
        if not success:
            message = tool_output.get("error", "工具执行失败")

    return result_data, message, success


def _simplify_input(tool_name: str, tool_input: dict) -> dict:
    """简化工具输入参数用于前端展示"""
    if tool_name == "feature_search":
        return {
            "keyword": tool_input.get("keyword", ""),
            "level": tool_input.get("level", "all"),
            "region": tool_input.get("region", "auto"),
        }
    elif tool_name == "buffer_analysis":
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
        return {"origin": tool_input.get("origin", ""), "destination": tool_input.get("destination", "")}
    elif tool_name == "mock_nearby_resources":
        return {
            "resource_type": tool_input.get("resource_type", ""),
            "count": tool_input.get("count", 0),
            "inner_radius": tool_input.get("inner_radius", 0),
            "outer_radius": tool_input.get("outer_radius", 0),
        }
    elif tool_name == "rag_retrieval":
        return {"query": tool_input.get("query", ""), "top_k": tool_input.get("top_k", 3)}
    elif tool_name == "pareto_resource_optimize":
        resources = tool_input.get("resources", "")
        if isinstance(resources, str):
            try:
                resources = json.loads(resources)
            except Exception:
                resources = []
        return {"resource_count": len(resources) if isinstance(resources, list) else 0, "top_k": tool_input.get("top_k", 3)}
    elif tool_name == "aco_multi_vehicle_route":
        vehicles = tool_input.get("vehicles", "")
        targets = tool_input.get("targets", "")
        if isinstance(vehicles, str):
            try:
                vehicles = json.loads(vehicles)
            except Exception:
                vehicles = []
        if isinstance(targets, str):
            try:
                targets = json.loads(targets)
            except Exception:
                targets = []
        return {
            "vehicle_count": len(vehicles) if isinstance(vehicles, list) else 0,
            "target_count": len(targets) if isinstance(targets, list) else 0,
            "iterations": tool_input.get("iterations", 50),
        }
    return {"raw": str(tool_input)[:200]}
