---
name: wiki-maintenance
description: 维护和更新 wiki/ 知识库目录。Use when 用户要求创建/更新/归档/查询 wiki 页面，或从代码分析结果生成 wiki 文档，或校验 wiki 规范合规性时。
---

# wiki-maintenance — Wiki 知识库维护

## 定位

维护 `wiki/` 目录下的项目知识库，确保所有页面遵循规范。覆盖创建、更新、归档、查询等全生命周期操作。

## 触发条件

用户提到以下任何一种表述时触发：
- "帮我在 wiki 里创建/新增一个页面"
- "更新 wiki 里的 XXX 页面"
- "把 XXX 归档到 wiki"
- "查一下 wiki 里有没有关于 XXX 的"
- "校验 wiki 规范"
- "从代码生成 wiki 页面"

---

## 操作一：创建 Wiki 页面

### Step 1: 确定页面类型和存放位置

根据内容确定类型，选择对应目录：

| 页面类型 | 判断标准 | 存放目录 |
|---------|---------|---------|
| 功能模块 | 描述一个 GIS 功能模块（如网络分析、空间查询） | `entities/modules/` |
| 外部接口 | 描述 SuperMap iServer REST API | `entities/apis/` |
| 数据资源 | 描述 Jingjin.udbx、Changchun.udbx 等数据 | `entities/database/` |
| 配置项 | 描述 iServer 服务配置、环境配置 | `entities/config/` |
| GIS 概念 | 描述缓冲区分析、叠置分析等技术概念 | `concepts/technical/` |
| 设计方案 | 描述技术方案和设计决策 | `concepts/designs/` |
| 问题排查 | 描述 Bug 排查过程 | `concepts/troubleshooting/` |
| 经验教训 | 描述踩坑记录 | `concepts/lessons/` |

### Step 2: 编写页面内容

每个 wiki 页面必须包含：

#### 2.1 YAML Frontmatter（必需）

```yaml
---
title: 页面标题（中文）
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: entity | concept | comparison
tags: [gis, frontend, backend, analysis, etc.]
---
```

#### 2.2 页面正文规范

**Entity 页面** 必须包含：
- Overview / 是什么
- 关键信息
- 与其他实体的关系
- 来源引用

**Concept 页面** 必须包含：
- 定义 / 解释
- 当前认知状态
- 待解决问题或争议点
- 相关概念

**Comparison 页面** 必须包含：
- 对比对象和目的
- 对比维度（优先使用表格）
- 结论或总结

### Step 3: 注册到 index.md

在 `wiki/index.md` 对应分类下添加索引条目，格式：

```markdown
- [[page-slug]] — 一句话摘要
```

更新 `Last updated` 日期和 `Total pages` 计数。

### Step 4: 记录到 log.md

在 `wiki/log.md` 末尾追加操作记录：

```markdown
## [YYYY-MM-DD] create | 页面标题

- 类型：entity | concept | comparison
- 存放路径：wiki/entities/modules/page-slug.md
```

---

## 操作二：更新 Wiki 页面

### Step 1: 读取现有页面

读取目标页面的完整内容，理解现有结构和信息。

### Step 2: 合并新信息

- **追加**：新信息追加到对应章节
- **修正**：如果新信息与现有内容冲突，同时记录两方观点，标注日期和来源

### Step 3: 更新元数据

- 更新 `updated` 日期为当前日期
- 如果新增了来源，追加到 `sources` 数组

### Step 4: 记录到 log.md

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

1. 将页面移动到 `wiki/_archive/` 目录
2. 从 `wiki/index.md` 中移除对应索引条目
3. 更新 `index.md` 的计数
4. 在归档页面顶部添加归档标记

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
```

---

## 操作五：从代码生成 Wiki 页面

### Step 1: 读取代码

根据用户指定的模块/接口，读取相关代码文件。

### Step 2: 提取知识

从代码中提取：
- 组件功能和 Props 说明
- 关键业务流程
- SuperMap iClient API 使用方式

### Step 3: 生成 Wiki 页面

按操作一的规范生成页面。

### Step 4: 执行操作一的 Step 3-4

注册 index.md 和记录 log.md。

---

## 完整操作 Checklist

每次执行 wiki 操作后，必须逐条确认：

```
□ 读取 wiki/index.md 确认索引状态
□ 执行操作（create/update/archive/query）
□ 更新 wiki/index.md（如涉及页面新增/归档）
□ 追加 wiki/log.md 操作记录
□ Frontmatter 格式正确（title/created/updated/type/tags）
□ 文件名使用 kebab-case
```
