# AGENTS.md — 京津冀城市综合防灾应急管理 GIS 项目入口

> 本文件是 AI Agent 的入口导航，定义项目上下文加载机制和文档索引。

---

## 1. 项目简介

京津冀城市综合防灾应急管理项目，采用 **Vue3 + SuperMap iClient (Vue-iClient-MapboxGL) + SpringBoot** 技术栈，数据使用 SuperMap iDesktopX 2025 处理，通过 SuperMap iServer 11i 发布服务。

**核心功能模块**：
- **基本地图功能**：全幅显示、缩放平移、鹰眼、量算、图层管理
- **空间查询**：按绘制范围查询 POI、结果标绘
- **专题检索**：关键字查询、行政级别分级检索
- **缓冲区与叠置分析**：辐射范围分析、土地利用叠置分析
- **网络分析**：最短路径分析、服务区分析
- **亮点特色**：土地利用变化对比、人口分布专题图、3D 场景展示

**项目概要文档**：[project-brief.md](file:///d:/Code/AI-Code/GIS-Practice/project-brief.md)

---

## 2. 上下文加载机制

| 层级 | 文件/目录 | 加载方式 | 作用 |
|------|----------|---------|------|
| 入口 | `AGENTS.md` | 自动加载 | 项目入口、导航索引 |
| 规则 | `.trae/rules/project_rules.md` | 自动加载 | Git 规范、命名规范、目录结构、安全规范 |
| 规则 | `.trae/rules/coding_guidelines.md` | 按需加载 | AI 编码行为准则 |
| 规则 | `.trae/rules/frontend_rules.md` | 按需加载 | Vue 3 + AntD + SuperMap 编码规范 |
| 文档 | `.trae/docs/workflows.md` | 按需加载 | 角色工作流、OpenSpec 规范流程 |
| 规范 | `openspec/changes/<change-id>/` | 按需加载 | 单次变更的方案设计、规格、任务、验收清单 |
| **知识库** | **`.trae/wiki/`** | **按需加载** | **Wiki 知识库（82 页面）** |
| **可视化** | **`.trae/wiki/wiki-site/index.html`** | **浏览器打开** | **Wiki HTML 站点 + Obsidian 风格关联图谱** |
| 技能 | `.trae/skills/<skill-name>/SKILL.md` | 按需加载 | code-review、req-doc-gen、wiki-bootstrap、wiki-maintenance 等 |

**加载原则**：
- **自动加载**：`AGENTS.md` 为全局上下文，每次提问自动加载
- **按需加载**：其他规则/技能文件根据当前任务类型选择性加载
- **知识库优先**：回答功能相关问题时，优先读取 `.trae/wiki/` 下的页面
- **显式引用**：AI Agent 在需要时应主动读取对应规则文件

---

## 3. Wiki 知识库索引

> **路径**：`.trae/wiki/` | **可视化**：`.trae/wiki/wiki-site/index.html`（浏览器打开）

### 3.1 节点类型（6 种）

| 类型 | 颜色 | 数量 | 说明 |
|------|------|------|------|
| **component** | 🟣 紫色 | 37 | 所有代码实现（按 tech 子分类） |
| **view** | 🔵 蓝色 | 8 | 路由级页面 |
| **entity** | 🟠 橙色 | 6 | 数据结构、Schema |
| **api** | 🟢 绿色 | 12 | HTTP API 契约 |
| **flow** | 🔵 青色 | 7 | 业务流程 |
| **concept** | 🩷 粉色 | 12 | 技术概念、ADR |

### 3.2 核心页面速查

| 场景 | 推荐页面 |
|------|---------|
| 了解地图组件 | `pages/components/sm-map-viewer.md` |
| 了解首页 | `pages/views/home-view.md` |
| 了解缓冲区分析 | `pages/flows/buffer-analysis.md` |
| 了解空间查询 | `pages/flows/spatial-query.md` |
| 了解网络分析 | `pages/flows/network-analysis.md` |
| 查看实体字段 | `pages/entities/coord-response.md` 等 |
| 查看 API 接口 | `pages/apis/coord-response.md` 等 |
| 理解技术概念 | `pages/concepts/buffer-analysis.md` 等 |
| 查看技术决策 | `pages/concepts/adr-001.md` 等 |

### 3.3 可视化站点

运行 `node .trae/skills/wiki-bootstrap/scripts/wiki-build.js` 重新生成 `.trae/wiki/wiki-site/index.html`。

功能：
- 📄 页面视图：Markdown 渲染 + Mermaid 图表 + 引用关系
- 🕸️ 关联图谱：D3.js 力导向图，Obsidian 风格
  - 默认缩放 70%，居中显示
  - 滚轮缩放（0.1x - 5x）
  - 拖拽节点调整布局
  - 点击节点跳转到页面
  - 右上角图例显示节点类型
  - 放大/缩小/重置/显示标签按钮
  - 孤立节点半透明显示，分布在边缘

---

## 4. 文档索引

| 文档 | 内容说明 |
|------|---------|
| [project-brief.md](file:///d:/Code/AI-Code/GIS-Practice/project-brief.md) | 项目概要：技术栈、数据资源、功能模块设计 |
| [project_rules.md](.trae/rules/project_rules.md) | 项目规范：目录结构、Git 提交、命名、安全 |
| [frontend_rules.md](.trae/rules/frontend_rules.md) | 前端规范：Vue 3 + AntD + SuperMap 编码规范 |
| [coding_guidelines.md](.trae/rules/coding_guidelines.md) | AI 编码行为准则：编码前思考、简洁优先、精准修改 |
| [workflows.md](.trae/docs/workflows.md) | 角色工作流、协作流程、OpenSpec 规范流程 |
| `openspec/changes/` | OpenSpec 设计文档：proposal → design → spec → tasks → checklist |
| `.trae/wiki/` | **Wiki 知识库（82 页面）** |
| `.trae/wiki/wiki-site/index.html` | **Wiki 可视化站点** |
| `.trae/skills/` | 技能库：code-review、req-doc-gen、wiki-bootstrap、wiki-maintenance 等 |

## 5. 项目目录结构

```
GIS-Practice/
├── frontend/               # Vue3 前端
│   ├── src/
│   │   ├── components/     # 功能组件（地图、量算、分析等）
│   │   ├── views/          # 页面视图
│   │   ├── router/         # 路由配置
│   │   ├── stores/         # Pinia 状态管理
│   │   └── utils/          # 工具函数
│   └── public/data/        # 静态地理数据
├── backend/                # SpringBoot 后端
│   └── src/main/java/com/gis/emergency/
│       ├── controller/     # REST API
│       ├── config/         # 配置
│       ├── common/         # 通用响应
│       └── util/           # 工具类
├── agent-backend/          # FastAPI Agent 后端
│   └── app/
│       ├── api/            # Agent/RAG API
│       ├── agent/          # 多智能体协同
│       ├── services/       # LLM/RAG/iServer 服务
│       ├── tools/          # LangChain 工具
│       └── schemas/        # 数据模型
├── .trae/                  # Trae IDE 配置
│   ├── rules/              # AI 编码规范
│   ├── docs/               # 工作流 + 课程资料
│   ├── wiki/               # Wiki 知识库
│   │   ├── INDEX.md        # 导航索引
│   │   ├── spec.md         # 规范定义
│   │   ├── profile.md      # 项目特征
│   │   ├── pages/          # 所有页面（按类型分目录）
│   │   └── wiki-site/      # 可视化站点
│   │       └── index.html
│   └── skills/             # AI 技能
│       ├── wiki-bootstrap/ # 搭建 wiki
│       └── wiki-maintenance/ # 维护 wiki
├── openspec/               # OpenSpec 设计文档
└── .trae/docs/project/     # 课程资料（已移入 .trae）
```
