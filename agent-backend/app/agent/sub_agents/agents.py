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
)
from app.tools.rag_tools import rag_retrieval

logger = logging.getLogger(__name__)


# ==================== 子 Agent 系统提示词 ====================

SEARCH_PROMPT = """你是检索专家，专门负责地理要素检索和空间查询。

可用工具：
- feature_search: 按关键字搜索地理要素。支持 region 参数（auto/jingjin/changchun）
- spatial_query: 在指定几何范围内查询地物。支持 feature_type 过滤
- fly_to_location: 按地名定位地图

执行规则：
1. 根据任务描述选择合适的工具
2. 如果任务提到长春市地点，feature_search 必须传 region="changchun"
3. 工具返回的 geojson 会自动渲染到地图上
4. 执行完成后，简要总结检索结果（找到几个要素、主要名称等）
5. 不要编造结果，只基于工具返回的数据回答"""

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

ROUTE_PROMPT = """你是路径规划专家，专门负责最短路径和服务区分析。

可用工具：
- shortest_path: 在长春路网中计算多点间最短路径。参数 points 是 JSON 字符串，如 '[{"lng":125.3,"lat":43.8},{"lng":125.4,"lat":43.9}]'
- service_area: 分析中心点可达范围。参数 center 是 JSON 字符串，如 '{"lng":125.3,"lat":43.8}'，radius 单位米

执行规则：
1. 这些工具使用长春市路网，坐标范围约 125.15-125.45°E, 43.74-44.00°N
2. 如果任务需要地点坐标但没有提供，说明需要先获取坐标
3. points 和 center 参数请传 JSON 字符串格式
4. 工具返回的 geojson 会自动渲染到地图上
5. 执行完成后，总结路径结果（距离、路段数等）"""

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
            tools=[feature_search, spatial_query, fly_to_location],
            state_modifier=SEARCH_PROMPT,
        ),
        "analysis": create_react_agent(
            model=llm,
            tools=[buffer_analysis, overlay_analysis],
            state_modifier=ANALYSIS_PROMPT,
        ),
        "route": create_react_agent(
            model=llm,
            tools=[shortest_path, service_area],
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

                result_data, geojson, message, success = _parse_tool_output(tool_output)

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
    """解析工具输出，返回 (result_data, geojson, message, success)"""
    result_data = {}
    geojson = None
    message = ""
    success = True

    if isinstance(tool_output, str):
        try:
            parsed = json.loads(tool_output)
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

    return result_data, geojson, message, success


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
    elif tool_name == "rag_retrieval":
        return {"query": tool_input.get("query", ""), "top_k": tool_input.get("top_k", 3)}
    return {"raw": str(tool_input)[:200]}
