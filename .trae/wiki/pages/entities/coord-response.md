---
title: 协同叫应处置实体 CoordResponse
type: entity
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [entity, backend, coord-response, tb_coord_response]

references:
  - pages/apis/coord-response.md
  - pages/views/coord-response-view.md

related:
  - pages/entities/warn-info.md
  - pages/entities/response-wrapper.md

source:
  - backend/src/main/java/com/gis/emergency/entity/CoordResponse.java
  - backend/src/main/java/com/gis/emergency/controller/CoordResponseController.java

summary: 协同叫应处置表（tb_coord_response）对应的 Java 实体
---

# 协同叫应处置实体 CoordResponse

## 1. 实体概述

协同叫应处置表 `tb_coord_response` 的 Java 实体类，用于记录基层责任人对预警信息的响应和处置情况。

## 2. 字段定义

| 字段 | 类型 | 说明 |
|------|------|------|
| `responseId` | `String` | 处置记录编号（主键） |
| `warnId` | `String` | 外键，关联预警表 `tb_warn_info.warn_id` |
| `unionArea` | `String` | 联动区域 |
| `dutyUser` | `String` | 基层责任人 |
| `contactPhone` | `String` | 叫应联系电话 |
| `callMode` | `Integer` | 叫应方式：1短信 2电话 3平台消息 |
| `responseState` | `Integer` | 应答状态：0未接通 1已应答 2已处置 |
| `disposeTask` | `String` | 协同处置任务 |
| `jointCmd` | `String` | 跨区域联动指令 |
| `feedbackTime` | `String` | 反馈时间，格式 `yyyy-MM-dd HH:mm:ss` |

## 3. 枚举映射

### callMode（叫应方式）

| 值 | 含义 |
|----|------|
| 1 | 短信 |
| 2 | 电话 |
| 3 | 平台消息 |

### responseState（应答状态）

| 值 | 含义 |
|----|------|
| 0 | 未接通 |
| 1 | 已应答 |
| 2 | 已处置 |

## 4. 数据库表

```sql
CREATE TABLE tb_coord_response (
  response_id    VARCHAR(64) PRIMARY KEY,
  warn_id        VARCHAR(64),
  union_area     VARCHAR(255),
  duty_user      VARCHAR(64),
  contact_phone  VARCHAR(32),
  call_mode      INT,
  response_state INT,
  dispose_task   TEXT,
  joint_cmd      TEXT,
  feedback_time  DATETIME
);
```

## 5. 关联关系

```
tb_warn_info (1) ──── (N) tb_coord_response
    warn_id ─────────── warn_id (FK)
```

## 6. 代码位置

| 文件 | 路径 |
|------|------|
| 实体类 | `backend/src/main/java/com/gis/emergency/entity/CoordResponse.java` |
| Controller | `backend/src/main/java/com/gis/emergency/controller/CoordResponseController.java` |
| Service | `backend/src/main/java/com/gis/emergency/service/CoordResponseService.java` |
| Mapper | `backend/src/main/java/com/gis/emergency/mapper/CoordResponseMapper.java` |
