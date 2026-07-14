---
title: 应急物资调度实体 SupplyDispatch
type: entity
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [entity, backend, supply-dispatch, tb_supply_dispatch]

references:
  - pages/apis/supply-dispatch.md
  - pages/views/supply-dispatch-view.md

related:
  - pages/entities/warn-info.md
  - pages/entities/coord-response.md
  - pages/entities/response-wrapper.md

source:
  - backend/src/main/java/com/gis/emergency/entity/SupplyDispatch.java
  - backend/src/main/java/com/gis/emergency/controller/SupplyDispatchController.java

summary: 应急物资调度总表（tb_supply_dispatch）对应的 Java 实体
---

# 应急物资调度实体 SupplyDispatch

## 1. 实体概述

应急物资调度总表 `tb_supply_dispatch` 的 Java 实体类，用于管理应急物资的调拨和配送。

## 2. 字段定义

| 字段 | 类型 | 说明 |
|------|------|------|
| `dispatchId` | `String` | 调度单号（主键） |
| `warnId` | `String` | 外键，关联预警表 `tb_warn_info.warn_id` |
| `storageAddr` | `String` | 物资储备库位置 |
| `supplyType` | `String` | 物资类型 |
| `supplyNum` | `Integer` | 调拨数量 |
| `demandArea` | `String` | 需求受灾区域 |
| `transportRoute` | `String` | 最优配送路径 |
| `distance` | `Float` | 运输里程（公里） |
| `departTime` | `String` | 出库时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `planArrive` | `String` | 预计送达时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `transportTeam` | `String` | 运输救援队伍 |
| `dispatchState` | `Integer` | 调度状态：0待出库 1运输中 2已送达 |

## 3. 枚举映射

### dispatchState（调度状态）

| 值 | 含义 |
|----|------|
| 0 | 待出库 |
| 1 | 运输中 |
| 2 | 已送达 |

## 4. 数据库表

```sql
CREATE TABLE tb_supply_dispatch (
  dispatch_id     VARCHAR(64) PRIMARY KEY,
  warn_id         VARCHAR(64),
  storage_addr    VARCHAR(255),
  supply_type     VARCHAR(64),
  supply_num      INT,
  demand_area     VARCHAR(255),
  transport_route TEXT,
  distance        FLOAT,
  depart_time     DATETIME,
  plan_arrive     DATETIME,
  transport_team  VARCHAR(128),
  dispatch_state  INT
);
```

## 5. 关联关系

```
tb_warn_info (1) ──── (N) tb_supply_dispatch
    warn_id ─────────── warn_id (FK)
```

## 6. 代码位置

| 文件 | 路径 |
|------|------|
| 实体类 | `backend/src/main/java/com/gis/emergency/entity/SupplyDispatch.java` |
| Controller | `backend/src/main/java/com/gis/emergency/controller/SupplyDispatchController.java` |
| Service | `backend/src/main/java/com/gis/emergency/service/SupplyDispatchService.java` |
| Mapper | `backend/src/main/java/com/gis/emergency/mapper/SupplyDispatchMapper.java` |
