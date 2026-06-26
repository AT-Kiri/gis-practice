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
| 知识库 | `.trae/knowledge/` | 按需加载 | 项目全景 INDEX.md + 决策日志 decisions.md |
| 技能 | `.trae/skills/<skill-name>/SKILL.md` | 按需加载 | code-review、req-doc-gen 等 |

**加载原则**：
- **自动加载**：`AGENTS.md` 为全局上下文，每次提问自动加载
- **按需加载**：其他规则/技能文件根据当前任务类型选择性加载
- **显式引用**：AI Agent 在需要时应主动读取对应规则文件

---

## 3. 文档索引

| 文档 | 内容说明 |
|------|---------|
| [project-brief.md](file:///d:/Code/AI-Code/GIS-Practice/project-brief.md) | 项目概要：技术栈、数据资源、功能模块设计 |
| [project_rules.md](.trae/rules/project_rules.md) | 项目规范：目录结构、Git 提交、命名、安全 |
| [frontend_rules.md](.trae/rules/frontend_rules.md) | 前端规范：Vue 3 + AntD + SuperMap 编码规范 |
| [coding_guidelines.md](.trae/rules/coding_guidelines.md) | AI 编码行为准则：编码前思考、简洁优先、精准修改 |
| [workflows.md](.trae/docs/workflows.md) | 角色工作流、协作流程、OpenSpec 规范流程 |
| `openspec/changes/` | OpenSpec 设计文档：proposal → design → spec → tasks → checklist |
| `.trae/knowledge/` | 项目知识库：INDEX.md（全景图）+ decisions.md（决策日志） |
| `.trae/skills/` | 技能库：code-review、req-doc-gen、awesome-design-md 等 |

## 4. 项目目录结构

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
├── .trae/                  # Trae IDE 配置
│   ├── rules/              # AI 编码规范
│   ├── docs/               # 工作流 + 课程资料
│   ├── knowledge/          # 项目知识库
│   └── skills/             # AI 技能
├── openspec/               # OpenSpec 设计文档
└── .trae/docs/project/     # 课程资料（已移入 .trae）
```
