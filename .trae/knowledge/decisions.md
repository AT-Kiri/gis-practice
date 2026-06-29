# 决策日志

> 记录每次变更的关键技术选型和踩坑记录。
> 只有值得记的才记——方案理由、踩坑教训、API 隐藏限制。

| 日期 | 变更 | 决策 | 选择方案 | 理由 / 备注 |
|------|------|------|----------|-------------|
| 2026-06-10 | `project-foundation` | 前端构建工具 | Vite | 相比 Webpack 开发服务器启动更快，Vue3 官方推荐 |
| 2026-06-10 | `project-foundation` | UI 组件库 | Ant Design Vue | SuperMap iClient 官方示例推荐 |
| 2026-06-10 | `project-foundation` | 状态管理 | Pinia | Vue3 官方推荐，相比 Vuex TS 支持更好 |
| 2026-06-10 | `project-foundation` | 地图引擎 | @supermap/vue-iclient-mapboxgl | 课程技术栈指定的 MapboxGL 封装 |
| 2026-06-26 | `20260626-data-dashboard` | 数据大屏底图 | 天地图 WMTS | iServer 未运行时无法加载底图；天地图国内可访问、免费、无需 Key |
| 2026-06-26 | `20260626-data-dashboard` | 分级地图渲染方式 | 圆点标记（County_COORDS） | iServer 未运行时无法获取行政区划 GeoJSON 面；改用县区中心坐标 + Circle Layer 按灾害等级着色 |
| 2026-06-26 | `20260626-data-dashboard` | 地图初始化时机 | onMounted | `watch + immediate + deep` 在组件挂载阶段导致「Maximum recursive updates exceeded」无限循环；改用 onMounted + map.loaded / style.load 是 Vue + Mapbox 官方推荐模式 |
| 2026-06-26 | `20260626-data-dashboard` | 缓冲区分析引擎 | turf.js | iServer 空间分析服务不可用；turf.js (buffer + distance + pointsWithinCircle) 纯浏览器端计算，无网络依赖 |
| 2026-06-26 | `20260626-data-dashboard` | 路径规划引擎 | OSRM Public API | iServer 网络分析服务（transportationanalyst-sample）不在京津冀区域且未启动；OSRM 提供全球 OpenStreetMap 路网，HTTP API 免 Key |
| 2026-06-26 | `20260626-data-dashboard` | 路径线起终点对齐 | 容差补坐标 | OSRM 路径首尾在道路上，距圆点可能 >100m；补圆点坐标到路径首尾保证视觉相连，容差可配置（默认 0.001° ≈ 100m） |
| 2026-06-26 | `20260626-data-dashboard` | 弹窗结果持久化 | 关闭弹窗不清除地图图层 | 缓冲区圆/标记/路径线关闭后保留在地图上，方便对比查看；切换县区或点击空白返回总览时统一清除 |
| 2026-06-28 | `20260626-multi-agent-gis` | LLM 服务商 | 硅基流动 `deepseek-ai/DeepSeek-V3.2` | DeepSeek 官方 API 成本较高；硅基流动兼容 OpenAI 协议，`.env` 中改 `DEEPSEEK_BASE_URL=https://api.siliconflow.cn/v1` 即可，LangChain 代码无需改动 |
| 2026-06-28 | `20260626-multi-agent-gis` | 配置源优先级（401 根因） | `settings_customise_sources` 调整为 .env > 进程环境变量 | pydantic-settings 默认优先级是「构造参数 > 进程环境变量 > .env」。Trae IDE 启动后端时继承了终端残留的旧 DeepSeek Key，覆盖了 `.env` 中硅基流动 Key，导致 401。改为 .env 优先后，进程级旧变量不再干扰 |
| 2026-06-28 | `20260626-multi-agent-gis` | 后端运行 Python | 项目 venv（`agent-backend/venv`） | 系统 Python 缺少依赖且会读取系统级环境变量；必须用 venv Python 启动，命令：`venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload` |
| 2026-06-28 | `20260626-multi-agent-gis` | 长春市 POI 检索 | `feature_search` 增加 `region` 参数 | 京津冀数据源不包含长春市 POI。新增 `region`（auto/jingjin/changchun），长春市内地点检索必须传 `region="changchun"`，否则返回京津冀近似坐标导致路径规划起终点偏离实际位置 |
| 2026-06-28 | `20260626-multi-agent-gis` | 空间查询结果过滤 | `spatial_query` 增加 `feature_type` 参数 | 原实现返回范围内所有要素类型（点/线/面混杂），缓冲区分析周边时出现非预期的线/面要素。新增 `feature_type`（point/line/polygon/all）按需过滤 |
| 2026-06-28 | `20260626-multi-agent-gis` | iServer 缓冲区字段名 | 使用 `analystParameter` | 调用 `GeometryBufferAnalyst` 时必须用 `analystParameter` 字段，而非 `bufferSetting`，否则服务端忽略参数 |
| 2026-06-28 | `20260626-multi-agent-gis` | 长春市底图加载时机 | Agent 渲染路径结果前自动调用 `ensureChangchunBasemap` | 原前端默认加载京津冀底图，长春路径会画在空白处。`mapRenderer.js` 检测到 `shortest_path` / `service_area` 工具时调用，幂等加载栅格底图（iServer `image.png`）+ 矢量路网（`RoadNet@Changchun`）。不默认加载是为避免初始视图被长春底图覆盖 |
| 2026-06-28 | `20260626-multi-agent-gis` | 长春底图与 Agent 图层顺序 | `beforeId` = 第一个 `agent-` 图层 | 长春底图在起终点圆点之后添加，默认置于顶层覆盖圆点。修复：通过 `map.getStyle().layers.find(l => l.id.startsWith('agent-'))` 找到第一个 agent 图层，将底图插入其下方 |
| 2026-06-28 | `20260626-multi-agent-gis` | 会话内短期记忆 | 内存级 `session_store.py`（dict） | P0 Task 4 子任务「session_id 与会话管理」原实现遗漏。`graph.py` 调用 Agent 前拼接 `history + [HumanMessage(current)]`，结束后保存纯文本 Human/AIMessage（不含 `tool_calls`，避免重复执行工具）。每会话最多 20 条，重启丢失。长期持久化属 P2 Task 16 |
| 2026-06-28 | `20260626-multi-agent-gis` | SSE 工具结果解析 | 提取 `ToolMessage.content` 后再 JSON 解析 | LangGraph `astream_events` v2 的 `on_tool_end` 返回 `ToolMessage` 对象而非字符串，直接 `json.loads` 会失败 |
| 2026-06-28 | `20260626-multi-agent-gis` | 工具复杂参数类型声明 | `geometry` / `points` / `center` 统一声明为 `str` + 内部 `_normalize_geometry` 解析 | DeepSeek-V3.2（硅基流动）调用工具时会把 dict/list 参数以 JSON 字符串传入，导致工具内 `.get()` 崩溃抛 `'str' object has no attribute 'get'`。改为 `str` 类型后，JSON Schema 明确告知 LLM 传字符串，工具内部再 `json.loads` 归一化为 dict，兼容 LLM 行为 |
| 2026-06-28 | `20260626-multi-agent-gis` | 工具校验失败事件可见性 | 新增 `on_tool_error` 事件处理分支 | LangGraph 工具参数 Pydantic 校验失败时，内部捕获异常返回 `ToolMessage` 给 LLM，**不触发 `on_tool_end`**，SSE 流看不到错误。新增 `on_tool_error` 分支输出 `success=False` 的 `tool_result` 事件，让前端能看到工具错误 |
| 2026-06-28 | `20260626-multi-agent-gis` | `on_tool_end` 输出防御 | `isinstance(parsed, dict)` 校验 | `json.loads(tool_output)` 可能返回非 dict 类型（字符串/数字/列表），直接 `.get()` 会再次崩溃。非 dict 时抛 `ValueError` 走 `except` 分支返回 `success=False` |
| 2026-06-30 | `20260626-multi-agent-gis` (P1) | 多 Agent 编排方式 | async function 顺序调度（代码级路由） | 未使用 LangGraph StateGraph 编译，改用 async function 顺序调度实现「代码级路由」。等价于 StateGraph 但流式输出更自然、调试更方便。Coordinator 串行执行子 Agent，每步通过 `_build_step_context` 注入前序 summary 和关键数据（坐标、资源列表）作为上下文 |
| 2026-06-30 | `20260626-multi-agent-gis` (P1) | 单/多 Agent 路由策略 | 双轨制：单一意图走单 Agent，mixed 走 Coordinator | 简单任务（单一意图：search/analysis/route/knowledge）走 `/api/agent/chat` 单 Agent，避免 Coordinator 意图分类+任务规划的额外 2 次 LLM 调用开销；复杂任务（多领域协同）走 `/api/agent/chat/multi` Coordinator 多 Agent 流程 |
| 2026-06-30 | `20260626-multi-agent-gis` (P1) | 非长春地区路径规划 | `online_route_planning`（OSRM 公共 API） | 长春路网只覆盖长春市区，京津冀等非长春地区路径规划必须用 OSRM 公共服务（`https://router.project-osrm.org`，免 Key）。失败时降级为直线距离 |
| 2026-06-30 | `20260626-multi-agent-gis` (P1) | 真实资源数据缺失处理 | `mock_nearby_resources` 模拟数据 + 紫灰色系视觉区分 | 当 spatial_query/feature_search 查不到医院/物资点等关键资源时，Agent 显式调用 mock_nearby_resources 生成模拟资源点。前端用紫灰色系（#94a3b8 / #a78bfa / #cbd5e1）+ 弹窗标题 [模拟] 标签区分。Agent 回复必须显式告知用户"模拟数据" |
| 2026-06-30 | `20260626-multi-agent-gis` (P1) | 资源点排序策略 | 按球面距离升序，取最近前 2 条 | 复杂任务路径规划时，对资源点（医院/物资点）按到受灾点的球面距离升序排序，取前 2 条进行路径计算（不足 2 条则全部）。距离标注在坐标列表中 |
| 2026-06-30 | `20260626-multi-agent-gis` (P1) | token 溢出根因 | 完整 GeoJSON 进 LLM 上下文 | 子 Agent ReAct 循环会把 ToolResult 完整返回（含 GeoJSON）写进 message history，多次工具调用后 token 累积到 865k 超出 LLM 上限。修复：ToolResult.to_dict() 把 geojson 剥离到 threading.local 缓存，返回给 LLM 的 dict 中 geojson=None；graph.py/agents.py 通过 pop_pending_geojson() 取出后通过 SSE 单独发给前端 |
| 2026-06-30 | `20260626-multi-agent-gis` (P1) | feature_search 返回坐标 | data.features 中加入 lng/lat | 原 features_summary 只有 displayName/dataset/region，LLM 看不到坐标，会编造坐标传给 shortest_path，导致路径规划起终点错误（路径 0.42km 而非实际 2.16km）。修复：从 geojson_features 提取 Point 坐标放入 features_summary。完整 geometry 仍保留在 geojson 字段供前端渲染（不进 LLM 上下文） |
| 2026-06-30 | `20260626-multi-agent-gis` (P1) | spatial_query 拒绝 Point 几何 | 强制走 buffer_analysis → spatial_query 流程 | 原 circle 模式让 LLM 跳过 buffer_analysis 直接传 Point 给 spatial_query，与"缓冲区分析应独立显示"规则矛盾，且虚拟事件拆分干扰 ReAct 循环导致无限重试。修复：去掉 circle 模式，spatial_query 检测到 Point 几何直接返回错误，引导 LLM 先调 buffer_analysis 取 data.geometry_brief |
| 2026-06-30 | `20260626-multi-agent-gis` (P1) | feature_type 兜底推断 | 从用户消息提取关键词 | DeepSeek-V3.2 常不传 feature_type 参数导致查到所有要素类型。修复：`_infer_feature_type_from_message` 从用户消息提取"点/线/面要素"关键词，应急救援场景（救援/应急/医院/物资/资源/避难/消防/公安/受灾/灾情等）默认 feature_type=point。在 SEARCH_PROMPT 规则 11 中明确要求应急救援场景必须传 point |
| 2026-06-30 | `20260626-multi-agent-gis` (P1) | SYSTEM_PROMPT 规则正交化 | 精简为 8 条正交规则，禁止多行示例 | 原规则 2.2 从一行扩展为多行示例后，LLM 在路径规划场景也调 spatial_query + buffer_analysis + fly_to_location（注意力分散）。修复：精简为 8 条正交规则，规则 3 明确"路径规划只调 feature_search + 路径工具，禁止调 spatial_query/buffer_analysis/fly_to_location"。**核心教训：规则必须正交不重叠，不能为某场景写多行示例** |
| 2026-06-30 | `20260626-multi-agent-gis` (P1) | 虚拟事件干扰 ReAct | 去掉虚拟 buffer_analysis 事件拆分 | spatial_query circle 模式返回的 geojson 含缓冲区 Feature，拆分出虚拟 buffer_analysis 事件后，LLM 以为系统自动做了缓冲区分析但自己没做，反复重试 spatial_query 导致无限循环（10+ 次）。修复：去掉虚拟事件拆分，让 LLM 必须走真实 buffer_analysis → spatial_query 流程 |
| 2026-06-30 | `20260626-multi-agent-gis` (P1) | summarize 节点首 token 延迟 | 用 `astream` 真流式而非 `ainvoke` | summarize 节点一次性返回完整文本，首 token 延迟较高。改用 `astream` 真流式输出，逐 token 推送给前端 |
| 2026-06-30 | `20260626-multi-agent-gis` (P1) | 闲聊响应延迟 | 跳过意图分类直接流式回答 | 闲聊类问题（问候/感谢/简单咨询）走意图分类+任务规划会引入 2 次额外 LLM 调用。修复：在 Coordinator 入口处判断是否为闲聊，是则跳过分类直接流式回答 |
