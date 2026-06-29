# Tasks: 多智能体协同 GIS 应急助手

> 任务拆解清单，按优先级排序，标注依赖关系

---

## 任务总览

| 优先级 | 任务数 | 说明 |
|--------|--------|------|
| P0（必须） | 8 项 | 核心功能：对话 + GIS 工具调用 + 分步可视化 |
| P1（重要） | 5 项 | 多智能体协同 + RAG |
| P2（锦上添花）| 3 项 | 算法层 + 优化体验 |

---

## P0：核心功能（必须实现）

### Task 1: 后端项目初始化与基础架构
- **优先级**: P0
- **依赖**: 无
- **状态**: done
- **描述**: 搭建 FastAPI + LangChain + LangGraph 后端项目骨架
- **子任务**:
  - [x] 创建后端项目目录结构
  - [x] 编写 requirements.txt（fastapi, uvicorn, langchain, langgraph, langchain-openai, faiss-cpu, python-multipart, pydantic-settings 等）
  - [x] 配置管理（pydantic-settings，从 .env 读取 DEEPSEEK_API_KEY 等）
  - [x] FastAPI 应用入口（main.py）+ CORS 配置
  - [x] LLMService 封装（DeepSeek 兼容 OpenAI 格式）
  - [x] .env.example 模板

### Task 2: iServer REST API 封装与 GIS 工具层
- **优先级**: P0
- **依赖**: Task 1
- **状态**: done
- **描述**: 封装 iServer REST API，实现 7 个 GIS Tool
- **子任务**:
  - [x] iServerClient 基础封装（通用 GET/POST 请求）
  - [x] feature_search 工具（专题检索，SQLQuery）
  - [x] spatial_query 工具（空间查询，SPATIAL query）
  - [x] buffer_analysis 工具（缓冲区分析，GeometryBufferAnalyst）
  - [x] overlay_analysis 工具（叠置分析，DatasetOverlayAnalyst）
  - [x] shortest_path 工具（最短路径，长春路网）
  - [x] service_area 工具（服务区分析，长春路网）
  - [x] fly_to_location 工具（地名解析 + 坐标返回）
  - [x] ToolResult 统一输出格式（Pydantic Model）
  - [ ] 每个工具的单元测试（mock iServer 响应）

### Task 3: Agent 核心 - 单 Agent + Tool Calling
- **优先级**: P0
- **依赖**: Task 2
- **状态**: done
- **描述**: 先实现单 Agent 调工具的最简版本，验证端到端链路
- **子任务**:
  - [x] 创建基础 ReAct Agent（LangChain create_react_agent 或自定义）
  - [x] 注册所有 GIS Tool 到 Agent
  - [x] System Prompt 设计（应急助手角色 + GIS 工具使用说明）
  - [x] Agent 执行入口函数（astream_events 用于流式）
  - [x] 简单端到端测试（输入"朝阳区在哪" → 调 feature_search → 返回结果）

### Task 4: SSE 流式接口
- **优先级**: P0
- **依赖**: Task 3
- **状态**: done
- **描述**: 后端 SSE 接口 + 事件类型定义
- **子任务**:
  - [x] 定义 SSE 事件类型（agent_start, tool_start, tool_result, text, agent_end, error）
  - [x] 实现 POST /api/agent/chat 接口（SSE 流式响应）
  - [x] 基于 LangGraph astream_events 或 astream 生成事件流
  - [x] session_id 与会话管理（内存级，简单实现）
  - [x] 接口测试（curl 或 Python 脚本验证 SSE 流）

### Task 5: 前端 Agent 聊天面板 UI
- **优先级**: P0
- **依赖**: 无
- **状态**: done
- **描述**: 前端对话界面组件
- **子任务**:
  - [x] AgentChatPanel.vue 主组件（右侧滑入面板）
  - [x] ChatMessage.vue 消息气泡组件（用户/AI 样式区分）
  - [x] ToolCallCard.vue 工具调用卡片（加载中/完成/失败状态）
  - [x] 输入框 + 发送按钮
  - [x] 快捷操作推荐
  - [x] 清空对话功能
  - [x] Pinia agent store（对话历史、加载状态）

### Task 6: 前端 SSE 连接与消息处理
- **优先级**: P0
- **依赖**: Task 4, Task 5
- **状态**: done
- **描述**: 前端 SSE 客户端 + 事件分发
- **子任务**:
  - [x] SSE 连接管理工具类（自动重连、错误处理）
  - [x] 事件类型解析与分发
  - [x] 流式文本渲染（逐字追加效果）
  - [x] 工具调用卡片动态更新
  - [x] agent store 状态同步

### Task 7: Agent 结果地图渲染
- **优先级**: P0
- **依赖**: Task 6
- **状态**: done
- **描述**: 前端接收 GeoJSON → 自动渲染到地图
- **子任务**:
  - [x] AgentResultRenderer 工具类（addResult / clearAll / clearByTool）
  - [x] 点/线/面要素自动分类渲染
  - [x] Agent 结果专属样式（橙色系，与手动操作区分）
  - [x] 自动 fitBounds 到结果范围
  - [x] 结果图层管理（在 LayerManager 中显示/隐藏）
  - [x] 清空对话时同步清除地图结果

### Task 8: 端到端联调与 P0 功能验证
- **优先级**: P0
- **依赖**: Task 1-7
- **状态**: done
- **描述**: 打通前后端，验证核心场景
- **验证场景**:
  - [x] 场景 1："朝阳区在哪" → 专题检索 → 地图标绘 + 列表结果
  - [x] 场景 2："以天安门为中心做 1km 缓冲区分析" → 缓冲区分析 → 地图显示
  - [x] 场景 3：(长春) "从人民广场到火车站的最短路径" → 路径分析 → 地图显示
  - [x] 场景 4：流式文本显示 + 工具调用过程可视化

---

## P0 验收后补充修复（手动测试 + Bug 修复）

> 以下为 P0 主体开发完成、进入手动测试阶段后进行的改动。
> P1 阶段开发前请先了解这些上下文，避免重复踩坑。

### 配置与环境

- **LLM 服务商切换为硅基流动**：原计划用 DeepSeek 官方 API，因成本原因改用硅基流动 `deepseek-ai/DeepSeek-V3.2`。`.env` 中配置 `DEEPSEEK_BASE_URL=https://api.siliconflow.cn/v1`，对 LangChain 仍以 DeepSeek 兼容协议调用。
- **`config.py` 配置源优先级修复（401 错误根因）**：pydantic-settings 默认优先级为「构造参数 > 进程环境变量 > .env 文件」。Trae IDE 启动后端时若继承了系统/终端中残留的旧 `DEEPSEEK_API_KEY`，会覆盖 `.env` 中的硅基流动 Key，导致 401。修复方案：实现 `settings_customise_sources`，调整为「构造参数 > .env 文件 > 进程环境变量」。
- **后端启动方式统一**：必须使用项目 venv 的 Python 启动，不能用系统 Python。命令：`d:\Code\AI-Code\GIS-Practice\agent-backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload`。

### 工具与数据

- **`feature_search` 增加 `region` 参数**：支持 `auto`（默认，先查京津冀无结果回退查长春）/ `jingjin` / `changchun`。长春市内地点检索必须传 `region="changchun"`，否则会从京津冀数据源返回近似坐标，导致路径规划起终点偏离实际位置。
- **`spatial_query` 增加 `feature_type` 过滤**：原实现返回范围内所有要素类型（点/线/面混杂），缓冲区分析周边时会出现非预期的线/面要素。新增 `feature_type` 参数（point/line/polygon/all）按需过滤。
- **缓冲区分析字段名修正**：调用 iServer `GeometryBufferAnalyst` 必须用 `analystParameter` 字段，而非 `bufferSetting`。
- **长春市 POI 数据源补充**：原京津冀数据源不包含长春市 POI（如「南湖公园」），新增长春市数据集，通过 `region="changchun"` 走长春数据源查询。

### 前端渲染

- **长春市底图自动加载（`changchunBasemap.js`）**：Agent 执行 `shortest_path` / `service_area` 时，结果坐标在长春市范围，但原前端默认加载京津冀底图，路径会画在空白处。新增 `ensureChangchunBasemap(map)` 工具函数，由 `mapRenderer.js` 在渲染路径结果前调用，幂等加载栅格底图（iServer `image.png`）+ 矢量路网（`RoadNet@Changchun`）。
- **图层顺序修复**：长春底图在起终点圆点之后添加，默认置于顶层覆盖了圆点。修复：`ensureChangchunBasemap` 通过 `map.getStyle().layers.find(l => l.id.startsWith('agent-'))` 找到第一个 agent 图层，将底图插入到其下方。
- **要素弹窗与交互**：Agent 结果图层绑定 click / mouseenter / mouseleave，弹窗展示要素属性，风格与 `FeatureSearch.vue` 一致。

### Agent 核心

- **会话内短期记忆（Task 4 补完）**：原 P0 实现遗漏了 `session_id 与会话管理` 子任务，导致同一会话窗口内 Agent 无上下文记忆。新增 `session_store.py`（内存级，`dict[session_id -> list[BaseMessage]]`），`graph.py` 在调用 Agent 前拼接 `history + [HumanMessage(current)]`，流式结束后保存 `HumanMessage` + 最终 `AIMessage`（仅纯文本，不含 `tool_calls`，避免重复执行工具）。每会话最多保留 20 条消息。**长期持久化仍为 P2 Task 16，未实现。**
- **SSE 事件流中 ToolMessage 处理**：LangGraph `astream_events` v2 返回的 `on_tool_end` 数据是 `ToolMessage` 对象，需提取 `.content` 后再 JSON 解析。
- **LLM 传 dict 参数为 JSON 字符串的修复（`'str' object has no attribute 'get'` 根因）**：DeepSeek-V3.2（硅基流动）在调用工具时，会把 `dict` / `list` 类型的参数以 JSON 字符串形式传入（而非原生对象），导致 Pydantic 校验通过但工具内部 `.get()` 调用崩溃。修复方案：
  - `gis_tools.py` 中 `spatial_query` / `buffer_analysis` / `shortest_path` / `service_area` 四个工具的 `geometry: dict` / `points: list` / `center: dict` 参数类型统一改为 `str`（这样 JSON Schema 会告知 LLM 传字符串）。
  - 新增 `_normalize_geometry(g)` 辅助函数：若入参为 `str` 则 `json.loads` 转 dict，否则原样返回。
  - 工具内部先用 `_normalize_geometry` 归一化再做 `.get("type")` 校验，避免崩溃。
  - `graph.py` 的 `_simplify_tool_input` 同步加防御：`geometry` 可能是 `dict` / `str` / `None`，分别处理后再提取 `type`；`points` 同理。
- **LangGraph 工具校验失败事件不可见的修复**：当工具参数 Pydantic 校验失败时，LangGraph 内部捕获异常并返回 `ToolMessage` 给 LLM，**不会触发 `on_tool_end`**，导致 SSE 流中看不到错误。`graph.py` 新增 `on_tool_error` 事件处理分支，输出 `tool_result` SSE 事件（`success=False` + 错误消息），让前端能看到工具执行错误。
- **`on_tool_end` 输出非 dict JSON 的防御**：`json.loads(tool_output)` 可能返回非 dict 类型（纯字符串/数字/列表），直接 `.get()` 会再次崩溃。新增 `isinstance(parsed, dict)` 校验，非 dict 时抛 `ValueError` 走 `except` 分支返回 `success=False`。

---

## P1：多智能体 + RAG

### Task 9: RAG 知识库服务
- **优先级**: P1
- **依赖**: Task 1
- **状态**: done
- **描述**: FAISS 向量库 + 文档索引 + 检索工具
- **子任务**:
  - [x] RAGService 封装（FAISS + Embedding）
  - [x] 文档分块与索引功能
  - [x] rag_retrieval Tool
  - [x] 初始知识库文档（5 篇应急相关 Markdown）
  - [x] 启动时自动索引
  - [x] POST /api/rag/upload 接口
  - [x] GET /api/rag/search 调试接口

### Task 10: 多智能体架构 - LangGraph StateGraph
- **优先级**: P1
- **依赖**: Task 3
- **状态**: done
- **描述**: 从单 Agent 升级为 Coordinator + 子 Agent 的 StateGraph
- **实现说明**: 未使用 LangGraph StateGraph 编译，改用 async function 顺序调度实现「代码级路由」（spec 场景 3 要求），等价于 StateGraph 但流式输出更自然、调试更方便
- **子任务**:
  - [x] AgentState 类型定义（TypedDict，state.py）
  - [x] 意图分类节点（intent_classify）+ JSON Schema 校验 + 重试（nodes/intent.py）
  - [x] 任务规划节点（task_planner，nodes/planner.py）
  - [x] 代码级路由逻辑（route_agent，coordinator.py 主循环）
  - [x] 结果汇总节点（summarize，nodes/summarize.py）
  - [x] 步数上限保护（MAX_STEPS=5，coordinator.py）
  - [x] 状态图编译与测试（用 async function 等价实现，已通过 import 健康检查）
  - [x] 双轨制路由：单一意图走单 Agent，mixed 走 Coordinator（避免简单任务额外 2 次 LLM 调用）
  - [x] 闲聊跳过意图分类直接流式回答

### Task 11: 子 Agent 子图实现
- **优先级**: P1
- **依赖**: Task 10
- **状态**: done
- **描述**: 四个专业子 Agent 的 LangGraph 子图
- **实现说明**: 用 create_react_agent 创建 4 个独立子 Agent，由 Coordinator 顺序调度；子 Agent 输出契约通过 SubAgentResult Pydantic 模型定义
- **子任务**:
  - [x] SearchAgent 子图（feature_search + spatial_query + fly_to + mock_nearby_resources）
  - [x] AnalysisAgent 子图（buffer_analysis + overlay_analysis）
  - [x] RouteAgent 子图（shortest_path + service_area + online_route_planning）
  - [x] KnowledgeAgent 子图（rag_retrieval + 回答生成）
  - [x] 每个子图的输出契约验证（SubAgentResult 模型 + execute_sub_agent 事件流契约）
  - [x] 子图集成到 Coordinator 主图（coordinator.py 调用 execute_sub_agent）
  - [x] _build_step_context 注入前序 summary 和关键数据（坐标、资源列表）作为子 Agent 上下文

### Task 12: 分步可视化增强
- **优先级**: P1
- **依赖**: Task 7, Task 11
- **状态**: done
- **描述**: 多步任务的分步地图标绘与进度展示
- **子任务**:
  - [x] 每步 tool_result 实时推送（Coordinator SSE 流转发）
  - [x] 前端进度指示（第 X / 共 Y 步，AgentChatPanel.vue 顶部 workflow-bar）
  - [x] 不同工具结果图层叠加（橙色系样式不变，按 step 分组卡片显示）
  - [x] 步骤说明文字同步显示（step_start 事件携带 description）
  - [x] 应急场景演示测试："朝阳区地震，评估灾情并规划救援"（5 步：定位→缓冲区→查医院→路径规划→知识检索，已通过测试）
  - [x] 模拟数据紫灰色系视觉区分 + [模拟] 弹窗标签

### Task 13: 前端面板完善与体验优化
- **优先级**: P1
- **依赖**: Task 12
- **状态**: done
- **描述**: 完善对话面板细节体验
- **子任务**:
  - [x] 消息气泡中的代码块/表格渲染（Markdown 支持，引入 markdown-it，utils/agent/markdown.js）
  - [x] 工具卡片点击展开详情（P0 已实现）
  - [x] 停止生成按钮（P0 已实现）
  - [x] 错误提示样式优化（保留 P0 实现）
  - [x] 响应式布局适配（保留 P0 实现）

---

## P1 测试与修复（手动测试 + Bug 修复）

> P1 主体开发完成、进入手动测试阶段后进行的改动。
> P2 阶段开发前请先了解这些上下文，避免重复踩坑。

### 严重 Bug 修复

- **token 超限（865k）根因**：子 Agent ReAct 循环把 ToolResult 完整返回（含 GeoJSON）写进 message history，多次工具调用后 token 累积超出 LLM 上限。
  - 修复：`ToolResult.to_dict()` 把 geojson 剥离到 `threading.local` 缓存，返回给 LLM 的 dict 中 `geojson=None`
  - `graph.py` / `agents.py` 通过 `pop_pending_geojson()` 取出后通过 SSE 单独发给前端
  - 完整 GeoJSON 不再进 LLM 上下文，只用于前端渲染

- **路径规划起终点坐标错误**：`feature_search` 的 `data.features` 只有摘要（displayName、dataset），不含坐标。LLM 看不到实际坐标，编造坐标传给 `shortest_path`，导致路径只有 0.42km（实际应 2.16km）。
  - 修复：`features_summary` 加入 `lng/lat`（从 `geojson_features` 提取 Point 坐标）
  - 完整 geometry 仍保留在 `geojson` 字段供前端渲染（不进 LLM 上下文）

- **复杂任务空间查询多余线/面要素**：朝阳区地震复杂任务中，`spatial_query` 的 `feature_type` 默认 `all`，查到 236 个要素（含 215 个线/面要素）。应急救援场景应该只查点要素。
  - 修复：`_infer_feature_type_from_message` 加入应急救援关键词推断（救援/应急/医院/物资/资源/避难/消防/公安/受灾/灾情等）
  - `SEARCH_PROMPT` 规则 11 明确要求应急救援场景 `spatial_query` 必须传 `feature_type="point"`

### 中等问题修复

- **SYSTEM_PROMPT 规则膨胀导致路径规划回归**：规则 2.2 从一行扩展为多行示例后，LLM 在路径规划场景也调 spatial_query + buffer_analysis + fly_to_location。
  - 修复：精简为 8 条正交规则，规则 3 明确"路径规划只调 feature_search + 路径工具，禁止调 spatial_query/buffer_analysis/fly_to_location"
  - **核心教训：规则必须正交不重叠，不能为某场景写多行示例**

- **虚拟事件导致 LLM 无限循环**：spatial_query circle 模式返回的 geojson 含缓冲区 Feature，拆分出虚拟 buffer_analysis 事件后，LLM 以为系统自动做了缓冲区分析但自己没做，反复重试 spatial_query 导致无限循环（10+ 次）。
  - 修复：去掉虚拟事件拆分，去掉 circle 模式，让 LLM 必须走真实 buffer_analysis → spatial_query 流程
  - spatial_query 检测到 Point 几何直接返回错误，引导 LLM 先调 buffer_analysis 取 `data.geometry_brief`

- **资源点排序优化**：复杂任务路径规划需选择距离受灾点最近的前 2 条资源点。
  - 修复：`_build_step_context` 中按球面距离升序排序资源点，取前 2 条，距离标注在坐标列表中

### 小问题修复

- **summarize 节点首 token 延迟**：改用 `astream` 真流式而非 `ainvoke`，逐 token 推送给前端
- **闲聊响应延迟**：闲聊类问题（问候/感谢/简单咨询）跳过意图分类直接流式回答
- **变量名冲突**：features_summary 循环内用 `summary` 变量名覆盖外层字符串 `summary`，改名为 `feat`

### 涉及文件

| 文件 | 修改内容 |
|------|---------|
| `app/schemas/tool_result.py` | 新增 threading.local geojson 剥离机制（`pop_pending_geojson`） |
| `app/tools/gis_tools.py` | feature_search 加坐标返回 / spatial_query 拒绝 Point + 去掉 circle 模式 / `_infer_feature_type_from_message` 加应急救援关键词 |
| `app/agent/graph.py` | SYSTEM_PROMPT 精简为 8 条正交规则 / on_tool_end 去掉虚拟事件拆分，恢复直接发 tool_result |
| `app/agent/sub_agents/agents.py` | on_tool_end 去掉虚拟事件拆分 / SEARCH_PROMPT 新增规则 11（应急救援 feature_type=point） |
| `app/agent/coordinator.py` | `_build_step_context` 按距离排序资源点，取最近前 2 条 |
| `app/agent/nodes/planner.py` | 任务规划输出适配新数据结构 |
| `app/agent/state.py` | AgentState 字段补充 |

### 测试验证

| 场景 | 验证结果 |
|------|---------|
| "朝阳区地震，评估灾情并规划救援"（复杂任务） | ✅ 5 步全部走通，spatial_query 只返回 20 个点要素（1 县级市 + 19 乡镇），不再有线/面要素 |
| "从南湖公园到省体育局怎么走？"（长春市路径规划） | ✅ feature_search 返回正确坐标（125.300561, 43.815469 → 125.349475, 43.837537），shortest_path 距离 2.16km |
| "查一下东城区3km范围内的点要素"（缓冲区+空间查询） | ✅ 缓冲区分析独立显示，spatial_query 返回点要素，不再 token 超限 |
| "XXX在哪"（专题检索） | ✅ feature_search 正常返回，地图标绘正确 |

---

## P2：锦上添花

### Task 14: 算法层预留接口
- **优先级**: P2
- **依赖**: Task 11
- **状态**: pending
- **描述**: Pareto 多目标匹配 + ACO 蚁群算法接口预留
- **子任务**:
  - [ ] Pareto 优化工具骨架（输入输出定义，mock 实现）
  - [ ] ACO 多车路径规划工具骨架（mock 实现）
  - [ ] 在应急场景中演示调用（返回示意结果）

### Task 15: 知识库管理 UI
- **优先级**: P2
- **依赖**: Task 9
- **状态**: pending
- **描述**: 前端知识库文档上传与管理界面
- **子任务**:
  - [ ] 知识库标签页（聊天面板内切换）
  - [ ] 文档上传组件
  - [ ] 已索引文档列表
  - [ ] 删除文档功能

### Task 16: 对话历史持久化
- **优先级**: P2
- **依赖**: Task 5
- **状态**: pending
- **描述**: 本地存储对话历史，刷新不丢失
- **子任务**:
  - [ ] localStorage 存储对话历史
  - [ ] 启动时恢复历史
  - [ ] 多会话切换（可选）

---

## 实施顺序建议

```
第一轮（P0 核心）:
  Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8
  （先跑通单 Agent + 工具调用 + 分步可视化的最小闭环）

第二轮（P1 增强）:
  Task 9 (RAG)        ← 可并行
  Task 10 → Task 11 → Task 12 → Task 13  （多智能体升级）

第三轮（P2 锦上添花）:
  Task 14 / 15 / 16 （时间充裕再做）
```
