# 项目规范

> 目录结构、Git 提交规范、命名规则、安全规范。

---

## 1. 目录结构

```
GIS-Practice/
├── frontend/               # Vue 3 前端
│   ├── src/
│   │   ├── components/     # Vue 功能组件（地图、分析、面板等）
│   │   ├── views/          # 页面视图（路由级别）
│   │   ├── router/         # 路由配置
│   │   ├── stores/         # Pinia 状态管理
│   │   ├── utils/          # 工具函数（axios、地图工具等）
│   │   ├── assets/         # 静态资源（图片、样式）
│   │   ├── App.vue
│   │   └── main.js
│   └── public/data/        # 静态地理数据
├── backend/                # SpringBoot 后端
│   └── src/main/java/com/gis/emergency/
│       ├── controller/     # REST API 控制器
│       ├── config/         # 配置类（CORS、异常处理等）
│       ├── common/         # 通用工具（统一响应 R.java）
│       └── util/           # 工具类
├── openspec/               # OpenSpec 设计文档
│   └── changes/<change-id>/
└── .trae/                  # Trae IDE 配置
    ├── rules/              # AI 编码规范
    ├── docs/               # 工作流文档
    ├── knowledge/          # 项目知识库
    └── skills/             # AI 技能
```

## 2. Git 提交规范

消息格式（简洁版 Angular）：

```
<type>: <简短描述>

<可选：详细说明>
```

type 类型：

| type | 使用场景 |
|------|----------|
| feat | 新功能 |
| fix | Bug 修复 |
| refactor | 重构（不新增功能也不修 Bug） |
| docs | 文档变更 |
| style | 样式/UI 调整（不影响逻辑） |
| chore | 依赖、构建配置等杂项 |

示例：

```
feat: 实现缓冲区分析功能

- 支持点/线/面绘制缓冲区
- 支持半径参数调节
- 结果以 GeoJSON 图层叠加显示
```

## 3. 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| Vue 组件 | PascalCase | `SmMapViewer.vue`、`SpatialQuery.vue` |
| 普通 JS 文件 | camelCase | `request.js`、`map.js` |
| Pinia Store | camelCase | `map.js`（useMapStore） |
| Vue Router 路径 | kebab-case | `/flood-simulation` |
| 后端 Controller | PascalCase | `HealthController.java` |
| 后端类 | PascalCase | `R.java`、`CorsConfig.java` |
| OpenSpec change-id | 新：`YYYYMMDD-desc` / 已有：保持原名 | `20260617-network-analysis` |

## 4. 安全规范

- 禁止提交 `.env`、密钥、密码到 Git 仓库
- iServer 服务地址在代码中用相对路径，通过 Vite proxy 转发
- 前后端 API 不涉及用户认证（课设阶段）

## 5. 代码审查

- 编码后需运行 `code-review` skill 检查规范合规性
- 审查通过后方可提交
