# Proposal: Agent 后端低风险清理

## Why

### 问题背景

Agent 后端 3 个文件中存在低风险但明显的代码冗余：

1. **gis_tools.py**：`fieldNames/fieldValues` 遍历转 dict 的 feature 解析逻辑重复 **4 处**（行 230-234、268-272、473-477、1031-1035），逐字复制
2. **iserver_client.py**：`post_feature_results` 和 `post_changchun_feature_results` 两个方法**几乎完全相同**，仅 URL 中 `data-jingjin` 与 `data-changchun` 不同
3. **algo_tools.py**：`_composite_score` 函数（行 98-113）是**死代码**——定义后从未被任何函数调用，`pareto_resource_optimize` 内联了自己的评分逻辑（行 171-179）

### 为什么现在做

- 4 处重复的 feature 解析逻辑：修改任一处需同步 4 个位置，极易遗漏
- 两个几乎相同的 HTTP 方法：新增第三个数据源时会再复制一份
- 死代码干扰阅读：`_composite_score` 的注释说"归一化后取平均"但代码没归一化，容易误导维护者

## What

1. 在 `gis_tools.py` 中提取 `_parse_feature_properties(f)` 公共函数，替换 4 处重复代码
2. 在 `iserver_client.py` 中合并 `post_feature_results` 和 `post_changchun_feature_results` 为统一的 `post_feature_results(body, datasource="jingjin")` 方法
3. 在 `algo_tools.py` 中删除 `_composite_score` 函数及其注释

## Capabilities

- **C1**：提供统一的 feature 属性解析函数，消除 4 处重复
- **C2**：提供统一的数据源查询接口，消除 2 个近重复方法
- **C3**：清除死代码，减少维护干扰

## Impact

### 受影响文件（修改）

| 文件 | 修改内容 |
|------|----------|
| `agent-backend/app/tools/gis_tools.py` | 提取 `_parse_feature_properties`，替换 4 处重复代码；更新调用方 |
| `agent-backend/app/services/iserver_client.py` | 合并两个方法为 `post_feature_results(body, datasource)` |
| `agent-backend/app/tools/algo_tools.py` | 删除 `_composite_score` 函数 |

### 不受影响

- 所有函数的外部行为（返回值、参数签名兼容）保持不变
- 前端代码不修改
- Java 后端不修改

### 风险评估

- **B1（feature 解析提取）**：纯机械替换，4 处代码完全相同，风险极低
- **B2（HTTP 方法合并）**：需同步更新 gis_tools.py 中所有 `post_changchun_feature_results` 调用为 `post_feature_results(body, datasource="changchun")`，涉及 1 处调用
- **B4（删除死代码）**：`_composite_score` 无任何调用方，删除无影响
