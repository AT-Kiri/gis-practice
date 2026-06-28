"""
意图分类节点
使用 LLM + 结构化输出，识别用户意图并提取实体
"""
import logging
from langchain_core.messages import HumanMessage, SystemMessage
from app.services.llm_service import LLMService
from app.agent.state import IntentResult, MAX_RETRY

logger = logging.getLogger(__name__)

INTENT_SYSTEM_PROMPT = """你是一个意图分类器，负责分析用户的自然语言输入，识别其意图类型并提取关键实体。

意图类型说明：
- search: 检索类。用户想查找地点、了解某地有什么、查询要素信息
- analysis: 分析类。用户想做缓冲区分析、叠置分析、空间查询等空间分析
- route: 路径类。用户想规划路径、最短路径、服务区分析
- knowledge: 知识类。用户询问应急救援知识、处置流程、预案内容
- mixed: 混合类。用户的需求涉及多个领域（如"朝阳区地震，评估灾情并规划救援路线"）
- chat: 闲聊类。不涉及 GIS 操作或知识检索的普通对话

实体提取规则：
- location: 用户提到的地点名称
- disaster: 灾害类型（地震/洪水/火灾/医疗等）
- radius: 半径/距离（单位米，纯数字）
- dataset: 数据集名称
- other: 其他关键参数

请准确分类并提取实体。"""


async def classify_intent(user_input: str) -> IntentResult:
    """
    意图分类
    使用 with_structured_output 确保结构化输出
    失败时自动重试，最多 MAX_RETRY 次
    """
    llm = LLMService.get_chat_model(temperature=0.1)
    structured_llm = llm.with_structured_output(IntentResult)

    messages = [
        SystemMessage(content=INTENT_SYSTEM_PROMPT),
        HumanMessage(content=f"用户输入：{user_input}"),
    ]

    for attempt in range(MAX_RETRY):
        try:
            result = await structured_llm.ainvoke(messages)
            if isinstance(result, IntentResult):
                logger.info(f"意图分类成功（第{attempt+1}次）：{result.intent} | entities={result.entities}")
                return result
            # 某些版本返回 dict
            return IntentResult(**result) if isinstance(result, dict) else result
        except Exception as e:
            logger.warning(f"意图分类第{attempt+1}次失败：{e}")
            if attempt == MAX_RETRY - 1:
                # 最后一次仍失败，返回 fallback
                logger.error("意图分类全部失败，使用 fallback")
                return IntentResult(intent="chat", entities={}, reasoning=f"分类失败: {e}")

    return IntentResult(intent="chat", entities={})
