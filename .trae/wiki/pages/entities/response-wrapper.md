---
title: 统一响应包装 R<T>
type: entity
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [entity, common, response, backend]

references:
  - pages/apis/health.md
  - pages/apis/coord-response.md
  - pages/apis/warn-info.md
  - pages/apis/supply-dispatch.md

related:
  - pages/entities/coord-response.md
  - pages/entities/warn-info.md
  - pages/entities/supply-dispatch.md

source:
  - backend/src/main/java/com/gis/emergency/common/R.java
  - backend/src/main/java/com/gis/emergency/config/GlobalExceptionHandler.java

summary: 前后端统一响应体，所有 Controller 返回值的包装格式
---

# 统一响应包装 R<T>

## 1. 实体概述

所有后端 Controller 返回值的统一包装格式，保证前后端接口一致性。

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

## 2. 字段定义

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `int` | 状态码：200 成功，非 200 业务异常 |
| `message` | `String` | 提示信息 |
| `data` | `T` | 返回数据泛型 |

## 3. 静态工厂方法

| 方法 | 入参 | 返回 | 用途 |
|------|------|------|------|
| `ok(T data)` | 数据对象 | `R<T>` code=200, message="success" | 标准成功响应 |
| `ok()` | 无 | `R<T>` data=null | 无需返回数据的成功 |
| `error(int code, String msg)` | 状态码 + 消息 | `R<T>` 自定义错误 | 业务异常 |
| `error(String msg)` | 错误消息 | `R<T>` code=500 | 默认 500 错误 |

## 4. 前端使用方式

```js
import request from '@/utils/request'

const res = await request.get('/api/warn-info')
// res 即 R<T> 结构
if (res.code === 200) {
  const list = res.data  // List<WarnInfo>
} else {
  console.error(res.message)
}
```

## 5. 错误处理

- Controller 抛出 `IllegalArgumentException` → `GlobalExceptionHandler` → `R.error(400, msg)`
- 其他未捕获异常 → `R.error(500, "服务器内部错误")`
- 前端 `utils/request.js` 拦截非 200 code，弹出 `message` 通知

## 6. 代码位置

| 文件 | 路径 |
|------|------|
| 统一响应体 | `backend/src/main/java/com/gis/emergency/common/R.java` |
| 全局异常处理 | `backend/src/main/java/com/gis/emergency/config/GlobalExceptionHandler.java` |
| 前端请求封装 | `frontend/src/utils/request.js` |
