# AGENTS.md — pad-market 项目入口

> 本文件是 AI Agent 的入口导航，定义项目上下文加载机制和文档索引。
> 具体规范和工作流详见各规则文件。

---

## 1. 项目简介

pad-market 是河南电信 PAD 营销系统，采用 Java Spring Boot + Vue 2 技术栈，使用 SVN 进行版本管理，PostgreSQL 数据库，Redis 缓存，Apollo 配置中心。

详细技术栈和目录结构见 [project_rules.md §1 项目概览](.trae/rules/project_rules.md#1-项目概览)。

---

---

## 2. 上下文加载机制

| 层级 | 文件/目录                              | 加载方式   | 作用                                     |
|------|----------------------------------------|------------|------------------------------------------|
| 入口 | `AGENTS.md`                            | 自动加载   | 项目入口、导航索引                       |
| 规则 | `.trae/rules/project_rules.md`         | 自动加载   | 命名规范、SVN 工作流、目录结构、安全规范  |
| 规则 | `.trae/rules/backend_rules.md`         | 按需加载   | Java 后端编码规范                        |
| 规则 | `.trae/rules/frontend_rules.md`        | 按需加载   | Vue 前端编码规范                         |
| 规则 | `.trae/rules/coding_guidelines.md`     | 按需加载   | AI 编码行为准则（简洁优先、精准修改等）   |
| 文档 | `.trae/docs/workflows.md`              | 按需加载   | 角色工作流、协作流程、Spec-Driven 工作流  |
| 技能 | `.trae/skills/<skill-name>/SKILL.md`   | 按需加载   | 特定技术栈的操作指南、模板、复用模式     |
| 规范 | `.trae/specs/<change-id>/`             | 按需加载   | 单次变更的详细需求、任务、验收清单       |

**加载原则**：
- **自动加载**：`AGENTS.md` + `project_rules.md` 为全局上下文，每次提问自动加载
- **按需加载**：其他规则文件根据当前任务类型选择性加载，减少上下文噪音
- **显式引用**：AI Agent 在需要时应主动读取对应规则文件，而非依赖自动加载

---

## 3. 文档索引

| 文档                                       | 内容说明                                                         |
|--------------------------------------------|------------------------------------------------------------------|
| [project_rules.md](.trae/rules/project_rules.md) | 项目全局规则：命名规范、SVN 工作流、目录结构、安全规范、模块权限、常用命令 |
| [workflows.md](.trae/docs/workflows.md)    | 角色工作流、协作流程（5 Phase）、技能体系、Spec-Driven 工作流     |
| [backend_rules.md](.trae/rules/backend_rules.md) | Java 后端编码规范：分层、MyBatis、接口调用、注释                 |
| [frontend_rules.md](.trae/rules/frontend_rules.md) | Vue 前端编码规范：组件、API 封装、样式、注释                     |
| [coding_guidelines.md](.trae/rules/coding_guidelines.md) | AI 编码行为准则：编码前思考、简洁优先、精准修改、目标驱动执行     |
| `.trae/skills/`                            | 技能库：biz-logic-trace、sync-code-trace、code-review 等         |
| `.trae/specs/`                             | 需求规格目录：spec.md、tasks.md、checklist.md                    |
