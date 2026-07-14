---
name: wiki-maintenance
description: 维护项目 wiki 知识库。Use when 用户要求新增/更新/归档 wiki 页面 / 校验 wiki 规范 / 重新生成索引 / 审查 references 时。
---

# wiki-maintenance — Wiki 知识库维护

## 定位

日常维护已有的 wiki 知识库。**不负责首次搭建**（用 `wiki-maintenance` 前先跑 `wiki-bootstrap`）。

## 触发条件

用户提到以下任何一种表述时触发：
- "新增/添加 wiki 页面"
- "更新 wiki 里的 XXX 页面"
- "把 XXX 归档到 wiki"
- "查一下 wiki 里有没有关于 XXX 的"
- "校验 wiki 规范" / "检查 wiki 合规"
- "重新生成 wiki 索引" / "更新 INDEX"
- "审查 references" / "合并引用"
- "从代码更新 wiki 页面"（增量，非首次）

**不触发**：从零搭建 wiki（用 `wiki-bootstrap`）。

---

## 前置检查

1. 读取 `.trae/wiki/spec.md`。如果不存在，报错并提示先跑 `wiki-bootstrap`。
2. 读取 `.trae/wiki/profile.md`（可选，用于理解项目上下文）。
3. 读取 `.trae/wiki/INDEX.md` 了解当前页面状态。

---

## 操作一：新增 Wiki 页面

### Step 1: 确定页面类型和存放位置

按 `spec.md` 中的 type 枚举和目录约定，确定存放路径。

### Step 2: 检查 slug 唯一性

确保 `pages/{type}/{kebab}.md` 不存在。

### Step 3: 编写页面内容

按 `spec.md` 的 frontmatter 规范生成页面。`references` 字段暂空，后续由 references 审查补全。

### Step 4: 注册到 INDEX.md

在对应分类下添加索引条目：

```markdown
- [[page-slug]] — 一句话摘要
```

更新 `Last updated` 日期和 `Total pages` 计数。

### Step 5: 追加 LOG.md

```markdown
## [YYYY-MM-DD] create | 页面标题

- 类型：{type}
- 存放路径：.trae/wiki/pages/{type}/{kebab}.md
```

---

## 操作二：更新 Wiki 页面

### Step 1: 读取现有页面

读取目标页面完整内容，理解现有结构。

### Step 2: 合并新信息

- **追加**：新信息追加到对应章节
- **修正**：如果新信息与现有内容冲突，同时记录两方观点，标注日期和来源

### Step 3: 更新元数据

- 更新 `updated` 日期为当前日期
- 如果新增了来源，追加到 `source` 数组
- 如果变更影响了关联关系，标记需要重新审查 references

### Step 4: 追加 LOG.md

```markdown
## [YYYY-MM-DD] update | 页面标题

- 变更内容：简述做了什么修改
```

---

## 操作三：归档 Wiki 页面

### Step 1: 确认归档条件

- 内容完全被新页面取代
- 页面描述的功能已下线
- 页面内容已过时

### Step 2: 执行归档

1. 将页面移动到 `.trae/wiki/_archive/{原路径}`（保留目录结构）
2. 从 `INDEX.md` 中移除对应索引条目
3. 更新 `INDEX.md` 的计数
4. 在归档页面顶部添加归档标记：

```markdown
> ⚠️ **已归档** — YYYY-MM-DD，原因：{原因}
> 替代页面：[[new-page]]
```

### Step 3: 追加 LOG.md

```markdown
## [YYYY-MM-DD] archive | 页面标题

- 归档原因：{原因}
- 替代页面：[[new-page]]
```

---

## 操作四：查询 Wiki 内容

### Step 1: 先查 INDEX.md

读取 `INDEX.md`，根据分类和摘要快速定位相关页面。

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
```

---

## 操作五：校验 Wiki 规范

### Step 1: 全量扫描

扫描 `.trae/wiki/pages/` 下所有 `.md` 文件。

### Step 2: 逐项检查

| 检查项 | 规则 |
|--------|------|
| frontmatter 必需字段 | `title, type, status, created, updated, tags, references, source, summary` |
| type 枚举 | 必须在 `spec.md` 声明的枚举内 |
| status 枚举 | 必须在 `spec.md` 声明的枚举内 |
| 文件名 | kebab-case |
| 死链 | `[[link]]` 引用的目标页面必须存在 |
| references 一致性 | 如果 A 的 references 包含 B，则 B 的 references 应包含 A（双向检查） |
| source 有效性 | `source` 字段指向的文件/路径是否存在 |

### Step 3: 输出校验报告

```markdown
## Wiki 校验报告

**校验时间**：YYYY-MM-DD
**检查页面数**：N
**问题数**：M

### 问题列表

| 页面 | 问题 | 严重级别 |
|------|------|---------|
| pages/components/Foo.md | type 非法值 `compnent` | P0 |
| pages/views/Bar.md | 死链 [[NonExistent]] | P1 |
```

---

## 操作六：重新生成索引

### Step 1: 全量扫描

扫描 `.trae/wiki/pages/` 下所有 `.md` 文件。

### Step 2: 重写 INDEX.md

按分类重新生成索引表格，更新 `Last updated` 和 `Total pages`。

### Step 3: 追加 LOG.md

```markdown
## [YYYY-MM-DD] reindex | 索引重建

- 页面总数：N
```

---

## 操作七：审查 references

### Step 1: 读取 auto.json

读取 `.trae/wiki/references/auto.json`，了解自动计算的引用关系。

### Step 2: 合并到页面

将自动计算的 references 合并到对应页面的 frontmatter。合并规则：
- 已存在的引用不重复添加
- 自动计算的引用标记来源为 `auto`
- 人工补充的引用标记来源为 `manual`

### Step 3: 追加 LOG.md

```markdown
## [YYYY-MM-DD] refs-merge | References 合并

- 新增引用：N 条
- 已存在跳过：M 条
```

---

## 完整操作 Checklist

每次执行 wiki 操作后，必须逐条确认：

```
□ 读取 spec.md 确认规范
□ 执行操作（create/update/archive/query/validate/reindex/refs-merge）
□ 更新 INDEX.md（如涉及页面新增/归档）
□ 追加 LOG.md 操作记录
□ Frontmatter 格式正确
□ 文件名使用 kebab-case
□ 死链检查通过
```
