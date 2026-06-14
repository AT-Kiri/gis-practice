---
name: wiki-maintenance
description: 维护和更新 wiki/ 知识库目录。Use when 用户要求创建/更新/归档/查询 wiki 页面，或从代码分析结果生成 wiki 文档，或校验 wiki 规范合规性时。
---

# wiki-maintenance — Wiki 知识库维护

## 定位

维护 `wiki/` 目录下的项目知识库，确保所有页面遵循 [wiki/SCHEMA.md](file:///d:/工作/河南/code/pad-market-dev/wiki/SCHEMA.md) 中定义的规范。覆盖创建、更新、归档、查询、校验等全生命周期操作。

区别于：
- `biz-logic-trace`：面向代码的业务流程分析，输出到 `.trae/biz-logic/`
- `crm-domain-map`：面向 JSON 的业务域映射维护
- **本技能**：面向人工阅读的知识沉淀，输出到 `wiki/` 目录

## 触发条件

用户提到以下任何一种表述时触发：
- "帮我在 wiki 里创建/新增一个页面"
- "更新 wiki 里的 XXX 页面"
- "把 XXX 归档到 wiki"
- "查一下 wiki 里有没有关于 XXX 的"
- "校验 wiki 规范"
- "从代码生成 wiki 页面"

## 前置步骤：读取规范

> **⚠️ 强制**：执行任何 wiki 操作前，必须先读取 `wiki/SCHEMA.md` 确认最新规范。

```
□ 读取 wiki/SCHEMA.md（确认目录结构、Frontmatter 格式、Tag 分类、页面阈值）
□ 读取 wiki/index.md（确认当前页面索引和分类）
□ 读取 wiki/log.md（确认最近操作记录）
```

---

## 操作一：创建 Wiki 页面

### Step 1: 确定页面类型和存放位置

根据内容确定类型，选择对应目录：

| 页面类型 | 判断标准 | 存放目录 |
|---------|---------|---------|
| 系统模块 | 描述 pad-marketing-service-henan 等模块 | `entities/modules/` |
| 外部接口 | 描述 CRM、系管、支付等外部 API | `entities/apis/` |
| 数据表 | 描述 t_order、constant_data_config 等表 | `entities/database/` |
| 配置项 | 描述功能开关、Apollo 配置 | `entities/config/` |
| 业务概念 | 描述渠道、客户、套餐等领域概念 | `concepts/business/concepts/` |
| 业务流程 | 描述登录、客户定位、购物车等流程 | `concepts/business/flows/` |
| 业务规则 | 描述校验规则、计费规则 | `concepts/business/rules/` |
| 技术架构 | 描述分层、模块关系 | `concepts/technical/architecture/` |
| 设计模式 | 描述异常处理、校验链等模式 | `concepts/technical/patterns/` |
| 最佳实践 | 描述开发规范、安全规范 | `concepts/technical/best-practices/` |
| 设计方案 | 描述技术方案和设计决策 | `concepts/experience/designs/` |
| 问题排查 | 描述 Bug 排查过程 | `concepts/experience/troubleshooting/` |
| 经验教训 | 描述踩坑记录 | `concepts/experience/lessons/` |
| 对比分析 | A vs B 的对比 | `comparisons/` |
| 对话摘要 | AI 对话的关键结论 | `queries/` |

### Step 2: 检查页面阈值

根据 [SCHEMA.md 页面阈值规则](file:///d:/工作/河南/code/pad-market-dev/wiki/SCHEMA.md#L91-L97)：

- **必须创建**：实体/概念出现在 2+ 来源中，或是某个来源的核心主题
- **追加到已有页面**：新信息只是对已覆盖内容的补充
- **不创建**：顺带提及、次要细节、超出领域范围
- **拆分**：现有页面超过 ~200 行时，拆分为子主题
- **归档**：内容完全被新内容取代时，移至 `_archive/`

### Step 3: 编写页面内容

每个 wiki 页面必须包含：

#### 3.1 YAML Frontmatter（必需）

```yaml
---
title: 页面标题（中文）
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: entity | concept | comparison | query | summary
tags: [从 Tag Taxonomy 中选择，至少 1 个]
sources: [raw/articles/source-name.md]
confidence: high | medium | low
contested: true          # 可选：内容有争议时
contradictions: [other-page-slug]  # 可选：与其他页面矛盾时
---
```

**Tag 选择规则**：只能从 SCHEMA.md 定义的 Tag Taxonomy 中选择，如需新 Tag 必须先添加到 SCHEMA.md：

```
业务概念: channel | customer | package | order | marketing | cart | receipt | location
业务流程: login-flow | customer-location | cart-flow | order-flow | payment | ocr-audit | scan-receipt
技术层: backend | frontend | api | database | config | feature-flag | security | redis
省份定制: henan-custom | jilin-custom
经验: best-practice | troubleshooting | lesson-learned | design-decision
元信息: comparison | timeline | architecture
```

#### 3.2 页面正文规范

**Entity 页面** 必须包含：
- Overview / 是什么
- 关键信息和日期
- 与其他实体的关系（使用 `[[wikilinks]]`）
- 来源引用

**Concept 页面** 必须包含：
- 定义 / 解释
- 当前认知状态
- 待解决问题或争议点
- 相关概念（`[[wikilinks]]`）

**Comparison 页面** 必须包含：
- 对比对象和目的
- 对比维度（优先使用表格）
- 结论或总结
- 来源

**Query 页面** 必须包含：
- 对话主题和日期
- 关键结论
- 关联的 wiki 页面（`[[wikilinks]]`）

#### 3.3 双向链接（必需）

- **每个页面至少 2 个 `[[wikilinks]]` 出链**
- 使用 kebab-case 文件名作为链接目标，如 `[[customer-location]]`
- 链接到相关的实体页、概念页、或对比页

#### 3.4 来源追溯

- 合成 3+ 来源的页面，在段落末尾标注出处：`^[raw/articles/source-file.md]`

### Step 4: 注册到 index.md

在 `wiki/index.md` 对应分类下添加索引条目，格式：

```markdown
- [[page-slug]] — 一句话摘要
```

**更新 `Last updated` 日期和 `Total pages` 计数**。

### Step 5: 记录到 log.md

在 `wiki/log.md` 末尾追加操作记录：

```markdown
## [YYYY-MM-DD] create | 页面标题

- 类型：entity | concept | comparison | query
- 存放路径：wiki/entities/modules/page-slug.md
- 关联页面：[[related-page-1]], [[related-page-2]]
```

---

## 操作二：更新 Wiki 页面

### Step 1: 读取现有页面

读取目标页面的完整内容，理解现有结构和信息。

### Step 2: 合并新信息

- **追加**：新信息追加到对应章节
- **修正**：如果新信息与现有内容冲突，按 SCHEMA.md 更新策略处理：
  1. 检查日期 —— 新来源通常取代旧来源
  2. 如果确实矛盾，同时记录两方观点，标注日期和来源
  3. 在 Frontmatter 中标记：`contradictions: [page-name]`
  4. 在 lint 报告中标注供人工审核

### Step 3: 更新元数据

- 更新 `updated` 日期为当前日期
- 如果新增了 Tag，同步检查 SCHEMA.md 的 Tag Taxonomy
- 如果新增了来源，追加到 `sources` 数组

### Step 4: 记录到 log.md

```markdown
## [YYYY-MM-DD] update | 页面标题

- 变更内容：简述做了什么修改
- 冲突处理：无 / 已标注 contradictions
```

---

## 操作三：归档 Wiki 页面

### Step 1: 确认归档条件

- 内容完全被新页面取代
- 页面描述的功能/接口已下线
- 页面超过 ~200 行且已完成拆分

### Step 2: 执行归档

1. 将页面移动到 `wiki/_archive/` 目录
2. 从 `wiki/index.md` 中移除对应索引条目
3. 更新 `index.md` 的 `Total pages` 计数
4. 在归档页面顶部添加归档标记：

```markdown
> **⚠️ ARCHIVED**: 本页已于 YYYY-MM-DD 归档。原因：{原因}。替代页面：[[new-page]]。
```

### Step 3: 记录到 log.md

```markdown
## [YYYY-MM-DD] archive | 页面标题

- 归档原因：{原因}
- 替代页面：[[new-page]]
```

---

## 操作四：查询 Wiki 内容

### Step 1: 先查 index.md

读取 `wiki/index.md`，根据分类和摘要快速定位相关页面。

### Step 2: 再读具体页面

读取匹配的页面，提取相关信息。

### Step 3: 输出查询结果

```markdown
## Wiki 查询结果

**查询关键词**：{关键词}
**匹配页面**：N 个

| 页面 | 类型 | 摘要 |
|------|------|------|
| [[page-1]] | entity | 一句话摘要 |
| [[page-2]] | concept | 一句话摘要 |

**详细内容**：
[按需展开具体页面的关键内容]
```

---

## 操作五：从代码生成 Wiki 页面

### Step 1: 读取代码

根据用户指定的模块/接口/表，读取相关代码文件。

### Step 2: 提取知识

从代码中提取：
- 类/方法的 JavaDoc 和注释
- 功能开关配置（`ConstantDataUtil.getStr`）
- 外部接口调用（`@Value` 配置的 URL）
- 关键业务流程（条件分支、异常处理）
- 数据表操作（Mapper XML 中的 SQL）

### Step 3: 生成 Wiki 页面

按操作一的规范生成页面，`confidence` 标记为 `high`（因为来源于实际代码），`sources` 标注代码文件路径。

### Step 4: 执行操作一的 Step 4-5

注册 index.md 和记录 log.md。

---

## 操作六：校验 Wiki 规范（Lint）

### Step 1: 读取所有 wiki 页面

遍历 `wiki/` 目录下所有 `.md` 文件（排除 `SCHEMA.md`、`index.md`、`log.md`、`.obsidian/`、`_archive/`）。

### Step 2: 逐项检查

| # | 检查项 | 规则来源 |
|---|--------|---------|
| 1 | 文件名是否为 kebab-case | SCHEMA.md Conventions |
| 2 | 是否包含 YAML Frontmatter | SCHEMA.md Frontmatter |
| 3 | Frontmatter 是否有 `title`、`created`、`updated`、`type`、`tags` | SCHEMA.md Frontmatter |
| 4 | `type` 值是否在允许列表中 | SCHEMA.md Frontmatter |
| 5 | `tags` 中的每个 tag 是否在 Tag Taxonomy 中 | SCHEMA.md Tag Taxonomy |
| 6 | 是否至少 2 个 `[[wikilinks]]` 出链 | SCHEMA.md Conventions |
| 7 | 是否在 `index.md` 中注册 | index.md |
| 8 | 是否超过 ~200 行需拆分 | SCHEMA.md Page Thresholds |
| 9 | `updated` 日期是否 >= `created` 日期 | 逻辑校验 |
| 10 | `sources` 引用的文件是否存在 | SCHEMA.md Frontmatter |

### Step 3: 输出 Lint 报告

```markdown
# Wiki Lint 报告

**检查时间**：YYYY-MM-DD HH:mm
**检查页面数**：N
**通过**：N
**问题**：N

## 问题清单

| # | 页面 | 检查项 | 问题描述 | 修复建议 |
|---|------|--------|---------|---------|
| 1 | page-slug.md | tags | tag "xxx" 不在 Tag Taxonomy 中 | 添加到 SCHEMA.md 或移除 |

## 需人工审核

| # | 页面 | 问题描述 |
|---|------|---------|
| 1 | page-slug.md | contradictions 标记需确认 |
```

---

## 完整操作 Checklist

每次执行 wiki 操作后，必须逐条确认：

```
□ 读取 wiki/SCHEMA.md 确认规范
□ 读取 wiki/index.md 确认索引状态
□ 执行操作（create/update/archive/query/lint）
□ 更新 wiki/index.md（如涉及页面新增/归档）
□ 追加 wiki/log.md 操作记录
□ Frontmatter 格式正确（title/created/updated/type/tags）
□ Tags 全部在 Tag Taxonomy 中
□ 至少 2 个 [[wikilinks]] 出链
□ 文件名使用 kebab-case
```

## 防错铁律

1. **操作前必读规范**：每次执行前必须读取 `wiki/SCHEMA.md`，禁止凭记忆操作
2. **创建后必注册**：新页面必须同步更新 `index.md` 和 `log.md`，禁止遗漏
3. **Tags 必须在 Taxonomy 中**：新 Tag 必须先添加到 SCHEMA.md，再在页面中使用
4. **文件名必须 kebab-case**：如 `customer-location.md`，禁止 `CustomerLocation.md`
5. **Frontmatter 不可省略**：每个页面必须包含完整的 YAML Frontmatter
6. **链接必须双向**：每页至少 2 个 `[[wikilinks]]` 出链
7. **冲突不可掩盖**：新信息与旧内容矛盾时，必须标注 `contradictions` 而非静默覆盖
8. **归档不可删除**：过期页面移入 `_archive/`，不可直接删除

## 与其他技能的协作

| 协作技能 | 协作方式 | 触发时机 |
|---------|---------|---------|
| `biz-logic-trace` | 业务分析完成后，将关键结论生成 wiki 页面 | 用户要求 "归档到 wiki" |
| `code-review` | 审查发现共性问题后，沉淀为 best-practices wiki 页面 | 用户要求 "记录到 wiki" |
| `self-check-guardian` | wiki 页面生成后进行规范自检 | 每次创建/更新后 |

## 使用示例

### 示例1：创建模块页面

```
用户：帮我在 wiki 里给 pad-marketing-service-henan 模块建个页面

Agent:
1. 读取 wiki/SCHEMA.md 确认规范
2. 读取 pad-marketing-service-henan 的代码结构
3. 创建 wiki/entities/modules/pad-marketing-service-henan.md
4. 编写 Frontmatter（type: entity, tags: [backend, henan-custom]）
5. 在 index.md 的 Modules 下添加索引
6. 在 log.md 追加操作记录
```

### 示例2：从代码生成业务流程页面

```
用户：把登录流程整理到 wiki 里

Agent:
1. 读取 wiki/SCHEMA.md 确认规范
2. 搜索登录相关前后端代码
3. 创建 wiki/concepts/business/flows/staff-login.md
4. 编写 Frontmatter（type: concept, tags: [login-flow, backend, frontend]）
5. 添加 [[wikilinks]] 到相关页面（[[crm-qry-staff-info]], [[constant-data-config]]）
6. 在 index.md 的 Flows 下添加索引
7. 在 log.md 追加操作记录
```

### 示例3：校验 wiki 规范

```
用户：帮我检查下 wiki 有没有不规范的地方

Agent:
1. 读取 wiki/SCHEMA.md 确认规范
2. 遍历所有 wiki 页面
3. 逐项检查 Frontmatter、Tags、wikilinks、index 注册
4. 输出 Lint 报告
```