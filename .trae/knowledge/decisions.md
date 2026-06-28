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
| 2026-06-28 | `20260626-multi-agent-gis` | `on_tool_end` 输出防御 | `isinstance(parsed, dict)` 校验 | `json.loads(tool_output)` 可能返回非 dict 类型（字符串/数字/列表），直接 `.get()` 再次崩溃。非 dict 时抛 `ValueError` 走 `except` 分支 |
