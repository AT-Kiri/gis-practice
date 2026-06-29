"""
任务规划节点
根据意图和实体，生成多步任务计划
"""
import logging
from langchain_core.messages import HumanMessage, SystemMessage
from app.services.llm_service import LLMService
from app.agent.state import TaskPlan, MAX_STEPS, MAX_RETRY

logger = logging.getLogger(__name__)

PLANNER_SYSTEM_PROMPT = f"""你是一个任务规划器，负责将用户的复杂需求拆解为可执行的步骤列表。

可用子 Agent 类型：
- search: 检索专家。可调用 feature_search（专题检索，支持 region=jingjin/changchun）、spatial_query（空间查询）、fly_to_location（地图定位）、mock_nearby_resources（模拟周边资源点，仅当真实查询无结果时使用）
- analysis: 分析专家。可调用 buffer_analysis（缓冲区分析）、overlay_analysis（叠置分析）
- route: 路径专家。可调用 online_route_planning（在线路径规划，OSRM 公共服务，覆盖京津冀）、shortest_path（最短路径，仅长春路网）、service_area（服务区分析，仅长春路网）
- knowledge: 知识专家。可调用 rag_retrieval（应急救援知识库检索）

规划规则：
1. 最多 {MAX_STEPS} 步
2. 每步指定一个 agent_type 和 description
3. description 是给子 Agent 的具体指令，要清晰明确
4. 步骤之间有依赖关系时需顺序执行（如先搜索坐标再做缓冲区分析）
5. 区域选择规则（重要）：
   - 普通地点查询（如"朝阳区在哪""有哪些医院"）：用 region=jingjin（仅京津冀），不要查长春
   - 长春市内的路径规划/服务区分析任务的起终点查询：用 region=changchun（仅长春），因为 shortest_path/service_area 使用长春路网
   - 京津冀地区的救援路径规划：不要用 shortest_path（不支持），改用 online_route_planning（OSRM 公共服务，覆盖全球）
   - 不要在非路径任务中查询长春数据源
6. 数据传递规则（重要）：
   - 前序步骤的关键坐标和数据摘要会自动注入下一步 description，子 Agent 可直接复用，无需重复查询
   - 例如步骤1查到的"朝阳区"坐标，步骤2做缓冲区分析时可直接使用，无需重新查询
7. 复杂应急任务的推荐 7 步流程（适用于地震/火灾/洪水等灾害评估+救援场景）：
   步骤1 - search: 定位受灾地点（region=jingjin），获取名称和坐标
   步骤2 - analysis: 对受灾点做缓冲区分析（半径根据灾害类型选择，地震5000m、火灾2000m、洪水3000m）
   步骤3 - search: 查询缓冲区范围内的关键资源（医院/物资点/救援队等）。如果查不到真实数据，调用 mock_nearby_resources 生成模拟数据（必须告知用户是模拟数据）
   步骤4 - search: 从步骤3的结果中筛选最近的3条（不足3条取全部），作为救援推荐资源
   步骤5 - route: 对筛选出的资源点分别规划到受灾点的路径（京津冀用 online_route_planning，长春用 shortest_path）
   步骤6 - knowledge: 检索该类灾害的应急救援知识库内容（处置流程、预案等）
   步骤7 - knowledge: 综合前6步的结果，输出应急救援方案（含灾情评估、推荐救援资源、行进路线、处置建议）
8. 路径规划规则：
   - 京津冀地区（如朝阳区、丰台区等）：使用 online_route_planning，起点是受灾点，终点是资源点
   - 长春市内：使用 shortest_path，需先用 region=changchun 的 feature_search 查起终点坐标
   - 多个资源点：分别规划路径，得到多条推荐路线

示例：
用户："朝阳区发生地震，评估灾情并规划救援"
计划：
1. search: "搜索朝阳区，获取其位置坐标（region=jingjin）"
2. analysis: "对朝阳区做缓冲区分析，半径5000米，评估地震影响范围（复用步骤1坐标）"
3. search: "查询朝阳区周边5000米内的医院（spatial_query，feature_type=point）。如果无结果，调用 mock_nearby_resources(center=朝阳区坐标, resource_type=hospital, count=5) 生成模拟医院数据（必须告知用户是模拟数据）"
4. search: "从步骤3的医院列表中筛选距离朝阳区最近的3条（不足3条取全部）"
5. route: "对步骤4筛选出的医院，分别规划到朝阳区的行车路径（使用 online_route_planning，起终点复用前序坐标）"
6. knowledge: "检索地震应急救援流程、处置方案和应急预案"
7. knowledge: "综合前6步结果，输出朝阳区地震应急救援方案（含灾情评估、推荐医院、行进路线、处置建议）"

请根据用户需求生成合理的任务计划。"""


async def plan_tasks(intent: str, entities: dict, user_input: str) -> TaskPlan:
    """
    任务规划
    使用 with_structured_output 确保结构化输出
    """
    llm = LLMService.get_chat_model(temperature=0.2)
    structured_llm = llm.with_structured_output(TaskPlan)

    context = f"意图: {intent}\n实体: {entities}\n用户原始输入: {user_input}"

    messages = [
        SystemMessage(content=PLANNER_SYSTEM_PROMPT),
        HumanMessage(content=f"请为以下需求生成任务计划：\n{context}"),
    ]

    for attempt in range(MAX_RETRY):
        try:
            result = await structured_llm.ainvoke(messages)
            if isinstance(result, TaskPlan):
                # 截断超过 MAX_STEPS 的任务
                if len(result.tasks) > MAX_STEPS:
                    result.tasks = result.tasks[:MAX_STEPS]
                logger.info(f"任务规划成功（第{attempt+1}次）：{len(result.tasks)} 步")
                return result
            if isinstance(result, dict):
                plan = TaskPlan(**result)
                if len(plan.tasks) > MAX_STEPS:
                    plan.tasks = plan.tasks[:MAX_STEPS]
                return plan
        except Exception as e:
            logger.warning(f"任务规划第{attempt+1}次失败：{e}")
            if attempt == MAX_RETRY - 1:
                logger.error("任务规划全部失败，返回单步 fallback")
                return TaskPlan(
                    tasks=[{
                        "step": 1,
                        "agent_type": "search",
                        "description": user_input,
                        "tool_hint": "",
                    }],
                    summary="规划失败，降级为单步执行",
                )

    return TaskPlan(tasks=[], summary="规划失败")
