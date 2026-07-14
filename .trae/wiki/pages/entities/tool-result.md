---
title: 工具结果 schema
type: entity
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [entity, schema, tool, result]

references:
  - tools/gis-tools.md
  - tools/algo-tools.md
  - tools/rag-tools.md

related:
  - components/agent-graph.md

source:
  - agent-backend/app/schemas/tool_result.py

summary: 工具执行结果的统一格式定义，所有 GIS 工具和 RAG 工具的输出必须符合此契约
---

# 工具结果 schema

## 1. 概述

工具执行结果的统一格式定义，所有 GIS 工具和 RAG 工具的输出必须符合此契约。

## 2. 数据结构

```python
class ToolResult(BaseModel):
    success: bool              # 是否成功
    data: dict = {}            # 返回数据
    geojson: Optional[dict] = None  # GeoJSON 结果（可选）
    message: str = ""          # 提示信息
    error: Optional[str] = None     # 错误信息
```

## 3. GeoJSON 缓存机制

工具返回时把完整 geojson 存到线程级缓存（`threading.local`），避免 token 暴涨。

```python
# 存储
_set_pending_geojson(geojson)

# 取出
pop_pending_geojson()
```

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| 工具结果 schema | `agent-backend/app/schemas/tool_result.py` |
