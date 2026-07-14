---
name: wiki-bootstrap
description: 从零搭建项目 wiki 知识库。Use when 用户要求初始化 wiki / 扫描代码生成 wiki 页面 / 首次建立知识库 / 在新项目中搭建 wiki 体系时。
---

# wiki-bootstrap — Wiki 知识库搭建

## 定位

为项目**首次**建立 wiki 知识库。一次性执行，完成后项目进入维护期，后续使用 `wiki-maintenance` skill。

## 触发条件

用户提到以下任何一种表述时触发：
- "从零搭建 wiki" / "初始化 wiki" / "建立知识库"
- "扫描代码生成 wiki" / "从项目代码生成 wiki"
- "在新项目中搭建 wiki"
- "给这个项目建一套 wiki"

**不触发**：日常新增/更新/归档页面（用 `wiki-maintenance`）。

---

## 前置检查

1. 读取 `.trae/wiki/spec.md`。如果不存在，使用本 skill 末尾的 **默认 spec 骨架** 生成一份，并提示用户审阅。
2. 读取 `.trae/wiki/profile.md`。如果不存在，引导用户创建（见 Step 2）。
3. 确认 `.trae/wiki/` 目录不存在或为空。如果已有 wiki 内容，提示用户改用 `wiki-maintenance`。

---

## 执行步骤

### Step 1: 创建目录结构

在项目根目录创建（**当前 7 种页面类型，不要创建废弃目录**）：

```
.trae/wiki/
├── INDEX.md
├── LOG.md
├── spec.md              ← 从默认骨架生成（如不存在）
├── profile.md           ← 引导用户创建（如不存在）
├── graph.json           ← 初始为空图
├── pages/
│   ├── components/
│   ├── views/
│   ├── entities/
│   ├── apis/
│   ├── flows/
│   ├── concepts/
│   └── services/        ← 合并了原来的 stores/tools/schemas
├── references/
│   └── auto.json        ← 初始为空
└── _archive/
```

**⚠️ 废弃目录（不要再创建）**：~~stores/~~、~~tools/~~、~~schemas/~~、~~decisions/~~、~~descriptions/~~

这些目录已被合并到现有目录：
- stores/ → services/
- tools/ → services/
- schemas/ → entities/
- decisions/ → concepts/

### Step 2: 引导创建 profile.md

`profile.md` 描述本项目的技术特征，内容由用户主导。引导用户填写：

```markdown
# Project Profile

## 技术栈
- 前端：Vue 3 + Ant Design Vue + @supermap/vue-iclient-mapboxgl
- 后端：SpringBoot + SuperMap iServer 11i
- 构建：Vite

## 目录约定
- 前端源码：`frontend/src/`
- 后端源码：`backend/src/main/java/com/gis/emergency/`
- 静态数据：`frontend/public/data/`

## 命名约定
- Vue 组件：PascalCase（如 `SmMapViewer.vue`）
- JS 文件：camelCase
- Pinia Store：camelCase（如 `map.js` → `useMapStore`）
- 路由路径：kebab-case
- 后端 Controller：PascalCase

## 关键数据源
- iServer 服务：通过 `/iserver` 代理转发
- 空间数据：Jingjin.udbx、Changchun.udbx
```

### Step 3: 初始化 INDEX.md

```markdown
# Wiki Index

> Last updated: YYYY-MM-DD | Total pages: 0

## 快速导航
- [[pages/components/|组件]] — 前端 Vue 组件
- [[pages/views/|页面]] — 路由级页面
- [[pages/entities/|实体]] — 数据结构与接口字段
- [[pages/apis/|接口]] — REST API 与 iServer 服务
- [[pages/flows/|流程]] — 业务流程与数据流
- [[pages/concepts/|概念]] — GIS 与技术概念
- [[pages/decisions/|决策]] — 架构决策记录

## 全页面列表

（扫描后自动填充）
```

### Step 4: 初始化 LOG.md

```markdown
# Wiki Log

## [YYYY-MM-DD] init | Wiki 初始化

- 操作：从零搭建 wiki 知识库
- spec.md：从默认骨架生成
- profile.md：用户创建
```

### Step 5: 扫描代码生成 stub

按 `profile.md` 中的目录约定，扫描代码目录，为每个文件生成 wiki stub。

**扫描规则**：

| 扫描目标 | 生成位置 | frontmatter type |
|---------|---------|-----------------|
| `frontend/src/components/*.vue` | `pages/components/{kebab}.md` | `component` |
| `frontend/src/views/*.vue` | `pages/views/{kebab}.md` | `view` |
| `agent-backend/app/api/*.py` | `pages/apis/{kebab}.md` | `api` |
| `agent-backend/app/services/*.py` | `pages/services/{kebab}.md` | `service` |
| `agent-backend/app/tools/*.py` | `pages/services/{kebab}.md` | `service` |
| `agent-backend/app/agent/*.py` | `pages/components/{kebab}.md` | `component` |
| `agent-backend/app/agent/nodes/*.py` | `pages/components/{kebab}.md` | `component` |
| `agent-backend/app/agent/sub_agents/*.py` | `pages/components/{kebab}.md` | `component` |
| `agent-backend/app/schemas/*.py` | `pages/entities/{kebab}.md` | `entity` |
| `agent-backend/app/config.py` | `pages/concepts/app-config.md` | `concept` |
| `agent-backend/app/main.py` | `pages/components/fastapi-main.md` | `component` |
| `backend/src/main/java/**/controller/*Controller.java` | `pages/apis/{kebab}.md` | `api` |
| `backend/src/main/java/**/entity/*.java` 或 `model/*.java` 或 `dto/*.java` | `pages/entities/{kebab}.md` | `entity` |
| `backend/src/main/java/**/service/*Service.java` | `pages/services/{kebab}.md` | `service` |
| `backend/src/main/java/**/common/R.java` | `pages/entities/response-wrapper.md` | `entity` |

**stub 模板**：

```markdown
---
title: {文件名转中文可读}
type: {按上表}
status: draft
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: []
references: []
related: []
source:
  - {代码路径}
summary: （待补充）
---

# {标题}

> 状态：draft — 待补充内容

## 基本信息

（待补充）

## 关联

（待补充）
```

**注意事项**：
- 不扫描 `node_modules/`、`dist/`、`.git/`。
- 如果文件已存在（重复执行），跳过已存在的 stub，不覆盖。
- 扫描完成后输出报告：创建了多少 stub、哪些 type 不确定需人工确认。

### Step 6: 计算初始 references

扫描所有页面的 `source` 字段，解析对应代码文件的 import 关系，反推谁引用了谁。

输出到 `.trae/wiki/references/auto.json`：

```json
{
  "generated": "YYYY-MM-DD",
  "references": {
    "pages/components/Foo.md": [
      "pages/views/Home.md"
    ]
  }
}
```

**注意**：此时只生成数据，不写回页面 frontmatter。人工审查后合并到页面的 `references` 字段。

### References 策略（仅保留业务引用）

**核心原则**：`references` 字段只记录**业务逻辑引用**，不记录代码技术导入。这确保关系图谱展示的是业务流程关联，而非代码依赖。

**技术引用黑名单**（永不自动合并）：
- `pages/services/map.md` — Pinia store 状态管理
- `pages/services/agent.md` — Pinia store 状态管理
- `pages/services/session-store.md` — 会话存储
- 任何已废弃目录（`pages/stores/`, `pages/tools/`, `pages/schemas/`, `pages/decisions/`）

**业务引用白名单示例**：
- **视图 → 组件**：`home-view` → `sm-map-viewer`（页面使用了组件）
- **流程 → 组件/视图**：`agent-emergency` → `agent-coordinator`（业务流程涉及）
- **API → 实体**：`iserver-buffer` → `buffer-analysis`（API 返回概念）
- **概念 → 流程**：`buffer-analysis` → `buffer-analysis flow`（概念在流程中应用）

**过滤规则**（wiki-merge-refs.js）：
1. 排除 `pages/stores/` 目录（已废弃）
2. 排除黑名单中的纯技术模块
3. 排除 services 内部互相引用
4. 排除 concepts 间互相引用
5. 保留 views/components/apis/flows 之间的业务引用

### Step 7: 输出构建报告

```
✅ Wiki 搭建完成

📊 统计：
- 创建 stub 页面：N 个
  - components: N
  - views: N
  - entities: N
  - apis: N
- 跳过（已存在）：N 个
- 不确定 type：N 个（请人工确认）

📂 目录：.trae/wiki/

📋 后续步骤：
1. 审阅 .trae/wiki/spec.md，确认规范符合项目需求
2. 审阅 .trae/wiki/profile.md，补充项目特征
3. 选 3-5 个核心页面，从 stub 补充为完整内容
4. 审查 references/auto.json，合并到页面 frontmatter
5. 日常维护使用 wiki-maintenance skill
```

---

## 默认 spec 骨架

当 `.trae/wiki/spec.md` 不存在时，用以下内容生成初始版本：

```markdown
# Wiki Specification

## Frontmatter 必需字段

```yaml
---
title: 页面标题
type: component | view | entity | api | flow | concept | decision | change
status: stable | draft | deprecated
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: []
references: []
related: []
source: []
summary: 一句话摘要
---
```

## type 枚举

| 值 | 含义 |
|----|------|
| `component` | Vue 组件 / FastAPI 核心模块（main/coordinator/agent/graph/nodes） |
| `view` | 路由级页面 |
| `service` | 后端服务（Java Service / Python Tool / RAG / LLM / iServer 客户端） |
| `entity` | 数据结构 / Schema / 接口入参出参 |
| `api` | REST API / iServer 服务接口 |
| `flow` | 业务流程 / 数据流（Mermaid） |
| `concept` | 技术概念 / ADR 架构决策 |

**⚠️ 已废弃**：~~store~~、~~tool~~、~~schema~~、~~decision~~（已合并到上表）

## status 枚举

| 值 | 含义 |
|----|------|
| `stable` | 内容稳定，可引用 |
| `draft` | 草稿，待补充 |
| `deprecated` | 已废弃，即将归档 |

## 链接语法

- **同库引用**：`[[page-slug]]`（如 `[[SmMapViewer]]`）
- **跨库/外链**：标准 markdown 链接 `[text](url)`
- **代码引用**：放 `source` 字段，不在正文出现代码路径

## 命名规范

- 文件名：kebab-case（如 `sm-map-viewer.md`）
- 目录名：kebab-case（如 `pages/components/`）

## Mermaid 支持

正文中的 ````mermaid` 代码块会被渲染。VS Code 装 `Markdown Preview Mermaid Support` 插件即可预览。

## 模板

- 业务流程图模板：`pages/flows/_template.md`
```

---

## Checklist

```
□ 读取 spec.md（或生成默认骨架）
□ 读取/创建 profile.md
□ 创建目录结构
□ 初始化 INDEX.md
□ 初始化 LOG.md
□ 扫描代码生成 stub
□ 计算 references/auto.json
□ 输出构建报告
```
