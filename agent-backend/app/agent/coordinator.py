"""
Coordinator 主调度器
多智能体协同的核心：意图分类 → 任务规划 → 代码级路由 → 子 Agent 执行 → 结果汇总

设计决策：
- 不使用 LangGraph StateGraph 编译，改用 async function 顺序调度
- 等价于「代码级路由」（spec 场景 3 要求：不由 LLM 决定路由）
- 优势：流式 SSE 输出更自然、调试更方便、错误隔离更清晰
- 状态用本地变量维护，每个阶段 yield SSE 事件
"""
import json
import logging
from typing import AsyncGenerator
from langchain_core.messages import HumanMessage, SystemMessage
from app.agent.nodes.intent import classify_intent
from app.agent.nodes.planner import plan_tasks
from app.agent.nodes.summarize import astream_summarize_results
from app.agent.sub_agents.agents import execute_sub_agent
from app.agent.graph import stream_agent_events
from app.agent.state import MAX_STEPS
from app.services.llm_service import LLMService
from app.services.session_store import get_history, add_exchange

logger = logging.getLogger(__name__)


# ==================== 主流程 ====================

async def stream_coordinator_events(
    user_message: str,
    session_id: str = "default",
) -> AsyncGenerator[dict, None]:
    """
    Coordinator 主流程，生成 SSE 事件流

    事件类型:
    - agent_start: 开始执行
    - intent_classified: 意图分类完成
    - plan_created: 任务规划完成
    - step_start: 某步开始
    - tool_start: 工具开始调用（来自子 Agent）
    - tool_result: 工具执行完成（来自子 Agent）
    - step_done: 某步完成
    - text: 流式文本 token（最终汇总报告）
    - agent_end: 全部完成
    - error: 出错
    """
    yield {"event": "agent_start", "data": {"agent_name": "coordinator"}}

    # Q4-B 优化：明显闲聊直接回答，跳过意图分类（降低首字延迟）
    if _is_trivial_chat(user_message):
        async for event in _chat_respond(user_message, session_id):
            yield event
        return

    try:
        # 清理上一次请求残留的 inner Polygon 缓存，避免跨请求误 fallback
        from app.tools.gis_tools import clear_inner_polygon_context
        clear_inner_polygon_context()

        # ===== 阶段 1: 意图分类 =====
        intent_result = await classify_intent(user_message)
        yield {
            "event": "intent_classified",
            "data": {
                "intent": intent_result.intent,
                "entities": intent_result.entities,
                "reasoning": intent_result.reasoning,
            },
        }
        logger.info(
            f"[Coordinator] 意图: {intent_result.intent} | 实体: {intent_result.entities}"
        )

        # 闲聊意图：跳过规划，直接 LLM 简单回答
        if intent_result.intent == "chat":
            async for event in _chat_respond(user_message, session_id):
                yield event
            return

        # 双轨制：单一意图（search/analysis/route/knowledge）走单 Agent（P0 模式）
        # 只有 mixed（多领域协同）才走 Coordinator 多 Agent 流程
        if intent_result.intent in ("search", "analysis", "route", "knowledge"):
            logger.info(f"[Coordinator] 单一意图({intent_result.intent}) → 走单 Agent")
            async for event in stream_agent_events(user_message, session_id):
                # 过滤 agent_start（已在开头发过），转发 tool/text/agent_end 事件
                if event.get("event") != "agent_start":
                    yield event
            return

        # ===== 阶段 2: 任务规划 =====
        plan = await plan_tasks(
            intent_result.intent, intent_result.entities, user_message
        )
        tasks_serialized = [_task_to_dict(t) for t in plan.tasks]
        yield {
            "event": "plan_created",
            "data": {
                "tasks": tasks_serialized,
                "summary": plan.summary,
                "total_steps": len(plan.tasks),
                "intent": intent_result.intent,
            },
        }
        logger.info(f"[Coordinator] 任务计划: {len(plan.tasks)} 步")

        if not plan.tasks:
            # 空计划，降级到闲聊回答
            async for event in _chat_respond(user_message, session_id):
                yield event
            return

        # ===== 阶段 3: 顺序执行子 Agent（代码级路由） =====
        step_results: list[dict] = []
        total = len(plan.tasks)

        for idx, task in enumerate(plan.tasks):
            step_num = idx + 1
            agent_type = _get_field(task, "agent_type", "")
            description = _get_field(task, "description", "")

            # 注入前序步骤结果，让子 Agent 能复用坐标和数据（修复子 Agent 间数据传递缺陷）
            context = _build_step_context(step_results)
            full_description = f"{description}\n\n{context}" if context else description

            # 提取前序步骤的 inner Polygon 到 gis_tools 线程级缓存，
            # 当 LLM 传给 spatial_query 退化 Polygon 时自动 fallback（实测 LLM 自纠成功率仅 ~25%）
            _set_inner_polygon_fallback(step_results)

            yield {
                "event": "step_start",
                "data": {
                    "step": step_num,
                    "total": total,
                    "agent_type": agent_type,
                    "description": description,
                },
            }

            # 执行子 Agent，转发其事件
            step_summary = ""
            step_success = True
            step_geojson = None
            step_data_list: list[dict] = []  # Bug3 修复：改为 list，保留所有工具的 result
            # 步骤1受灾中心标记 flag：只标记第一个含 Point 的 geojson（feature_search 返回）
            disaster_center_marked = False

            async for sub_event in execute_sub_agent(agent_type, full_description):
                ev_type = sub_event.get("type")
                if ev_type == "tool_start":
                    yield {
                        "event": "tool_start",
                        "data": {
                            "step": step_num,
                            "tool_name": sub_event.get("tool_name", ""),
                            "input": sub_event.get("input", {}),
                        },
                    }
                elif ev_type == "tool_result":
                    geojson_to_send = sub_event.get("geojson")
                    # 步骤1：受灾地点 Point 在事件转发前就标记 _role='disaster_center'，
                    # 确保前端拿到的 geojson 已含标记，能正确染红。
                    # 用 flag 控制只标记第一个含 Point 的 geojson（feature_search 结果）
                    if (
                        step_num == 1
                        and geojson_to_send
                        and not disaster_center_marked
                        and _has_point_feature(geojson_to_send)
                    ):
                        _mark_disaster_center(geojson_to_send)
                        disaster_center_marked = True
                    if geojson_to_send:
                        step_geojson = geojson_to_send
                    if sub_event.get("result"):
                        step_data_list.append(sub_event["result"])
                    if not sub_event.get("success", True):
                        step_success = False
                    yield {
                        "event": "tool_result",
                        "data": {
                            "step": step_num,
                            "tool_name": sub_event.get("tool_name", ""),
                            "success": sub_event.get("success", False),
                            "result": sub_event.get("result", {}),
                            "geojson": geojson_to_send,
                            "message": sub_event.get("message", ""),
                        },
                    }
                elif ev_type == "done":
                    step_summary = sub_event.get("summary", "")
                    if not sub_event.get("success", True):
                        step_success = False

            # 兜底：步骤1若因故未在事件流中标记（如 tool_result 无 geojson），
            # 仍尝试在 step_results 备份中标记，保证后续步骤上下文能识别受灾中心
            if step_num == 1 and step_geojson and not disaster_center_marked:
                step_geojson = _mark_disaster_center(step_geojson)

            step_results.append({
                "agent_type": agent_type,
                "description": description,
                "success": step_success,
                "summary": step_summary,
                "geojson": step_geojson,
                "data_list": step_data_list,  # Bug3 修复：所有工具 result 列表
                "data": step_data_list[-1] if step_data_list else {},  # 兼容字段：取最后一个
            })

            yield {
                "event": "step_done",
                "data": {
                    "step": step_num,
                    "total": total,
                    "agent_type": agent_type,
                    "success": step_success,
                    "summary": step_summary,
                },
            }

            # 步数上限保护
            if step_num >= MAX_STEPS:
                logger.warning(f"[Coordinator] 达到最大步数 {MAX_STEPS}，强制退出")
                break

        # ===== 阶段 4: 结果汇总（真流式 token 输出，消除首字延迟瓶颈）=====
        final_answer_parts: list[str] = []
        try:
            async for chunk in astream_summarize_results(user_message, step_results):
                final_answer_parts.append(chunk)
                yield {"event": "text", "data": {"content": chunk}}
        except Exception as e:
            logger.error(f"汇总失败，使用 fallback: {e}")
            fallback = "\n\n".join(
                r.get("summary", "") for r in step_results if r.get("summary")
            )
            if fallback:
                final_answer_parts.append(fallback)
                yield {"event": "text", "data": {"content": fallback}}

        # 保存会话历史（仅纯文本，避免重复执行工具）
        add_exchange(session_id, user_message, "".join(final_answer_parts))

        yield {"event": "agent_end", "data": {}}

    except Exception as e:
        logger.exception(f"[Coordinator] 执行异常: {e}")
        yield {"event": "error", "data": {"message": str(e)}}


# ==================== 辅助函数 ====================

async def _chat_respond(
    user_message: str, session_id: str
) -> AsyncGenerator[dict, None]:
    """闲聊类意图：直接 LLM 回答，跳过规划和工具调用"""
    llm = LLMService.get_chat_model(temperature=0.5)
    history = get_history(session_id)

    messages = [
        SystemMessage(
            content=(
                "你是京津冀城市综合防灾应急管理系统的 AI 应急助手。"
                "请简洁友好地回答用户问题。如果用户的问题涉及 GIS 操作、"
                "空间分析、应急救援知识，可以提示用户更具体地描述需求。"
            )
        ),
    ] + history + [HumanMessage(content=user_message)]

    collected: list[str] = []
    try:
        async for chunk in llm.astream(messages):
            if chunk.content:
                collected.append(chunk.content)
                yield {"event": "text", "data": {"content": chunk.content}}
    except Exception as e:
        logger.error(f"闲聊回答失败: {e}")
        yield {
            "event": "text",
            "data": {"content": f"抱歉，回答时出现错误：{e}"},
        }

    add_exchange(session_id, user_message, "".join(collected))
    yield {"event": "agent_end", "data": {}}


def _task_to_dict(task) -> dict:
    """将 TaskStep 对象或 dict 统一转为 dict"""
    if hasattr(task, "model_dump"):
        return task.model_dump()
    if isinstance(task, dict):
        return task
    return {"description": str(task)}


def _get_field(task, field: str, default=""):
    """从 TaskStep 对象或 dict 中取字段"""
    if hasattr(task, field):
        return getattr(task, field, default)
    if isinstance(task, dict):
        return task.get(field, default)
    return default


def _set_inner_polygon_fallback(step_results: list[dict]):
    """从前序步骤结果中提取 inner Polygon（受灾圈），补充注入到 gis_tools 线程级缓存。
    当 LLM 传给 spatial_query 退化 Polygon 时，工具自动用此 Polygon fallback。

    【重要】此函数不清理缓存（不调 clear）！dual_buffer_analysis 工具内部已经设置了
    fallback（inner_geo），这里只是从 step_results 补充——如果工具设置的 fallback 丢了
    （如 geojson 被 pop 走），这里从 step_results 恢复。清理在外层 stream_coordinator_events
    开始时做，避免跨步骤误清。
    """
    from app.tools.gis_tools import set_inner_polygon_context
    for r in step_results:
        geojson = r.get("geojson")
        if not geojson or not isinstance(geojson, dict):
            continue
        for f in geojson.get("features") or []:
            if not isinstance(f, dict):
                continue
            props = f.get("properties") or {}
            if props.get("_bufferRole") == "inner":
                geom = f.get("geometry")
                if geom and geom.get("type") == "Polygon":
                    set_inner_polygon_context(geom)
                    return


def _build_step_context(step_results: list[dict]) -> str:
    """从前序步骤结果中提取关键信息（summary + 坐标 + 数据摘要），
    注入下一步子 Agent 的 description，修复子 Agent 间无法传递数据的缺陷。

    返回空字符串表示无可用上下文（第一步时）。

    Bug1 修复：坐标以多种格式注入（{"lng":...,"lat":...} 给 mock/online_route，
                {"type":"Point","coordinates":[...]} 给 buffer_analysis）
    Bug2 修复：Polygon 注入简化版完整 GeoJSON，供 spatial_query 直接使用
    Bug3 修复：遍历 data_list（一个步骤可能调用多个工具，保留所有工具 result）
    Bug7 修复：提取 mock 数据的 count / is_mock 字段
    问题3 优化：从第一步提取受灾点中心坐标，后续步骤的 Point 要素按到中心距离排序
    """
    if not step_results:
        return ""

    # 问题3：提取第一步的受灾点坐标作为中心点，用于后续步骤按距离排序
    center = _extract_center_from_step(step_results[0])

    lines = ["【前序步骤执行结果（请直接复用其中的坐标和数据，不要重复查询）】"]

    for i, r in enumerate(step_results, 1):
        agent_type = r.get("agent_type", "")
        description = r.get("description", "")
        summary = r.get("summary", "")
        data_list = r.get("data_list") or []
        geojson = r.get("geojson")

        lines.append(f"\n[步骤{i} - {agent_type}] {description}")

        # 1. 子 Agent 文本摘要
        if summary:
            lines.append(f"摘要: {summary}")

        # 2. 关键坐标（多格式注入 + Polygon 完整 GeoJSON）
        # 问题3：从第二步起传入 center，对 Point 要素按距离排序
        coords_text = _extract_coords_from_geojson(
            geojson, center=center if i > 1 else None
        )
        if coords_text:
            lines.append(f"关键坐标: {coords_text}")

        # 3. 数据摘要（遍历所有工具的 data，Bug3 修复）
        if len(data_list) == 1:
            data_summary = _extract_data_summary(data_list[0])
            if data_summary:
                lines.append(f"数据: {data_summary}")
            # 【单独行】inner_geometry_brief JSON 字符串，供 spatial_query 直接复制传给 geometry。
            # 不放入逗号分隔的"数据:"行（JSON 内含逗号会干扰 LLM 解析）。
            # 对齐 git HEAD 单缓冲区场景：LLM 直接读工具返回的 data.geometry_brief。
            _add_inner_geometry_brief(lines, data_list[0])
        elif len(data_list) > 1:
            for j, data in enumerate(data_list, 1):
                data_summary = _extract_data_summary(data)
                if data_summary:
                    lines.append(f"工具{j}数据: {data_summary}")
                _add_inner_geometry_brief(lines, data, prefix=f"工具{j}")

    return "\n".join(lines)


def _add_inner_geometry_brief(lines: list, data: dict, prefix: str = ""):
    """如果 data 含 inner_geometry_brief，以单独行的形式写入 lines。
    单独行（而非混入逗号分隔的"数据:"行）的原因是 JSON 值内包含逗号，
    LLM 在逗号分隔的上下文中难以准确识别 JSON 值的边界。
    """
    brief = data.get("inner_geometry_brief") if isinstance(data, dict) else None
    if brief:
        tag = f"{prefix}inner_geometry_brief" if prefix else "inner_geometry_brief"
        lines.append(f"  {tag}: {brief}")


def _extract_center_from_step(step: dict):
    """从某个步骤的 geojson 中提取中心坐标（Point 直接取，Polygon 取质心）。
    返回 (lng, lat) 元组，提取失败返回 None。
    """
    geojson = step.get("geojson") if isinstance(step, dict) else None
    if not geojson or not isinstance(geojson, dict):
        return None
    features = geojson.get("features") or []
    if not features:
        return None
    # 取第一个要素作为中心
    f = features[0]
    if not isinstance(f, dict):
        return None
    geom = f.get("geometry")
    if not geom:
        return None
    gtype = geom.get("type")
    coordinates = geom.get("coordinates")
    if not coordinates:
        return None
    try:
        if gtype == "Point":
            return (float(coordinates[0]), float(coordinates[1]))
        if gtype == "Polygon":
            ring = coordinates[0] if isinstance(coordinates[0][0], (list, tuple)) else coordinates
            if ring:
                avg_lng = sum(p[0] for p in ring) / len(ring)
                avg_lat = sum(p[1] for p in ring) / len(ring)
                return (avg_lng, avg_lat)
    except (IndexError, TypeError, ValueError):
        return None
    return None


def _haversine_km(lng1, lat1, lng2, lat2) -> float:
    """计算两点间球面距离（公里），用于 Point 要素排序。"""
    R = 6371.0
    import math as _math
    rl1 = _math.radians(lat1)
    rl2 = _math.radians(lat2)
    dlat = _math.radians(lat2 - lat1)
    dlng = _math.radians(lng2 - lng1)
    a = _math.sin(dlat / 2) ** 2 + _math.cos(rl1) * _math.cos(rl2) * _math.sin(dlng / 2) ** 2
    return 2 * R * _math.asin(_math.sqrt(a))


def _extract_coords_from_geojson(geojson, center=None) -> str:
    """从 GeoJSON FeatureCollection 中提取关键坐标供下一步复用。

    Bug1 修复：Point 同时注入两种格式：
      - {"lng":...,"lat":...}（给 mock_nearby_resources / online_route_planning）
      - {"type":"Point","coordinates":[...]}（给 buffer_analysis）
    Bug2 修复：Polygon 注入简化版完整 GeoJSON（最多20个点），供 spatial_query 直接使用
    问题3 优化：当 center 不为 None 时，Point 要素按到 center 的距离升序排序，
                并在名称后标注距离，便于 LLM 优先选择最近的资源点

    最多提取前 5 个要素的坐标，避免上下文过长。
    """
    if not geojson or not isinstance(geojson, dict):
        return ""
    features = geojson.get("features") or []
    if not features:
        return ""

    # 问题3：当传入 center 时，先把所有 Point 要素按距离排序
    point_items = []  # [(feature, distance_km), ...]
    other_items = []  # 非 Point 要素保留原顺序
    for f in features:
        if not isinstance(f, dict):
            continue
        geom = f.get("geometry")
        if not geom or not geom.get("type"):
            continue
        gtype = geom.get("type")
        coordinates = geom.get("coordinates")
        if not coordinates:
            continue
        if gtype == "Point" and center:
            try:
                lng, lat = float(coordinates[0]), float(coordinates[1])
                dist = _haversine_km(center[0], center[1], lng, lat)
                point_items.append((f, dist))
            except (IndexError, TypeError, ValueError):
                other_items.append((f, None))
        else:
            other_items.append((f, None))

    # 问题3：Point 按距离升序排序，最近的在前
    if point_items:
        point_items.sort(key=lambda x: x[1])
        # 最多保留前 5 个 Point（按距离）
        sorted_features = [f for f, _ in point_items[:5]] + [f for f, _ in other_items[:5]]
    else:
        sorted_features = [f for f, _ in other_items[:5]]

    # 构建距离查找表（用于在名称后标注距离）
    dist_map = {}
    if point_items:
        for f, d in point_items[:5]:
            dist_map[id(f)] = d

    coords_list = []

    for f in sorted_features:
        geom = f.get("geometry")
        if not geom:
            continue
        gtype = geom.get("type")
        coordinates = geom.get("coordinates")
        if not coordinates:
            continue

        props = f.get("properties") or {}
        name = props.get("_displayName") or props.get("NAME") or ""
        is_mock = props.get("_mock") is True
        mock_tag = "[模拟]" if is_mock else ""
        # 问题3：附加距离标注
        dist_tag = ""
        if id(f) in dist_map:
            dist_tag = f"({dist_map[id(f)]:.2f}km)"

        try:
            if gtype == "Point":
                lng, lat = coordinates[0], coordinates[1]
                # Bug1: 同时给两种格式，LLM 可直接复制使用
                coords_list.append(
                    f'{name}{mock_tag}{dist_tag}: {{"lng":{lng},"lat":{lat}}} '
                    f'(或 GeoJSON: {{"type":"Point","coordinates":[{lng},{lat}]}})'
                )
            elif gtype == "LineString" and coordinates:
                first = coordinates[0]
                last = coordinates[-1]
                coords_list.append(
                    f'{name}{mock_tag}起点: {{"lng":{first[0]},"lat":{first[1]}}}, '
                    f'终点: {{"lng":{last[0]},"lat":{last[1]}}}'
                )
            elif gtype == "Polygon" and coordinates:
                # Bug2: 质心 + 简化版完整 GeoJSON
                ring = coordinates[0] if isinstance(coordinates[0][0], (list, tuple)) else coordinates
                if ring:
                    avg_lng = sum(p[0] for p in ring) / len(ring)
                    avg_lat = sum(p[1] for p in ring) / len(ring)
                    # 双缓冲区：按 _bufferRole 标注角色（inner=受灾圈/outer=支援圈）
                    props = f.get("properties") or {}
                    role = props.get("_bufferRole", "")
                    role_tag = f"[{role}]" if role else ""
                    coords_list.append(
                        f'{name}{mock_tag}{role_tag}质心: {{"lng":{avg_lng:.6f},"lat":{avg_lat:.6f}}}'
                    )
        except (IndexError, TypeError, ValueError):
            continue

    result = "; ".join(coords_list)

    # 问题3：当 Point 已按距离排序时，提示 LLM 优先选最近的
    if point_items and center:
        result = "[已按到受灾点距离从近到远排序，路径规划请优先取前2条] " + result

    return result


def _mark_disaster_center(geojson) -> dict:
    """给步骤1 search 返回的第一个 Point feature 标记 _role='disaster_center'。
    前端按此标记将受灾中心圆点染红，与 spatial_query 返回的普通点要素（琥珀色）区分。
    双缓冲区场景下，受灾中心 Point 也是路径规划的终点。
    """
    if not geojson or not isinstance(geojson, dict):
        return geojson
    features = geojson.get("features") or []
    for f in features:
        if not isinstance(f, dict):
            continue
        geom = f.get("geometry")
        if geom and geom.get("type") == "Point":
            props = f.get("properties") or {}
            props["_role"] = "disaster_center"
            f["properties"] = props
            break  # 只标记第一个 Point
    return geojson


def _has_point_feature(geojson) -> bool:
    """判断 GeoJSON FeatureCollection 是否含至少一个 Point feature。
    用于步骤1筛选含受灾地点 Point 的 geojson（跳过 fly_to_location 等无 geojson 的工具结果）。
    """
    if not geojson or not isinstance(geojson, dict):
        return False
    for f in geojson.get("features") or []:
        if isinstance(f, dict) and f.get("geometry", {}).get("type") == "Point":
            return True
    return False


def _extract_data_summary(data: dict) -> str:
    """从工具返回的 data 字段中提取关键摘要信息。
    Bug7 修复：新增 count / is_mock / resource_type 字段提取（mock_nearby_resources 返回）
    """
    if not data or not isinstance(data, dict):
        return ""

    parts = []
    if "total" in data:
        parts.append(f"total={data['total']}")
    if "count" in data:  # Bug7: mock_nearby_resources 返回
        parts.append(f"count={data['count']}")
    if "is_mock" in data:  # Bug7: 标记是否模拟数据
        parts.append(f"is_mock={data['is_mock']}")
    if "resource_type" in data:
        parts.append(f"resource_type={data['resource_type']}")
    if "bufferDistance" in data:
        parts.append(f"bufferDistance={data['bufferDistance']}m")
    # 双缓冲区半径（dual_buffer_analysis 返回），供后续步骤 mock_nearby_resources 复用
    if "inner_distance" in data:
        parts.append(f"inner_distance={data['inner_distance']}m")
    if "outer_distance" in data:
        parts.append(f"outer_distance={data['outer_distance']}m")
    # 受灾中心坐标，步骤4 mock_nearby_resources 的 center 参数 + 步骤5 路径规划终点
    if "center" in data and isinstance(data["center"], dict):
        c = data["center"]
        parts.append(f"center={{\"lng\":{c.get('lng', 0)},\"lat\":{c.get('lat', 0)}}}")
    if "distance_km" in data:
        parts.append(f"distance_km={data['distance_km']}")
    if "duration_min" in data:
        parts.append(f"duration_min={data['duration_min']}")
    if "is_fallback" in data:  # online_route_planning 降级标记
        parts.append(f"is_fallback={data['is_fallback']}")
    if "serviceAreaCount" in data:
        parts.append(f"serviceAreaCount={data['serviceAreaCount']}")

    # 要素列表摘要（只取前 3 个名字，避免上下文膨胀）
    features = data.get("features")
    if isinstance(features, list) and features:
        names = []
        for f in features[:3]:
            if isinstance(f, dict):
                n = f.get("displayName") or f.get("dataset") or ""
                if n:
                    names.append(n)
        if names:
            suffix = "..." if len(features) > 3 else ""
            parts.append(f"features=[{','.join(names)}{suffix}]")

    # 数据集统计
    counts = data.get("datasetCounts")
    if isinstance(counts, dict) and counts:
        items = [f"{k}:{v}" for k, v in list(counts.items())[:5]]
        parts.append(f"datasetCounts={{{','.join(items)}}}")

    return ", ".join(parts)


# 明显闲聊前缀（保守匹配，避免误判 GIS 查询）
_TRIVIAL_CHAT_PREFIXES = ("你好", "您好", "嗨", "哈喽", "再见", "拜拜", "谢谢", "感谢")
_TRIVIAL_CHAT_KEYWORDS = ("你是谁", "你叫什么", "你能做什么", "自我介绍", "我叫")
# GIS 关键词：含此类词的消息不走闲聊快速通道
_GIS_KEYWORDS = (
    "朝阳", "地震", "火灾", "洪水", "路径", "最短", "缓冲", "分析", "查询", "在哪",
    "搜索", "公园", "医院", "学校", "道路", "河流", "京津冀", "长春", "救援", "服务区",
    "叠置", "图层", "地图", "定位", "灾区", "应急",
)


def _is_trivial_chat(message: str) -> bool:
    """判断是否为明显闲聊（短消息 + 问候/自我介绍关键词，且不含 GIS 关键词）。
    命中则跳过意图分类，直接走流式闲聊回答，降低首字延迟。
    """
    msg = message.strip()
    if len(msg) > 20:
        return False
    # 含 GIS 关键词的，一律走正常流程
    if any(kw in msg for kw in _GIS_KEYWORDS):
        return False
    if any(msg.startswith(p) for p in _TRIVIAL_CHAT_PREFIXES):
        return True
    if any(kw in msg for kw in _TRIVIAL_CHAT_KEYWORDS):
        return True
    return False
