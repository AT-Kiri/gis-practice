---
title: 意图分类节点 intent
type: component
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [component, agent, intent, nlp, llm]

references:
  - components/agent-coordinator.md
  - pages/components/agent-store

source:
  - agent-backend/app/agent/nodes/intent.py

summary: 语义理解层核心，基于 LLM 实现六类意图分类与实体抽取
---

# 意图分类节点 intent

## 1. 定位

语义理解层核心组件，基于 DeepSeek LLM 实现自然语言意图识别与实体抽取，是 Coordinator 调度流程的第二阶段。

## 2. 意图类型（6 类）

| 意图 | 说明 | 典型输入 |
|------|------|---------|
| `search` | 地理要素检索 | "查找北京市朝阳区附近的医院" |
| `analysis` | 空间分析 | "分析某区域洪水影响范围" |
| `route` | 路径规划 | "从 A 到 B 怎么走" |
| `knowledge` | 应急知识查询 | "地震救援流程是什么" |
| `mixed` | 综合任务 | "查询周边医院并规划救援路线" |
| `chat` | 闲聊 | "你好" |

## 3. 实体抽取

自动从用户输入提取关键实体：

| 实体 | 说明 | 示例 |
|------|------|------|
| `location` | 地名实体 | "北京市朝阳区"、"南湖公园" |
| `disaster` | 灾害类型 | "地震"、"洪水"、"火灾" |
| `radius` | 半径参数 | "周边 500 米"、"3 公里内" |
| `dataset` | 数据集类型 | "医院"、"道路"、"河流" |
| `level` | 行政级别 | "省级"、"县级"、"乡镇" |
| `region` | 搜索区域 | "jingjin"、"changchun"、"auto" |

## 4. Schema 校验

使用 Pydantic 强约束 Schema，DeepSeek-V3.2 返回不合规时自动重试（最多 3 次）。

```python
class IntentResult(BaseModel):
    intent: Literal["search", "analysis", "route", "knowledge", "mixed", "chat"]
    entities: dict
    reasoning: str
```

## 5. 代码位置

| 文件 | 路径 |
|------|------|
| 意图分类节点 | `agent-backend/app/agent/nodes/intent.py` |
