# 数据库表格模块接入后端 CRUD - 需求论证

## Why（业务背景）

京津冀城市综合防灾应急管理 GIS 项目已存在三个"数据库表格模块"页面：

- [WarnInfoView.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/views/WarnInfoView.vue) — 气象灾害预警主表 `tb_warn_info`
- [CoordResponseView.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/views/CoordResponseView.vue) — 协同叫应处置表 `tb_coord_response`
- [SupplyDispatchView.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/views/SupplyDispatchView.vue) — 应急物资调度总表 `tb_supply_dispatch`

这三个页面通过 [NavSidebar.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/NavSidebar.vue) 的 `database` 分组入口进入，目前从 [mockData.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/mockData.js) 加载写死的模拟数据：

- 数据不持久：刷新即丢，仅前端内存中 `unshift` 新增
- 操作不完整：WarnInfo/CoordResponse 仅有 Create+Read，SupplyDispatch 仅有 Create+Read+Delete
- 无 Update 能力，无真实"增删改查"业务闭环

后端现状：Spring Boot 3.4.0 仅含 `spring-boot-starter-web` + `actuator`，[HealthController.java](file:///d:/Code/AI-Code/GIS-Practice/backend/src/main/java/com/gis/emergency/controller/HealthController.java) 一个健康检查接口，无任何业务接口、无数据库、无持久层。

**目标**：让这三个表格模块接入后端真实 MySQL 数据库，实现完整 CRUD（增删改查），形成业务闭环。

## What（变更内容）

### 后端新增

1. **MySQL 数据库 `emergency_db`**：3 张表，严格按用户给定字段类型建表
2. **MyBatis 持久层**：3 套 Entity + Mapper + Service
3. **REST API**：3 套 Controller，每套 5 个端点（List/Get/Create/Update/Delete）
4. **种子数据**：将 mockData.js 中的现有数据转成 `data.sql`，启动自动初始化

### 前端改造

1. **三个视图数据源切换**：从 `mockData.js` 切换到 `request.get/post/put/delete` 调用后端 API
2. **CRUD UI 补全**：
   - 表格每行新增"编辑"按钮 → 打开编辑弹窗复用录入表单 → 提交 PUT 更新
   - WarnInfo/CoordResponse 表格每行新增"删除"按钮 → 二次确认 → DELETE
   - SupplyDispatch 已有删除，补"编辑"按钮
3. **加载/操作反馈**：onMounted 自动拉取列表，loading 态 + message 提示
4. **mockData.js 保留不动**：三个 generate 函数（`generateWarnInfoData` 等）作为后备/参考保留，避免影响其他潜在引用方；本次仅三个 View 切换数据源，不改 mockData.js

## Capabilities（新增/修改能力）

| 能力 | 类型 | 说明 |
|------|------|------|
| MySQL 数据库 | 新增 | `emergency_db` 库 + 3 张表 + 种子数据 |
| 后端 MyBatis 持久层 | 新增 | Entity + Mapper + Service 三层 |
| 后端 REST API | 新增 | 3 表 × 5 端点 = 15 个接口，路径 `/api/warn-info` `/api/coord-response` `/api/supply-dispatch` |
| 前端 API 调用 | 修改 | 三个 View 从 mock 切换到 axios 调用 [utils/request.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/request.js) |
| 前端编辑能力 | 新增 | 三个 View 表格行新增"编辑"按钮 + 编辑弹窗 |
| 前端删除能力 | 修改 | WarnInfo/CoordResponse 补"删除"按钮 + 二次确认 |

## Impact（影响范围）

### 受影响模块

| 模块 | 影响类型 | 说明 |
|------|----------|------|
| `backend/pom.xml` | 修改 | 新增 `mysql-connector-j`、`mybatis-spring-boot-starter` 依赖 |
| `backend/src/main/resources/application.yml` | 修改 | 新增 datasource + mybatis + sql init 配置 |
| `backend/src/main/resources/schema.sql` | 新增 | 建表 DDL（CREATE TABLE IF NOT EXISTS） |
| `backend/src/main/resources/data.sql` | 新增 | 种子数据 INSERT（INSERT IGNORE，幂等） |
| `backend/src/main/java/com/gis/emergency/entity/` | 新增 | WarnInfo / CoordResponse / SupplyDispatch 三个实体 |
| `backend/src/main/java/com/gis/emergency/mapper/` | 新增 | 三个 Mapper 接口（注解式 @Select/@Insert/@Update/@Delete） |
| `backend/src/main/java/com/gis/emergency/service/` | 新增 | 三个 Service 类 |
| `backend/src/main/java/com/gis/emergency/controller/` | 新增 | 三个 Controller（不动 HealthController） |
| `frontend/src/views/WarnInfoView.vue` | 修改 | 数据源切换 + 补全 CRUD UI |
| `frontend/src/views/CoordResponseView.vue` | 修改 | 数据源切换 + 补全 CRUD UI |
| `frontend/src/views/SupplyDispatchView.vue` | 修改 | 数据源切换 + 补全编辑能力 |
| `frontend/src/utils/mockData.js` | 不动 | 保留三个 generate 函数作为后备/参考，避免影响潜在引用方 |

### 明确不受影响

- **Agent 模块**：[AgentChatPanel.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/AgentChatPanel.vue)、[utils/agent/](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/agent/)、[stores/agent.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/stores/agent.js) 不动
- **后端 Agent 相关**：当前后端无 Agent 代码，本次也不引入
- **地图功能**：[SmMapViewer.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/SmMapViewer.vue) 仅作为路由跳转触发器，本次不动其逻辑
- **其他视图**：HomeView、FloodSimulationView、DataDashboardView、NewBigScreenView 不动
- **mockData.js 其他函数**：`generateCountyDisasters`、`generateWeatherData`、`getCounties`、`getCountyCoords`、`COUNTIES`、`COUNTY_COORDS` 等保留不动

### 技术依赖新增

- `mysql-connector-j`（MySQL JDBC 驱动）
- `mybatis-spring-boot-starter` 3.x（MyBatis Spring Boot 集成）
- 现有 `axios` 已在 [request.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/request.js) 中封装，复用

### 数据库依赖

- MySQL 8.x（用户已确认本地安装，账号 root / 密码 t821777）
- 数据库名 `emergency_db`，启动时通过 JDBC URL `createDatabaseIfNotExist=true` 自动创建
