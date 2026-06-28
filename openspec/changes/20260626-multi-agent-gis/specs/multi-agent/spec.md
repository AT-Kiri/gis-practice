# Spec: 多智能体协同（Multi-Agent）

> 模块：LangGraph StateGraph + 子 Agent 子图
> 原则：结构化契约 + 代码级调度 + 收敛循环

---

## 场景 1：意图分类节点

### Given-When-Then

#### 正常场景：检索类意图
- **Given** 用户输入"朝阳区在哪"
- **When** Coordinator 图执行 intent_classify 节点
- **Then**
  - LLM 输出结构化 JSON：`{"intent": "search", "entities": {"location": "朝阳区"}}`
  - 输出必须通过 JSON Schema 校验
  - intent 只能取枚举值：`search` / `analysis` / `route` / `knowledge` / `mixed`

#### 正常场景：混合类意图（应急场景）
- **Given** 用户输入"朝阳区发生地震，评估灾情并规划救援路线"
- **When** 执行 intent_classify 节点
- **Then**
  - 返回 `intent: "mixed"`
  - `entities` 中提取出 `location: "朝阳区"`, `disaster: "地震"`

#### 异常场景：LLM 输出不符合 Schema
- **Given** LLM 返回了非 JSON 格式或缺少必须字段
- **When** 执行 intent_classify 节点
- **Then**
  - 自动重试，最多 3 次
  - 每次重试时在 prompt 中追加错误信息和 Schema 示例
  - 3 次都失败则走 fallback：标记为 `intent: "unknown"`，直接转纯文本回答

---

## 场景 2：任务规划节点

### Given-When-Then

#### 正常场景：单步任务（简单检索）
- **Given** intent = "search", entities = { location: "朝阳区" }
- **When** 执行 task_planner 节点
- **Then**
  - 生成 `task_plan` 列表，包含 1 个任务：
  ```json
  [
    {
      "step": 1,
      "agent_type": "search",
      "description": "搜索朝阳区并定位",
      "tool": "feature_search",
      "params": { "keyword": "朝阳区", "level": "county" }
    }
  ]
  ```
  - 输出通过 TaskPlan JSON Schema 校验

#### 正常场景：多步任务（应急场景）
- **Given** intent = "mixed", entities = { location: "朝阳区", disaster: "地震" }
- **When** 执行 task_planner 节点
- **Then**
  - 生成多步 task_plan，例如：
    1. SearchAgent: 搜索朝阳区范围
    2. AnalysisAgent: 做缓冲区分析评估影响范围
    3. KnowledgeAgent: 检索地震救援方案
    4. RouteAgent: 规划最近救援路线（可选，需要知道医院位置）
  - 每步包含 `agent_type`、`description`、`tool`、`params`
  - 任务间有明确的依赖关系（顺序执行）

#### 约束：任务数量上限
- **Given** 任意用户输入
- **When** 生成 task_plan
- **Then**
  - 任务数量不超过 5 步
  - 超过则截断或合并

---

## 场景 3：子 Agent 调度（代码级路由）

### Given-When-Then

#### 正常场景：调度 SearchAgent
- **Given** current_step 指向 agent_type = "search" 的任务
- **When** Coordinator 图执行 route_agent 节点
- **Then**
  - 代码路由到 SearchAgent 子图，**不由 LLM 决定**
  - 传入当前任务的 params 和全局状态
  - 子图执行完成后，结果合并回全局状态

#### 正常场景：顺序执行多步
- **Given** task_plan 有 3 个任务
- **When** Coordinator 循环执行
- **Then**
  - 按顺序执行第 1、2、3 步
  - 每步完成后更新 `current_step`
  - 每步结果都作为 tool_event 推送到前端
  - 前端分步渲染结果到地图

#### 约束：最大步数保护
- **Given** 执行循环
- **When** 已执行 10 步仍未完成
- **Then**
  - 强制退出循环
  - final_answer 中说明"已达到最大执行步数，部分任务未完成"
  - 已完成的结果仍然有效

---

## 场景 4：子 Agent 输出契约

### Given-When-Then

#### SearchAgent 输出契约
- **Given** SearchAgent 子图执行完成
- **When** 返回结果到 Coordinator
- **Then**
  - 必须返回：`{ search_results: [...], search_geojson: {...}, search_summary: "..." }`
  - 所有字段必须存在，空结果也给空数组/对象
  - Coordinator 按固定字段名读取，不做自由解析

#### AnalysisAgent 输出契约
- **Given** AnalysisAgent 子图执行完成
- **When** 返回结果到 Coordinator
- **Then**
  - 必须返回：`{ analysis_results: [...], analysis_geojson: {...}, analysis_summary: "..." }`

#### RouteAgent 输出契约
- **Given** RouteAgent 子图执行完成
- **When** 返回结果到 Coordinator
- **Then**
  - 必须返回：`{ route_results: [...], route_geojson: {...}, route_summary: "..." }`

#### KnowledgeAgent 输出契约
- **Given** KnowledgeAgent 子图执行完成
- **When** 返回结果到 Coordinator
- **Then**
  - 必须返回：`{ knowledge_context: [...], knowledge_answer: "..." }`

---

## 场景 5：结果汇总节点

### Given-When-Then

#### 正常场景：单任务汇总
- **Given** 只有一步搜索任务已完成
- **When** 执行 summarize 节点
- **Then**
  - LLM 基于 search_results 生成自然语言回答
  - 回答中包含：找到的结果数量、主要要素名称
  - 同时保留所有 tool_result 的 GeoJSON 供前端渲染

#### 正常场景：多任务汇总（应急报告）
- **Given** 搜索、分析、路径任务都已完成
- **When** 执行 summarize 节点
- **Then**
  - 生成结构化的综合报告
  - 按步骤说明：灾情定位 → 影响范围 → 救援建议 → 路线规划
  - 语气专业，符合应急指挥场景

---

## 场景 6：收敛循环（待扩展，P2）

> 算法层预留，本期不实现核心逻辑，仅保留接口

### 设计说明
- 当某个 Agent 的结果不满足条件时（如资源匹配未收敛），可以循环优化
- 循环次数上限可配置（默认 3 次）
- 循环条件由代码判断，不由 LLM 判断
- 预留算法接口：`pareto_optimize()`、`aco_route()`
