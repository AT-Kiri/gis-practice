# Proposal: gis_tools.py 统一错误处理模式

## Why

### 问题背景

`gis_tools.py` 中 8 个 `@tool` 函数末尾都有完全相同的 try-except 结构：

```python
    try:
        ... 业务逻辑 ...
        return ToolResult(success=True, ...).to_dict()
    except Exception as e:
        return ToolResult(success=False, error=f"XXX失败: {e}").to_dict()
```

涉及函数（8 个）：
1. `feature_search` — "专题检索失败"
2. `spatial_query` — "空间查询失败"
3. `buffer_analysis` — "缓冲区分析失败"
4. `dual_buffer_analysis` — "双缓冲区分析失败"
5. `overlay_analysis` — "叠置分析失败"
6. `shortest_path` — "路径分析失败"
7. `service_area` — "服务区分析失败"
8. `fly_to_location` — "定位失败"

### 为什么现在做

- 8 处重复的 `except Exception as e: return ToolResult(success=False, error=f"...").to_dict()` 完全相同，仅操作名不同
- 若需调整错误处理逻辑（如增加日志记录、错误码、异常上报），需改 8 处
- 装饰器方案可将 8 处 try-except 全部消除，函数体只保留业务逻辑

## What

引入 `_tool_error_handler` 装饰器，自动包裹 `@tool` 函数的异常处理：
- 装饰器捕获 `Exception`，返回 `ToolResult(success=False, error=f"{操作名}失败: {e}").to_dict()`
- 操作名从函数名自动推导（如 `feature_search` → "feature_search"）
- 函数体内的 try-except 全部移除，只保留业务逻辑

## Capabilities

- **C1**：提供统一的 GIS 工具错误处理装饰器，消除 8 处重复 try-except

## Impact

### 受影响文件

| 文件 | 修改内容 |
|------|----------|
| `agent-backend/app/tools/gis_tools.py` | 新增 `_tool_error_handler` 装饰器；8 个 `@tool` 函数移除 try-except，添加装饰器 |

### 风险评估

- **低风险**：装饰器仅改变代码组织方式，不改业务逻辑
- **注意点**：装饰器需正确处理 `async` 函数（所有 8 个函数都是 `async def`）
- **注意点**：装饰器需在 `@tool` 装饰器之后应用（即先 `@tool` 再 `@_tool_error_handler`），实际上是在 `@tool` 之前应用
