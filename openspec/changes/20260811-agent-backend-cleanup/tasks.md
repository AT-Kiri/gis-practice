# Tasks: Agent 后端低风险清理

## T1: B1 — gis_tools.py 提取 _parse_feature_properties

**优先级**: P0
**状态**: [ ]

### T1.1: 新增 _parse_feature_properties 函数

在 gis_tools.py 模块级（工具函数区）新增：

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

### T1.2: 替换 4 处重复代码

1. **行 ~230-234**（query_layer 内）：`properties = {}` + 4 行循环 → `properties = _parse_feature_properties(f)`
2. **行 ~268-272**（query_changchun_layer 内）：同上
3. **行 ~473-477**（spatial_query 内）：同上
4. **行 ~1031-1035**（fly_to_location 内）：同上

---

## T2: B2 — iserver_client.py 合并 post_feature_results

**优先级**: P0
**状态**: [ ]

### T2.1: 合并两个方法

将 `post_feature_results` 和 `post_changchun_feature_results` 合并为：

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

删除 `post_changchun_feature_results` 方法。

### T2.2: 更新调用方

在 gis_tools.py 中搜索 `post_changchun_feature_results`，替换为 `post_feature_results(body, datasource="changchun")`。

---

## T3: B4 — algo_tools.py 删除死代码

**优先级**: P0
**状态**: [ ]

删除 `_composite_score` 函数（行 98-113）及其上方注释。

---

## T4: 构建验证

**优先级**: P0
**状态**: [ ]

- `cd agent-backend && python -m py_compile app/tools/gis_tools.py app/services/iserver_client.py app/tools/algo_tools.py`
- 确认无 ImportError / NameError
