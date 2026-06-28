"""
RAG 知识库 API 接口
"""
import os
from fastapi import APIRouter, UploadFile, File, Form
from app.services.rag_service import rag_service

router = APIRouter()


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """上传文档到知识库并索引"""
    if not file.filename.endswith((".md", ".txt", ".markdown")):
        return {"success": False, "message": "仅支持 .md / .txt 文件"}

    content = (await file.read()).decode("utf-8")
    if len(content) < 50:
        return {"success": False, "message": "文档内容过短，无法索引"}

    metadata = {"source": file.filename}
    success = rag_service.add_text(content, metadata)

    return {
        "success": success,
        "message": f"文档 {file.filename} 已索引" if success else "索引失败",
        "char_count": len(content),
    }


@router.get("/search")
async def search(query: str, top_k: int = 3):
    """向量检索（调试用）"""
    if not rag_service.is_ready():
        return {"success": False, "message": "知识库未初始化", "documents": []}

    results = rag_service.search(query, top_k=top_k)
    return {
        "success": True,
        "query": query,
        "documents": results,
        "count": len(results),
    }


@router.get("/docs")
async def list_docs():
    """获取已索引文档列表"""
    return {
        "success": True,
        "docs": rag_service.get_indexed_docs(),
        "ready": rag_service.is_ready(),
    }
