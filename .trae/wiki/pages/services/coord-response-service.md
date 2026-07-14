---
title: 协同叫应服务 CoordResponseService
type: service
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [service, backend, springboot, database]

references:
  - apis/coord-response.md
  - entities/coord-response.md

source:
  - backend/src/main/java/com/gis/emergency/service/CoordResponseService.java

summary: 协同叫应业务服务层，对接 tb_coord_response 数据表的基础 CRUD 操作
---

# 协同叫应服务 CoordResponseService

## 1. 定位

协同叫应业务服务层，对接 `tb_coord_response` 数据表的基础 CRUD 操作，象征性表示系统已连接后端数据库。

## 2. 功能

- 协同叫应处置记录的增删改查
- 基础数据校验（非空、格式合法性）
- 状态流转（未接通 → 已应答 → 已处置）

## 3. 代码位置

| 文件 | 路径 |
|------|------|
| Service | `backend/src/main/java/com/gis/emergency/service/CoordResponseService.java` |
| Controller | `backend/src/main/java/com/gis/emergency/controller/CoordResponseController.java` |
| Entity | `backend/src/main/java/com/gis/emergency/entity/CoordResponse.java` |
| Mapper | `backend/src/main/java/com/gis/emergency/mapper/CoordResponseMapper.java` |
