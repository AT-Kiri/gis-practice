# 数据库表格模块接入后端 CRUD - 实现清单

## 优先级说明

| 标记 | 含义 |
|------|------|
| P0 | 必须完成，阻塞其他任务 |
| P1 | 核心功能，必须完成 |
| P2 | 重要功能，建议完成 |

---

## 后端任务

### Task B1：pom.xml 依赖新增 [P0]

| 属性 | 内容 |
|------|------|
| 依赖 | 无 |
| 文件 | `backend/pom.xml` |
| 描述 | 新增 `mysql-connector-j`（runtime scope）、`mybatis-spring-boot-starter` 3.x |
| 验证 | `mvn dependency:tree | grep -E "mysql-connector-j\|mybatis-spring-boot"` 输出两条依赖 |

### Task B2：application.yml 数据源与 MyBatis 配置 [P0]

| 属性 | 内容 |
|------|------|
| 依赖 | Task B1 |
| 文件 | `backend/src/main/resources/application.yml` |
| 描述 | 新增 spring.datasource（url 带 `createDatabaseIfNotExist=true`、username=root、password=t821777、driver-class-name）、spring.sql.init（mode=always、schema 和 data locations）、mybatis.configuration.map-underscore-to-camel-case |
| 验证 | 后端启动日志显示 HikariCP 连接 MySQL 成功 |

### Task B3：schema.sql 建表 DDL [P0]

| 属性 | 内容 |
|------|------|
| 依赖 | Task B2 |
| 文件 | `backend/src/main/resources/schema.sql` |
| 描述 | 3 张表 CREATE TABLE IF NOT EXISTS，严格按 [design.md](file:///d:/Code/AI-Code/GIS-Practice/openspec/changes/20260702-db-crud-module/design.md) 数据设计章节字段类型 |
| 验证 | 首次启动后 `SHOW TABLES;` 返回 3 张表 |

### Task B4：data.sql 种子数据 [P0]

| 属性 | 内容 |
|------|------|
| 依赖 | Task B3 |
| 文件 | `backend/src/main/resources/data.sql` |
| 描述 | 将 [mockData.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/mockData.js) 中三个 generate 函数返回的 26 条数据转成 `INSERT IGNORE INTO ...` SQL |
| 验证 | 启动后 `SELECT COUNT(*) FROM tb_warn_info;` 返回 6，`tb_coord_response` 返回 6，`tb_supply_dispatch` 返回 14 |

### Task B5：实体类 [P0]

| 属性 | 内容 |
|------|------|
| 依赖 | Task B3 |
| 文件 | `backend/src/main/java/com/gis/emergency/entity/{WarnInfo,CoordResponse,SupplyDispatch}.java` |
| 描述 | 3 个 POJO，字段类型按 design.md "实体字段映射"表；TINYINT→Integer，FLOAT→Float，INT→Integer，DATETIME→String，VARCHAR/TEXT→String |
| 验证 | 编译通过；字段与 DB 列一一对应 |

### Task B6：Mapper 接口 [P0]

| 属性 | 内容 |
|------|------|
| 依赖 | Task B5 |
| 文件 | `backend/src/main/java/com/gis/emergency/mapper/{WarnInfoMapper,CoordResponseMapper,SupplyDispatchMapper}.java` |
| 描述 | 注解式 Mapper，每个含 findAll/findOne/deleteById 共 5 个方法（findAll/findOne/insert/update/deleteById），用 `@Select/@Insert/@Update/@Delete` 注解 |
| 验证 | 编译通过；EmergencyApplication 加 `@MapperScan("com.gis.emergency.mapper")` 后能扫描到 |

### Task B7：Service 类 [P0]

| 属性 | 内容 |
|------|------|
| 依赖 | Task B6 |
| 文件 | `backend/src/main/java/com/gis/emergency/service/{WarnInfoService,CoordResponseService,SupplyDispatchService}.java` |
| 描述 | @Service 注解，注入对应 Mapper；findOne/deleteById 在 Mapper 返回 null/0 时抛 IllegalArgumentException；insert/update 直接委托 Mapper |
| 验证 | 编译通过；单元测试或手工调用接口验证异常分支 |

### Task B8：Controller 类 [P0]

| 属性 | 内容 |
|------|------|
| 依赖 | Task B7 |
| 文件 | `backend/src/main/java/com/gis/emergency/controller/{WarnInfoController,CoordResponseController,SupplyDispatchController}.java` |
| 描述 | @RestController + @RequestMapping("/api/xxx")，每个 5 个端点（GET 列表、GET 单条、POST、PUT、DELETE）；返回 R 包络 |
| 验证 | curl 调用 15 个端点均返回 200 |

### Task B9：EmergencyApplication 加 @MapperScan [P0]

| 属性 | 内容 |
|------|------|
| 依赖 | Task B6 |
| 文件 | `backend/src/main/java/com/gis/emergency/EmergencyApplication.java` |
| 描述 | 在主类上加 `@MapperScan("com.gis.emergency.mapper")` |
| 验证 | 启动日志不报 Mapper 找不到 |

### Task B10：后端整体启动验证 [P0]

| 属性 | 内容 |
|------|------|
| 依赖 | Task B1-B9 |
| 文件 | 无 |
| 描述 | `mvn spring-boot:run` 启动；检查日志无 ERROR；访问 `/api/health` 返回 200；访问 `/api/warn-info` 返回 6 条数据 |
| 验证 | 三个 GET 列表接口均返回正确种子数据条数 |

---

## 前端任务

### Task F1：WarnInfoView 切换 API + 补 CRUD [P0]

| 属性 | 内容 |
|------|------|
| 依赖 | Task B10 |
| 文件 | `frontend/src/views/WarnInfoView.vue` |
| 描述 | 1) 移除 `import { generateWarnInfoData } from '@/utils/mockData.js'`；2) 加 `import { request } from '@/utils/request'`；3) `onMounted` 调 `loadList()`；4) `loadList()` 调 `request.get('/warn-info')` 并填充 records；5) `addRecord()` 改为 `request.post('/warn-info', form.value)`；6) 表格末尾加"操作"列，含"编辑"+"删除"按钮；7) 新增 `editingRecord` ref + `a-modal` 弹窗复用既有 `a-form`；8) 编辑提交调 `request.put('/warn-info/{id}')`；9) 删除用 `Modal.confirm` 二次确认 + `request.delete('/warn-info/{id}')` |
| 验证 | 页面加载显示 6 条数据；新增成功后列表刷新；编辑弹窗正确回填并提交；删除二次确认后刷新 |

### Task F2：CoordResponseView 切换 API + 补 CRUD [P0]

| 属性 | 内容 |
|------|------|
| 依赖 | Task B10 |
| 文件 | `frontend/src/views/CoordResponseView.vue` |
| 描述 | 与 Task F1 同构，针对 `/coord-response` 路由 |
| 验证 | 同 Task F1 |

### Task F3：SupplyDispatchView 切换 API + 补编辑 [P0]

| 属性 | 内容 |
|------|------|
| 依赖 | Task B10 |
| 文件 | `frontend/src/views/SupplyDispatchView.vue` |
| 描述 | 与 Task F1/F2 同构，针对 `/supply-dispatch`；既有"删除"按钮改为二次确认 + API 调用（替换原 filter 逻辑）；新增"编辑"按钮 + 弹窗 |
| 验证 | 同 Task F1；删除按钮显示二次确认 |

---

## 验收任务

### Task V1：端到端联调 [P0]

| 属性 | 内容 |
|------|------|
| 依赖 | 所有 B/F 任务 |
| 文件 | 无 |
| 描述 | 启动后端 + 前端；逐页面验证：列表加载、新增、编辑、删除；刷新页面数据持久 |
| 验证 | 见 [checklist.md](file:///d:/Code/AI-Code/GIS-Practice/openspec/changes/20260702-db-crud-module/checklist.md) 全部通过 |

### Task V2：规范检查 [P1]

| 属性 | 内容 |
|------|------|
| 依赖 | Task V1 |
| 文件 | 无 |
| 描述 | 1) Vue 组件用 `<script setup>`；2) 后端类用 PascalCase；3) Mapper 接口在 `mapper/` 包；4) 不动 Agent 模块；5) 不动 mockData.js |
| 验证 | code-review skill 输出 P0=0 |

---

## 依赖关系图

```
B1 (pom) ─→ B2 (yml) ─→ B3 (schema) ─→ B4 (data) ─┐
                              │                    │
                              └─→ B5 (entity) ─→ B6 (mapper) ─→ B7 (service) ─→ B8 (controller) ─→ B10 (启动验证)
                                                          │                              │
                                                          └─→ B9 (@MapperScan)           │
                                                                                         │
                                                                                         ▼
                                                                              F1 (WarnInfo) ┐
                                                                              F2 (Coord)    ├─→ V1 (联调) ─→ V2 (规范)
                                                                              F3 (Supply)   ┘
```

## 执行顺序建议

1. **后端基础设施**：B1 → B2 → B3 → B4（数据库就位）
2. **后端 Java 代码**：B5 → B6 → B7 → B8 + B9（CRUD 接口就位）
3. **后端验证**：B10（启动 + 接口测试）
4. **前端改造**：F1 / F2 / F3（三个 View 切换 API）
5. **验收**：V1 → V2
