---
title: 协同叫应 API
type: api
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [api, backend, coord-response, rest]

references:
  - pages/views/coord-response-view.md
  - pages/entities/coord-response.md

related:
  - pages/apis/warn-info.md
  - pages/apis/supply-dispatch.md
  - pages/apis/health.md

source:
  - backend/src/main/java/com/gis/emergency/controller/CoordResponseController.java
  - backend/src/main/java/com/gis/emergency/entity/CoordResponse.java

summary: 协同叫应处置表 REST API，提供 CRUD 操作
---

# 协同叫应 API

## 1. 概述

协同叫应处置表 `tb_coord_response` 的 REST API，提供完整的 CRUD 操作。

## 2. 基础路径

```
/api/coord-response
```

## 3. 接口列表

### 3.1 获取列表

```
GET /api/coord-response
```

**响应**：`R<List<CoordResponse>>`

### 3.2 获取单条

```
GET /api/coord-response/{responseId}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `responseId` | `String` | 处置记录编号（路径参数） |

**响应**：`R<CoordResponse>`

### 3.3 新增

```
POST /api/coord-response
```

**请求体**：`CoordResponse` JSON

**响应**：`R<Integer>`（影响行数）

### 3.4 更新

```
PUT /api/coord-response/{responseId}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `responseId` | `String` | 处置记录编号（路径参数） |

**请求体**：`CoordResponse` JSON

**响应**：`R<Integer>`（影响行数）

### 3.5 删除

```
DELETE /api/coord-response/{responseId}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `responseId` | `String` | 处置记录编号（路径参数） |

**响应**：`R<Integer>`（影响行数）

## 4. 异常处理

- `IllegalArgumentException` → 400 Bad Request
- 其他未捕获异常 → 500 Internal Server Error

## 5. 代码位置

| 文件 | 路径 |
|------|------|
| Controller | `backend/src/main/java/com/gis/emergency/controller/CoordResponseController.java` |
| Service | `backend/src/main/java/com/gis/emergency/service/CoordResponseService.java` |
| Mapper | `backend/src/main/java/com/gis/emergency/mapper/CoordResponseMapper.java` |
| 实体类 | `backend/src/main/java/com/gis/emergency/entity/CoordResponse.java` |
