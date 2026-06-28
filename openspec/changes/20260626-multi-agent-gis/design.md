# Design: 多智能体协同 GIS 应急助手

## 1. Context（上下文）

### 1.1 现状
- **前端**：Vue 3 + Pinia + Ant Design Vue + MapboxGL + SuperMap iClient
  - 各功能组件独立（FeatureSearch、SpatialQuery、SpatialAnalysis、NetworkAnalysis）
  - 地图实例通过 Pinia store 共享
  - GIS 操作直接在组件内实现，UI 与业务逻辑耦合
- **后端**：SpringBoot（当前仅有健康检查等简单接口）
- **数据**：SuperMap iServer 11i 提供 GIS 服务（京津冀数据 + 长春路网）

### 1.2 约束
- LLM：DeepSeek-V4-Flash（纯文本推理，足够用，不需要多模态）
- 后端技术栈：FastAPI + LangChain + LangGraph
- 多智能体采用**强约束方案**：结构化契约 + 代码级调度 + 收敛循环
- 算法层：先架构预留，后续锦上添花

### 1.3 核心难点
Agent 如何操作前端 GIS 功能？这是最关键的设计决策，详见 §3.1。

---

## 2. Goals / Non-Goals（目标与边界）

### 2.1 Goals
| 目标 | 优先级 | 说明 |
|------|--------|------|
| 对话式 GIS 操作 | P0 | 用户用自然语言就能做专题检索、空间分析、网络分析 |
| 分步可视化 | P0 | 每步分析结果实时标绘到地图，过程透明 |
| 多智能体协同 | P1 | Coordinator + 专业子 Agent，结构化调度 |
| RAG 知识库 | P1 | 应急救援方案可被检索，增强回答准确性 |
| 算法层预留 | P2 | Pareto / ACO 接口预留，暂不实现核心逻辑 |

### 2.2 Non-Goals
- ❌ 不做语音交互
- ❌ 不做 3D 场景的 Agent 操作
- ❌ 不做用户认证和权限管理（课设阶段）
- ❌ 不做多轮对话的长期记忆持久化（仅会话内上下文）
- ❌ 不做移动端适配

---

## 3. Decisions（方案对比与选型）

### 3.1 核心决策：Agent 如何操作 GIS 功能？

**问题**：现有 GIS 功能（专题检索、缓冲区分析等）的业务逻辑都写在 Vue 组件里，Agent 运行在后端，怎么调用？

#### 方案对比

| 方案 | 思路 | 优点 | 缺点 |
|------|------|------|------|
| **A. 后端重写 GIS 逻辑** | 后端用 SuperMap iClient Python 或直接调 iServer REST API，Agent 在后端直接执行 GIS 操作，结果返回前端渲染 | 职责清晰，Agent 直接可控 | 重复实现前端已有逻辑，前后端两套代码维护成本高 |
| **B. 前端提供 Tool API** | 前端把 GIS 操作封装为可调用的 API（通过 store 或事件总线），Agent 通过 WebSocket/SSE 发送指令，前端执行后回传结果 | 复用前端已有代码，改动量小 | 前后端双向通信复杂，状态同步麻烦 |
| **C. 后端调 iServer + 前端渲结果** | 后端 Agent 直接调 iServer REST API 做 GIS 分析，结果以 GeoJSON 返回前端，前端只负责渲染到地图 | 后端独立可控，前端只做展示，职责清晰 | 后端需重新对接 iServer API，但前端已有参考实现 |

**决策：采用方案 C（后端调 iServer + 前端渲结果）**

**理由**：
1. **职责清晰**：后端 Agent 负责"决策 + 调 iServer 计算"，前端负责"展示 + 用户交互"
2. **复用价值高**：后端 GIS 工具函数可被 Agent 和未来其他功能复用
3. **前端改动小**：前端只需要新增"接收 GeoJSON → 渲染到地图"的通用能力
4. **可测试性好**：后端 Tool 函数可以独立单元测试，不依赖前端
5. **符合技术栈**：用 LangChain/LangGraph 做 Agent，Tool 自然是后端 Python 函数

**关键设计**：
```
用户输入 → FastAPI → LangGraph Agent → Tool(iServer REST API) → GeoJSON 结果
                                                              ↓
                                        前端 ← SSE 流式推送 ←
                                          ↓
                                    渲染到地图 + 更新对话
```

---

### 3.2 系统整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                        前端 (Vue 3)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ AgentChat 面板│  │  SmMapViewer  │  │  GIS 功能组件（保留）│  │
│  │  (对话UI)     │  │  (地图渲染)   │  │  (手动操作仍然可用)  │  │
│  └──────┬───────┘  └──────▲───────┘  └───────────────────┘  │
│         │ SSE/WebSocket    │ GeoJSON 结果                     │
│         ▼                  │                                 │
│  ┌─────────────────────────┴──────────────────────────────┐  │
│  │           Agent Bridge（前端消息转发层）                  │  │
│  │  - 连接后端 SSE                                          │  │
│  │  - 解析事件类型（text / tool_start / tool_result / ...） │  │
│  │  - 调用地图渲染 API                                       │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │ HTTP + SSE
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    后端 (FastAPI + LangGraph)                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    API Layer                              │  │
│  │  POST /api/agent/chat    → 触发 Agent 执行                │  │
│  │  GET  /api/agent/stream  → SSE 流式推送                    │  │
│  │  POST /api/rag/upload    → 知识库文档上传                 │  │
│  │  GET  /api/rag/search    → 向量检索（调试用）              │  │
│  └────────────────────┬────────────────────────────────────┘  │
│                       │                                        │
│  ┌────────────────────▼────────────────────────────────────┐  │
│  │               Agent Layer (LangGraph)                     │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────────┐    │  │
│  │  │  Coordinator Graph（调度主图）                     │    │  │
│  │  │  - 意图识别 → 任务拆解 → 调度子 Agent → 结果汇总    │    │  │
│  │  │  - 强约束：JSON Schema 输出 + 代码级路由           │    │  │
│  │  └─────────┬───────────┬───────────┬───────────┬─────┘    │  │
│  │            │           │           │           │          │  │
│  │  ┌─────────▼─┐ ┌───────▼─────┐ ┌───▼───────┐ ┌─▼────────┐ │  │
│  │  │SearchAgent│ │AnalysisAgent│ │RouteAgent │ │Knowledge│ │  │
│  │  │ (检索专家) │ │ (分析专家)   │ │(路径专家)  │ │ Agent   │ │  │
│  │  │ 子图       │ │ 子图        │ │ 子图       │ │ (知识专家)│ │  │
│  │  └─────┬─────┘ └──────┬──────┘ └─────┬─────┘ └────┬─────┘ │  │
│  └────────┼───────────────┼───────────────┼────────────┼───────┘  │
│           │               │               │            │          │
│  ┌────────▼───────────────▼───────────────▼────────────▼───────┐  │
│  │                      Tool Layer (工具层)                     │  │
│  │  feature_search   buffer_analysis   shortest_path           │  │
│  │  spatial_query    overlay_analysis  service_area            │  │
│  │  fly_to           rag_retrieval                             │  │
│  └───────────────────────────┬────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼────────────────────────────────┐  │
│  │                    Service Layer（服务层）                    │  │
│  │  - iServerClient（iServer REST API 封装）                    │  │
│  │  - RAGService（向量检索 + 文档索引）                          │  │
│  │  - LLMService（DeepSeek API 封装 + 统一构建函数）             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  外部依赖：iServer / DeepSeek API / 向量数据库(FAISS/Chroma)     │
└──────────────────────────────────────────────────────────────────┘
```

---

### 3.3 多智能体架构设计（强约束方案）

#### 3.3.1 设计原则（来自你的开发思路）
1. **结构化契约**：Agent 间通过固定 JSON Schema 通信，不自由理解和发挥
2. **代码级调度**：下一个 Agent 由代码逻辑决定，不由 LLM 自由决定
3. **收敛循环**：不收敛则循环执行，上限 N 次
4. **分步可视化**：每步结果实时按顺序标绘在地图上

#### 3.3.2 Coordinator 调度流程

```
用户消息
   │
   ▼
┌─────────────────────┐
│  Step 1: 意图分类    │  LLM + 代码校验（JSON Schema）
│  (intent_classify)  │  输出: { intent, entities }
└──────────┬──────────┘
           │
   ┌───────┴─────────────────────┐
   ▼               ▼             ▼
[检索类]        [分析类]       [知识类]       [混合/应急类]
   │               │             │                │
   ▼               ▼             ▼                ▼
SearchAgent   AnalysisAgent  KnowledgeAgent   任务拆解
   │               │             │                │
   └───────┬───────┘             │          多 Agent 串行/并行
           ▼                     ▼                ▼
        地图渲染              文本回答         Coordinator 汇总
                                 │
                                 ▼
                           生成最终回复
```

#### 3.3.3 状态图设计（LangGraph StateGraph）

**全局状态（State）**：
```python
class AgentState(TypedDict):
    user_input: str                    # 用户原始输入
    intent: str                        # 识别出的意图
    entities: dict                     # 提取的实体（地点、参数等）
    task_plan: list[TaskStep]          # 拆解后的任务计划
    current_step: int                  # 当前执行到第几步
    search_results: list[GeoJSON]      # 检索结果
    analysis_results: list[GeoJSON]    # 分析结果
    route_results: list[GeoJSON]       # 路径结果
    knowledge_context: list[str]       # RAG 检索到的知识
    tool_events: list[ToolEvent]       # 工具执行事件（用于前端分步展示）
    final_answer: str                  # 最终回答
```

**强约束关键设计**：
- **任务计划（task_plan）** 由 LLM 生成，但必须符合 JSON Schema，代码校验失败则重试（最多 3 次）
- **下一步执行哪个 Agent** 由 `task_plan[current_step].agent_type` 决定，代码路由，不由 LLM 决定
- **收敛控制**：最多执行 N 步（默认 10 步），超出则强制结束并返回已完成结果
- **子图输出契约**：每个子 Agent 必须返回固定结构的结果，Coordinator 按契约读取

---

### 3.4 Tool 层设计

#### 3.4.1 Tool 清单

| Tool 名称 | 功能 | 输入参数 | 输出结构 | 对应前端功能 |
|-----------|------|---------|---------|------------|
| `feature_search` | 专题检索（关键字） | keyword: str, level: str = "all" | { total, features: [...], geojson } | FeatureSearch |
| `spatial_query` | 空间查询（范围） | geometry: GeoJSON, mode: str | { total, features: [...], geojson } | SpatialQuery |
| `buffer_analysis` | 缓冲区分析 | geometry: GeoJSON, distance: float | { result_geojson } | SpatialAnalysis |
| `overlay_analysis` | 叠置分析 | source_dataset: str, operate_dataset: str, operation: str | { result_geojson, feature_count } | SpatialAnalysis |
| `shortest_path` | 最短路径 | points: list[{lng, lat}] | { path_geojson, distance_m } | NetworkAnalysis |
| `service_area` | 服务区分析 | center: {lng, lat}, radius: float | { area_geojson, edge_count } | NetworkAnalysis |
| `fly_to_location` | 地图定位 | location: str OR {lng, lat} | { center, zoom } | (前端直接执行) |
| `rag_retrieval` | RAG 知识检索 | query: str, top_k: int = 3 | { documents: [...] } | 新增 |

#### 3.4.2 Tool 输出统一格式

每个 Tool 必须返回：
```python
class ToolResult(BaseModel):
    success: bool
    data: dict          # 具体结果数据（各工具不同）
    geojson: dict | None = None  # 可直接渲染的 GeoJSON，前端直接 addSource
    message: str        # 人类可读的结果摘要
    error: str | None = None
```

**前端渲染约定**：
- 如果返回 `geojson`，前端自动添加到地图（Source ID: `agent-result-{toolName}-{timestamp}`）
- `fly_to_location` 不返回 GeoJSON，前端直接执行 flyTo

---

### 3.5 RAG 设计

#### 3.5.1 技术选型
| 组件 | 选型 | 理由 |
|------|------|------|
| 向量数据库 | FAISS (本地文件) | 轻量、无需部署服务、Python 生态好，适合课设 |
| 向量模型 | 调用 OpenAI Embedding 或本地模型 | 用 DeepSeek 兼容的 Embedding API |
| 文档格式 | Markdown / TXT | 简单易处理 |

#### 3.5.2 知识库内容
- 地震救援应急预案
- 火灾处置流程
- 洪水应急响应
- 医疗救援调度方案
- （用户可上传补充）

#### 3.5.3 RAG 流程
```
用户问题 → 检索相关文档 → 注入 Prompt → LLM 生成回答
```

KnowledgeAgent 负责：
1. 判断是否需要 RAG（由 Coordinator 调度时决定，或 Agent 自行调用 rag_retrieval tool）
2. 检索向量库
3. 将知识上下文整合到回答中

---

### 3.6 前后端通信设计

#### 3.6.1 协议：SSE (Server-Sent Events)
- 为什么不用 WebSocket：SSE 更简单，单向流式推送足够用，LangGraph 原生支持 astream_events
- 前端用 EventSource 或 fetch + ReadableStream

#### 3.6.2 事件类型
| 事件类型 | 触发时机 | 数据内容 | 前端动作 |
|---------|---------|---------|---------|
| `agent_start` | Agent 开始执行 | { agent_name } | 显示"思考中..." |
| `tool_start` | 工具开始调用 | { tool_name, input } | 显示"正在执行 xxx..." |
| `tool_result` | 工具执行完成 | { tool_name, result, geojson? } | 渲染 GeoJSON 到地图 + 更新消息 |
| `agent_step` | 子 Agent 完成一步 | { agent_name, step_result } | 更新进度 |
| `text` | 流式文本 token | { content } | 追加到回答消息 |
| `agent_end` | 全部执行完成 | { final_answer } | 标记完成 |
| `error` | 出错 | { message } | 显示错误 |

#### 3.6.3 API 接口
```
POST /api/agent/chat
Body: { message: str, session_id: str }
Response: SSE 流

POST /api/rag/upload
Body: multipart/form-data (file)
Response: { success, document_count }

POST /api/rag/index
Body: { content: str, metadata: dict }
Response: { success, id }
```

---

### 3.7 前端地图渲染设计

#### 3.7.1 Agent 结果图层管理
前端新增一个通用的 Agent 结果图层管理器：

```javascript
// stores/agent.js 或 utils/agentRenderer.js
class AgentResultRenderer {
  // 添加一个 Agent 工具结果到地图
  addResult(toolName, geojson, options = {}) { ... }
  
  // 清除所有 Agent 结果
  clearAll() { ... }
  
  // 按工具类型清除
  clearByTool(toolName) { ... }
  
  // 飞行定位到某个结果
  flyToResult(resultId) { ... }
}
```

#### 3.7.2 图层命名规范
```
agent-{toolName}-{timestamp}-source
agent-{toolName}-{timestamp}-fill  (面)
agent-{toolName}-{timestamp}-line  (线)
agent-{toolName}-{timestamp}-point (点)
```

#### 3.7.3 样式约定
- Agent 结果使用有辨识度的配色（如橙色系），与用户手动操作的结果区分
- 不同工具类型使用不同色系，但都在 Agent 主题色范围内

---

### 3.8 前端对话面板设计

#### 3.8.1 交互设计
- 页面右侧悬浮按钮，点击展开聊天面板（可拖拽调整宽度）
- 消息列表支持：用户消息、AI 文本消息、工具调用卡片、错误提示
- 工具调用卡片显示：工具名 + 状态（进行中/完成/失败）+ 结果摘要 + "查看地图"按钮
- 支持清空对话、停止生成

#### 3.8.2 技术实现
- 组件：`AgentChatPanel.vue`
- 状态：Pinia store (`agent.js`) 管理对话历史
- 流式渲染：逐字显示 AI 回答（类似 ChatGPT 效果）

---

### 3.9 LLM 封装设计

吸取经验教训：**Agent 构造做单点封装**，隔离版本差异。

```python
# services/llm_service.py
class LLMService:
    """统一的 LLM 服务封装，隔离底层 API 差异"""
    
    @classmethod
    def get_chat_model(cls, **kwargs):
        """获取聊天模型实例"""
        return ChatDeepSeek(
            model="deepseek-v4-flash",
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
            temperature=kwargs.get("temperature", 0.7),
            **kwargs
        )
    
    @classmethod
    def get_embedding_model(cls):
        """获取 Embedding 模型"""
        # DeepSeek 或其他兼容 OpenAI 格式的 Embedding
        ...
```

---

### 3.10 目录结构

#### 后端（新增）
```
backend/
├── app/
│   ├── main.py                 # FastAPI 入口
│   ├── api/                    # API 路由
│   │   ├── __init__.py
│   │   ├── agent.py            # Agent 对话接口
│   │   └── rag.py              # RAG 知识库接口
│   ├── agent/                  # Agent 核心（LangGraph）
│   │   ├── __init__.py
│   │   ├── graph.py            # Coordinator 主图
│   │   ├── state.py            # 状态定义
│   │   ├── nodes/              # 各节点
│   │   │   ├── intent.py       # 意图分类节点
│   │   │   ├── planner.py      # 任务规划节点
│   │   │   └── summarize.py    # 结果汇总节点
│   │   └── sub_agents/         # 子 Agent 子图
│   │       ├── search_agent.py
│   │       ├── analysis_agent.py
│   │       ├── route_agent.py
│   │       └── knowledge_agent.py
│   ├── tools/                  # Tool 定义
│   │   ├── __init__.py
│   │   ├── gis_tools.py        # GIS 相关工具
│   │   └── rag_tools.py        # RAG 相关工具
│   ├── services/               # 服务层
│   │   ├── __init__.py
│   │   ├── iserver_client.py   # iServer REST API 封装
│   │   ├── llm_service.py      # LLM 封装
│   │   └── rag_service.py      # RAG 向量检索服务
│   ├── schemas/                # Pydantic 模型
│   │   ├── __init__.py
│   │   ├── agent.py            # Agent 相关 Schema
│   │   └── tool_result.py      # Tool 结果统一格式
│   └── config.py               # 配置
├── data/
│   └── knowledge/              # 知识库文档（初始）
├── vector_store/               # FAISS 向量库文件（运行时生成）
├── requirements.txt
└── .env.example
```

#### 前端（新增/修改）
```
frontend/src/
├── components/
│   ├── AgentChatPanel.vue      # 【新增】Agent 聊天面板
│   └── agent/                  # 【新增】Agent 子组件
│       ├── ChatMessage.vue
│       ├── ToolCallCard.vue
│       └── QuickActions.vue
├── stores/
│   ├── agent.js                # 【新增】Agent 状态管理
│   └── map.js                  # 【修改】增加 agent 结果图层管理
├── utils/
│   ├── agent/                  # 【新增】Agent 前端工具
│   │   ├── sse.js              # SSE 连接管理
│   │   └── mapRenderer.js      # Agent 结果地图渲染
│   └── map.js                  # 【可能修改】抽离通用渲染函数
└── views/
    └── HomeView.vue            # 【修改】挂载 AgentChatPanel
```

---

## 4. 风险与应对

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| iServer REST API 对接工作量大 | 中 | 高 | 前端已有 fetch 调用参考，后端 Python 直接 requests 调 REST，逻辑一致 |
| LangGraph 多子图调试复杂 | 中 | 中 | 先做单 Agent + 多 Tool，跑通后再拆分子图；子图输出契约先行 |
| DeepSeek API 不稳定或限流 | 低 | 中 | 加重试 + 超时；提供 Mock 模式用于演示 |
| 向量库 + Embedding 模型选型波折 | 中 | 低 | 先用 FAISS + OpenAI 兼容 Embedding，不行再换 |
| SSE 流式 + 前端状态管理复杂 | 中 | 中 | 事件类型少而精，前端 store 统一管理 |
