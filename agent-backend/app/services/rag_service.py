"""
RAG 知识库服务
使用 FAISS 向量库 + Embedding 模型实现文档索引与语义检索

Embedding 模型通过 .env 配置，兼容 OpenAI 格式的 API（如阿里云百炼、硅基流动等）
"""
import os
import glob
import logging
from typing import Optional
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from app.config import settings
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)


class RAGService:
    """RAG 向量检索服务（单例）"""

    def __init__(self):
        self._vectorstore: Optional[FAISS] = None
        self._text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=100,
            separators=["\n## ", "\n### ", "\n\n", "\n", "。", "；", " "],
        )
        self._indexed_docs: list[dict] = []  # 已索引文档元信息

    @property
    def vectorstore(self) -> Optional[FAISS]:
        return self._vectorstore

    def initialize(self):
        """
        初始化向量库：
        1. 检查本地持久化文件是否存在
        2. 存在则直接加载
        3. 不存在则从 knowledge_dir 读取 .md 文件并索引
        """
        vs_path = settings.vector_store_path
        index_file = os.path.join(vs_path, "index.faiss")

        if os.path.exists(index_file):
            # 加载已有向量库
            try:
                embeddings = LLMService.get_embedding_model()
                self._vectorstore = FAISS.load_local(
                    vs_path, embeddings, allow_dangerous_deserialization=True
                )
                logger.info(f"RAG 向量库已从 {vs_path} 加载")
                self._rebuild_indexed_docs()
                return
            except Exception as e:
                logger.warning(f"加载向量库失败，将重新索引: {e}")

        # 首次索引
        self._index_from_dir()

    def _index_from_dir(self):
        """从 knowledge_dir 读取所有 .md 文件并索引"""
        knowledge_dir = settings.knowledge_dir
        md_files = glob.glob(os.path.join(knowledge_dir, "*.md"))

        if not md_files:
            logger.warning(f"知识库目录 {knowledge_dir} 中没有 .md 文件")
            return

        documents = []
        for md_file in md_files:
            with open(md_file, "r", encoding="utf-8") as f:
                content = f.read()
            doc = Document(
                page_content=content,
                metadata={"source": os.path.basename(md_file), "file_path": md_file},
            )
            documents.append(doc)
            self._indexed_docs.append({
                "source": os.path.basename(md_file),
                "char_count": len(content),
            })

        # 分块
        chunks = self._text_splitter.split_documents(documents)
        logger.info(f"知识库索引：{len(md_files)} 个文件，分块为 {len(chunks)} 个片段")

        # 创建向量库
        embeddings = LLMService.get_embedding_model()
        self._vectorstore = FAISS.from_documents(chunks, embeddings)

        # 持久化
        self._save()
        logger.info(f"RAG 向量库已创建并保存到 {settings.vector_store_path}")

    def _rebuild_indexed_docs(self):
        """从已加载的向量库重建文档元信息"""
        sources = set()
        for doc_id, doc in self._vectorstore.docstore._dict.items():
            source = doc.metadata.get("source", "unknown")
            sources.add(source)
        self._indexed_docs = [{"source": s, "char_count": 0} for s in sorted(sources)]

    def _save(self):
        """持久化向量库"""
        if self._vectorstore:
            os.makedirs(settings.vector_store_path, exist_ok=True)
            self._vectorstore.save_local(settings.vector_store_path)

    def search(self, query: str, top_k: int = 3) -> list[dict]:
        """
        语义检索
        返回 [{"content": str, "metadata": dict, "score": float}]
        """
        if not self._vectorstore:
            return []

        results = self._vectorstore.similarity_search_with_score(query, k=top_k)
        return [
            {
                "content": doc.page_content,
                "metadata": doc.metadata,
                "source": doc.metadata.get("source", "未知"),
                "score": float(score),
            }
            for doc, score in results
        ]

    def add_text(self, content: str, metadata: dict = None) -> bool:
        """
        添加文本到知识库
        用于 API 上传文档时的动态索引
        """
        if not content or len(content) < 50:
            return False

        if not self._vectorstore:
            # 向量库未初始化，先初始化
            embeddings = LLMService.get_embedding_model()
            doc = Document(page_content=content, metadata=metadata or {})
            chunks = self._text_splitter.split_documents([doc])
            self._vectorstore = FAISS.from_documents(chunks, embeddings)
        else:
            doc = Document(page_content=content, metadata=metadata or {})
            chunks = self._text_splitter.split_documents([doc])
            self._vectorstore.add_documents(chunks)

        self._save()
        source = (metadata or {}).get("source", "uploaded")
        self._indexed_docs.append({"source": source, "char_count": len(content)})
        return True

    def get_indexed_docs(self) -> list[dict]:
        """获取已索引文档列表"""
        return list(self._indexed_docs)

    def is_ready(self) -> bool:
        """向量库是否就绪"""
        return self._vectorstore is not None


# 全局单例
rag_service = RAGService()
