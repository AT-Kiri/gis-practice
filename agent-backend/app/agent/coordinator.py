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
            step_data: dict = {}

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
                    if sub_event.get("geojson"):
                        step_geojson = sub_event["geojson"]
                    if sub_event.get("result"):
                        step_data = sub_event["result"]
                    if not sub_event.get("success", True):
                        step_success = False
                    yield {
                        "event": "tool_result",
                        "data": {
                            "step": step_num,
                            "tool_name": sub_event.get("tool_name", ""),
                            "success": sub_event.get("success", False),
                            "result": sub_event.get("result", {}),
                            "geojson": sub_event.get("geojson"),
                            "message": sub_event.get("message", ""),
                        },
                    }
                elif ev_type == "done":
                    step_summary = sub_event.get("summary", "")
                    if not sub_event.get("success", True):
                        step_success = False

            step_results.append({
                "agent_type": agent_type,
                "description": description,
                "success": step_success,
                "summary": step_summary,
                "geojson": step_geojson,
                "data": step_data,
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


def _build_step_context(step_results: list[dict]) -> str:
    """从前序步骤结果中提取关键信息（summary + 坐标 + 数据摘要），
    注入下一步子 Agent 的 description，修复子 Agent 间无法传递数据的缺陷。

    返回空字符串表示无可用上下文（第一步时）。
    """
    if not step_results:
        return ""

    lines = ["【前序步骤执行结果（请直接复用其中的坐标和数据，不要重复查询）】"]

    for i, r in enumerate(step_results, 1):
        agent_type = r.get("agent_type", "")
        description = r.get("description", "")
        summary = r.get("summary", "")
        data = r.get("data") or {}
        geojson = r.get("geojson")

        lines.append(f"\n[步骤{i} - {agent_type}] {description}")

        # 1. 子 Agent 文本摘要
        if summary:
            lines.append(f"摘要: {summary}")

        # 2. 关键坐标（从 geojson 提取 Point / Polygon 质心 / LineString 端点）
        coords_text = _extract_coords_from_geojson(geojson)
        if coords_text:
            lines.append(f"关键坐标: {coords_text}")

        # 3. 数据摘要（total / bufferDistance / distance_km 等）
        data_summary = _extract_data_summary(data)
        if data_summary:
            lines.append(f"数据: {data_summary}")

    return "\n".join(lines)


def _extract_coords_from_geojson(geojson) -> str:
    """从 GeoJSON FeatureCollection 中提取关键坐标供下一步复用。
    - Point: 直接取坐标
    - LineString: 取起点和终点
    - Polygon: 计算质心
    最多提取前 5 个要素的坐标，避免上下文过长。
    """
    if not geojson or not isinstance(geojson, dict):
        return ""
    features = geojson.get("features") or []
    if not features:
        return ""

    coords_list = []
    for f in features[:5]:
        if not isinstance(f, dict):
            continue
        geom = f.get("geometry")
        if not geom:
            continue
        gtype = geom.get("type")
        coordinates = geom.get("coordinates")
        if not coordinates:
            continue

        props = f.get("properties") or {}
        name = props.get("_displayName") or props.get("NAME") or ""

        try:
            if gtype == "Point":
                lng, lat = coordinates[0], coordinates[1]
                coords_list.append(
                    f"{name}({lng:.6f},{lat:.6f})" if name else f"({lng:.6f},{lat:.6f})"
                )
            elif gtype == "LineString" and coordinates:
                first = coordinates[0]
                last = coordinates[-1]
                coords_list.append(
                    f"{name}起点({first[0]:.6f},{first[1]:.6f})-终点({last[0]:.6f},{last[1]:.6f})"
                )
            elif gtype == "Polygon" and coordinates:
                # Polygon.coordinates[0] 是外环
                ring = coordinates[0] if isinstance(coordinates[0][0], (list, tuple)) else coordinates
                if ring:
                    avg_lng = sum(p[0] for p in ring) / len(ring)
                    avg_lat = sum(p[1] for p in ring) / len(ring)
                    coords_list.append(f"{name}质心({avg_lng:.6f},{avg_lat:.6f})")
        except (IndexError, TypeError, ValueError):
            continue

    return "; ".join(coords_list)


def _extract_data_summary(data: dict) -> str:
    """从工具返回的 data 字段中提取关键摘要信息。
    只提取对下一步有用的字段：total / bufferDistance / 路径距离时长 / 要素名列表。
    """
    if not data or not isinstance(data, dict):
        return ""

    parts = []
    if "total" in data:
        parts.append(f"total={data['total']}")
    if "bufferDistance" in data:
        parts.append(f"bufferDistance={data['bufferDistance']}m")
    if "distance_km" in data:
        parts.append(f"distance_km={data['distance_km']}")
    if "duration_min" in data:
        parts.append(f"duration_min={data['duration_min']}")
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
