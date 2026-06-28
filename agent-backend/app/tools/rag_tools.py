"""
RAG 工具
将知识库检索封装为 LangChain Tool，供 Agent 调用
"""
from langchain_core.tools import tool
from app.schemas.tool_result import ToolResult
from app.services.rag_service import rag_service


@tool
async def rag_retrieval(query: str, top_k: int = 3) -> dict:
    """
    知识检索：从应急救援知识库中检索相关文档片段。
    当用户询问应急救援方案、处置流程、预案内容等知识性问题时使用此工具。

    Args:
        query: 检索查询文本，如"地震救援流程"、"火灾疏散原则"
        top_k: 返回的相关文档数量，默认3
    """
    query = query.strip()
    if not query:
        return ToolResult(success=False, error="检索查询不能为空").to_dict()

    if not rag_service.is_ready():
        return ToolResult(success=False, error="知识库未初始化").to_dict()

    try:
        results = rag_service.search(query, top_k=top_k)

        if not results:
            return ToolResult(
                success=True,
                data={"documents": [], "count": 0},
                message="未找到相关知识",
            ).to_dict()

        # 格式化文档用于 LLM 阅读
        docs_text = []
        for i, r in enumerate(results, 1):
            docs_text.append(f"【文档{i}】来源: {r['source']}\n{r['content']}")

        return ToolResult(
            success=True,
            data={
                "documents": results,
                "count": len(results),
                "context": "\n\n".join(docs_text),
            },
            message=f"检索到 {len(results)} 条相关知识（来源：{', '.join(r['source'] for r in results[:2])}）",
        ).to_dict()

    except Exception as e:
        return ToolResult(success=False, error=f"知识检索失败: {e}").to_dict()


# 导出 RAG 工具列表
RAG_TOOLS = [rag_retrieval]
