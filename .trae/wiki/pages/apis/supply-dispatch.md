---
title: 应急物资调度 API
type: api
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [api, backend, supply-dispatch, rest]

references:
  - pages/views/supply-dispatch-view.md
  - pages/entities/supply-dispatch.md

related:
  - pages/apis/coord-response.md
  - pages/apis/warn-info.md

source:
  - backend/src/main/java/com/gis/emergency/controller/SupplyDispatchController.java
  - backend/src/main/java/com/gis/emergency/entity/SupplyDispatch.java

summary: 应急物资调度总表 REST API，提供 CRUD 操作
---

# 应急物资调度 API

## 1. 概述

应急物资调度总表 `tb_supply_dispatch` 的 REST API，提供完整的 CRUD 操作。

## 2. 基础路径

```
/api/supply-dispatch
```

## 3. 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/supply-dispatch` | 获取列表 |
| GET | `/api/supply-dispatch/{dispatchId}` | 获取单条 |
| POST | `/api/supply-dispatch` | 新增 |
| PUT | `/api/supply-dispatch/{dispatchId}` | 更新 |
| DELETE | `/api/supply-dispatch/{dispatchId}` | 删除 |

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| Controller | `backend/src/main/java/com/gis/emergency/controller/SupplyDispatchController.java` |
| Service | `backend/src/main/java/com/gis/emergency/service/SupplyDispatchService.java` |
| Mapper | `backend/src/main/java/com/gis/emergency/mapper/SupplyDispatchMapper.java` |
| 实体类 | `backend/src/main/java/com/gis/emergency/entity/SupplyDispatch.java` |
