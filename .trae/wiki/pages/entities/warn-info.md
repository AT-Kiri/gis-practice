---
title: 气象灾害预警实体 WarnInfo
type: entity
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [entity, backend, warn-info, tb_warn_info]

references:
  - pages/apis/warn-info.md
  - pages/views/warn-info-view.md

related:
  - pages/entities/coord-response.md
  - pages/entities/supply-dispatch.md
  - pages/entities/response-wrapper.md

source:
  - backend/src/main/java/com/gis/emergency/entity/WarnInfo.java
  - backend/src/main/java/com/gis/emergency/controller/WarnInfoController.java

summary: 气象灾害预警主表（tb_warn_info）对应的 Java 实体
---

# 气象灾害预警实体 WarnInfo

## 1. 实体概述

气象灾害预警主表 `tb_warn_info` 的 Java 实体类，用于存储京津冀地区的气象灾害预警信息。

## 2. 字段定义

| 字段 | 类型 | 说明 |
|------|------|------|
| `warnId` | `String` | 预警唯一编号（主键） |
| `districtCode` | `String` | 所属京津冀区域编码 |
| `disasterType` | `Integer` | 灾害类型：1暴雨 2大风 3沙尘 4强对流 |
| `warnLevel` | `Integer` | 预警等级：1蓝 2黄 3橙 4红 |
| `realMeteorData` | `String` | 实时气象数据 |
| `riskScore` | `Float` | AHP熵权综合风险分值 |
| `releaseTime` | `String` | 预警发布时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `validEndTime` | `String` | 预警失效时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `warnContent` | `String` | 预警研判内容 |
| `pushStatus` | `Integer` | 推送状态：0未推送 1已推送 |
| `createUser` | `String` | 发布责任人ID |

## 3. 枚举映射

### disasterType（灾害类型）

| 值 | 含义 |
|----|------|
| 1 | 暴雨 |
| 2 | 大风 |
| 3 | 沙尘 |
| 4 | 强对流 |

### warnLevel（预警等级）

| 值 | 含义 | 颜色 |
|----|------|------|
| 1 | 蓝色预警 | #1890ff |
| 2 | 黄色预警 | #faad14 |
| 3 | 橙色预警 | #fa8c16 |
| 4 | 红色预警 | #f5222d |

### pushStatus（推送状态）

| 值 | 含义 |
|----|------|
| 0 | 未推送 |
| 1 | 已推送 |

## 4. 数据库表

```sql
CREATE TABLE tb_warn_info (
  warn_id         VARCHAR(64) PRIMARY KEY,
  district_code   VARCHAR(32),
  disaster_type   INT,
  warn_level      INT,
  real_meteor_data TEXT,
  risk_score      FLOAT,
  release_time    DATETIME,
  valid_end_time  DATETIME,
  warn_content    TEXT,
  push_status     INT,
  create_user     VARCHAR(64)
);
```

## 5. 关联关系

```
tb_warn_info (1) ──── (N) tb_coord_response
    warn_id ─────────── warn_id (FK)

tb_warn_info (1) ──── (N) tb_supply_dispatch
    warn_id ─────────── warn_id (FK)
```

## 6. 代码位置

| 文件 | 路径 |
|------|------|
| 实体类 | `backend/src/main/java/com/gis/emergency/entity/WarnInfo.java` |
| Controller | `backend/src/main/java/com/gis/emergency/controller/WarnInfoController.java` |
| Service | `backend/src/main/java/com/gis/emergency/service/WarnInfoService.java` |
| Mapper | `backend/src/main/java/com/gis/emergency/mapper/WarnInfoMapper.java` |
