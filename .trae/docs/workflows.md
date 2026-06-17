# Agent 工作流

> 定义 AI Agent 在本项目中的角色分工、协作流程和规范体系。
> 适用：京津冀城市综合防灾应急管理 GIS 项目（Vue3 + SuperMap iClient + SpringBoot）

---

## 1. Agent Roles

| 角色 | 职责 | 输入 | 输出 |
|------|------|------|------|
| **Architect** | 方案设计、知识库维护、代码审查 | 用户需求 | proposal.md、design.md、spec、tasks.md、checklist.md、知识库更新 |
| **Developer** | 前端编码为主、后端按需 | tasks.md、design.md | 功能代码、测试验证 |

本项目为单人/小组课设，前后端通常一人完成，不再拆分 Frontend / Backend / QA 独立角色。

---

## 2. 协作流程

> **工作流生效标识**：每次进入新需求时，我会明确告知当前所处的 Phase 和 Step（如 "进入 Phase 1 Step 1：编写 proposal.md"），你可以据此确认工作流是否被真正执行。

```
拿到一个需求
    │
    ▼
┌─ Phase 1: 需求分析与设计（OpenSpec）────────────────────────────────────┐
│  Step 1: proposal.md — 需求论证（为什么做、做什么、影响范围）            │
│  Step 2: design.md   — 技术设计（目标边界、方案对比、技术决策）          │
│  Step 3: specs/*/spec.md — 行为规格（Given/When/Then 场景）             │
│  → 产出存放在 openspec/changes/<change-id>/                              │
│  → 每一步先给你确认，再往下走                                            │
└────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─ Phase 2: 任务与验收规划 ──────────────────────────────────────────────┐
│  Step 1: tasks.md — 任务拆解清单（优先级、依赖关系）                    │
│  Step 2: checklist.md — 验收检查清单（功能验收、边界情况、规范检查）     │
│  → 产出存放在 openspec/changes/<change-id>/                              │
│  → 给你确认后再进入编码                                                  │
└────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─ Phase 3: 编码实现 ────────────────────────────────────────────────────┐
│  按 tasks.md 执行                                                        │
│  → Developer 以前端为主（Vue3 + Ant Design Vue + SuperMap）              │
│  → 后端按需扩展（SpringBoot REST API）                                   │
│  → 遵循 project_rules.md / frontend_rules.md 规范                        │
└────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─ Phase 4: 验收与知识同步 ──────────────────────────────────────────────┐
│  Step 1: 核对 checklist.md 逐项验收                                     │
│  Step 2: 【Skill】code-review → 代码审查                                │
│  Step 3: 同步更新 .trae/knowledge/INDEX.md + decisions.md（你确认后）   │
│  Step 4: git commit （采用 Angular 风格提交信息）                        │
│  → 更新后我会告诉你，你可以花 1 分钟审查知识库                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Spec-Driven Workflow（OpenSpec）

本项目采用 **OpenSpec** 规范驱动开发，每次变更的完整设计文档存放在 `openspec/changes/<change-id>/` 目录下。

### 3.1 目录结构

```text
openspec/
└── changes/<change-id>/
    ├── .openspec.yaml              # 元数据（schema、created、parent 依赖）
    ├── proposal.md                 # 需求论证——Why / What / Capabilities / Impact
    ├── design.md                   # 技术设计——Context / Goals-NonGoals / Decisions
    ├── specs/<module>/             # 行为规格（可含多个模块，按模块拆分）
    │   └── spec.md                 # Given/When/Then 场景定义
    ├── tasks.md                    # 实现清单——可执行任务项、优先级、依赖
    └── checklist.md                # 验收清单——功能验收、边界测试、规范检查
```

### 3.2 变更 ID 规范

| 类型 | 格式 | 示例 |
|------|------|------|
| **新变更（推荐）** | `{YYYYMMDD}-{short-desc}` | `20260617-network-analysis` |
| **已有变更** | 保持原名不动 | `project-foundation`、`spatial-query` |

- `short-desc` 用小写字母 + 连字符，简洁描述变更内容
- 已有变更不改名，避免路径引用断裂

### 3.3 文件说明

| 文件 | 内容要求 | 责任人 |
|------|----------|--------|
| `.openspec.yaml` | schema 版本、创建时间、父变更依赖（如有） | Architect |
| `proposal.md` | **需求论证**：Why（业务背景）、What（变更内容）、Capabilities（新增/修改能力）、Impact（影响范围） | Architect |
| `design.md` | **技术设计**：Context（上下文）、Goals/Non-Goals（目标与边界）、Decisions（方案对比与选型理由） | Architect |
| `specs/*/spec.md` | **行为规格**：每个模块独立文件，用 Given/When/Then 定义场景；覆盖正常、异常、边界三种情况 | Architect |
| `tasks.md` | **实现清单**：可执行任务项、优先级、依赖关系、状态跟踪 | Architect |
| `checklist.md` | **验收清单**：功能验收、边界情况、规范检查、自测结果 | Architect |

### 3.4 工作流约束

1. **编码前**：proposal.md → design.md → specs/*/spec.md → tasks.md → checklist.md **必须全部完成**
2. **编码中**：严格按照 `tasks.md` 执行任务，每完成一项标注完成状态
3. **编码后**：逐条核对 `checklist.md`，全部通过方可进入评审
4. **评审后**：根据评审意见更新对应文档，形成闭环

---

## 4. 规则与 Skill

### 4.1 规则（Rules）加载机制

| 规则文件 | 加载方式 | 适用范围 | 约束内容 |
|----------|----------|----------|----------|
| `project_rules.md` | 自动加载 | 全项目 | 目录结构、Git 规范、命名规范、安全规范 |
| `coding_guidelines.md` | 按需加载 | AI 行为 | AI 编码行为准则（简洁优先、精准修改等） |
| `frontend_rules.md` | 按需加载 | Vue 前端 | 组件规范、UI 规范、SuperMap 集成规范 |

**加载原则**：
- **自动加载**：`project_rules.md` 为全局上下文，每次提问自动加载
- **按需加载**：其他规则文件根据当前任务类型选择性加载
- **显式引用**：AI Agent 在需要时应主动读取对应规则文件

### 4.2 Skill 调用对照表

| Skill | 调用时机 | 输出 |
|-------|----------|------|
| `code-review` | 编码完成后 | 代码审查报告 |
| `req-doc-gen` | 需要生成需求文档时（按需） | 需求文档 |
| `awesome-design-md-main` | 需要参考知名网站 UI 设计风格时 | 设计参考 |
| `wiki-maintenance` | 更新 wiki 知识库时 | wiki 页面 |

---

## 5. Architect 工作流

**触发条件**：
- 用户发起新需求请求
- 需要方案设计评审

**执行步骤**：

```text
接收需求
    │
    ▼
Step 1: 需求分析
    - 理解用户需求，明确目标
    - 判断需求类型：新功能 / 优化 / 重构 / Bug 修复
    - Bug 修复 → 跳过设计流程，直接定位修复
    - 新功能/重构 → 进入 Step 2
    │
    ▼
Step 2: OpenSpec 方案设计
    - 编写 `proposal.md`（需求论证）
    - 提交用户确认
    - 编写 `design.md`（技术设计、方案对比）
    - 提交用户确认
    - 编写 `specs/*/spec.md`（行为规格）
    │
    ▼
Step 3: 任务与验收规划
    - 编写 `tasks.md`（任务拆解、优先级、依赖）
    - 编写 `checklist.md`（验收标准）
    - 提交用户确认后进入编码
    │
    ▼
Step 4: 验收与知识库同步
    - 核对 checklist.md
    - 【Skill】运行 code-review
    - 修复审查问题
    - 用户确认功能通过
    - 更新 `.trae/knowledge/INDEX.md` 和 `decisions.md`
    - git commit
```

**输出标准**：
- proposal.md 必须包含：Why（背景）、What（变更内容）、Capabilities、Impact
- design.md 必须包含：Context、Goals/Non-Goals、Decisions（方案对比）
- specs/*/spec.md 必须包含：Given/When/Then 场景定义（正常/异常/边界）
- tasks.md 必须包含：可执行的任务项、明确的优先级、依赖关系
- checklist.md 必须包含：可量化的验收标准

---

## 6. Developer 工作流

**触发条件**：
- tasks.md 中分配了开发任务
- 用户直接请求功能开发
- Bug 修复

**执行步骤**：

```text
接收开发任务
    │
    ▼
Step 1: 理解方案
    - 读取 design.md 理解技术设计
    - 读取 specs/*/spec.md 理解行为规格
    - 读取 tasks.md 明确任务
    │
    ▼
Step 2: 编码实现
    - 【Rule】按 frontend_rules.md 规范编码
    - 前端：Vue 3 + Composition API + Ant Design Vue
    - 地图：@supermap/vue-iclient-mapboxgl
    - 后端：按需扩展 SpringBoot REST API
    │
    ▼
Step 3: 自测
    - 前端功能正常（地图渲染、交互、组件切换）
    - 接口调用正确（后端 / iServer）
    - 逐条核对 checklist.md
    │
    ▼
Step 4: 交付
    - 【Skill】运行 code-review → 修复问题
    - 提交验证结果给 Architect
```

**输出标准**：
- 代码遵循 frontend_rules.md / project_rules.md 规范
- 功能正常通过 checklist.md 验收
- 代码审查 P0 级别问题数为 0
