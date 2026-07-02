# 数据库表格模块接入后端 CRUD - 技术设计

## Context（上下文）

### 项目现状
- 前端：Vue3 + Ant Design Vue + SuperMap iClient，已有三个表格视图通过 [NavSidebar.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/NavSidebar.vue) `database` 分组入口路由跳转访问
- 后端：Spring Boot 3.4.0 + Java 17，仅 [HealthController.java](file:///d:/Code/AI-Code/GIS-Practice/backend/src/main/java/com/gis/emergency/controller/HealthController.java)（`/api/health`）
- 公共设施：[R.java](file:///d:/Code/AI-Code/GIS-Practice/backend/src/main/java/com/gis/emergency/common/R.java)（统一响应体）、[CorsConfig.java](file:///d:/Code/AI-Code/GIS-Practice/backend/src/main/java/com/gis/emergency/config/CorsConfig.java)（已允许 localhost）、[GlobalExceptionHandler.java](file:///d:/Code/AI-Code/GIS-Practice/backend/src/main/java/com/gis/emergency/config/GlobalExceptionHandler.java)、[request.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/request.js)（axios baseURL=`/api`，已处理 R 包络）
- Vite proxy：`/api` → `http://localhost:8080` 已配置（[vite.config.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/vite.config.js)）

### 本模块定位
让"数据库表格模块"真正连后端 MySQL 持久化，实现完整 CRUD 闭环。**不动 Agent 模块**。

---

## Goals / Non-Goals

### Goals
1. 后端新建 `emergency_db` 库 + 3 张表（严格按用户给定字段类型）
2. 后端实现 3 表完整 CRUD REST API（15 个端点）
3. 前端三个 View 切换数据源到后端 API，补全 CRUD UI（编辑弹窗 + 删除按钮）
4. 启动自动建表 + 种子数据初始化（基于现有 mock 数据）
5. 操作有反馈：loading 态、message 成功/失败提示

### Non-Goals
- 不引入用户认证/权限（课设阶段，沿用 [project_rules.md §4](file:///d:/Code/AI-Code/GIS-Practice/.trae/rules/project_rules.md) 约定）
- 不修改任何 Agent 相关代码（[AgentChatPanel.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/AgentChatPanel.vue)、[utils/agent/](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/agent/)、[stores/agent.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/stores/agent.js)）
- 不引入 DTO/VO 分层（实体直接作出入参，简洁优先）
- 不引入事务管理（单表 CRUD，MyBatis 默认即足够）
- 不修改前端三个 View 的整体布局/样式/表单字段（仅替换数据源 + 补 CRUD 行操作）
- 不修改 NavSidebar 入口分组
- 不修改 [mockData.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/mockData.js)（三个 generate 函数保留作为后备/参考，避免影响潜在引用方）
- 不为本次未涉及的列做扩展（如未来要加 `deleted_at` 软删除字段，本次不做）

---

## Architecture（架构设计）

### 分层架构

```
┌─────────────────────────────────────────────────────┐
│  前端 Vue3                                          │
│  WarnInfoView / CoordResponseView / SupplyDispatchView
│      ↓ axios (baseURL=/api)                         │
├─────────────────────────────────────────────────────┤
│  Vite proxy: /api → http://localhost:8080           │
├─────────────────────────────────────────────────────┤
│  Spring Boot 后端                                   │
│  Controller (REST) → Service (业务) → Mapper (MyBatis)
│      ↓ JDBC                                          │
├─────────────────────────────────────────────────────┤
│  MySQL 8.x                                          │
│  database: emergency_db                             │
│  tables: tb_warn_info / tb_coord_response /         │
│          tb_supply_dispatch                          │
└─────────────────────────────────────────────────────┘
```

### 后端包结构（新增）

```
backend/src/main/java/com/gis/emergency/
├── common/                  # 既有 R.java
├── config/                  # 既有 CorsConfig / GlobalExceptionHandler / AppConfig
├── controller/
│   ├── HealthController.java       # 既有
│   ├── WarnInfoController.java      # 新增
│   ├── CoordResponseController.java # 新增
│   └── SupplyDispatchController.java # 新增
├── service/                 # 新增目录
│   ├── WarnInfoService.java
│   ├── CoordResponseService.java
│   └── SupplyDispatchService.java
├── mapper/                  # 新增目录
│   ├── WarnInfoMapper.java
│   ├── CoordResponseMapper.java
│   └── SupplyDispatchMapper.java
├── entity/                  # 新增目录
│   ├── WarnInfo.java
│   ├── CoordResponse.java
│   └── SupplyDispatch.java
└── EmergencyApplication.java   # 既有，需加 @MapperScan
```

### REST API 设计

路径前缀 `/api`，与既有 [HealthController](file:///d:/Code/AI-Code/GIS-Practice/backend/src/main/java/com/gis/emergency/controller/HealthController.java) 一致；前端 [request.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/request.js) `baseURL='/api'` 已统一处理。

#### 预警主表 `/api/warn-info`

| Method | Path | 说明 |
|--------|------|------|
| GET    | `/api/warn-info`                | 列表查询 |
| GET    | `/api/warn-info/{warnId}`       | 单条查询 |
| POST   | `/api/warn-info`                | 新增 |
| PUT    | `/api/warn-info/{warnId}`       | 更新 |
| DELETE | `/api/warn-info/{warnId}`       | 删除 |

#### 协同处置表 `/api/coord-response`

| Method | Path | 说明 |
|--------|------|------|
| GET    | `/api/coord-response`                  | 列表 |
| GET    | `/api/coord-response/{responseId}`     | 单条 |
| POST   | `/api/coord-response`                  | 新增 |
| PUT    | `/api/coord-response/{responseId}`     | 更新 |
| DELETE | `/api/coord-response/{responseId}`     | 删除 |

#### 物资调度表 `/api/supply-dispatch`

| Method | Path | 说明 |
|--------|------|------|
| GET    | `/api/supply-dispatch`                  | 列表 |
| GET    | `/api/supply-dispatch/{dispatchId}`     | 单条 |
| POST   | `/api/supply-dispatch`                  | 新增 |
| PUT    | `/api/supply-dispatch/{dispatchId}`     | 更新 |
| DELETE | `/api/supply-dispatch/{dispatchId}`     | 删除 |

**统一响应**：所有接口返回 [R.java](file:///d:/Code/AI-Code/GIS-Practice/backend/src/main/java/com/gis/emergency/common/R.java) 包络 `{code, message, data}`，前端 request.js 已自动解包。

---

## Data Design（数据设计）

### 数据库 schema.sql

3 张表严格按用户给定字段类型，引擎 InnoDB，字符集 utf8mb4。所有表均**不**加 created_at/updated_at/deleted_at 等附加字段（精准修改原则）。

```sql
-- 表 1：气象灾害预警主表
CREATE TABLE IF NOT EXISTS tb_warn_info (
  warn_id          VARCHAR(30)  PRIMARY KEY COMMENT '预警唯一编号',
  district_code    VARCHAR(20)  COMMENT '所属京津冀区域编码',
  disaster_type    TINYINT      COMMENT '灾害类型 1暴雨 2大风 3沙尘 4强对流',
  warn_level       TINYINT      COMMENT '预警等级 1蓝 2黄 3橙 4红',
  real_meteor_data TEXT         COMMENT '实时气象数据',
  risk_score       FLOAT        COMMENT 'AHP熵权综合风险分值',
  release_time     DATETIME     COMMENT '预警发布时间',
  valid_end_time   DATETIME     COMMENT '预警失效时间',
  warn_content     VARCHAR(1000) COMMENT '预警研判内容',
  push_status      TINYINT      COMMENT '推送状态 0未推送 1已推送',
  create_user      VARCHAR(30)  COMMENT '发布责任人'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='气象灾害预警主表';

-- 表 2：协同叫应处置表
CREATE TABLE IF NOT EXISTS tb_coord_response (
  response_id     VARCHAR(30) PRIMARY KEY COMMENT '处置记录编号',
  warn_id         VARCHAR(30) COMMENT '关联预警编号',
  union_area      VARCHAR(100) COMMENT '联动区域',
  duty_user       VARCHAR(50)  COMMENT '基层责任人',
  contact_phone   VARCHAR(20)  COMMENT '叫应联系电话',
  call_mode       TINYINT     COMMENT '叫应方式 1短信 2电话 3平台消息',
  response_state  TINYINT     COMMENT '应答状态 0未接通 1已应答 2已处置',
  dispose_task    TEXT        COMMENT '协同处置任务',
  joint_cmd       TEXT        COMMENT '跨区域联动指令',
  feedback_time   DATETIME    COMMENT '反馈时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='协同叫应处置表';

-- 表 3：应急物资调度总表
CREATE TABLE IF NOT EXISTS tb_supply_dispatch (
  dispatch_id     VARCHAR(30)  PRIMARY KEY COMMENT '调度单号',
  warn_id         VARCHAR(30)  COMMENT '关联预警编号',
  storage_addr    VARCHAR(200) COMMENT '物资储备库位置',
  supply_type     VARCHAR(100) COMMENT '物资类型',
  supply_num      INT          COMMENT '调拨数量',
  demand_area     VARCHAR(100) COMMENT '需求受灾区域',
  transport_route TEXT         COMMENT '最优配送路径',
  distance        FLOAT        COMMENT '运输里程',
  depart_time     DATETIME     COMMENT '出库时间',
  plan_arrive     DATETIME     COMMENT '预计送达时间',
  transport_team  VARCHAR(100) COMMENT '运输救援队伍',
  dispatch_state  TINYINT      COMMENT '调度状态 0待出库 1运输中 2已送达'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='应急物资调度总表';
```

### 种子数据 data.sql

将 [mockData.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/mockData.js) 中三个 generate 函数返回的静态数据逐条转成 `INSERT IGNORE INTO ...` 语句（幂等：重启不会因主键冲突报错；用户通过 API 新增/修改的数据在重启后保留；用户删除的种子数据重启会重新插入，可接受）。

种子数据条数：tb_warn_info 6 条、tb_coord_response 6 条、tb_supply_dispatch 14 条（与现有 mock 数据完全一致）。

### 后端实体字段映射

实体使用基本 Java 类型，避免引入 BigDecimal 等过度设计：

| DB 字段 | Java 类型 | 备注 |
|---------|-----------|------|
| warn_id / response_id / dispatch_id | String | 主键 |
| *_type / *_level / *_state / *_status / call_mode / push_status | Integer | TINYINT |
| risk_score / distance | Float | FLOAT |
| supply_num | Integer | INT |
| release_time / valid_end_time / feedback_time / depart_time / plan_arrive | String | DATETIME ↔ String，前端已是字符串 'yyyy-MM-dd HH:mm[:ss]' |
| 其他 VARCHAR/TEXT | String | |

**DATETIME 处理策略**：实体字段统一为 String，格式 'yyyy-MM-dd HH:mm:ss'。MySQL DATETIME 列对 String 入参兼容（自动 parse），MyBatis 默认 StringTypeHandler 处理。前端既有 'yyyy-MM-dd HH:mm'（无秒）格式也能写入（秒默认 00）。读出时 JDBC 返回 'yyyy-MM-dd HH:mm:ss' 字符串，前端直接展示。

---

## Frontend Design（前端设计）

### 三个 View 的统一改造模式

三个 View 改造结构相同，只是字段不同：

1. **移除 mock 导入**：删除 `import { generateXxxData } from '@/utils/mockData.js'`
2. **导入 request**：`import { request } from '@/utils/request'`
3. **加载列表**：`onMounted` 调用 `request.get('/xxx').then(res => records.value = res.data)`
4. **新增**：`request.post('/xxx', form.value)` → 成功后 `loadList()`
5. **编辑**：表格行新增"编辑"按钮 → 弹出 `a-modal` 复用录入表单（`form` 回填记录）→ 提交 `request.put('/xxx/{id}', form.value)` → 刷新列表
6. **删除**：表格行"删除"按钮 → `Modal.confirm` 二次确认 → `request.delete('/xxx/{id}')` → 刷新列表
7. **loading 态**：列表加载时 `loading.value = true`，结束设 false
8. **错误反馈**：request.js 已统一 `message.error`，无需重复处理

### 编辑弹窗复用策略

为最小改动，**新增**一个 `editing` 状态 + `a-modal` 包裹既有录入 `a-form`：

```vue
<a-modal v-model:open="editModalVisible" title="编辑记录" @ok="submitEdit">
  <!-- 复用既有 form 字段，绑定到 editingRecord -->
</a-modal>
```

录入（Create）按钮维持原逻辑，编辑（Update）打开弹窗。两者共用字段定义但状态分离，避免互相污染。

### 表格行操作列

三个 View 表格末尾统一新增"操作"列：

```js
{ title: '操作', dataIndex: 'actions', key: 'actions', fixed: 'right', width: 140 }
```

```vue
<template v-if="column.dataIndex === 'actions'">
  <a-button type="link" @click="openEdit(record)">编辑</a-button>
  <a-button type="link" danger @click="confirmDelete(record)">删除</a-button>
</template>
```

### 数据加载时机

- `onMounted` 触发首次加载
- 新增/编辑/删除成功后调用 `loadList()` 刷新
- 不做自动轮询（避免后端压力，简单课设阶段足够）

---

## Technical Decisions（技术决策）

### 决策 1：MySQL vs H2 / SQLite
- **选择**：MySQL 8.x
- **理由**：用户已本地安装并提供账号；生产级数据库，符合论文"京津冀应急管理"业务背景
- **代价**：需保证 MySQL 服务运行；非嵌入式，重启数据天然持久

### 决策 2：MyBatis（注解）vs JPA vs MyBatis XML
- **选择**：MyBatis 注解式（`@Select/@Insert/@Update/@Delete`）
- **理由**：用户明确选择 MyBatis；注解式对单表 CRUD 代码量最少、SQL 显式可控，无需 XML 文件，避免文件爆炸
- **不选 JPA**：用户未选；JPA 的 Repository 接口虽简洁但隐藏 SQL，不利于课设阶段理解
- **不选 MyBatis XML**：单表 CRUD 用 XML 是过度设计，注解足够

### 决策 3：DATETIME 字段使用 String 而非 LocalDateTime
- **选择**：实体字段统一 `String`
- **理由**：
  - 前端表单 input 已是字符串 'yyyy-MM-dd HH:mm:ss' 或 'yyyy-MM-dd HH:mm'
  - MySQL DATETIME 列接受字符串入参（自动 parse）
  - 避免 Jackson + LocalDateTime + @JsonFormat 的额外配置
  - MyBatis StringTypeHandler 默认即可工作
- **代价**：失去 LocalDateTime 的类型安全；可接受，因前端不参与时间计算

### 决策 4：种子数据幂等策略
- **选择**：`INSERT IGNORE INTO` + `spring.sql.init.mode=always`
- **理由**：
  - `CREATE TABLE IF NOT EXISTS` 保证建表幂等
  - `INSERT IGNORE` 主键冲突时跳过，重启不报错
  - 用户 API 新增/修改的数据重启后保留（INSERT IGNORE 不覆盖已有主键）
  - 已知缺陷：用户删除种子数据后重启会重新插入 — 课设演示场景可接受；如需关闭可在 application.yml 注释 `spring.sql.init.mode: never`
- **不选 `ON DUPLICATE KEY UPDATE`**：会覆盖用户修改
- **不选手动执行 SQL**：违背"启动即可用"目标

### 决策 5：前端编辑弹窗 vs 路由跳转
- **选择**：当前页面内 `a-modal` 弹窗
- **理由**：
  - 复用既有 `a-form` 字段定义，改动最小
  - 不需新增路由/视图
  - 用户体验上"列表 + 弹窗编辑"是 CRUD 标准 UX
- **不选路由跳转**：需新增 3 个 EditView，3 倍工作量，且与现有"页面内表单+表格"布局割裂

### 决策 6：前端是否新建 `api/` 目录
- **选择**：不新建，调用处直接 `request.get/post/put/delete`
- **理由**：[frontend_rules.md §4](file:///d:/Code/AI-Code/GIS-Practice/.trae/rules/frontend_rules.md) 明确"后端接口极少时，每个后端接口在调用处直接使用 request.get/post，不另建 api 目录"；本次每表 5 端点共 15 个，调用都集中在对应 View 内

### 决策 7：是否加 `@MapperScan` 显式注解
- **选择**：在 [EmergencyApplication.java](file:///d:/Code/AI-Code/GIS-Practice/backend/src/main/java/com/gis/emergency/EmergencyApplication.java) 添加 `@MapperScan("com.gis.emergency.mapper")`
- **理由**：统一扫描入口，避免每个 Mapper 单独写 `@Mapper`；为后续可扩展性留口子（虽然本次不过度设计）

---

## File Change Plan（文件变更计划）

### 后端新增

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `backend/pom.xml` | 加 `mysql-connector-j`、`mybatis-spring-boot-starter` |
| 修改 | `backend/src/main/resources/application.yml` | 加 datasource / mybatis / sql init 配置 |
| 修改 | `backend/src/main/java/com/gis/emergency/EmergencyApplication.java` | 加 `@MapperScan` |
| 新增 | `backend/src/main/resources/schema.sql` | 3 表 DDL |
| 新增 | `backend/src/main/resources/data.sql` | 26 条种子数据 INSERT IGNORE |
| 新增 | `backend/src/main/java/com/gis/emergency/entity/WarnInfo.java` | 实体 |
| 新增 | `backend/src/main/java/com/gis/emergency/entity/CoordResponse.java` | 实体 |
| 新增 | `backend/src/main/java/com/gis/emergency/entity/SupplyDispatch.java` | 实体 |
| 新增 | `backend/src/main/java/com/gis/emergency/mapper/WarnInfoMapper.java` | 注解 Mapper |
| 新增 | `backend/src/main/java/com/gis/emergency/mapper/CoordResponseMapper.java` | 注解 Mapper |
| 新增 | `backend/src/main/java/com/gis/emergency/mapper/SupplyDispatchMapper.java` | 注解 Mapper |
| 新增 | `backend/src/main/java/com/gis/emergency/service/WarnInfoService.java` | Service |
| 新增 | `backend/src/main/java/com/gis/emergency/service/CoordResponseService.java` | Service |
| 新增 | `backend/src/main/java/com/gis/emergency/service/SupplyDispatchService.java` | Service |
| 新增 | `backend/src/main/java/com/gis/emergency/controller/WarnInfoController.java` | REST |
| 新增 | `backend/src/main/java/com/gis/emergency/controller/CoordResponseController.java` | REST |
| 新增 | `backend/src/main/java/com/gis/emergency/controller/SupplyDispatchController.java` | REST |

### 前端修改

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `frontend/src/views/WarnInfoView.vue` | mock → API + 编辑弹窗 + 删除按钮 |
| 修改 | `frontend/src/views/CoordResponseView.vue` | mock → API + 编辑弹窗 + 删除按钮 |
| 修改 | `frontend/src/views/SupplyDispatchView.vue` | mock → API + 编辑弹窗（已有删除） |

### 明确不动

- `frontend/src/components/AgentChatPanel.vue` 及 `frontend/src/utils/agent/*`
- `frontend/src/components/SmMapViewer.vue`（仅作路由跳转触发器）
- `frontend/src/components/NavSidebar.vue`（入口已就绪）
- `frontend/src/router/index.js`（路由已就绪）
- `frontend/src/utils/mockData.js`（保留三个 generate 函数，作为后备/参考，避免影响潜在引用方）
- `backend/src/main/java/com/gis/emergency/controller/HealthController.java`
- `backend/src/main/java/com/gis/emergency/common/R.java`
- `backend/src/main/java/com/gis/emergency/config/*`
- `frontend/src/views/HomeView.vue`、`FloodSimulationView.vue`、`DataDashboardView.vue`、`NewBigScreenView.vue`

---

## Risk & Mitigation（风险与应对）

| 风险 | 可能性 | 影响 | 应对方案 |
|------|--------|------|----------|
| MySQL 服务未启动 | 中 | 后端启动失败 | application.yml 用 `createDatabaseIfNotExist=true`；启动前提示用户检查 MySQL 服务 |
| 字段类型不匹配（如 TINYINT 接收 String） | 低 | 接口 400 | Entity 严格按表中类型，前端 a-select-option :value 已是数字 |
| DATETIME 字段前端格式不统一（有/无秒） | 低 | 写入截断 | MySQL DATETIME 兼容两种格式；前端不做强制转换 |
| 删除种子数据后重启被重新插入 | 低 | 用户疑惑 | README 文档说明此行为；可在 application.yml 切换 `spring.sql.init.mode: never` 关闭 |
| 表已存在但 schema 不一致 | 低 | 启动报错 | `CREATE TABLE IF NOT EXISTS` 不会修改已存在表；用户首次部署需确保无残留旧表 |
| MyBatis 主键不存在查询返回 null | 低 | 前端报错 | Service 层校验 `null` 时抛 IllegalArgumentException，由 [GlobalExceptionHandler](file:///d:/Code/AI-Code/GIS-Practice/backend/src/main/java/com/gis/emergency/config/GlobalExceptionHandler.java) 转为 R.error(400) |
