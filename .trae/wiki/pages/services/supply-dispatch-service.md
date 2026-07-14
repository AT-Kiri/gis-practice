---
title: 物资调度服务 SupplyDispatchService
type: service
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [service, backend, springboot, database]

references:
  - apis/supply-dispatch.md
  - entities/supply-dispatch.md

source:
  - backend/src/main/java/com/gis/emergency/service/SupplyDispatchService.java

summary: 应急物资调度业务服务层，对接 tb_supply_dispatch 数据表的基础 CRUD 操作
---

# 物资调度服务 SupplyDispatchService

## 1. 定位

应急物资调度业务服务层，对接 `tb_supply_dispatch` 数据表的基础 CRUD 操作。

## 2. 功能

- 应急物资调度记录录入与查询
- 物资类型管理（排水/救生/医疗/食品）
- 调度状态跟踪

## 3. 代码位置

| 文件 | 路径 |
|------|------|
| Service | `backend/src/main/java/com/gis/emergency/service/SupplyDispatchService.java` |
| Controller | `backend/src/main/java/com/gis/emergency/controller/SupplyDispatchController.java` |
| Entity | `backend/src/main/java/com/gis/emergency/entity/SupplyDispatch.java` |
| Mapper | `backend/src/main/java/com/gis/emergency/mapper/SupplyDispatchMapper.java` |
