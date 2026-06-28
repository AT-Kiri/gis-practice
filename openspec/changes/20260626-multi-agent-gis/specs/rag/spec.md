# Spec: RAG 知识库

> 模块：后端 RAGService + KnowledgeAgent
> 职责：向量存储、文档索引、语义检索，为 Agent 提供知识增强

---

## 场景 1：文档索引

### Given-When-Then

#### 正常场景：上传 Markdown 文档
- **Given** 用户通过 API 上传一个 .md 文件
- **When** 调用 `/api/rag/upload` 接口
- **Then**
  - 文档被解析为文本
  - 按段落/语义分块（chunk size: 500-1000 字）
  - 每个 chunk 生成 embedding 向量
  - 向量存入 FAISS 向量库
  - 返回 `success=true` + 索引的 chunk 数量

#### 正常场景：纯文本索引
- **Given** 通过 API 传入文本内容和元数据
- **When** 调用 `/api/rag/index` 接口
- **Then**
  - 文本被分块并生成向量
  - 元数据（标题、来源、标签等）随向量存储
  - 返回文档 ID

#### 边界场景：空文档
- **Given** 上传的文档内容为空或极少（< 50 字）
- **When** 索引文档
- **Then**
  - 返回 `success=false`
  - 返回 `error="文档内容过短，无法索引"`

---

## 场景 2：向量检索

### Given-When-Then

#### 正常场景：语义检索
- **Given** 向量库中已索引应急救援文档
- **When** 调用 `rag_retrieval` 工具，参数 `query="地震救援流程"`, `top_k=3`
- **Then**
  - 返回 `success=true`
  - 返回 `documents` 列表，每个文档含：
    - `content`: 文本内容
    - `metadata`: 元数据（标题、来源等）
    - `score`: 相似度分数
  - 按相似度从高到低排序
  - 数量不超过 top_k

#### 边界场景：无匹配结果
- **Given** 查询内容与知识库完全无关
- **When** 执行检索
- **Then**
  - 返回 `success=true`
  - `documents` 为空数组
  - `message` 提示"未找到相关知识"

#### 异常场景：向量库未初始化
- **Given** 向量库文件不存在或为空
- **When** 执行检索
- **Then**
  - 返回 `success=false`
  - 返回 `error="知识库未初始化，请先索引文档"`

---

## 场景 3：KnowledgeAgent 知识增强

### Given-When-Then

#### 正常场景：知识问答
- **Given** 用户问"地震救援的优先级是什么？"
- **When** Coordinator 调度 KnowledgeAgent
- **Then**
  - KnowledgeAgent 调用 rag_retrieval 工具检索相关文档
  - 将检索到的知识注入 prompt
  - LLM 基于知识生成回答
  - 回答中引用知识来源（可选）
  - 返回结构符合 KnowledgeAgent 输出契约

#### 边界场景：知识库无相关内容
- **Given** 检索结果为空
- **When** KnowledgeAgent 生成回答
- **Then**
  - 不强行编造，如实告知"知识库中暂无相关内容"
  - 可基于通用知识回答，但需说明"以下为通用建议，非预案内容"

---

## 场景 4：初始知识库

### 预置文档
系统启动时自动加载以下初始知识（Markdown 格式，存放于 `data/knowledge/`）：

| 文档 | 内容说明 |
|------|---------|
| earthquake_response.md | 地震应急响应与救援流程 |
| flood_response.md | 洪水灾害处置方案 |
| fire_response.md | 火灾扑救与人员疏散 |
| medical_rescue.md | 医疗救援调度原则 |
| emergency_plan.md | 综合应急预案框架 |

### 初始化流程
- **Given** 后端服务启动
- **When** RAGService 初始化
- **Then**
  - 检查向量库是否已存在
  - 不存在则从 `data/knowledge/` 加载所有 .md 文件并索引
  - 已存在则直接加载向量库
  - 日志记录索引的文档总数

---

## 向量库技术规格

| 项目 | 规格 |
|------|------|
| 向量数据库 | FAISS (本地文件存储) |
| Embedding 模型 | OpenAI 兼容 API（DeepSeek 或其他） |
| 向量维度 | 取决于 Embedding 模型（通常 1536/1024） |
| 分块策略 | 按段落分割，每块 500-1000 字，重叠 100 字 |
| 存储位置 | `vector_store/` 目录（.gitignore） |
