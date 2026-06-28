"""
LLM 服务封装
单点封装，隔离底层 API 差异，业务代码不直接依赖具体构造器细节
"""
from langchain_openai import ChatOpenAI
from app.config import settings


class LLMService:
    """统一的 LLM 服务封装"""

    @classmethod
    def get_chat_model(cls, temperature: float = 0.3, **kwargs) -> ChatOpenAI:
        """
        获取聊天模型实例
        统一使用 DeepSeek 兼容 OpenAI 格式的 API
        """
        return ChatOpenAI(
            model=settings.deepseek_model,
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
            temperature=temperature,
            **kwargs,
        )

    @classmethod
    def get_embedding_model(cls):
        """获取 Embedding 模型（用于 RAG）"""
        from langchain_openai import OpenAIEmbeddings
        return OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=settings.embedding_api_key or settings.deepseek_api_key,
            base_url=settings.embedding_base_url or settings.deepseek_base_url,
        )
