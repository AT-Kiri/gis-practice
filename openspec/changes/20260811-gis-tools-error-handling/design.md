# Design: gis_tools.py 统一错误处理模式

## Context

8 个 `@tool` async 函数的 try-except 完全重复，仅操作名不同。

## Goals / Non-Goals

### Goals

1. 消除 8 处重复的 `except Exception as e: return ToolResult(...)` 代码
2. 保持所有函数的外部行为（返回值、异常处理）完全不变

### Non-Goals

- 不修改非 `@tool` 函数的错误处理（如内部辅助函数的 `except Exception: return []`）
- 不增加日志记录或错误码等新功能
- 不修改 `@tool` 装饰器本身

## Decisions

### D1：装饰器 vs 辅助函数

**选择**：装饰器

**理由**：
- 8 个函数的错误处理模式完全相同，装饰器可完全消除重复
- 辅助函数仍需在每个函数末尾写 `return _handle_error("XXX", e)`，不如装饰器干净
- 装饰器可自动从函数名推导操作名，无需手动传参

### D2：装饰器与 `@tool` 的顺序

**选择**：`@tool` 在外层，`@_tool_error_handler` 在内层

```python
@tool
@_tool_error_handler
async def feature_search(...):
    ...
```

**理由**：
- `@tool` 装饰器将函数注册为 LangChain Tool，需在最外层
- `_tool_error_handler` 直接包裹原始 async 函数，捕获其异常
- 这样 `@tool` 调用时拿到的是已包裹异常处理的函数，不会抛出未捕获异常

### D3：操作名推导

**选择**：从函数名自动推导，将 `snake_case` 转为中文操作名

**方案**：维护函数名 → 中文名的映射 dict，装饰器查表

```python
_TOOL_NAMES = {
    "feature_search": "专题检索",
    "spatial_query": "空间查询",
    "buffer_analysis": "缓冲区分析",
    "dual_buffer_analysis": "双缓冲区分析",
    "overlay_analysis": "叠置分析",
    "shortest_path": "路径分析",
    "service_area": "服务区分析",
    "fly_to_location": "定位",
}
```

**理由**：自动翻译 snake_case 不可靠（如 `fly_to_location` → "fly to location" 不是中文），映射表更可靠且只有 8 项。

## 方案

### 装饰器实现

```python
import functools

_TOOL_NAMES = {
    "feature_search": "专题检索",
    "spatial_query": "空间查询",
    "buffer_analysis": "缓冲区分析",
    "dual_buffer_analysis": "双缓冲区分析",
    "overlay_analysis": "叠置分析",
    "shortest_path": "路径分析",
    "service_area": "服务区分析",
    "fly_to_location": "定位",
}


def _tool_error_handler(func):
    """统一 GIS 工具错误处理：捕获异常并返回 ToolResult"""
    op_name = _TOOL_NAMES.get(func.__name__, func.__name__)

    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            return ToolResult(success=False, error=f"{op_name}失败: {e}").to_dict()

    return wrapper
```

### 函数改造

每个 `@tool` 函数：
1. 在 `@tool` 下方添加 `@_tool_error_handler`
2. 移除函数体末尾的 `try:` 和 `except Exception as e: return ToolResult(...)`
3. 函数体减少一层缩进

示例（feature_search 改造前后）：

改造前：
```python
@tool
async def feature_search(...):
    try:
        ... 业务逻辑 ...
        return ToolResult(success=True, ...).to_dict()
    except Exception as e:
        return ToolResult(success=False, error=f"专题检索失败: {e}").to_dict()
```

改造后：
```python
@tool
@_tool_error_handler
async def feature_search(...):
    ... 业务逻辑 ...
    return ToolResult(success=True, ...).to_dict()
```
