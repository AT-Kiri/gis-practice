# Project INDEX

> 项目全景图。每次交付后由 AI 自动更新。
> 你确认功能通过后，我会同步更新此文件。

---

## 变更记录

| 日期 | 变更 ID | 内容 | 涉及模块 | 状态 |
|------|---------|------|----------|------|
| — | `project-foundation` | 项目脚手架 + 基础地图 + 鹰眼 + 量算 + 图层管理 | 全部 | ✅ 完成 |
| — | `spatial-query` | 空间查询（绘制范围查询 POI） | SpatialQuery | ✅ 完成 |
| — | `spatial-analysis` | 缓冲区分析与叠置分析 | SpatialAnalysis | ✅ 完成 |
| — | `thematic-search` | 专题检索（关键字 + 行政级别分类） | FeatureSearch | ✅ 完成 |
| 2026-06-26 | `20260626-data-dashboard` | 数据大屏模块（分级地图、灾害详情、气象监控、缓冲区联动分析、路径规划） | DataDashboard | ✅ 完成 |
| 2026-06-28 | `20260626-multi-agent-gis` | 多智能体协同 GIS 应急助手（P0 阶段：单 Agent + 7 GIS 工具 + SSE 流式 + 地图自动渲染） | AgentChatPanel / agent-backend | 🔄 P0 完成，P1 进行中 |

---

## 前端组件树

### 主应用（地图操作页）

```
App.vue
├── NavSidebar.vue              # 左侧导航栏（功能切换）
└── SmMapViewer.vue             # 核心地图容器
    ├── MapToolbar.vue           # 顶部工具栏（缩放/全幅/量算）
    ├── MapOverview.vue          # 鹰眼组件
    ├── LayerManager.vue         # 图层管理面板
    ├── FeatureSearch.vue        # 专题检索面板
    ├── SpatialQuery.vue         # 空间查询面板
    ├── SpatialAnalysis.vue      # 缓冲区/叠置分析面板
    └── NetworkAnalysis.vue      # 网络分析面板
```

### 数据大屏（独立页面）

```
DataDashboardView.vue
├── DashboardMap.vue                   # 分级地图（天地图底图 + 灾害等级着色圆点 + 交互）
├── DisasterDetailPanel.vue            # 灾害详情面板（选中县区展示）
├── WeatherPanel.vue                   # 气象监控面板（表格 + 阈值标红 + 排序）
├── BufferAnalysisModal.vue            # 缓冲区联动分析弹窗（turf.js + 救援/物资模拟点）
└── RoutePlanningModal.vue             # 最优路径规划弹窗（OSRM API / 降级直线）
```

### Agent 应急助手（嵌入式组件）

```
AgentChatPanel.vue                     # 右侧滑入式聊天面板（主组件）
├── ChatMessage.vue                    # 消息气泡（用户/AI 样式区分）
└── ToolCallCard.vue                   # 工具调用卡片（进行中/完成/失败三态）

前端工具层（utils/agent/）：
├── sseClient.js                       # SSE 连接管理（自动重连、事件分发）
├── mapRenderer.js                     # Agent 结果地图渲染（橙色系，自动 fitBounds）
└── changchunBasemap.js                # 长春市底图加载器（栅格图 + 矢量路网，幂等）
```

---

## 路由表

| 路径 | 视图组件 | 说明 |
|------|----------|------|
| `/` | HomeView | 主地图页面（含全部功能组件） |
| `/flood` | FloodSimulationView | 洪涝模拟（亮点功能） |
| `/data-dashboard` | DataDashboardView | 数据大屏（分级地图、灾害详情、气象监控、缓冲区分析、路径规划） |

---

## 后端服务

### SpringBoot 后端（`backend/`）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |

当前后端极简，仅提供健康检查。后续信息管理功能按需扩展。

### Agent 后端（`agent-backend/`，FastAPI + LangGraph）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/agent/chat` | POST | Agent 对话（SSE 流式响应，事件：agent_start/tool_start/tool_result/text/agent_end/error） |
| `/api/agent/sessions/{session_id}/history` | GET | 获取会话历史（内存级，重启丢失） |
| `/api/agent/sessions/{session_id}/history` | DELETE | 清空会话历史 |

**启动方式**（必须用 venv Python）：
```bash
d:\Code\AI-Code\GIS-Practice\agent-backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**目录结构**：
```
agent-backend/app/
├── api/agent.py              # Agent 对话 API（SSE）
├── agent/graph.py            # LangGraph Agent 核心（单 Agent，P1 升级为多智能体）
├── tools/gis_tools.py        # 7 个 GIS Tool（feature_search/spatial_query/buffer/overlay/shortest_path/service_area/fly_to）
├── services/
│   ├── llm_service.py        # LLM 封装（OpenAI 兼容协议，当前接硅基流动）
│   ├── iserver_client.py     # iServer REST API 封装
│   └── session_store.py      # 内存级会话存储（短期记忆）
├── config.py                 # pydantic-settings 配置（.env 优先于进程环境变量）
└── main.py                   # FastAPI 入口 + CORS
```

**7 个 GIS 工具**：
- `feature_search`：专题检索（SQLQuery），支持 `region` 参数（auto/jingjin/changchun）
- `spatial_query`：空间查询，支持 `feature_type` 过滤（point/line/polygon/all）
- `buffer_analysis`：缓冲区分析（iServer `GeometryBufferAnalyst`，`analystParameter` 字段）
- `overlay_analysis`：叠置分析（`DatasetOverlayAnalyst`）
- `shortest_path`：最短路径（长春路网）
- `service_area`：服务区分析（长春路网）
- `fly_to_location`：地名解析 + 坐标返回

---

## 外部依赖

| 依赖 | 用途 | 版本/说明 |
|------|------|-----------|
| SuperMap iServer 11i | 地图服务 & 空间分析服务 | `http://localhost:8090/iserver` |
| `map-world` | 底图服务 | iServer 预配置 |
| `map-jingjin` | 京津冀专题地图 | iServer 预配置 |
| `map-changchun`（长春市区图） | 长春市底图 + 路网 + POI | iServer 预配置，Agent 网络分析时使用 |
| 天地图 WMTS | 数据大屏底图（矢量+注记） | 免费，`tk=f8bf399b1e49a8f6a513ff3df0005477` |
| OSRM Public API | 数据大屏路径规划（全球路网） | `https://router.project-osrm.org`，免费免 Key |
| turf.js | 缓冲区分析几何计算 | `@turf/turf` |
| 硅基流动 SiliconFlow | Agent LLM 服务 | `deepseek-ai/DeepSeek-V3.2`，兼容 OpenAI 协议，`.env` 中以 `DEEPSEEK_*` 命名配置 |
| LangGraph | Agent 编排框架 | `create_react_agent`（P0 单 Agent）；P1 升级为 StateGraph 多智能体 |
| LangChain | LLM 抽象层 + Tool 协议 | `langchain-openai` 对接硅基流动 |
| FAISS | 向量库（P1 RAG 使用） | `faiss-cpu` |
