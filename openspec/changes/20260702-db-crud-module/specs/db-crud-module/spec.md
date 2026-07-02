# 数据库表格模块 CRUD - 行为规格

## 模块 1: 预警主表 WarnInfo

### 场景 1.1：首次进入页面加载列表

**Given** 后端已启动且数据库 `emergency_db` 已建表 + 种子数据已就位
**When** 用户从 [NavSidebar.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/components/NavSidebar.vue) 点击"预警主表"进入 `/warn-info`
**Then** `onMounted` 触发 `GET /api/warn-info`
**And** 表格显示种子数据的 6 条预警记录
**And** 表格列顺序为：预警编号、区域编码、灾害类型、预警等级、实时气象、风险分值、发布时间、失效时间、研判内容、推送状态、发布责任人、操作
**And** 灾害类型列显示中文文本（1→暴雨、2→大风、3→沙尘、4→强对流）
**And** 预警等级列显示带颜色 a-tag（1蓝processing、2黄warning、3橙orange、4红red）
**And** 推送状态列显示中文（0→未推送、1→已推送）

### 场景 1.2：新增预警记录

**Given** 用户在预警主表页面
**When** 用户填写表单（warn_id 可空，将由系统生成）并点击"录入信息"
**Then** 前端调用 `POST /api/warn-info`，请求体为表单 JSON
**And** 后端 WarnInfoService.insert(warnInfo) 写入数据库
**And** 返回 `R.ok()`，前端显示 `message.success('录入成功')`
**And** 调用 `loadList()` 刷新表格，新记录出现在列表顶部
**And** 表单被重置（resetForm）

### 场景 1.3：编辑预警记录

**Given** 表格已有预警记录
**When** 用户点击某行"编辑"按钮
**Then** 弹出 `a-modal` 编辑弹窗，标题为"编辑预警信息"
**And** 弹窗内的表单字段被该行记录数据回填
**When** 用户修改字段后点击"确定"
**Then** 前端调用 `PUT /api/warn-info/{warnId}`，请求体为修改后的 JSON
**And** 后端 WarnInfoService.update(warnId, warnInfo) 更新数据库
**And** 返回 `R.ok()`，前端显示成功提示
**And** 弹窗关闭，列表刷新显示新数据

### 场景 1.4：删除预警记录

**Given** 表格已有预警记录
**When** 用户点击某行"删除"按钮
**Then** 弹出 `Modal.confirm` 二次确认对话框，提示"确定删除该预警记录吗？"
**When** 用户点击"确定"
**Then** 前端调用 `DELETE /api/warn-info/{warnId}`
**And** 后端 WarnInfoService.deleteById(warnId) 删除记录
**And** 返回 `R.ok()`，前端显示成功提示
**And** 列表刷新，该记录消失
**When** 用户点击"取消"
**Then** 不发请求，对话框关闭

### 场景 1.5：查询单条预警

**Given** 后端有 warn_id='WARN-20260629-01' 的记录
**When** 前端调用 `GET /api/warn-info/WARN-20260629-01`
**Then** 返回 `R.ok(warnInfo)`，data 字段为该预警完整数据
**When** 查询不存在的 warn_id='NOT-EXIST'
**Then** 后端 Service 抛 IllegalArgumentException，[GlobalExceptionHandler](file:///d:/Code/AI-Code/GIS-Practice/backend/src/main/java/com/gis/emergency/config/GlobalExceptionHandler.java) 捕获返回 `R.error(400, "预警记录不存在: NOT-EXIST")`

### 场景 1.6：新增时 warn_id 自动生成

**Given** 用户在录入表单中 warn_id 字段为空
**When** 用户点击"录入信息"
**Then** 前端在提交前自动生成 `WARN-${Date.now().toString().slice(-6)}` 作为 warn_id（保留既有逻辑）
**And** 提交 POST 请求

### 场景 1.7：网络错误处理

**Given** 后端服务未启动或网络断开
**When** 前端调用任意 API
**Then** [request.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/request.js) 拦截器捕获错误，显示 `message.error('网络错误')`
**And** 控制台打印错误详情
**And** 不阻塞 UI，用户可重试

---

## 模块 2: 协同处置表 CoordResponse

### 场景 2.1：首次加载列表

**Given** 后端已就位
**When** 用户进入 `/coord-response`
**Then** `onMounted` 触发 `GET /api/coord-response`
**And** 表格显示 6 条种子数据
**And** 表格列：处置记录编号、预警编号、联动区域、责任人、联系电话、叫应方式、应答状态、处置任务、联动指令、反馈时间、操作
**And** 叫应方式显示中文（1短信、2电话、3平台消息）
**And** 应答状态显示带颜色 a-tag（0未接通default、1已应答processing、2已处置success）

### 场景 2.2：新增协同处置记录

**Given** 用户在协同处置页面
**When** 用户填写表单（response_id 可空）并点击"录入信息"
**Then** 前端调用 `POST /api/coord-response`
**And** 后端 CoordResponseService.insert 写入
**And** 返回 `R.ok()`，前端显示成功提示，列表刷新，表单重置

### 场景 2.3：编辑协同处置记录

**Given** 表格已有记录
**When** 用户点击某行"编辑"按钮
**Then** 弹出编辑弹窗，表单字段被回填
**When** 用户修改后点击"确定"
**Then** 调用 `PUT /api/coord-response/{responseId}`
**And** 返回成功，弹窗关闭，列表刷新

### 场景 2.4：删除协同处置记录

**Given** 表格已有记录
**When** 用户点击"删除"按钮
**Then** 弹出二次确认
**When** 确认
**Then** 调用 `DELETE /api/coord-response/{responseId}`
**And** 返回成功，列表刷新

### 场景 2.5：删除时 response_id 不存在

**Given** 后端无 response_id='NOT-EXIST' 的记录
**When** 前端调用 `DELETE /api/coord-response/NOT-EXIST`
**Then** 后端 Service.deleteById 返回 0（影响行数），抛 IllegalArgumentException
**And** 返回 `R.error(400, "处置记录不存在: NOT-EXIST")`

---

## 模块 3: 物资调度表 SupplyDispatch

### 场景 3.1：首次加载列表

**Given** 后端已就位
**When** 用户进入 `/supply-dispatch`
**Then** `onMounted` 触发 `GET /api/supply-dispatch`
**And** 表格显示 14 条种子数据
**And** 表格列：调度单号、预警编号、储备位置、物资类型、数量、需求区域、里程、出库时间、预计到达、运输队伍、状态、操作
**And** 里程列显示 `${distance} km` 后缀
**And** 状态列显示带颜色 a-tag（0待出库default、1运输中processing、2已送达success）

### 场景 3.2：新增调度记录

**Given** 用户在物资调度页面
**When** 用户填写表单（dispatch_id 可空）并点击"录入调度"
**Then** 前端调用 `POST /api/supply-dispatch`
**And** 后端写入，返回 `R.ok()`
**And** 列表刷新，表单重置

### 场景 3.3：编辑调度记录

**Given** 表格已有记录
**When** 用户点击"编辑"按钮
**Then** 弹出编辑弹窗（复用既有表单字段）
**When** 用户修改后点击"确定"
**Then** 调用 `PUT /api/supply-dispatch/{dispatchId}`
**And** 返回成功，弹窗关闭，列表刷新

### 场景 3.4：删除调度记录（既有功能保留）

**Given** 表格已有记录
**When** 用户点击"删除"按钮
**Then** 弹出二次确认（替换原有的直接 filter 行为，避免误删）
**When** 确认
**Then** 调用 `DELETE /api/supply-dispatch/{dispatchId}`
**And** 返回成功，列表刷新

---

## 模块 4: 后端启动与数据库初始化

### 场景 4.1：首次启动后端

**Given** MySQL 服务运行中，但 `emergency_db` 数据库不存在
**When** 后端 Spring Boot 启动
**Then** JDBC URL `createDatabaseIfNotExist=true` 自动创建 `emergency_db`
**And** Spring Boot 执行 `schema.sql`，创建 3 张表（`CREATE TABLE IF NOT EXISTS`）
**And** Spring Boot 执行 `data.sql`，插入 26 条种子数据（`INSERT IGNORE`，无主键冲突）
**And** 控制台日志显示启动成功
**And** `GET /api/health` 返回 200

### 场景 4.2：二次启动后端

**Given** 数据库已存在且表 + 种子数据已就位，用户曾通过 API 新增/编辑/删除数据
**When** 后端重启
**Then** `CREATE TABLE IF NOT EXISTS` 跳过建表
**And** `INSERT IGNORE` 跳过已存在主键，**不覆盖**用户修改过的记录
**And** 用户通过 API 新增的记录保留
**And** 用户编辑过的记录保留（INSERT IGNORE 主键冲突时跳过）
**And** 已知行为：用户删除的种子记录会被重新插入

### 场景 4.3：关闭自动种子初始化

**Given** 用户不希望每次重启都重新插入种子数据
**When** 用户在 `application.yml` 注释掉 `spring.sql.init.mode: always`（默认为 never）
**Then** 重启后不再执行 schema.sql / data.sql
**And** 数据库完全由 API 操作驱动

### 场景 4.4：MySQL 服务未启动

**Given** MySQL 服务未运行
**When** 后端启动
**Then** 启动失败，控制台报 `CommunicationsException: Communications link failure`
**And** 错误日志提示用户检查 MySQL 服务

---

## 模块 5: 异常与边界

### 场景 5.1：请求体格式错误

**Given** 用户提交的 JSON 字段类型错误（如 disaster_type 传 "暴雨" 字符串而非数字 1）
**When** 后端接收 POST/PUT 请求
**Then** Jackson 反序列化失败，抛 `HttpMessageNotReadableException`
**And** [GlobalExceptionHandler](file:///d:/Code/AI-Code/GIS-Practice/backend/src/main/java/com/gis/emergency/config/GlobalExceptionHandler.java) 捕获，返回 `R.error(400, "请求体格式错误，请检查 JSON 格式")`

### 场景 5.2：主键冲突（新增重复主键）

**Given** 数据库已有 warn_id='WARN-20260629-01' 记录
**When** 用户尝试 POST 一条 warn_id 相同的新记录
**Then** MySQL 抛 `DuplicateKeyException`
**And** 后端返回 500（被 GlobalExceptionHandler 兜底）
**And** 前端显示错误提示
**改进项**：在 Service 层捕获该异常返回 `R.error(409, "主键已存在")`（如时间允许；否则依赖兜底处理）

### 场景 5.3：跨域请求

**Given** 前端运行在 `http://localhost:5173`，后端在 `http://localhost:8080`
**When** 前端通过 Vite proxy `/api` 调用后端
**Then** Vite 转发到 `http://localhost:8080/api/...`，无跨域
**When** 前端直接调用 `http://localhost:8080/api/...`（不通过 proxy）
**Then** [CorsConfig.java](file:///d:/Code/AI-Code/GIS-Practice/backend/src/main/java/com/gis/emergency/config/CorsConfig.java) 已允许 localhost 来源，跨域成功

### 场景 5.4：空列表查询

**Given** 数据库表为空（用户删除所有记录后）
**When** 前端调用 `GET /api/warn-info`
**Then** 返回 `R.ok([])`，data 为空数组
**And** 前端表格显示 Ant Design Vue 默认空状态（"暂无数据"）

### 场景 5.5：mockData.js 保留不动

**Given** 三个 View 已切换为后端 API
**When** 用户访问其他使用 mockData 的页面（如 [DataDashboardView.vue](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/views/DataDashboardView.vue) 用 `generateCountyDisasters`、`generateWeatherData`）
**Then** 数据正常加载，不受影响
**And** [mockData.js](file:///d:/Code/AI-Code/GIS-Practice/frontend/src/utils/mockData.js) 文件本身本次未修改，三个 generate 函数保留作为后备/参考（按用户要求，避免影响潜在引用方）
