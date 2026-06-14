# Agent 角色工作流

> 本文件定义每个 Agent 角色的详细工作流、协作流程、技能体系和 Spec-Driven 工作流。
> 放置位置：`.trae/docs/workflows.md`

---

## 1. Agent Roles

| 角色             | 职责                             | 输入                      | 输出                          |
|------------------|----------------------------------|---------------------------|-------------------------------|
| **Architect**    | 技术决策、架构设计、代码评审       | 需求文档、技术难点        | 技术方案、设计图、评审意见    |
| **Frontend Dev** | Vue 组件开发、页面实现、接口联调   | UI 设计稿、API 文档       | Vue 组件、Store、SCSS         |
| **Backend Dev**  | Java API 开发、数据库设计          | 需求文档、数据库设计      | Controller、Service、SQL 脚本 |
| **QA**           | 测试用例设计、单元/集成测试        | 需求文档、开发完成的代码  | 测试用例、测试报告、Bug 清单  |

---

## 2. 协作流程

```
Phase 1: 业务理解
    【Skill】biz-logic-trace → 分析现有业务逻辑 → 生成 .trae/biz-logic/{业务}/flow.md
    │                                           → 同步更新 crm-domain-map.json / interface-catalog.json
    ▼
Phase 2: 需求文档生成（可选）
    【Skill】req-doc-gen → 基于现有业务逻辑生成需求文档
    │                     → 生成 .trae/req-docs/{需求ID}/requirement.md
    ▼
Phase 3: 需求设计
    /spec 命令 → 参考 requirement.md 和 flow.md 编写技术设计
    │           → 生成 spec.md / tasks.md / checklist.md
    ▼
Phase 4: 编码实现
    按 tasks.md 执行 → 按角色职责分工 → 遵循 project_rules.md 规范
    │
    ▼
Phase 5: 评审交付
    【Skill】code-review → 生成 review.md → 修复问题 → 逐条核对 checklist.md
    │
    ▼
Phase 6: 文档同步
    【Skill】sync-code-trace → SVN update → 匹配变更 → 增量更新 biz-logic / crm-domain-map / interface-catalog
```

### 2.1 上下文传递机制

| 层级 | 文件/目录                              | 加载方式   | 作用                                     |
|------|----------------------------------------|------------|------------------------------------------|
| 入口 | `AGENTS.md`                            | 自动加载   | 项目入口、导航索引                       |
| 规则 | `.trae/rules/project_rules.md`         | 自动加载   | 命名规范、SVN 工作流、目录结构、安全规范  |
| 规则 | `.trae/rules/backend_rules.md`         | 按需加载   | Java后端编码规范（执行后端任务时读取）   |
| 规则 | `.trae/rules/frontend_rules.md`        | 按需加载   | Vue前端编码规范（执行前端任务时读取）    |
| 文档 | `.trae/docs/workflows.md`              | 按需加载   | Agent角色工作流（执行对应角色任务时读取）|
| 技能 | `.trae/skills/<skill-name>/SKILL.md`   | 按需加载   | 特定技术栈的操作指南、模板、复用模式     |
| 规范 | `.trae/specs/<change-id>/`             | 按需加载   | 单次变更的详细需求、任务、验收清单       |
| 需求 | `.trae/req-docs/<change-id>/`          | 按需加载   | 二次开发需求文档（requirement.md）       |

**加载原则**：
- **自动加载**：`AGENTS.md` + `project_rules.md` 为全局上下文，每次提问自动加载
- **按需加载**：其他规则文件根据当前任务类型选择性加载，减少上下文噪音
- **显式引用**：AI Agent 在需要时应主动读取对应规则文件，而非依赖自动加载

### 2.2 技能体系说明

本项目技能体系针对"核心业务数据在 CRM，通过 HTTP 接口交互"的架构特点设计：

| 技能                | 解决的问题                                   | 对应 PDF 方法论                  |
|---------------------|----------------------------------------------|----------------------------------|
| `biz-logic-trace`   | 消除业务理解不确定性：查询某业务的前后端全链路流程，生成文档并同步更新 domain-map 和 interface-catalog | 全链路追踪 |
| `interface-catalog` | 消除接口调用不确定性：URL、入参、响应结构（含CRM及所有外围系统） | `metadata-graph`（迁移到接口层） |
| `crm-domain-map`    | 消除业务流程不确定性：接口调用顺序、依赖关系（含CRM及所有外围系统） | `acct-user-query`（迁移到接口层）|
| `sync-code-trace`   | 消除文档滞后不确定性：拉取 SVN 最新代码，匹配变更并增量更新业务文档 | 文档同步 |
| `code-review`       | 自动代码审查，检查规范合规性                 | Checklist                        |
| `api-doc-gen`       | 自动生成 API 文档                            | —                                |
| `req-doc-gen`       | 基于现有业务逻辑生成二次开发需求文档          | 需求文档生成                      |

### 2.3 研发流程与技能触发点

```text
拿到一个需求
    │
    ▼
┌─ Phase 1: 业务理解 ──────────────────────────────────────────────────────┐
│  触发指令："帮我梳理 [某某] 业务逻辑"                                      │
│  【Skill】biz-logic-trace                                                 │
│    → 搜索前后端代码，构建前后端穿插调用流程图                                │
│    → 生成 .trae/biz-logic/{业务}/flow.md                                  │
│    → 同步更新 crm-domain-map.json（新增/更新业务域）                        │
│    → 同步更新 interface-catalog.json（新增/更新外部接口）                    │
└──────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─ Phase 2: 需求文档生成（可选）─────────────────────────────────────────────┐
│  触发指令："基于 [某某] 业务，帮我写一个需求文档"                           │
│  【Skill】req-doc-gen                                                     │
│    → 读取 .trae/biz-logic/{业务}/flow.md 现有业务逻辑                        │
│    → 结合用户需求分析变更影响范围                                           │
│    → 生成 .trae/req-docs/{需求ID}/requirement.md（需求文档）                 │
└──────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─ Phase 3: 需求设计 ──────────────────────────────────────────────────────┐
│  触发指令：/spec 命令                                                      │
│    → 参考 Phase 1 生成的 flow.md 和 Phase 2 生成的 requirement.md           │
│    → 生成 spec.md（技术设计文档）                                           │
│    → 生成 tasks.md（任务拆解清单）                                          │
│    → 生成 checklist.md（验收检查清单）                                      │
└──────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─ Phase 4: 编码实现 ──────────────────────────────────────────────────────┐
│  按 tasks.md 执行任务                                                      │
│    → Backend Dev：修改 pad-marketing-service-henan 模块                    │
│    → Frontend Dev：修改 pad-marketing-mobile-app 目录                      │
│    → 遵循 project_rules.md / backend_rules.md / frontend_rules.md 规范     │
│    → 如涉及新增外部接口，编码完成后由 sync-code-trace 自动同步              │
└──────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─ Phase 5: 评审交付 ──────────────────────────────────────────────────────┐
│  【Skill】code-review → 生成 review.md                                     │
│    → 修复评审问题                                                           │
│    → 逐条核对 checklist.md                                                 │
│    → 【Skill】api-doc-gen → 生成/更新 API 文档（如涉及）                    │
│    → SVN commit 提交代码                                                    │
└──────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─ Phase 6: 文档同步 ──────────────────────────────────────────────────────┐
│  触发指令："帮我拉取最新代码"                                               │
│  【Skill】sync-code-trace                                                  │
│    → svn update 拉取后端/前端最新代码                                       │
│    → 分析 SVN 变更文件，匹配已有文档                                        │
│    → 增量更新 .trae/biz-logic/ 下的 flow.md（匹配到的）                     │
│    → 增量更新 crm-domain-map.json（匹配到的业务域）                          │
│    → 增量更新 interface-catalog.json（匹配到的接口）                         │
│    → 记录本次 SVN 版本号到 last-sync.json                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Spec-Driven Workflow

### 3.1 目录结构

#### 需求文档目录（Phase 2 生成）

```text
.trae/req-docs/<change-id>/
└── requirement.md  # 二次开发需求文档（基于现有业务逻辑生成）
```

#### 技术规格目录（Phase 3 生成）

```text
.trae/specs/<change-id>/
├── spec.md        # 技术设计文档（必须）
├── tasks.md       # 任务拆解清单（必须）
├── checklist.md   # 验收检查清单（必须）
├── review.md      # 代码审查报告（编码后生成）
└── db/            # 数据库变更脚本目录（按需）
    ├── V<version>__<description>.sql
    └── rollback_V<version>__<description>.sql
```

### 3.2 文件说明

| 文件             | 内容要求                                                                                 | 责任人                           |
|------------------|------------------------------------------------------------------------------------------|----------------------------------|
| `requirement.md` | 需求文档：基于现有业务逻辑的二次开发需求，包含变更范围、详细设计、验收标准、风险分析     | AI / Architect（Phase 2 生成）   |
| `spec.md`        | 技术设计：技术方案、接口定义（入参/出参）、数据模型、边界条件、异常处理、CRM 调用链设计   | Architect                        |
| `tasks.md`       | 任务拆分：优先级、依赖关系、预估工时、指派角色                                           | Architect / 项目经理             |
| `checklist.md`   | 验收标准：功能验收、接口规范、代码规范、数据库、文档                                     | QA / Architect                   |
| `review.md`      | 代码审查报告（问题列表、严重程度、修复建议、审查统计）                                   | AI / Architect（编码后自动生成） |
| `db/*.sql`       | 数据库变更脚本、回滚脚本                                                                 | Backend Dev / DBA                |

### 3.3 工作流约束

1. **编码前**：`spec.md`、`tasks.md`、`checklist.md` 必须全部完成并通过评审
    - 业务需求理解通过 Phase 1 的 `biz-logic-trace` 生成的 `flow.md` 完成
    - 如进行了 Phase 2 需求文档生成，则参考 `requirement.md` 编写技术设计
    - `spec.md`（技术设计）由 Architect 编写，基于 `flow.md` 和 `requirement.md` 设计技术方案
    - 用户执行 `/spec` 命令生成 `tasks.md` 和 `checklist.md`
2. **编码中**：严格按照 `tasks.md` 执行任务，每日更新任务状态
3. **编码后**：逐条核对 `checklist.md`，全部通过方可进入评审；运行 `code-review` Skill 生成 `review.md`
4. **评审后**：根据评审意见更新 spec / tasks / checklist / review.md / db，形成闭环
5. **文档同步**：编码完成后执行 `sync-code-trace`，自动同步更新 `crm-domain-map.json` 和 `interface-catalog.json`

### 3.4 变更 ID 规范

- 格式：`{date}-{short-desc}`，例如：`20260511-user-login-optimization`
- 或关联需求系统 ID：`REQ-2025-001`
- 变更 ID 全局唯一

---

## 4. 规则与 Skill 调用说明

### 4.1 规则（Rules）加载机制

| 规则文件            | 加载方式   | 适用范围  | 约束内容                                         |
|---------------------|------------|-----------|--------------------------------------------------|
| `project_rules.md`  | 自动加载   | 全项目    | 命名规范、SVN 工作流、目录结构、安全规范、模块权限 |
| `backend_rules.md`  | 按需加载   | Java 后端 | 分层规范、MyBatis 规范、接口调用规范（第6章）、注释规范 |
| `frontend_rules.md` | 按需加载   | Vue 前端  | 组件规范、API 封装规范、样式规范、注释规范       |
| `workflows.md`      | 按需加载   | 角色执行  | 各角色工作流、触发条件、决策点                   |

**加载原则**：
- **自动加载**：`project_rules.md` 为全局上下文，每次提问自动加载
- **按需加载**：其他规则文件根据当前任务类型选择性加载，减少上下文噪音
- **显式引用**：AI Agent 在需要时应主动读取对应规则文件，而非依赖自动加载

> **注意**：规则是**强制性约束**，AI 生成代码时必须遵循。例如 Backend Dev 编码时必须显式读取 `backend_rules.md` 的第6章（外部接口调用规范）。

### 4.2 Skill 调用对照表

Skill 需要**显式调用**，在特定步骤触发：

| Skill               | 调用时机                   | 调用角色                                 | 输出                           |
|---------------------|----------------------------|------------------------------------------|--------------------------------|
| `biz-logic-trace`   | 拿到新需求，需理解现有业务逻辑时 | Architect / Backend Dev / Frontend Dev | `.trae/biz-logic/{业务}/flow.md` + 同步更新 crm-domain-map.json / interface-catalog.json |
| `sync-code-trace`   | 编码完成后，需同步文档时     | Architect / Backend Dev                  | 增量更新 biz-logic / crm-domain-map / interface-catalog |
| `interface-catalog` | 需查询外部接口契约时       | Architect / Backend Dev                  | 接口定义信息（含CRM及所有外围系统） |
| `crm-domain-map`    | 需查询业务流程调用链时     | Architect / Backend Dev                  | 业务域映射信息（含CRM及所有外围系统） |
| `code-review`       | 编码完成后                 | Backend Dev / Frontend Dev / Architect   | `review.md`                    |
| `api-doc-gen`       | 接口开发完成后             | Backend Dev                              | API 文档（Markdown / Swagger） |
| `req-doc-gen`       | 基于现有业务进行二次开发需求时 | Architect / Backend Dev / Frontend Dev | `.trae/req-docs/{需求ID}/requirement.md` |

---

## 5. Architect 工作流

**触发条件**：
- 用户发起新需求请求
- 技术方案需要评审
- 代码审查请求
- 性能瓶颈或架构变更提案

**执行步骤**：

```text
接收需求 / 技术问题
    │
    ▼
Step 1: 分析需求
    - 读取 biz-logic flow.md（Phase 1 生成）
    - 如存在 requirement.md（Phase 2 生成），一并读取
    - 判断需求类型：新功能 / 优化 / 重构 / Bug 修复
    - 评估技术可行性
    │
    ▼
Step 2: 编写技术设计
    - 编写 / 审核 spec.md
    - 设计接口定义（入参/出参）
    - 设计数据模型
    - 【Skill】查阅 crm-domain-map.json → 设计全量外部系统调用链
    - 【Skill】查阅 interface-catalog.json → 确认是否需要新增外部系统接口
    │
    ▼
Step 3: 任务拆解
    - 编写 / 审核 tasks.md
    - 确认优先级和依赖关系
    - 指派角色（Frontend Dev / Backend Dev / QA）
    │
    ▼
Step 4: 验收标准制定
    - 编写 / 审核 checklist.md
    - 确认验收标准可量化
    │
    ▼
Step 5: 评审（编码后）
    - 【Skill】运行 code-review → 生成 review.md
    - 审核 review.md 中的问题
    - 确认修复后批准合并
```

**决策点**：
- 如涉及新增外部系统接口 → 编码完成后由 `sync-code-trace` 自动同步
- 如涉及数据库变更 → 要求 Backend Dev 编写 db/*.sql
- 如技术方案存在风险 → 转交用户确认

**输出标准**：
- spec.md 必须包含：技术方案、接口定义、数据模型、边界条件、异常处理
- tasks.md 必须包含：可执行的任务项、明确的优先级、预估工时
- checklist.md 必须包含：可量化的验收标准

---

## 6. Backend Dev 工作流

**触发条件**：
- tasks.md 中分配了后端开发任务
- 用户直接请求后端功能开发
- Bug 修复请求

**执行步骤**：

```text
接收开发任务
    │
    ▼
Step 1: 需求理解
    - 读取 spec.md 理解技术设计
    - 读取 biz-logic flow.md 理解业务逻辑
    - 【Skill】查阅 interface-catalog.json → 确认外部系统接口契约
    - 【Skill】查阅 crm-domain-map.json → 确认全量调用链
    │
    ▼
Step 2: 编码实现
    - 【Rule】按 backend_rules.md 规范编码（分层、MyBatis、接口调用）
    - Controller → Service → Mapper 分层实现
    - 【Rule】遵循外部接口调用规范（backend_rules.md 第6章）
    - 【Rule】AI 生成代码必须包含完整注释（backend_rules.md 第8章）
    │
    ▼
Step 3: 自测
    - 单元测试通过
    - 代码自测通过
    - 逐条核对 checklist.md
    │
    ▼
Step 4: 交付
    - 【Skill】运行 code-review → 生成 review.md
    - 【Skill】运行 api-doc-gen → 生成 API 文档（如涉及）
    - 提交代码
    - 【Skill】运行 sync-code-trace → 自动同步更新 crm-domain-map.json / interface-catalog.json
```

**决策点**：
- 如需新增外部系统接口 → 在 application.yml 中配置接口 URL，在 ErrResultCode 枚举中定义错误码；JSON 文件由 sync-code-trace 自动同步
- 如接口契约不明确 → 转交 Architect 确认
- 如发现技术方案问题 → 反馈 Architect 调整 spec.md

**输出标准**：
- 代码遵循 backend_rules.md 规范
- 新增外部系统接口已在 application.yml 中配置 URL
- 新增错误码已在 ErrResultCode 枚举中定义
- 代码审查问题全部修复

---

## 7. Frontend Dev 工作流

**触发条件**：
- tasks.md 中分配了前端开发任务
- 用户直接请求前端页面/组件开发
- UI 适配或前端 Bug 修复

**执行步骤**：

```text
接收开发任务
    │
    ▼
Step 1: 需求理解
    - 读取 spec.md 理解接口定义
    - 读取 biz-logic flow.md 理解业务逻辑
    - 查阅 UI 设计稿（如提供）
    │
    ▼
Step 2: 技术方案
    - 确认页面/组件结构
    - 确认 API 调用方式（查阅 api/ 封装）
    - 确认路由配置
    │
    ▼
Step 3: 编码实现
    - 【Rule】按 frontend_rules.md 规范编码
    - 组件开发遵循 Vue 2 + Vant 2 规范
    - API 调用封装在 api/ 目录
    - 【Rule】AI 生成代码必须包含完整注释（frontend_rules.md 第8章）
    │
    ▼
Step 4: 自测
    - 页面渲染正常
    - 接口联调通过
    - 移动端适配检查
    │
    ▼
Step 5: 交付
    - 【Skill】运行 code-review → 生成 review.md（前端规范检查）
    - 提交代码
    - 更新路由配置（如涉及）
```

**决策点**：
- 如接口未就绪 → 使用 Mock 数据开发，标记待联调
- 如 UI 设计稿缺失 → 基于 Vant 2 默认样式实现
- 如发现接口定义问题 → 反馈 Backend Dev 调整

**输出标准**：
- 代码遵循 frontend_rules.md 规范
- 组件可复用、Props 定义清晰
- 移动端适配无问题

---

## 8. QA 工作流

**触发条件**：
- 开发任务完成，进入验收阶段
- 用户请求测试
- 发布前回归测试

**执行步骤**：

```text
接收测试任务
    │
    ▼
Step 1: 测试准备
    - 读取 spec.md 理解技术设计
    - 读取 biz-logic flow.md 理解业务逻辑
    - 读取 checklist.md 确认验收标准
    │
    ▼
Step 2: 测试用例设计
    - 编写测试用例（覆盖正常/异常/边界场景）
    - 确认测试数据准备
    │
    ▼
Step 3: 测试执行
    - 单元测试执行
    - 集成测试执行
    - 核对 checklist.md 逐项验收
    │
    ▼
Step 4: 问题跟踪
    - 记录 Bug 清单
    - 评估严重程度
    - 反馈开发人员修复
    │
    ▼
Step 5: 测试报告
    - 生成测试报告
    - 确认 checklist.md 全部通过
    - 批准交付
```

**决策点**：
- 如 checklist.md 未全部通过 → 拒绝交付，要求修复
- 如发现严重 Bug → 立即反馈，暂停交付
- 如测试覆盖率不达标 → 要求补充测试用例

**输出标准**：
- 测试用例覆盖正常/异常/边界场景
- checklist.md 全部通过
- 测试报告包含：通过率、Bug 清单、覆盖率
