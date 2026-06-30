# Spec: 算法层（Pareto + ACO）

> P2 Task 14：确定性算法约束 LLM 不可靠的推理
> 第一性原理分析 + 实现规格

---

## 0. 第一性原理分析

### 0.1 为什么需要确定性算法？

当前系统的资源调度完全依赖 LLM 推理：
- `mock_nearby_resources` 生成 N 个资源点
- `online_route_planning` 逐个规划路径
- LLM 汇总时"自由发挥"——可能选最近的，也可能选最大的，**不可控、不可复现**

确定性算法的价值：**把"选哪个资源"从 LLM 猜测变成可解释的数学优化**。

### 0.2 Pareto 多目标匹配

**本质**：在多个互相冲突的目标之间找"非劣解集"（Pareto 前沿）。

**应急场景映射**：
- 目标1：距离最短（快速到达）
- 目标2：容量最大（收治能力强）
- 这两个目标通常冲突——最近的医院可能床位少

**契合度**：✅ 高
- mock_nearby_resources 已生成资源点（含距离）
- 补充容量属性后即可做多目标筛选
- 实现简单（非支配排序），数据量小（≤10个资源点）

### 0.3 ACO 蚁群算法

**本质**：模拟蚂蚁释放信息素的正反馈机制，解决离散组合优化（如 TSP/mTSP）。

**应急场景映射**：
- 多个救援队（蚂蚁）从不同位置出发
- 多个受灾点（城市）需要分配
- 目标：总路程最短（所有救援队完成所有任务的总距离最小）

**契合度**：✅ 中高
- 当前系统已有 `mock_nearby_resources` 可生成多个救援队
- 可用 `online_route_planning` 获取两两间距离
- 课设数据量小（3-5 个救援队 × 2-3 个受灾点），ACO 迭代 50 次即可收敛
- **限制**：需要"多对多"场景才有意义，单点救援不需要

### 0.4 融合方案

```
现有流程：
  mock_nearby_resources → online_route_planning(逐个) → LLM 自由汇总

增强流程（Pareto）：
  mock_nearby_resources(含容量) → pareto_resource_optimize → 选出非劣资源 → online_route_planning

增强流程（ACO）：
  mock_nearby_resources(多个救援队) + 多个受灾点 → aco_multi_vehicle_route → 最优分配方案
```

---

## 场景 1：Pareto 多目标资源优选工具 (pareto_resource_optimize)

### Given-When-Then

#### 正常场景：多目标筛选医院
- **Given** 受灾点坐标 + 5 个模拟医院资源点（含距离和容量）
- **When** Agent 调用 `pareto_resource_optimize`，参数：
  ```json
  {
    "resources": [
      {"name": "模拟医院A", "lng": 116.40, "lat": 39.90, "distance_m": 1200, "capacity": 50},
      {"name": "模拟医院B", "lng": 116.42, "lat": 39.92, "distance_m": 2800, "capacity": 200},
      ...
    ],
    "objectives": ["distance", "capacity"],
    "top_k": 3
  }
  ```
- **Then**
  - 返回 `success=true`
  - 返回 `data.pareto_front`：非支配排序后的 Pareto 前沿资源列表
  - 返回 `data.recommended`：综合评分最高的 top_k 个资源
  - 返回 `data.analysis`：每个推荐资源的入选理由
  - 返回 `geojson`：推荐资源点（标注 Pareto 等级）
  - 返回 `message`：人类可读摘要

#### 边界场景：资源点不足
- **Given** resources 长度 < 2
- **When** 调用 pareto_resource_optimize
- **Then**
  - 返回 `success=false`
  - 返回 `error="Pareto 优化需要至少 2 个资源点"`

#### 边界场景：单一目标
- **Given** objectives 只有一个
- **When** 调用 pareto_resource_optimize
- **Then**
  - 退化为单目标排序
  - 仍然返回结果，`data.pareto_front` 为全部资源按该目标排序

---

## 场景 2：ACO 蚁群多车路径分配工具 (aco_multi_vehicle_route)

### Given-When-Then

#### 正常场景：3 个救援队分配到 3 个受灾点
- **Given** 3 个救援队坐标 + 3 个受灾点坐标
- **When** Agent 调用 `aco_multi_vehicle_route`，参数：
  ```json
  {
    "vehicles": [
      {"name": "救援队A", "lng": 125.30, "lat": 43.81},
      {"name": "救援队B", "lng": 125.35, "lat": 43.85},
      ...
    ],
    "targets": [
      {"name": "受灾点1", "lng": 125.32, "lat": 43.83},
      ...
    ],
    "iterations": 50,
    "ant_count": 20
  }
  ```
- **Then**
  - 返回 `success=true`
  - 返回 `data.assignment`：最优分配方案（哪个救援队负责哪些受灾点）
  - 返回 `data.total_distance`：总距离
  - 返回 `data.routes`：每个救援队的路径顺序
  - 返回 `geojson`：分配方案可视化（救援队→受灾点的连线）
  - 返回 `message`：人类可读摘要

#### 边界场景：单救援队
- **Given** vehicles 长度 = 1
- **When** 调用 aco_multi_vehicle_route
- **Then**
  - 退化为单旅行商问题（TSP）
  - 仍然返回结果

#### 边界场景：车辆数 >= 目标数
- **Given** vehicles 长度 >= targets 长度
- **When** 调用 aco_multi_vehicle_route
- **Then**
  - 每个目标分配一个救援队（一对一）
  - 多余的救援队不参与

#### 性能约束
- **Given** 任意输入
- **When** 执行 ACO 算法
- **Then**
  - iterations 上限 100，ant_count 上限 50
  - 总执行时间 < 3 秒
  - 距离计算使用 Haversine 公式（不需要调 OSRM，避免网络延迟）

---

## 工具输出统一契约

### pareto_resource_optimize 输出
```python
{
    "success": True,
    "data": {
        "pareto_front": [   # Pareto 前沿（非支配解）
            {"name": "...", "distance_m": ..., "capacity": ..., "pareto_rank": 1}
        ],
        "recommended": [    # 综合评分 top_k
            {"name": "...", "score": 0.85, "reasons": ["距离较近", "容量较大"]}
        ]
    },
    "geojson": {            # 推荐资源点
        "type": "FeatureCollection",
        "features": [...]
    },
    "message": "Pareto 优化完成，推荐 3 个资源点..."
}
```

### aco_multi_vehicle_route 输出
```python
{
    "success": True,
    "data": {
        "assignment": [     # 分配方案
            {"vehicle": "救援队A", "route": ["受灾点1", "受灾点2"], "distance_m": 5200}
        ],
        "total_distance_m": 15600,
        "iterations": 50,
        "converged": True
    },
    "geojson": {            # 路径可视化
        "type": "FeatureCollection",
        "features": [...]   # LineString: 救援队→受灾点1→受灾点2
    },
    "message": "ACO 优化完成，3 个救援队分配 3 个受灾点，总距离 15.6km"
}
```

---

## 与子 Agent 的集成

### RouteAgent 新增工具
- `pareto_resource_optimize`：当有多个资源点时，先做 Pareto 筛选再规划路径
- `aco_multi_vehicle_route`：当有多个救援队和多个受灾点时，做整体分配优化

### 触发条件（由 LLM 判断）
- 当 RouteAgent 收到 2+ 个资源点 + 1 个受灾点 → 调 pareto_resource_optimize
- 当 RouteAgent 收到 2+ 个救援队 + 2+ 个受灾点 → 调 aco_multi_vehicle_route
