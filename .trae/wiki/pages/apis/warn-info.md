---
title: 气象灾害预警 API
type: api
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [api, backend, warn-info, rest]

references:
  - pages/views/warn-info-view.md
  - pages/entities/warn-info.md

related:
  - pages/apis/coord-response.md
  - pages/apis/supply-dispatch.md

source:
  - backend/src/main/java/com/gis/emergency/controller/WarnInfoController.java
  - backend/src/main/java/com/gis/emergency/entity/WarnInfo.java

summary: 气象灾害预警主表 REST API，提供 CRUD 操作
---

# 气象灾害预警 API

## 1. 概述

气象灾害预警主表 `tb_warn_info` 的 REST API，提供完整的 CRUD 操作。

## 2. 基础路径

```
/api/warn-info
```

## 3. 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/warn-info` | 获取列表 |
| GET | `/api/warn-info/{warnId}` | 获取单条 |
| POST | `/api/warn-info` | 新增 |
| PUT | `/api/warn-info/{warnId}` | 更新 |
| DELETE | `/api/warn-info/{warnId}` | 删除 |

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| Controller | `backend/src/main/java/com/gis/emergency/controller/WarnInfoController.java` |
| Service | `backend/src/main/java/com/gis/emergency/service/WarnInfoService.java` |
| Mapper | `backend/src/main/java/com/gis/emergency/mapper/WarnInfoMapper.java` |
| 实体类 | `backend/src/main/java/com/gis/emergency/entity/WarnInfo.java` |
