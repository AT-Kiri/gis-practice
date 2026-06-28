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
- **状态**: pending
- **描述**: FAISS 向量库 + 文档索引 + 检索工具
- **子任务**:
  - [ ] RAGService 封装（FAISS + Embedding）
  - [ ] 文档分块与索引功能
  - [ ] rag_retrieval Tool
  - [ ] 初始知识库文档（5 篇应急相关 Markdown）
  - [ ] 启动时自动索引
  - [ ] POST /api/rag/upload 接口
  - [ ] GET /api/rag/search 调试接口

### Task 10: 多智能体架构 - LangGraph StateGraph
- **优先级**: P1
- **依赖**: Task 3
- **状态**: pending
- **描述**: 从单 Agent 升级为 Coordinator + 子 Agent 的 StateGraph
- **子任务**:
  - [ ] AgentState 类型定义（TypedDict）
  - [ ] 意图分类节点（intent_classify）+ JSON Schema 校验 + 重试
  - [ ] 任务规划节点（task_planner）
  - [ ] 代码级路由逻辑（route_agent）
  - [ ] 结果汇总节点（summarize）
  - [ ] 步数上限保护（max 10 步）
  - [ ] 状态图编译与测试

### Task 11: 子 Agent 子图实现
- **优先级**: P1
- **依赖**: Task 10
- **状态**: pending
- **描述**: 四个专业子 Agent 的 LangGraph 子图
- **子任务**:
  - [ ] SearchAgent 子图（feature_search + spatial_query + fly_to）
  - [ ] AnalysisAgent 子图（buffer_analysis + overlay_analysis）
  - [ ] RouteAgent 子图（shortest_path + service_area）
  - [ ] KnowledgeAgent 子图（rag_retrieval + 回答生成）
  - [ ] 每个子图的输出契约验证
  - [ ] 子图集成到 Coordinator 主图

### Task 12: 分步可视化增强
- **优先级**: P1
- **依赖**: Task 7, Task 11
- **状态**: pending
- **描述**: 多步任务的分步地图标绘与进度展示
- **子任务**:
  - [ ] 每步 tool_result 实时推送
  - [ ] 前端进度指示（第 X / 共 Y 步）
  - [ ] 不同工具结果图层叠加（透明度区分）
  - [ ] 步骤说明文字同步显示
  - [ ] 应急场景演示测试："朝阳区地震，评估灾情并规划救援"

### Task 13: 前端面板完善与体验优化
- **优先级**: P1
- **依赖**: Task 12
- **状态**: pending
- **描述**: 完善对话面板细节体验
- **子任务**:
  - [ ] 消息气泡中的代码块/表格渲染（Markdown 支持）
  - [ ] 工具卡片点击展开详情
  - [ ] 停止生成按钮
  - [ ] 错误提示样式优化
  - [ ] 响应式布局适配

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
