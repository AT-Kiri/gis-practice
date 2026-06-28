"""
结果汇总节点
将各子 Agent 的执行结果汇总为最终回答
"""
import logging
from typing import AsyncGenerator
from langchain_core.messages import HumanMessage, SystemMessage
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

SUMMARIZE_SYSTEM_PROMPT = """你是应急管理系统的高级分析官，负责将多个子 Agent 的执行结果汇总为一份清晰、专业的综合报告。

汇总规则：
1. 按任务步骤顺序组织内容
2. 每步结果用简明扼要的语言描述
3. 如果涉及地图操作，说明结果已展示在地图上
4. 如果有知识检索结果，整合应急救援建议
5. 应急场景下，语气专业果断，给出明确的行动建议
6. 报告结构：灾情定位 → 影响评估 → 救援建议 → 路线规划（按实际执行步骤）
7. 不要编造数据，只基于实际结果总结
8. 适当使用 Markdown 格式（标题、列表、加粗）增强可读性"""


async def astream_summarize_results(
    user_input: str, step_results: list[dict]
) -> AsyncGenerator[str, None]:
    """
    流式汇总各步结果，生成最终回答（真流式 token 输出，消除首字延迟瓶颈）

    Args:
        user_input: 用户原始输入
        step_results: 每步的执行结果 [{agent_type, success, summary, ...}]
    Yields:
        文本 chunk，前端直接追加显示
    """
    llm = LLMService.get_chat_model(temperature=0.4)

    # 构建结果摘要
    results_text = []
    for i, r in enumerate(step_results, 1):
        status = "成功" if r.get("success") else "失败"
        results_text.append(f"步骤{i} [{r.get('agent_type', '?')}] ({status}): {r.get('summary', '无结果')}")

    context = f"用户需求: {user_input}\n\n各步执行结果:\n" + "\n".join(results_text)

    messages = [
        SystemMessage(content=SUMMARIZE_SYSTEM_PROMPT),
        HumanMessage(content=f"请根据以下执行结果生成综合报告：\n{context}"),
    ]

    try:
        async for chunk in llm.astream(messages):
            if chunk.content:
                yield chunk.content
    except Exception as e:
        logger.error(f"流式汇总失败: {e}")
        # fallback：拼接各步摘要
        fallback = "\n\n".join(r.get("summary", "") for r in step_results if r.get("summary"))
        if fallback:
            yield fallback
