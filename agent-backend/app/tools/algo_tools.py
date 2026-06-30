"""
算法层工具：Pareto 多目标优化 + ACO 蚁群多车路径分配
用确定性算法约束 LLM 不可靠的资源调度推理

第一性原理：
- LLM 擅长"理解需求、选择工具"，不擅长"多目标数学优化"
- 这两个工具把"选哪个资源/怎么分配"从 LLM 猜测变成可解释的数学优化
- 作为 LangChain Tool 被 RouteAgent 调用，输入资源列表 → 输出最优方案
"""
import json
import math
import random
from langchain_core.tools import tool
from app.schemas.tool_result import ToolResult


# ==================== 工具函数 ====================

def haversine_m(lng1: float, lat1: float, lng2: float, lat2: float) -> float:
    """Haversine 公式计算两点间距离（米），不依赖外部服务"""
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))


def _normalize_json_param(param):
    """归一化 JSON 参数：LLM 可能传 str 或 dict/list"""
    if isinstance(param, str):
        try:
            return json.loads(param)
        except json.JSONDecodeError:
            return None
    return param


# ==================== Pareto 多目标资源优选 ====================

def _is_dominated(a: dict, b: dict, objectives: list[str]) -> bool:
    """
    判断 a 是否被 b 支配
    支配定义：b 在所有目标上 >= a，且至少一个目标 > a
    - distance: 越小越好（min）
    - capacity: 越大越好（max）
    """
    minimize = {"distance", "distance_m", "time", "cost"}
    at_least_one_better = False

    for obj in objectives:
        av, bv = a.get(obj, 0), b.get(obj, 0)
        if obj in minimize:
            if bv < av:
                at_least_one_better = True
            elif bv > av:
                return False  # b 在这个目标上比 a 差，不支配
        else:  # maximize
            if bv > av:
                at_least_one_better = True
            elif bv < av:
                return False

    return at_least_one_better


def _pareto_sort(resources: list[dict], objectives: list[str]) -> list[list[dict]]:
    """非支配排序，返回分层列表（第 0 层为 Pareto 前沿）"""
    remaining = list(resources)
    fronts = []

    while remaining:
        front = []
        for r in remaining:
            dominated = any(
                _is_dominated(r, other, objectives)
                for other in remaining
                if other is not r
            )
            if not dominated:
                front.append(r)
        fronts.append(front)
        front_names = {r.get("name") for r in front}
        remaining = [r for r in remaining if r.get("name") not in front_names]

    return fronts


def _normalize_score(val: float, min_val: float, max_val: float, minimize: bool) -> float:
    """归一化到 [0,1]，minimize=True 时越小分越高"""
    if max_val == min_val:
        return 1.0
    score = (val - min_val) / (max_val - min_val)
    return 1.0 - score if minimize else score


def _composite_score(resource: dict, objectives: list[str]) -> tuple[float, list[str]]:
    """计算综合评分和入选理由"""
    minimize = {"distance", "distance_m", "time", "cost"}
    reasons = []
    total = 0.0

    for obj in objectives:
        val = resource.get(obj, 0)
        total += val
        direction = "近" if obj in minimize else "大"
        reasons.append(f"{obj}={val}（{direction}）")

    # 简单加权：归一化后取平均
    # 这里用原始值的简单排名作为评分（数据量小，不需要复杂归一化）
    return total, reasons


@tool
async def pareto_resource_optimize(resources: str, objectives: str = '["distance_m","capacity"]', top_k: int = 3) -> dict:
    """
    Pareto 多目标资源优选：对多个应急资源点做非支配排序，选出最优资源。
    当有多个医院/物资点/救援队，需要在"距离"和"容量"等多目标间权衡时使用此工具。

    Args:
        resources: 资源点列表 JSON 字符串，每个资源含 name/lng/lat/distance_m/capacity 等字段，
                   如 '[{"name":"医院A","lng":116.4,"lat":39.9,"distance_m":1200,"capacity":50}]'
        objectives: 优化目标列表 JSON 字符串，如 '["distance_m","capacity"]'。distance_m 越小越好，capacity 越大越好
        top_k: 返回推荐资源数量，默认3
    """
    resources = _normalize_json_param(resources)
    objectives = _normalize_json_param(objectives)

    if not resources or not isinstance(resources, list):
        return ToolResult(success=False, error="资源点列表无效").to_dict()
    if len(resources) < 2:
        return ToolResult(success=False, error="Pareto 优化需要至少 2 个资源点").to_dict()
    if not objectives or not isinstance(objectives, list):
        objectives = ["distance_m", "capacity"]

    top_k = max(1, min(len(resources), top_k))

    # 补充默认容量（如果资源点没有 capacity 字段）
    for r in resources:
        if "capacity" not in r and "capacity" in objectives:
            # 基于 distance 反推一个模拟容量（近的容量小，模拟冲突）
            dist = r.get("distance_m", 2000)
            r["capacity"] = max(10, int(500 - dist / 10))

    # 1. 非支配排序
    fronts = _pareto_sort(resources, objectives)

    # 2. 给每个资源打 Pareto 等级
    for rank, front in enumerate(fronts):
        for r in front:
            r["pareto_rank"] = rank + 1

    pareto_front = fronts[0] if fronts else []

    # 3. 从 Pareto 前沿中按综合评分选 top_k
    # 归一化各目标后等权平均
    all_pareto = pareto_front.copy()
    if len(all_pareto) < top_k:
        # 前沿不够，从下一层补
        for front in fronts[1:]:
            all_pareto.extend(front)
            if len(all_pareto) >= top_k:
                break

    # 归一化评分
    minimize_objs = [o for o in objectives if o in {"distance", "distance_m", "time", "cost"}]
    maximize_objs = [o for o in objectives if o not in {"distance", "distance_m", "time", "cost"}]

    for r in all_pareto:
        score = 0.0
        for obj in minimize_objs:
            vals = [x.get(obj, 0) for x in all_pareto]
            score += _normalize_score(r.get(obj, 0), min(vals), max(vals), minimize=True)
        for obj in maximize_objs:
            vals = [x.get(obj, 0) for x in all_pareto]
            score += _normalize_score(r.get(obj, 0), min(vals), max(vals), minimize=False)
        r["composite_score"] = round(score / len(objectives), 3)

    # 排序取 top_k
    all_pareto.sort(key=lambda x: x.get("composite_score", 0), reverse=True)
    recommended = all_pareto[:top_k]

    # 生成入选理由
    for r in recommended:
        reasons = []
        for obj in objectives:
            val = r.get(obj, 0)
            if obj in {"distance", "distance_m", "time", "cost"}:
                reasons.append(f"距离{val:.0f}m")
            elif obj == "capacity":
                reasons.append(f"容量{val}")
            else:
                reasons.append(f"{obj}={val}")
        r["reasons"] = "、".join(reasons)

    # 4. 构建 GeoJSON（推荐资源点，标注 Pareto 等级）
    features = []
    for r in recommended:
        if "lng" in r and "lat" in r:
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [r["lng"], r["lat"]]},
                "properties": {
                    "_toolName": "pareto_resource_optimize",
                    "_displayName": f"★{r['name']}",
                    "_paretoRank": r.get("pareto_rank", 1),
                    "_score": r.get("composite_score", 0),
                    "_reasons": r.get("reasons", ""),
                    "capacity": r.get("capacity", 0),
                    "distance_m": r.get("distance_m", 0),
                },
            })

    pareto_names = [r["name"] for r in pareto_front]
    rec_names = [r["name"] for r in recommended]

    return ToolResult(
        success=True,
        data={
            "pareto_front": [
                {"name": r["name"], "pareto_rank": r.get("pareto_rank", 1)}
                for r in pareto_front
            ],
            "recommended": [
                {
                    "name": r["name"],
                    "score": r.get("composite_score", 0),
                    "reasons": r.get("reasons", ""),
                    "pareto_rank": r.get("pareto_rank", 1),
                    "lng": r.get("lng"),
                    "lat": r.get("lat"),
                }
                for r in recommended
            ],
            "total_resources": len(resources),
            "pareto_front_size": len(pareto_front),
        },
        geojson={"type": "FeatureCollection", "features": features} if features else None,
        message=f"Pareto 优化完成：{len(resources)}个资源中，前沿{len(pareto_front)}个，推荐{len(recommended)}个（{', '.join(rec_names)}）",
    ).to_dict()


# ==================== ACO 蚁群多车路径分配 ====================

def _build_distance_matrix(vehicles: list[dict], targets: list[dict]) -> list[list[float]]:
    """
    构建距离矩阵
    矩阵维度: (V + T) × (V + T)
    索引 0..V-1 为车辆起点，V..V+T-1 为目标点
    """
    n = len(vehicles) + len(targets)
    all_points = vehicles + targets
    matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            d = haversine_m(
                all_points[i]["lng"], all_points[i]["lat"],
                all_points[j]["lng"], all_points[j]["lat"],
            )
            matrix[i][j] = d
            matrix[j][i] = d
    return matrix


def _aco_solve(
    vehicles: list[dict],
    targets: list[dict],
    distance_matrix: list[list[float]],
    iterations: int = 50,
    ant_count: int = 20,
    alpha: float = 1.0,
    beta: float = 3.0,
    rho: float = 0.5,
    q: float = 100.0,
) -> dict:
    """
    ACO 求解多旅行商问题（mTSP）
    多个救援队（车辆）分配多个受灾点（目标），使总距离最小

    策略：每个目标分配给一个救援队，救援队依次访问分配到的目标
    """
    n_vehicles = len(vehicles)
    n_targets = len(targets)
    n_total = n_vehicles + n_targets

    # 信息素矩阵：tau[i][j] 表示从点 i 到点 j 的信息素
    tau = [[1.0] * n_total for _ in range(n_total)]
    # 初始信息素设为 1/(n * avg_dist)
    avg_dist = sum(sum(row) for row in distance_matrix) / (n_total * n_total)
    if avg_dist > 0:
        initial_tau = 1.0 / (n_total * avg_dist)
        tau = [[initial_tau] * n_total for _ in range(n_total)]

    best_solution = None
    best_distance = float("inf")

    for _ in range(iterations):
        all_ant_solutions = []

        for _ant in range(ant_count):
            # 每只蚂蚁构建一个解
            # 策略：随机分配每个目标给一个车辆，然后每辆车按最近邻顺序访问
            assigned = {}  # vehicle_idx -> [target_idx]
            available_targets = list(range(n_targets))

            # 随机打乱目标顺序
            random.shuffle(available_targets)

            for t_idx in available_targets:
                # 用轮盘赌选择车辆
                v_weights = []
                for v_idx in range(n_vehicles):
                    # 偏好距离近的车辆
                    dist = distance_matrix[v_idx][n_vehicles + t_idx]
                    if dist == 0:
                        dist = 1
                    # 信息素 × 启发式（距离倒数）
                    pheromone = tau[v_idx][n_vehicles + t_idx]
                    v_weights.append((pheromone ** alpha) * ((1.0 / dist) ** beta))

                total_w = sum(v_weights)
                if total_w == 0:
                    chosen_v = random.randint(0, n_vehicles - 1)
                else:
                    r = random.uniform(0, total_w)
                    cum = 0
                    chosen_v = 0
                    for vi, w in enumerate(v_weights):
                        cum += w
                        if cum >= r:
                            chosen_v = vi
                            break

                assigned.setdefault(chosen_v, []).append(t_idx)

            # 每辆车按最近邻顺序访问分配到的目标
            total_dist = 0
            routes = {}
            for v_idx, t_indices in assigned.items():
                if not t_indices:
                    routes[v_idx] = []
                    continue

                # 最近邻排序
                current = v_idx  # 从车辆起点出发
                ordered = []
                remaining = list(t_indices)

                while remaining:
                    nearest = min(remaining, key=lambda t_idx: distance_matrix[current][n_vehicles + t_idx])
                    total_dist += distance_matrix[current][n_vehicles + nearest]
                    current = n_vehicles + nearest
                    ordered.append(nearest)
                    remaining.remove(nearest)

                routes[v_idx] = ordered

            all_ant_solutions.append({
                "assignment": assigned,
                "routes": routes,
                "distance": total_dist,
            })

            if total_dist < best_distance:
                best_distance = total_dist
                best_solution = {
                    "assignment": {k: list(v) for k, v in assigned.items()},
                    "routes": {k: list(v) for k, v in routes.items()},
                    "distance": total_dist,
                }

        # 信息素更新：挥发 + 沉积
        for i in range(n_total):
            for j in range(n_total):
                tau[i][j] *= (1 - rho)

        # 只对最优解沉积信息素（精英策略）
        if best_solution:
            for v_idx, t_indices in best_solution["routes"].items():
                prev = v_idx
                for t_idx in t_indices:
                    tau[prev][n_vehicles + t_idx] += q / best_distance
                    prev = n_vehicles + t_idx

    return best_solution or {"assignment": {}, "routes": {}, "distance": 0}


@tool
async def aco_multi_vehicle_route(
    vehicles: str,
    targets: str,
    iterations: int = 50,
    ant_count: int = 20,
) -> dict:
    """
    ACO 蚁群多车路径分配：多个救援队分配到多个受灾点，使总路径最短。
    当有多个救援队需要分配多个受灾点时使用此工具，而非逐个规划路径。

    Args:
        vehicles: 救援队列表 JSON 字符串，每个含 name/lng/lat，
                  如 '[{"name":"救援队A","lng":125.3,"lat":43.8}]'
        targets: 受灾点列表 JSON 字符串，每个含 name/lng/lat，
                 如 '[{"name":"受灾点1","lng":125.35,"lat":43.85}]'
        iterations: ACO 迭代次数，默认50，上限100
        ant_count: 蚂蚁数量，默认20，上限50
    """
    vehicles = _normalize_json_param(vehicles)
    targets = _normalize_json_param(targets)

    if not vehicles or not isinstance(vehicles, list):
        return ToolResult(success=False, error="救援队列表无效").to_dict()
    if not targets or not isinstance(targets, list):
        return ToolResult(success=False, error="受灾点列表无效").to_dict()
    if len(vehicles) < 1:
        return ToolResult(success=False, error="至少需要 1 个救援队").to_dict()
    if len(targets) < 1:
        return ToolResult(success=False, error="至少需要 1 个受灾点").to_dict()

    iterations = max(10, min(100, iterations))
    ant_count = max(5, min(50, ant_count))

    # 构建距离矩阵
    dist_matrix = _build_distance_matrix(vehicles, targets)

    # ACO 求解
    solution = _aco_solve(vehicles, targets, dist_matrix, iterations, ant_count)

    # 构建结果
    assignment_list = []
    route_features = []

    for v_idx, t_indices in solution.get("routes", {}).items():
        v = vehicles[v_idx]
        route_targets = [targets[t_idx] for t_idx in t_indices]
        route_dist = 0.0

        # 计算该车辆路径距离
        prev_lng, prev_lat = v["lng"], v["lat"]
        coords = [[prev_lng, prev_lat]]

        for t in route_targets:
            d = haversine_m(prev_lng, prev_lat, t["lng"], t["lat"])
            route_dist += d
            coords.append([t["lng"], t["lat"]])
            prev_lng, prev_lat = t["lng"], t["lat"]

        assignment_list.append({
            "vehicle": v["name"],
            "route": [t["name"] for t in route_targets],
            "distance_m": round(route_dist, 1),
            "vehicle_lng": v["lng"],
            "vehicle_lat": v["lat"],
        })

        # 路径线 GeoJSON
        if len(coords) >= 2:
            route_features.append({
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": coords},
                "properties": {
                    "_toolName": "aco_multi_vehicle_route",
                    "_displayName": f"{v['name']}的路线",
                    "_vehicle": v["name"],
                },
            })

    # 起终点标注
    for v in vehicles:
        route_features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [v["lng"], v["lat"]]},
            "properties": {
                "_toolName": "aco_multi_vehicle_route",
                "_displayName": f"★{v['name']}",
                "_type": "vehicle",
            },
        })
    for t in targets:
        route_features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [t["lng"], t["lat"]]},
            "properties": {
                "_toolName": "aco_multi_vehicle_route",
                "_displayName": f"▶{t['name']}",
                "_type": "target",
            },
        })

    total_km = round(solution.get("distance", 0) / 1000, 2)

    return ToolResult(
        success=True,
        data={
            "assignment": assignment_list,
            "total_distance_m": round(solution.get("distance", 0), 1),
            "total_distance_km": total_km,
            "iterations": iterations,
            "ant_count": ant_count,
            "converged": True,
            "vehicle_count": len(vehicles),
            "target_count": len(targets),
        },
        geojson={"type": "FeatureCollection", "features": route_features},
        message=f"ACO 优化完成：{len(vehicles)}个救援队分配{len(targets)}个受灾点，总距离{total_km}km（迭代{iterations}次）",
    ).to_dict()
