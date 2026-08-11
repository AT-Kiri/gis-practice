# Design: Agent 后端低风险清理

## Context

三个独立的小重构，互不依赖，可逐个实施和验证。

## Goals / Non-Goals

### Goals

1. 消除 gis_tools.py 中 4 处重复的 feature 解析代码
2. 合并 iserver_client.py 中 2 个近重复方法
3. 删除 algo_tools.py 中的死代码

### Non-Goals

- 不重构 coordinator.py 的复杂辅助函数（属于第三梯队 B5）
- 不统一 gis_tools.py 的错误处理模式（属于第二梯队 B3）
- 不修改任何函数的返回值格式

## Decisions

### D1：_parse_feature_properties 放在哪个文件

**选择**：放在 `gis_tools.py` 内部，作为模块级私有函数（`_` 前缀）

**理由**：
- 该解析逻辑仅在 gis_tools.py 中使用
- iserver_client.py 是纯 HTTP 客户端，不应包含业务解析逻辑
- 作为私有函数不导出，不影响模块 API

### D2：post_feature_results 合并后的接口

**选择**：`post_feature_results(self, body, datasource="jingjin")`

**理由**：
- 京津冀是默认数据源，保持向后兼容
- `datasource` 参数取值为 `"jingjin"` 或 `"changchun"`，对应 URL 路径中的 `data-jingjin` / `data-changchun`
- 保留旧方法名作为兼容入口不可取——直接替换调用方更清晰

### D3：_composite_score 删除前确认

**选择**：直接删除

**理由**：
- 全局搜索确认无调用方
- `pareto_resource_optimize` 使用的是内联的 `_normalize_score` 逻辑（行 171-179），与 `_composite_score` 完全不同
- `_composite_score` 的注释说"归一化后取平均"但代码没归一化，是遗留的废弃实现

## 方案

### B1：_parse_feature_properties 提取

```python
def _parse_feature_properties(f: dict) -> dict:
    """从 iServer feature 中提取 fieldNames/fieldValues 为 dict"""
    properties = {}
    field_names = f.get("fieldNames", [])
    field_values = f.get("fieldValues", [])
    for i, name in enumerate(field_names):
        properties[name] = field_values[i]
    return properties
```

替换 4 处：
- 行 230-234（query_layer）→ `properties = _parse_feature_properties(f)`
- 行 268-272（query_changchun_layer）→ `properties = _parse_feature_properties(f)`
- 行 473-477（spatial_query）→ `properties = _parse_feature_properties(f)`
- 行 1031-1035（fly_to_location）→ `properties = _parse_feature_properties(f)`

### B2：post_feature_results 合并

```python
async def post_feature_results(self, body: dict, datasource: str = "jingjin") -> dict:
    """
    调用 iServer featureResults 接口
    Args:
        body: 请求体
        datasource: 数据源名称，"jingjin"（默认）或 "changchun"
    """
    url = f"{self.base_url}/iserver/services/data-{datasource}/rest/data/featureResults.json?returnContent=true"
    resp = await self.client.post(url, json=body)
    resp.raise_for_status()
    return resp.json()
```

调用方更新：
- gis_tools.py 行 226：`await iserver_client.post_feature_results(body)` — 不变（默认 jingjin）
- gis_tools.py 行 264：`await iserver_client.post_changchun_feature_results(body)` → `await iserver_client.post_feature_results(body, datasource="changchun")`

### B4：删除 _composite_score

删除 algo_tools.py 行 98-113（`_composite_score` 函数及其注释）。
