# Wiki Specification

## Frontmatter 必需字段

```yaml
---
title: 页面标题
type: component | view | entity | api | flow | concept
status: stable | draft | deprecated
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: []
references: []
related: []
source: []
summary: 一句话摘要
---

## type 枚举

| 值 | 含义 |
|----|------|
| `component` | 所有代码实现：Vue 组件 / FastAPI 核心 / Java Service / Python 服务 / Pinia Store |
| `view` | 路由级页面 |
| `entity` | 数据结构 / Schema / 接口入参出参 |
| `api` | HTTP 接口契约（URL + Request/Response JSON） |
| `flow` | 业务流程 / 数据流（Mermaid） |
| `concept` | 技术概念 / 架构决策 |

**⚠️ 已废弃**：~~service~~（已合并到 component）

## component 子分类（tech 字段）

| tech 值 | 含义 | 颜色 |
|---------|------|------|
| `vue` | Vue 3 组件 | 🟢 绿色 |
| `fastapi` | FastAPI 核心模块 | 🟠 橙色 |
| `java` | Java后端 Service | 🔴 红色 |
| `python` | Python 服务/工具 | 🔵 蓝色 |
| `store` | Pinia Store | 🟡 黄色 |

## status 枚举

| 值 | 含义 |
|----|------|
| `stable` | 内容稳定，可引用 |
| `draft` | 草稿，待补充 |
| `deprecated` | 已废弃，即将归档 |

## 链接语法

- **同库引用**：`[[pages/type/slug]]`
- **跨库/外链**：标准 markdown 链接 `[text](url)`
- **代码引用**：放 `source` 字段，不在正文出现代码路径

## 命名规范

- 文件名：kebab-case（如 `sm-map-viewer.md`）
- 目录名：kebab-case（如 `pages/components/`）

## Mermaid 支持

正文中的 ````mermaid` 代码块会被渲染。VS Code 装 `Markdown Preview Mermaid Support` 插件即可预览。

## 模板

- 业务流程图模板：`pages/flows/_template.md`
