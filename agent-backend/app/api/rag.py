"""
RAG 知识库 API 接口
P1 阶段实现，当前为占位
"""
from fastapi import APIRouter, UploadFile, File

router = APIRouter()


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """上传文档到知识库（P1 实现）"""
    return {"success": False, "message": "RAG 功能尚未实现，请等待 P1 阶段"}


@router.get("/search")
async def search(query: str, top_k: int = 3):
    """向量检索（P1 实现）"""
    return {"success": False, "message": "RAG 功能尚未实现", "documents": []}
