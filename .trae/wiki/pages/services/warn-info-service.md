---
title: 预警信息服务 WarnInfoService
type: service
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [service, backend, springboot, database]

references:
  - apis/warn-info.md
  - entities/warn-info.md

source:
  - backend/src/main/java/com/gis/emergency/service/WarnInfoService.java

summary: 气象灾害预警业务服务层，对接 tb_warn_info 数据表的基础 CRUD 操作
---

# 预警信息服务 WarnInfoService

## 1. 定位

气象灾害预警业务服务层，对接 `tb_warn_info` 数据表的基础 CRUD 操作。

## 2. 功能

- 气象灾害预警信息录入与查询
- 灾害类型校验（暴雨/大风/沙尘/强对流）
- 预警等级校验（蓝/黄/橙/红）

## 3. 代码位置

| 文件 | 路径 |
|------|------|
| Service | `backend/src/main/java/com/gis/emergency/service/WarnInfoService.java` |
| Controller | `backend/src/main/java/com/gis/emergency/controller/WarnInfoController.java` |
| Entity | `backend/src/main/java/com/gis/emergency/entity/WarnInfo.java` |
| Mapper | `backend/src/main/java/com/gis/emergency/mapper/WarnInfoMapper.java` |
