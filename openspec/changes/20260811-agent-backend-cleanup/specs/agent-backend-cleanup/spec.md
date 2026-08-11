# Spec: Agent 后端低风险清理

## 模块：B1 — _parse_feature_properties 提取

### 场景 1：_parse_feature_properties 正确解析 feature 属性

**Given** iServer 返回的 feature 对象 `f`，包含 `fieldNames: ["SMID", "NAME", "ADMINNAME"]` 和 `fieldValues: [1, "朝阳区", "北京市"]`

**When** 调用 `_parse_feature_properties(f)`

**Then** 返回 `{"SMID": 1, "NAME": "朝阳区", "ADMINNAME": "北京市"}`

---

### 场景 2：4 处调用点行为等价

**Given** gis_tools.py 中 4 处 feature 解析代码（query_layer、query_changchun_layer、spatial_query、fly_to_location）

**When** 重构后使用 `_parse_feature_properties(f)` 替换

**Then** 每处调用的返回值与重构前完全一致

**And** 后续代码（构建 results 列表、displayName 提取等）行为不变

---

## 模块：B2 — post_feature_results 合并

### 场景 3：默认查京津冀数据源

**Given** 调用方 `await iserver_client.post_feature_results(body)`（不传 datasource）

**When** 方法执行

**Then** 请求 URL 为 `{base_url}/iserver/services/data-jingjin/rest/data/featureResults.json?returnContent=true`

**And** 返回值与重构前完全一致

---

### 场景 4：查长春数据源

**Given** 调用方 `await iserver_client.post_feature_results(body, datasource="changchun")`

**When** 方法执行

**Then** 请求 URL 为 `{base_url}/iserver/services/data-changchun/rest/data/featureResults.json?returnContent=true`

**And** 返回值与重构前 `post_changchun_feature_results(body)` 完全一致

---

### 场景 5：旧方法名不再存在

**Given** 重构后

**When** 代码中搜索 `post_changchun_feature_results`

**Then** 无任何定义或引用

---

## 模块：B4 — 删除死代码

### 场景 6：_composite_score 被删除

**Given** 重构后

**When** 代码中搜索 `_composite_score`

**Then** 无任何定义或引用

---

### 场景 7：pareto_resource_optimize 行为不变

**Given** 重构前后

**When** 调用 `pareto_resource_optimize` 执行 Pareto 优选

**Then** 返回的推荐资源列表、composite_score、入选理由与重构前完全一致

---

## 模块：端到端行为等价

### 场景 8：feature_search 功能不变

**Given** 重构前后

**When** Agent 调用 feature_search 工具搜索关键字

**Then** 搜索结果（京津冀 + 长春）与重构前完全一致

---

### 场景 9：spatial_query 功能不变

**Given** 重构前后

**When** Agent 调用 spatial_query 工具执行空间查询

**Then** 查询结果与重构前完全一致

---

### 场景 10：fly_to_location 功能不变

**Given** 重构前后

**When** Agent 调用 fly_to_location 工具定位地点

**Then** 定位结果与重构前完全一致

---

### 场景 11：pareto_resource_optimize 功能不变

**Given** 重构前后

**When** Agent 执行救援调度触发 Pareto 资源优选

**Then** 优选结果与重构前完全一致
