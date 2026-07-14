# Wiki Log

## [2026-07-10] init | Wiki 初始化
- 操作：从零搭建 wiki 知识库

## [2026-07-14] fix-graph-json | 删除空的 graph.json
- 删除过时且为空的 graph.json 文件

## [2026-07-14] fix-stores-refs | 修复 stores/ 引用路径
- 更新 wiki-refs.js 和 wiki-scan.js，添加 stores/ → services/ 映射
- 新增页面：map-store.md, agent-store.md

## [2026-07-14] fix-type-inconsistency | 修复 type 字段
- 修复 pages/services/ 下 4 个页面的 type: component → service

## [2026-07-14] fix-link-syntax | 统一链接语法
- 将所有 [[slug]] 统一为 [[pages/type/slug]] 路径形式（约 15 个文件）

## [2026-07-14] re-refs | 重新计算并合并引用
- 重新运行 wiki-refs.js 和 wiki-merge-refs.js
- 结果：78 节点 + 340 边

## [2026-07-14] wiki-v2 restructuring | Wiki V2 重构

### 类型合并：service → component
- 删除 service 类型，所有服务层代码归入 component
- component 含义扩展为"所有代码实现"（Vue/Java/Python/FastAPI/Pinia Store）
- 通过 tech 字段区分子分类：vue, store, python, fastapi, java

### 页面迁移：9 个 service 页面 → component
- agent.md → components/agent-store.md (tech: store)
- coord-response-service.md → components/coord-response-service.md (tech: java)
- iserver-client.md → components/iserver-client.md (tech: python)
- llm-service.md → components/llm.md (tech: python)
- map.md → components/map-store.md (tech: store)
- rag-service.md → components/rag.md (tech: python)
- session-store.md → components/session-store.md (tech: python)
- supply-dispatch-service.md → components/supply-dispatch-service.md (tech: java)
- warn-info-service.md → components/warn-info-service.md (tech: java)

### 配置文件更新
- spec.md: 移除 service 类型枚举，添加 tech 字段定义
- wiki-scan.js: 更新扫描规则（Java Service → component, Python → component）
- wiki-refs.js: 更新路径映射（services/ → components/）
- wiki-build.js: 更新 typeConfig（移除 service，更新 component 颜色）
- INDEX.md: 重写分类导航（6 种类型，component 按 tech 分组）
- AGENTS.md: 更新节点类型表和页面计数（75 → 82，7 类型 → 6 类型）
- home.md: 更新统计数据

### 最终统计
- 节点类型：6 种（component, view, entity, api, flow, concept）
- component 子分类：5 种（vue, store, python, fastapi, java）
- 总页面数：82（原 75）
- component 页面：37（原 21 + 14 service - 重复）
- 边数：283（清理无效引用后）
