# 京津冀城市综合防灾应急管理系统

基于 **Vue3 + SuperMap iClient (MapboxGL) + SpringBoot + FastAPI + LangGraph** 的 GIS 应急管理平台，集成多源空间数据可视化、空间分析、网络分析、AI 智能问答等能力。

> 课程：GIS 工程应用实践 ｜ 数据处理：SuperMap iDesktopX 2025 ｜ 服务发布：SuperMap iServer 11i

---

## 一、功能模块

| 模块 | 说明 |
|------|------|
| 基本地图功能 | 全幅显示、缩放平移、鹰眼、距离/面积量算、图层管理 |
| 空间查询 | 按绘制范围（点/矩形/圆）查询 POI，结果标绘与属性弹窗 |
| 专题检索 | 关键字查询、行政级别（省/县/乡镇）分级检索 |
| 缓冲区与叠置分析 | 辐射范围分析、土地利用叠置分析 |
| 网络分析 | 最短路径分析、服务区分析（基于长春路网数据） |
| 三维洪水模拟 | 3D 场景淹没分析展示 |
| 数据看板 | 气象灾害预警、协同叫应、物资调度三表 CRUD 管理 |
| AI 应急助手 | 多 Agent 协同的空间问答（Coordinator + 4 子 Agent + 11 GIS 工具 + RAG 知识库） |

---

## 二、技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vue 3.5 + Vite 8 + Ant Design Vue 4 + MapboxGL + `@supermap/iclient-mapboxgl` 11 + Pinia + Vue Router |
| 后端（业务） | SpringBoot 3.4 + MyBatis 3 + MySQL 8（Java 17） |
| 后端（Agent） | FastAPI + LangGraph + LangChain + DeepSeek-V3.2（硅基流动）+ FAISS |
| GIS 服务 | SuperMap iServer 11i（地图/数据/空间分析/网络分析服务） |
| 数据 | Jingjin.udbx / World.udbx / Changchun.udbx（iServer 自带样本数据） |

---

## 三、目录结构

```
GIS-Practice/
├── frontend/              # Vue3 前端
│   ├── src/
│   │   ├── components/    # 功能组件（地图、Agent 聊天、分析面板等）
│   │   ├── views/         # 页面视图（路由级别）
│   │   ├── router/        # 路由配置
│   │   ├── stores/        # Pinia 状态管理（map / agent）
│   │   └── utils/         # 工具函数（请求、SSE、地图渲染等）
│   └── vite.config.js     # 含 /iserver /api /agent-api 三组 proxy
│
├── backend/               # SpringBoot 业务后端（CRUD + 健康检查）
│   └── src/main/
│       ├── java/com/gis/emergency/
│       │   ├── controller/  # REST API（WarnInfo / CoordResponse / SupplyDispatch）
│       │   ├── service/     # 业务层
│       │   ├── mapper/      # MyBatis 注解式 Mapper
│       │   ├── entity/      # 实体类
│       │   └── config/      # CORS、全局异常处理
│       └── resources/
│           ├── application.yml  # 数据库 + iServer 配置
│           ├── schema.sql       # 建表脚本（启动自动执行，幂等）
│           └── data.sql         # 种子数据（启动自动执行，INSERT IGNORE）
│
├── agent-backend/         # FastAPI Agent 后端（AI 智能问答）
│   ├── app/
│   │   ├── agent/         # LangGraph 多 Agent 编排
│   │   │   ├── coordinator.py  # Coordinator 调度
│   │   │   ├── sub_agents/     # 4 个子 Agent（search/analysis/route/knowledge）
│   │   │   └── tools/          # 11 个 GIS 工具 + 算法工具
│   │   ├── api/           # FastAPI 路由
│   │   ├── services/      # LLM / RAG / iServer 客户端
│   │   └── config.py      # 配置读取（.env 优先）
│   ├── data/knowledge/    # RAG 知识库源文档（应急预案等 markdown）
│   ├── .env.example       # 环境变量模板（含 API Key 配置说明）
│   └── requirements.txt
│
├── openspec/              # OpenSpec 设计文档（proposal/design/spec/tasks/checklist）
├── .trae/                 # Trae IDE 规则、技能、工作流、知识库
├── project-brief.md       # 项目概要
└── AGENTS.md              # AI Agent 入口导航
```

---

## 四、运行环境要求

| 软件 | 版本 | 用途 |
|------|------|------|
| JDK | 17+ | SpringBoot 后端 |
| Maven | 3.8+ | 后端构建 |
| Node.js | 18+ | 前端构建 |
| npm | 9+ | 前端依赖 |
| Python | 3.10+ | Agent 后端 |
| MySQL | 8.0+ | 业务数据存储 |
| SuperMap iServer | 11i (11.3.0) | GIS 服务 |
| SuperMap iDesktopX | 2025（可选） | 数据处理/制图 |

---

## 五、启动前配置

系统涉及 **5 个服务**（含数据库），按以下顺序配置和启动：iServer → MySQL → SpringBoot 后端 → FastAPI Agent 后端 → Vue 前端。

### 5.1 SuperMap iServer 配置（端口 8090）

iServer 提供 GIS 数据服务、地图服务、空间分析、网络分析能力，是前端地图和 Agent 工具的数据源。

#### 1) 安装并启动 iServer

- 安装路径示例：`D:\SuperMap\SuperMapiServer11i\`
- 启动：进入 `bin/` 目录运行 `startup.bat`，浏览器访问 `http://localhost:8090/iserver`
- 首次启动需设置管理员账号

#### 2) 确认样本数据存在

iServer 11i 自带以下样本数据，位于 `D:\SuperMap\SuperMapiServer11i\samples\data\`：

| 数据文件 | 路径 | 用途 |
|---------|------|------|
| 京津冀数据 | `City\Jingjin.udbx` | 基础地图、空间查询、缓冲区分析 |
| 世界底图 | `World\World.udbx` | 底图 |
| 长春路网 | `NetworkAnalyst\Changchun.udbx` | 网络分析（最短路径/服务区） |

#### 3) 发布/确认服务

iServer 默认在 `webapps\iserver\WEB-INF\iserver-services-samples.xml` 中预配置了以下服务，**首次启动后通常已自动发布**，请在 iServer 管理页面「服务」列表中确认存在：

| 服务名 | 类型 | 用途 |
|--------|------|------|
| `map-jingjin` | 地图服务 | 京津冀地图展示 |
| `data-jingjin` | 数据服务 | 要素查询（POI、行政区域等） |
| `spatialanalyst-sample` | 空间分析服务 | 缓冲区分析、叠置分析 |
| `transportationanalyst-sample` | 交通网络分析服务 | 最短路径、服务区分析 |

若服务未自动发布，可在 iServer 管理页面「服务 → 创建服务」中基于上述数据源手动发布。

#### 4) 验证

浏览器访问 `http://localhost:8090/iserver/services`，应能看到上述服务列表。

---

### 5.2 MySQL 数据库配置（端口 3306）

#### 1) 安装并启动 MySQL 8

确保 MySQL 服务已启动，并能以 root 账号登录：

```bash
mysql -u root -p
```

#### 2) 修改后端数据库账号密码

打开 `backend/src/main/resources/application.yml`，修改第 10–12 行：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/emergency_db?createDatabaseIfNotExist=true&useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true
    username: root           # ← 改为你的 MySQL 用户名
    password: t821777        # ← 改为你的 MySQL 密码
    driver-class-name: com.mysql.cj.jdbc.Driver
```

说明：
- `createDatabaseIfNotExist=true`：首次启动时自动创建 `emergency_db` 数据库，无需手动建库
- `serverTimezone=Asia/Shanghai`：时区配置，必须保留

#### 3) 执行 SQL（建表 + 种子数据）

**方式 A（推荐，自动执行）**：保持 `application.yml` 中以下配置不变：

```yaml
spring:
  sql:
    init:
      mode: always                              # 每次启动都执行
      schema-locations: classpath:schema.sql    # 建表（IF NOT EXISTS，幂等）
      data-locations: classpath:data.sql        # 种子数据（INSERT IGNORE，幂等）
      continue-on-error: false
```

启动 SpringBoot 后端时，`schema.sql`（建 3 张表）和 `data.sql`（插入 18 条种子数据）会**自动执行**，无需手动操作。

**方式 B（手动执行）**：如需提前建表，可在 MySQL 客户端中执行：

```bash
# 登录 MySQL
mysql -u root -p

# 在 MySQL 命令行中执行
CREATE DATABASE IF NOT EXISTS emergency_db DEFAULT CHARACTER SET utf8mb4;
USE emergency_db;
SOURCE d:/Code/AI-Code/GIS-Practice/backend/src/main/resources/schema.sql;
SOURCE d:/Code/AI-Code/GIS-Practice/backend/src/main/resources/data.sql;
EXIT;
```

> 若已通过方式 A 自动建表，**不要再手动执行**，否则 `INSERT IGNORE` 会因主键已存在而跳过（无害但冗余）。

#### 4) 数据表说明

| 表名 | 说明 | 主键 |
|------|------|------|
| `tb_warn_info` | 气象灾害预警主表 | `warn_id` |
| `tb_coord_response` | 协同叫应处置表 | `response_id` |
| `tb_supply_dispatch` | 应急物资调度总表 | `dispatch_id` |

---

### 5.3 SpringBoot 业务后端配置（端口 8080）

#### 1) 检查 iServer 配置

`application.yml` 第 33–41 行已配置 iServer 服务地址，若你的 iServer 不在 `localhost:8090`，请修改：

```yaml
iserver:
  base-url: http://localhost:8090
  data-service: data-jingjin
  datasource: Jingjin
  map-service: map-jingjin
  map-name: 京津地区地图
  spatial-service: spatialanalyst-sample
  transport-service: transportationanalyst-sample
```

#### 2) 构建并启动

```bash
cd backend
mvn clean package -DskipTests
java -jar target/emergency-backend-0.0.1-SNAPSHOT.jar
```

或在 IDE 中直接运行 `EmergencyApplication.java`。

#### 3) 验证

浏览器访问 `http://localhost:8080/api/health`，应返回：

```json
{ "code": 200, "message": "success", "data": "京津冀城市综合防灾应急管理系统后端运行正常" }
```

---

### 5.4 FastAPI Agent 后端配置（端口 8001）

Agent 后端依赖 **大模型 API Key** 才能运行 AI 问答功能。

#### 1) 创建 Python 虚拟环境并安装依赖

```bash
cd agent-backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

#### 2) 配置 API Key（必须）

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `agent-backend/.env`，填入你的 API Key：

```dotenv
# LLM API 配置（硅基流动 SiliconFlow）
# 注册地址：https://siliconflow.cn/  注册后在「API 密钥」页面创建 Key
# 注意：变量名虽为 DEEPSEEK_API_KEY，实际填入的是硅基流动的 API Key
DEEPSEEK_API_KEY=sk-your-siliconflow-api-key-here    # ← 改为你的真实 Key
DEEPSEEK_BASE_URL=https://api.siliconflow.cn/v1
DEEPSEEK_MODEL=deepseek-ai/DeepSeek-V3.2

# iServer 配置（默认本机，无需修改）
ISERVER_URL=http://localhost:8090

# 后端配置
HOST=0.0.0.0
PORT=8001

# RAG 配置（与 LLM 共用 API Key，留空则自动回退到 DEEPSEEK_API_KEY）
EMBEDDING_BASE_URL=https://api.siliconflow.cn/v1
EMBEDDING_MODEL=BAAI/bge-m3
```

> **关于 API Key**：本项目使用硅基流动（SiliconFlow）提供的 `deepseek-ai/DeepSeek-V3.2` 模型，性价比高。注册硅基流动账号后在「API 密钥」页面创建 Key，填入 `DEEPSEEK_API_KEY`。Embedding 模型 `BAAI/bge-m3` 与 LLM 共用同一 Key，无需额外申请。

#### 3) 启动

```bash
# 确保在 agent-backend/ 目录且已激活虚拟环境
python -m app.main
```

或使用 uvicorn 热重载：

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

#### 4) 验证

浏览器访问 `http://localhost:8001/api/health`，应返回：

```json
{ "status": "ok", "service": "gis-agent-backend" }
```

启动日志中应看到 `RAG 知识库就绪：5 个文档已索引`（首次启动会自动构建 FAISS 向量库）。

---

### 5.5 Vue 前端配置（端口 5173）

#### 1) 安装依赖

```bash
cd frontend
npm install
```

#### 2) 确认 Vite proxy 配置

`vite.config.js` 已配置三组代理，默认无需修改：

| 前缀 | 转发到 | 用途 |
|------|--------|------|
| `/iserver` | `http://localhost:8090` | iServer GIS 服务 |
| `/api` | `http://localhost:8080` | SpringBoot 业务后端 |
| `/agent-api` | `http://localhost:8001`（重写为 `/api`） | FastAPI Agent 后端 |

若你的后端服务端口不同，请修改 `vite.config.js` 中对应的 `target`。

#### 3) 启动

```bash
npm run dev
```

浏览器访问 `http://localhost:5173`。

---

## 六、启动顺序速查

| 顺序 | 服务 | 端口 | 启动命令 | 启动条件 |
|------|------|------|---------|---------|
| 1 | SuperMap iServer | 8090 | `bin/startup.bat` | 已安装并发布样本服务 |
| 2 | MySQL | 3306 | 系统服务 | 已创建 root 账号或修改 `application.yml` |
| 3 | SpringBoot 后端 | 8080 | `mvn spring-boot:run` | iServer + MySQL 已启动 |
| 4 | FastAPI Agent 后端 | 8001 | `python -m app.main` | iServer 已启动 + `.env` 已配置 Key |
| 5 | Vue 前端 | 5173 | `npm run dev` | 上述后端均已启动 |

> **可选**：若不使用 AI 问答功能，可跳过第 4 步（FastAPI Agent 后端），其余模块（地图、CRUD、空间分析）仍可正常使用。

---

## 七、常见问题

### Q1：前端打开后地图空白？
- 检查 iServer 是否启动：访问 `http://localhost:8090/iserver`
- 检查浏览器控制台是否有 `/iserver` 请求 404，确认服务名与 `application.yml` 一致

### Q2：后端启动报数据库连接失败？
- 确认 MySQL 服务已启动
- 确认 `application.yml` 中 `username` / `password` 与本机 MySQL 一致
- 确认 URL 中 `createDatabaseIfNotExist=true` 参数存在（首次启动需自动建库）

### Q3：数据表未自动创建？
- 检查 `application.yml` 中 `spring.sql.init.mode` 是否为 `always`
- 检查 `schema.sql` / `data.sql` 是否在 `src/main/resources/` 下
- 查看启动日志是否有 SQL 执行错误

### Q4：Agent 聊天无响应或报 401？
- 确认 `agent-backend/.env` 中 `DEEPSEEK_API_KEY` 已填写真实 Key
- 确认 Key 余额充足（硅基流动账户）
- 确认 `DEEPSEEK_BASE_URL` 为 `https://api.siliconflow.cn/v1`（非 DeepSeek 官方地址）

### Q5：RAG 知识库初始化失败？
- 首次启动会调用 Embedding API 构建向量库，需联网且 API Key 有效
- 失败为非致命错误，Agent 仍可运行（仅失去知识库检索能力）
- 重新启动时会自动重试

### Q6：网络分析模块无结果？
- 确认 `transportationanalyst-sample` 服务已在 iServer 发布
- 确认长春路网数据 `Changchun.udbx` 存在
- 网络分析使用长春市数据，起终点需在长春市范围内

### Q7：端口被占用？
- 8080 / 8001 / 5173 / 8090 任一被占用都会导致启动失败
- 使用 `netstat -ano | findstr <端口>` 查看占用进程
- 修改对应配置文件中的端口号（注意同步更新 `vite.config.js` 的 proxy target）

---

## 八、开发规范

- AI 编码规范：见 [`.trae/rules/coding_guidelines.md`](.trae/rules/coding_guidelines.md)
- 前端规范：见 [`.trae/rules/frontend_rules.md`](.trae/rules/frontend_rules.md)
- 项目规范：见 [`.trae/rules/project_rules.md`](.trae/rules/project_rules.md)
- Git 提交规范：`<type>: <描述>`，type 包括 `feat / fix / refactor / docs / style / chore`
- 设计文档：`openspec/changes/<change-id>/` 下按 proposal → design → spec → tasks → checklist 组织

---

## 九、安全说明

- 本项目为课程设计，**不涉及用户认证**，前后端 API 均为公开访问
- `application.yml` 中 MySQL 密码为明文（课设阶段可接受，生产环境应使用配置中心或环境变量）
- `agent-backend/.env` 已在 `.gitignore` 中忽略，不会提交 API Key 到 Git 仓库
- iServer 服务地址使用相对路径，通过 Vite proxy 转发，避免跨域

---

## 十、文档索引

| 文档 | 说明 |
|------|------|
| [AGENTS.md](AGENTS.md) | AI Agent 入口导航 |
| [project-brief.md](project-brief.md) | 项目概要：技术栈、数据资源、功能模块 |
| `.trae/docs/workflows.md` | 角色工作流、协作流程 |
| `openspec/changes/` | 各功能模块的设计文档与验收清单 |
| `.trae/knowledge/INDEX.md` | 项目知识库全景图 |

---

## 十一、文档与实现差异说明

本项目的设计文档（包括 `project-brief.md`、`openspec/changes/` 下的 proposal/design/spec/tasks/checklist、`.trae/knowledge/` 中的知识库等）反映的是**开发初期或阶段性方案设计**，并非最终实现的逐字描述。

在实际开发与测试过程中，部分功能会因以下原因与原始文档产生差异：

- 测试验证中发现问题后对接口字段、参数命名、业务逻辑的调整
- 依赖库版本升级或 API 行为变化导致的实现细节调整
- 针对 SuperMap iServer / DeepSeek / LangGraph 等外部服务的兼容性适配
- 性能优化、Bug 修复过程中的代码重构

> **若本文档（README）或其他设计文档与实际系统行为存在不一致，请以实际代码和运行系统为准。**

如需了解某模块的最新实现，建议直接查阅对应的源码：

- 前端组件实现：`frontend/src/components/` 与 `frontend/src/views/`
- 后端接口实现：`backend/src/main/java/com/gis/emergency/`
- Agent 工具实现：`agent-backend/app/agent/tools/` 与 `agent-backend/app/agent/sub_agents/`
- 配置文件（反映真实运行参数）：`backend/src/main/resources/application.yml`、`agent-backend/.env.example`
