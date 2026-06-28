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
- search: 检索专家。可调用 feature_search（专题检索）、spatial_query（空间查询）、fly_to_location（地图定位）
- analysis: 分析专家。可调用 buffer_analysis（缓冲区分析）、overlay_analysis（叠置分析）
- route: 路径专家。可调用 shortest_path（最短路径，长春路网）、service_area（服务区分析，长春路网）
- knowledge: 知识专家。可调用 rag_retrieval（应急救援知识库检索）

规划规则：
1. 最多 {MAX_STEPS} 步
2. 每步指定一个 agent_type 和 description
3. description 是给子 Agent 的具体指令，要清晰明确
4. 步骤之间有依赖关系时需顺序执行（如先搜索坐标再做缓冲区分析）
5. 区域选择规则（重要）：
   - 普通地点查询（如"朝阳区在哪""有哪些医院"）：用 region=jingjin（仅京津冀），不要查长春
   - 路径规划/服务区分析任务的起终点查询：用 region=changchun（仅长春），因为路网数据源是长春市
   - 不要在非路径任务中查询长春数据源
6. 路径规划需先搜索起点和终点的坐标（使用 region=changchun）

示例：
用户："朝阳区发生地震，评估灾情并规划救援路线"
计划：
1. search: "搜索朝阳区，获取其边界坐标和位置信息（region=jingjin）"
2. analysis: "对朝阳区做缓冲区分析，半径5000米，评估影响范围"
3. knowledge: "检索地震应急救援流程和处置方案"
4. route: "在长春市规划从南湖公园到吉林大学的最短路径（search 步骤用 region=changchun 查起终点）"

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
