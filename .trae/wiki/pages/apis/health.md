---
title: 健康检查 API
type: api
status: stable
created: 2026-07-10
updated: 2026-07-10
tags: [api, backend, health, monitor]

references: []
related:
  - pages/apis/coord-response.md
  - pages/apis/warn-info.md
  - pages/apis/supply-dispatch.md

source:
  - backend/src/main/java/com/gis/emergency/controller/HealthController.java

summary: 健康检查接口，用于前端/运维确认后端服务是否正常运行
---

# 健康检查 API

## 1. 概述

简单的健康检查接口，返回后端服务运行状态。

## 2. 接口

```
GET /api/health
```

**响应**：
```json
{
  "code": 200,
  "message": "success",
  "data": "京津冀城市综合防灾应急管理系统后端运行正常"
}
```

## 3. 用途

- 前端启动时检测后端是否可用
- 运维监控服务状态
- 负载均衡健康检查

## 4. 代码位置

| 文件 | 路径 |
|------|------|
| Controller | `backend/src/main/java/com/gis/emergency/controller/HealthController.java` |
