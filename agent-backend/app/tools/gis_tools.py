"""
GIS 工具层
将 iServer GIS 操作封装为 LangChain Tool，供 Agent 调用
参考前端 FeatureSearch/SpatialQuery/SpatialAnalysis/NetworkAnalysis 组件的实现逻辑
"""
import asyncio
import json
import math
import random
import threading
import httpx
from langchain_core.tools import tool
from app.schemas.tool_result import ToolResult
from app.services.iserver_client import (
    iserver_client,
    DATASOURCE,
    LAYER_NAMES,
    NAME_FIELD_MAP,
    LEVEL_LAYERS,
    CHANGCHUN_DATASOURCE,
    CHANGCHUN_POI_LAYERS,
    CHANGCHUN_LAYER_NAMES,
    geojson_to_server_geo,
    server_geo_to_geojson,
    convert_changchun_geometry,
    changchun_to_wgs84,
    wgs84_to_changchun,
    extract_display_name,
)


# 用户消息上下文（线程级）：graph.py/agents.py 在执行前设置，
# 供 spatial_query 等工具推断 LLM 没传的参数（如 feature_type）
_user_msg_ctx = threading.local()


def set_user_message_context(msg: str):
    """设置当前请求的用户消息，供工具内部推断参数使用"""
    _user_msg_ctx.msg = msg


def _infer_feature_type_from_message() -> str:
    """从用户消息推断要素类型。
    DeepSeek-V3.2 常不传 feature_type 参数，这里做兜底。
    """
    msg = getattr(_user_msg_ctx, "msg", "") or ""
    if "点要素" in msg or "点状要素" in msg:
        return "point"
    if "线要素" in msg or "线状要素" in msg:
        return "line"
    if "面要素" in msg or "面状要素" in msg:
        return "polygon"
    # 应急救援场景：查询周边资源（医院/物资点/救援队等）默认查点要素
    # 这些资源在数据源中都是点要素（County_P/Town_P），线/面要素不是救援资源
    rescue_keywords = ["救援", "应急", "医院", "物资", "资源", "避难", "消防", "公安",
                       "受灾", "灾情", "周边资源", "附近资源", "医疗", " shelter"]
    if any(kw in msg for kw in rescue_keywords):
        return "point"
    return "all"


def _normalize_geometry(g):
    """
    归一化几何参数：LLM（尤其 DeepSeek-V3.2）有时会把 dict 类型参数
    以 JSON 字符串形式传入，这里统一转为 dict。
    """
    if isinstance(g, str):
        try:
            return json.loads(g)
        except Exception:
            return None
    return g


def _simplify_geometry_for_llm(geometry: dict, max_points: int = 20) -> str:
    """将几何对象简化为 JSON 字符串（最多 max_points 个点），供 LLM 链式调用。
    用于 buffer_analysis 的 data.geometry_brief，LLM 可直接传给 spatial_query 的 geometry 参数。
    """
    if not geometry or not isinstance(geometry, dict):
        return ""
    gtype = geometry.get("type")
    coordinates = geometry.get("coordinates")
    if not coordinates:
        return ""

    def _simplify_ring(ring):
        if len(ring) <= max_points:
            return [[round(p[0], 6), round(p[1], 6)] for p in ring]
        step = len(ring) / max_points
        out = []
        for i in range(max_points):
            p = ring[int(i * step)]
            out.append([round(p[0], 6), round(p[1], 6)])
        if out[0] != out[-1]:
            out.append(out[0])
        return out

    try:
        if gtype == "Point":
            return json.dumps({"type": "Point", "coordinates": [round(coordinates[0], 6), round(coordinates[1], 6)]})
        if gtype == "Polygon":
            ring = coordinates[0] if isinstance(coordinates[0][0], (list, tuple)) else coordinates
            simplified = _simplify_ring(ring)
            return json.dumps({"type": "Polygon", "coordinates": [simplified]})
        if gtype == "LineString":
            simplified = _simplify_ring(coordinates)
            return json.dumps({"type": "LineString", "coordinates": simplified})
    except (IndexError, TypeError, ValueError):
        return ""
    return ""


@tool
async def feature_search(keyword: str, level: str = "all", region: str = "auto") -> dict:
    """
    专题检索：按关键字搜索地理要素（京津冀：县级市/乡镇/道路/河流等；长春：公园/医院/学校等POI）。
    当用户询问某个地点在哪、有什么时使用此工具。

    Args:
        keyword: 搜索关键字，如"朝阳区"、"长江"、"高速公路"、"南湖公园"
        level: 搜索层级，可选值：all(全部)、province(省级)、county(县级)、town(乡镇)，仅对京津冀有效
        region: 搜索区域。默认 auto（先查京津冀，无结果才查长春）。
            普通地点查询用 jingjin（仅京津冀）；
            路径规划/服务区分析的起终点查询用 changchun（仅长春，因路网数据源是长春）。
            不要在普通查询中查长春。
    """
    kw = keyword.strip()
    if not kw:
        return ToolResult(success=False, error="关键字不能为空").to_dict()

    try:
        # SQL 转义
        escaped = kw.replace("\\", "\\\\").replace("'", "''").replace("%", "\\%").replace("_", "\\_")
        all_features = []

        # ---- 京津冀搜索 ----
        if region in ("auto", "jingjin"):
            layers = LEVEL_LAYERS.get(level, LEVEL_LAYERS["all"])

            async def query_layer(layer: str) -> list:
                field = NAME_FIELD_MAP.get(layer)
                if not field:
                    return []
                attr_filter = f"{field} like '%{escaped}%'"
                body = {
                    "getFeatureMode": "SQL",
                    "datasetNames": [f"{DATASOURCE}:{layer}"],
                    "queryParameter": {"attributeFilter": attr_filter},
                }
                try:
                    data = await iserver_client.post_feature_results(body)
                    features = data.get("features", [])
                    results = []
                    for f in features:
                        properties = {}
                        field_names = f.get("fieldNames", [])
                        field_values = f.get("fieldValues", [])
                        for i, name in enumerate(field_names):
                            properties[name] = field_values[i]
                        results.append({
                            "dataset": layer,
                            "datasetName": LAYER_NAMES.get(layer, layer),
                            "geometry": f.get("geometry"),
                            "properties": properties,
                            "displayName": extract_display_name(properties),
                            "smid": properties.get("SMID", f.get("ID")),
                            "region": "jingjin",
                        })
                    return results
                except Exception:
                    return []

            tasks = [query_layer(layer) for layer in layers]
            results_by_layer = await asyncio.gather(*tasks)
            for r in results_by_layer:
                all_features.extend(r)

        # ---- 长春搜索 ----
        # auto 模式下京津冀无结果时回退到长春；changchun 模式直接查长春
        if region == "changchun" or (region == "auto" and len(all_features) == 0):
            async def query_changchun_layer(layer: str) -> list:
                attr_filter = f"name like '%{escaped}%'"
                body = {
                    "getFeatureMode": "SQL",
                    "datasetNames": [f"{CHANGCHUN_DATASOURCE}:{layer}"],
                    "queryParameter": {"attributeFilter": attr_filter},
                }
                try:
                    data = await iserver_client.post_changchun_feature_results(body)
                    features = data.get("features", [])
                    results = []
                    for f in features:
                        properties = {}
                        field_names = f.get("fieldNames", [])
                        field_values = f.get("fieldValues", [])
                        for i, name in enumerate(field_names):
                            properties[name] = field_values[i]
                        results.append({
                            "dataset": layer,
                            "datasetName": CHANGCHUN_LAYER_NAMES.get(layer, layer),
                            "geometry": f.get("geometry"),
                            "properties": properties,
                            "displayName": properties.get("name") or properties.get("NAME") or kw,
                            "smid": properties.get("SMID", f.get("ID")),
                            "region": "changchun",
                        })
                    return results
                except Exception:
                    return []

            cc_tasks = [query_changchun_layer(layer) for layer in CHANGCHUN_POI_LAYERS]
            cc_results = await asyncio.gather(*cc_tasks)
            for r in cc_results:
                all_features.extend(r)

        if not all_features:
            return ToolResult(success=True, data={"total": 0, "features": [], "datasetCounts": {}}, geojson={"type": "FeatureCollection", "features": []}, message=f"未找到与'{kw}'相关的要素").to_dict()

        # 构建 GeoJSON（长春要素需平面坐标→WGS84转换）
        geojson_features = []
        for f in all_features:
            if f.get("region") == "changchun":
                geo = convert_changchun_geometry(f["geometry"])
            else:
                geo = server_geo_to_geojson(f["geometry"])
            if geo:
                geojson_features.append({
                    "type": "Feature",
                    "geometry": geo,
                    "properties": {
                        **f["properties"],
                        "_displayName": f["displayName"],
                        "_dataset": f["datasetName"],
                        "_toolName": "feature_search",
                    },
                })

        # 统计各数据集数量
        dataset_counts = {}
        for f in all_features:
            name = f["datasetName"]
            dataset_counts[name] = dataset_counts.get(name, 0) + 1

        names = [f["displayName"] for f in all_features[:5]]
        summary = f"找到 {len(all_features)} 个要素"
        if names:
            summary += f"，包括：{'、'.join(names)}"

        # data.features 返回摘要 + 坐标，让 LLM 能传递给路径规划工具
        # 完整 geometry 保留在 geojson 字段供前端渲染，不进 LLM 上下文
        features_summary = []
        for i, f in enumerate(all_features[:20]):
            feat = {
                "displayName": f["displayName"],
                "dataset": f["datasetName"],
                "region": f.get("region", "jingjin"),
            }
            # 提取 Point 坐标，供 LLM 传递给 shortest_path/online_route_planning
            if i < len(geojson_features):
                geo = geojson_features[i].get("geometry", {})
                if geo.get("type") == "Point":
                    coords = geo.get("coordinates", [])
                    if len(coords) >= 2:
                        feat["lng"] = round(coords[0], 6)
                        feat["lat"] = round(coords[1], 6)
            features_summary.append(feat)

        return ToolResult(
            success=True,
            data={
                "total": len(all_features),
                "features": features_summary,
                "datasetCounts": dataset_counts,
            },
            geojson={"type": "FeatureCollection", "features": geojson_features},
            message=summary,
        ).to_dict()

    except Exception as e:
        return ToolResult(success=False, error=f"专题检索失败: {e}").to_dict()


@tool
async def spatial_query(geometry: str, feature_type: str = "all", region: str = "jingjin") -> dict:
    """
    空间查询：在指定 Polygon 范围内查询地理要素。
    当用户想查询某个区域内有哪些地物时使用此工具。

    Args:
        geometry: GeoJSON Polygon 几何对象的 JSON 字符串。通常来自 buffer_analysis 返回的 data.geometry_brief。
                  【重要】不要直接传 Point，必须先调 buffer_analysis 生成缓冲区 Polygon，再把 Polygon 传给本参数。
        feature_type: 【重要】要素类型过滤。用户提到"点要素"必须传 "point"，提到"线要素"必须传 "line"，提到"面要素"必须传 "polygon"。仅当用户说"全部要素"或未提类型时才传 "all"
        region: 搜索区域，可选 jingjin(京津冀，默认) 或 changchun(长春)
    """
    # LLM 可能把 geometry 以 JSON 字符串形式传入，统一归一化为 dict
    geometry = _normalize_geometry(geometry)
    if not geometry or not geometry.get("type"):
        return ToolResult(success=False, error="几何格式无效").to_dict()

    # 拒绝 Point 几何，引导 LLM 先调 buffer_analysis
    if geometry.get("type") == "Point":
        return ToolResult(
            success=False,
            error="spatial_query 需要 Polygon 范围，不能传 Point。请先调 buffer_analysis 生成缓冲区，再把返回的 data.geometry_brief 传给 spatial_query 的 geometry 参数",
        ).to_dict()

    try:
        # 根据区域选择数据源和图层
        if region == "changchun":
            # 长春数据源：只有 POI 点要素，geometry 需 WGS84→平面坐标转换
            server_geo = _geojson_to_changchun_server_geo(geometry)
            datasets = CHANGCHUN_POI_LAYERS  # 长春全是点要素，忽略 feature_type
            dataset_names = [f"{CHANGCHUN_DATASOURCE}:{d}" for d in datasets]
            layer_names_map = CHANGCHUN_LAYER_NAMES
            post_fn = iserver_client.post_changchun_feature_results
            convert_fn = convert_changchun_geometry
            datasource_prefix = f"{CHANGCHUN_DATASOURCE}:"
            is_changchun = True
        else:
            # 京津冀数据源
            # DeepSeek-V3.2 常不传 feature_type，这里从用户消息兜底推断
            if feature_type == "all":
                inferred = _infer_feature_type_from_message()
                if inferred != "all":
                    feature_type = inferred

            server_geo = geojson_to_server_geo(geometry)
            DATASETS_BY_TYPE = {
                "point": ["County_P", "Town_P"],
                "line": ["Road_L", "Railway_L", "River_L", "Coastline_L"],
                "polygon": ["Lake_R", "Landuse_R", "Geomor_R"],
                "all": ["County_P", "Town_P", "Road_L", "Railway_L", "River_L", "Lake_R", "Landuse_R", "Geomor_R", "Coastline_L"],
            }
            datasets = DATASETS_BY_TYPE.get(feature_type, DATASETS_BY_TYPE["all"])
            dataset_names = [f"{DATASOURCE}:{d}" for d in datasets]
            layer_names_map = LAYER_NAMES
            post_fn = iserver_client.post_feature_results
            convert_fn = server_geo_to_geojson
            datasource_prefix = f"{DATASOURCE}:"
            is_changchun = False

        body = {
            "getFeatureMode": "SPATIAL",
            "datasetNames": dataset_names,
            "geometry": server_geo,
            "spatialQueryMode": "INTERSECT",
        }
        data = await post_fn(body)

        # 解析结果
        dataset_infos = data.get("datasetInfos", [])
        dataset_ranges = [
            {
                "dataset": info["datasetName"].replace(datasource_prefix, ""),
                "start": info["featureRange"]["start"],
                "end": info["featureRange"]["end"],
            }
            for info in dataset_infos
        ]

        all_features = []
        for idx, f in enumerate(data.get("features", [])):
            range_info = next((r for r in dataset_ranges if r["start"] <= idx <= r["end"]), None)
            dataset_name = range_info["dataset"] if range_info else "未知"
            properties = {}
            field_names = f.get("fieldNames", [])
            field_values = f.get("fieldValues", [])
            for i, name in enumerate(field_names):
                properties[name] = field_values[i]
            # 长春数据源的 displayName 优先取 name 字段
            if is_changchun:
                display_name = properties.get("name") or properties.get("NAME") or "未命名"
            else:
                display_name = extract_display_name(properties)
            all_features.append({
                "dataset": dataset_name,
                "datasetName": layer_names_map.get(dataset_name, dataset_name),
                "geometry": f.get("geometry"),
                "properties": properties,
                "displayName": display_name,
                "smid": properties.get("SMID", f.get("ID")),
                "region": region,
            })

        # 构建 GeoJSON（长春要素需平面坐标→WGS84 转换）
        geojson_features = []
        for f in all_features:
            geo = convert_fn(f["geometry"])
            if geo:
                geojson_features.append({
                    "type": "Feature",
                    "geometry": geo,
                    "properties": {
                        **f["properties"],
                        "_displayName": f["displayName"],
                        "_dataset": f["datasetName"],
                        "_toolName": "spatial_query",
                    },
                })

        dataset_counts = {}
        for f in all_features:
            name = f["datasetName"]
            dataset_counts[name] = dataset_counts.get(name, 0) + 1

        # data.features 只返回摘要，避免 ReAct 循环 token 暴涨
        features_summary = [
            {
                "displayName": f["displayName"],
                "dataset": f["datasetName"],
            }
            for f in all_features[:20]
        ]

        return ToolResult(
            success=True,
            data={
                "total": len(all_features),
                "features": features_summary,
                "datasetCounts": dataset_counts,
                "region": region,
            },
            geojson={"type": "FeatureCollection", "features": geojson_features},
            message=f"查询到 {len(all_features)} 个要素（{region}）",
        ).to_dict()

    except Exception as e:
        return ToolResult(success=False, error=f"空间查询失败: {e}").to_dict()


def _geojson_to_changchun_server_geo(g: dict) -> dict:
    """GeoJSON Geometry（WGS84）→ iServer Server JSON（长春平面坐标）"""
    if not g or not g.get("type"):
        return g
    if g["type"] == "Point":
        x, y = wgs84_to_changchun(g["coordinates"][0], g["coordinates"][1])
        return {"type": "POINT", "points": [{"x": x, "y": y}], "parts": [1]}
    if g["type"] == "Polygon":
        ring = g["coordinates"][0]
        points = []
        for lng, lat in ring:
            x, y = wgs84_to_changchun(lng, lat)
            points.append({"x": x, "y": y})
        return {"type": "REGION", "points": points, "parts": [len(points)]}
    if g["type"] == "LineString":
        points = []
        for lng, lat in g["coordinates"]:
            x, y = wgs84_to_changchun(lng, lat)
            points.append({"x": x, "y": y})
        return {"type": "LINE", "points": points, "parts": [len(points)]}
    return g


@tool
async def buffer_analysis(geometry: str, distance: float) -> dict:
    """
    缓冲区分析：对指定几何对象做缓冲区分析，生成影响范围面。
    当用户需要分析某地点周边影响范围时使用此工具。

    Args:
        geometry: GeoJSON 几何对象的 JSON 字符串，如 '{"type":"Point","coordinates":[116.4,39.9]}'
        distance: 缓冲区半径，单位米，必须大于0
    """
    if distance <= 0:
        return ToolResult(success=False, error="缓冲区半径必须大于 0").to_dict()

    # LLM 可能把 geometry 以 JSON 字符串形式传入，统一归一化为 dict
    geometry = _normalize_geometry(geometry)
    if not geometry or not geometry.get("type"):
        return ToolResult(success=False, error="几何格式无效").to_dict()

    try:
        server_geo = geojson_to_server_geo(geometry)
        data = await iserver_client.geometry_buffer(server_geo, distance)

        result_geo = data.get("resultGeometry")
        if not result_geo:
            return ToolResult(success=False, error="缓冲区分析未返回结果").to_dict()

        # SDK 返回的 resultGeometry 可能是 GeoJSON Feature
        if result_geo.get("type") == "Feature":
            result_geo = result_geo.get("geometry")

        # 如果是 Server JSON 格式，转换为 GeoJSON
        if result_geo.get("points"):
            geojson_geo = server_geo_to_geojson(result_geo)
        else:
            geojson_geo = result_geo

        if not geojson_geo:
            return ToolResult(success=False, error="缓冲区结果转换失败").to_dict()

        # 生成简化版 geometry_brief（最多 20 个点），放入 data 供 LLM 链式调用 spatial_query
        # 完整 geojson 仍走 geojson 字段（会被 ToolResult.to_dict 剥离到线程缓存传给前端）
        geometry_brief = _simplify_geometry_for_llm(geojson_geo, max_points=20)

        return ToolResult(
            success=True,
            data={
                "bufferDistance": distance,
                "geometry_type": geojson_geo.get("type"),
                # geometry_brief 可直接传给 spatial_query 的 geometry 参数
                "geometry_brief": geometry_brief,
            },
            geojson={
                "type": "FeatureCollection",
                "features": [{
                    "type": "Feature",
                    "geometry": geojson_geo,
                    "properties": {"_toolName": "buffer_analysis", "_displayName": f"缓冲区({distance}m)"},
                }],
            },
            message=f"缓冲区分析完成，半径 {distance} 米。可将 data.geometry_brief 直接传给 spatial_query 的 geometry 参数查询范围内要素",
        ).to_dict()

    except Exception as e:
        return ToolResult(success=False, error=f"缓冲区分析失败: {e}").to_dict()


@tool
async def overlay_analysis(source_dataset: str, operate_dataset: str, operation: str = "INTERSECT") -> dict:
    """
    叠置分析：对两个数据集做叠置分析（并集/交集/擦除/裁剪）。
    当用户需要分析两个地理图层的叠加关系时使用此工具。

    Args:
        source_dataset: 源数据集名称，如 "Landuse_R@Jingjin"
        operate_dataset: 操作数据集名称，如 "Geomor_R@Jingjin"
        operation: 操作类型，可选：UNION(并集)、INTERSECT(交集)、ERASE(擦除)、CLIP(裁剪)
    """
    valid_ops = ["UNION", "INTERSECT", "ERASE", "CLIP"]
    if operation not in valid_ops:
        return ToolResult(success=False, error=f"不支持的叠置操作类型: {operation}").to_dict()

    try:
        data = await iserver_client.dataset_overlay(source_dataset, operate_dataset, operation)

        recordset = data.get("recordset", {})
        features = recordset.get("features", [])

        # 转换为 GeoJSON
        geojson_features = []
        for f in features:
            geo = f.get("geometry")
            if geo and geo.get("type"):
                # 可能已经是 GeoJSON 格式
                if geo.get("coordinates"):
                    geojson_features.append({
                        "type": "Feature",
                        "geometry": geo,
                        "properties": {"_toolName": "overlay_analysis"},
                    })
                # 也可能是 Server JSON
                elif geo.get("points"):
                    gj = server_geo_to_geojson(geo)
                    if gj:
                        geojson_features.append({
                            "type": "Feature",
                            "geometry": gj,
                            "properties": {"_toolName": "overlay_analysis"},
                        })

        return ToolResult(
            success=True,
            data={"featureCount": len(geojson_features)},
            geojson={"type": "FeatureCollection", "features": geojson_features},
            message=f"叠置分析完成（{operation}），共 {len(geojson_features)} 个要素",
        ).to_dict()

    except Exception as e:
        return ToolResult(success=False, error=f"叠置分析失败: {e}").to_dict()


@tool
async def shortest_path(points: str) -> dict:
    """
    最短路径分析：在长春路网中计算多个途经点之间的最短路径。
    当用户需要规划路线、找最短路径时使用此工具。
    注意：此工具使用长春市路网数据。

    Args:
        points: 途经点列表的 JSON 字符串，至少2个点，如 '[{"lng":125.3,"lat":43.8},{"lng":125.4,"lat":43.9}]'
    """
    # points 是 JSON 字符串，解析为 list
    if isinstance(points, str):
        try:
            points = json.loads(points)
        except Exception:
            points = None
    if not points or len(points) < 2:
        return ToolResult(success=False, error="最短路径需要至少 2 个点").to_dict()

    try:
        # WGS84 → 长春平面坐标
        nodes = []
        for p in points:
            x, y = wgs84_to_changchun(p["lng"], p["lat"])
            nodes.append({"x": x, "y": y})

        data = await iserver_client.find_path(nodes)

        path_list = data.get("pathList", [])
        if not path_list:
            return ToolResult(success=False, error="未找到路径").to_dict()

        path = path_list[0]

        # 从 pathGuideItems 逐段拼接路径坐标
        all_coords = []
        route_length = 0

        for item in path.get("pathGuideItems", []):
            if item.get("isEdge") and item.get("geometry", {}).get("type") == "LINE":
                geo = convert_changchun_geometry(item["geometry"])
                if geo and geo.get("coordinates"):
                    if not all_coords:
                        all_coords.extend(geo["coordinates"])
                    else:
                        all_coords.extend(geo["coordinates"][1:])
                    route_length += item.get("length", 0)

        # 如果 pathGuideItems 不可用，从 route 字段提取
        if len(all_coords) < 2 and path.get("route"):
            route = path["route"]
            if route.get("points"):
                pts = route["points"]
                parts = route.get("parts", [len(pts)])
                remaining = pts
                for part_count in parts:
                    segment = remaining[:part_count]
                    for p in segment:
                        all_coords.append(changchun_to_wgs84(p["x"], p["y"]))
                    remaining = remaining[part_count:]
                route_length = path.get("weight", 0)

        if len(all_coords) < 2:
            return ToolResult(success=False, error="未找到有效路径").to_dict()

        return ToolResult(
            success=True,
            data={
                "distance_m": round(route_length, 2),
                "distance_km": round(route_length / 1000, 2),
                "pointCount": len(points),
            },
            geojson={
                "type": "FeatureCollection",
                "features": [{
                    "type": "Feature",
                    "geometry": {"type": "LineString", "coordinates": all_coords},
                    "properties": {
                        "_toolName": "shortest_path",
                        "_displayName": f"最短路径 ({round(route_length / 1000, 2)} km)",
                    },
                }],
            },
            message=f"路径分析完成，总长度 {round(route_length / 1000, 2)} km",
        ).to_dict()

    except Exception as e:
        return ToolResult(success=False, error=f"路径分析失败: {e}").to_dict()


@tool
async def service_area(center: str, radius: float) -> dict:
    """
    服务区分析：分析某个中心点在指定半径内可到达的路网范围。
    当用户需要分析某地点的可达范围时使用此工具。
    注意：此工具使用长春市路网数据。

    Args:
        center: 中心点坐标的 JSON 字符串，如 '{"lng":125.3,"lat":43.8}'
        radius: 服务区半径，单位米
    """
    # LLM 可能把 center 以 JSON 字符串形式传入，统一归一化为 dict
    center = _normalize_geometry(center)
    if not center or "lng" not in center or "lat" not in center:
        return ToolResult(success=False, error="中心点坐标无效").to_dict()

    try:
        centers = [[center["lng"], center["lat"]]]
        weights = [radius]
        data = await iserver_client.find_service_areas(centers, weights)

        area_list = data.get("serviceAreaList", [])
        if not area_list:
            return ToolResult(success=False, error="未生成服务区").to_dict()

        features = []
        for area in area_list:
            edge_features = area.get("edgeFeatures", [])

            # GeoJSON FeatureCollection 格式
            if isinstance(edge_features, dict) and edge_features.get("type") == "FeatureCollection":
                for f in edge_features.get("features", []):
                    if f.get("geometry", {}).get("type") == "LineString":
                        coords = [changchun_to_wgs84(x, y) for x, y in f["geometry"]["coordinates"]]
                        features.append({
                            "type": "Feature",
                            "geometry": {"type": "LineString", "coordinates": coords},
                            "properties": {"_toolName": "service_area"},
                        })
            # 原始 iServer 格式
            elif isinstance(edge_features, list):
                for e in edge_features:
                    geo = e.get("geometry")
                    if geo and geo.get("type") == "LINE":
                        gj = convert_changchun_geometry(geo)
                        if gj:
                            features.append({
                                "type": "Feature",
                                "geometry": gj,
                                "properties": {"_toolName": "service_area"},
                            })

        return ToolResult(
            success=True,
            data={"edgeCount": len(features), "radius": radius},
            geojson={"type": "FeatureCollection", "features": features},
            message=f"服务区分析完成，包含 {len(features)} 条路段",
        ).to_dict()

    except Exception as e:
        return ToolResult(success=False, error=f"服务区分析失败: {e}").to_dict()


@tool
async def fly_to_location(location: str) -> dict:
    """
    地图定位：将地图视图移动到指定地点。
    当用户想查看某个地点在地图上的位置时使用此工具。

    Args:
        location: 地点名称，如 "朝阳区"、"天安门"
    """
    location = location.strip()
    if not location:
        return ToolResult(success=False, error="地点名称不能为空").to_dict()

    try:
        # 先用 feature_search 搜索地名
        escaped = location.replace("\\", "\\\\").replace("'", "''").replace("%", "\\%").replace("_", "\\_")
        layers = LEVEL_LAYERS["all"]

        async def query_layer(layer: str) -> list:
            field = NAME_FIELD_MAP.get(layer)
            if not field:
                return []
            attr_filter = f"{field} like '%{escaped}%'"
            body = {
                "getFeatureMode": "SQL",
                "datasetNames": [f"{DATASOURCE}:{layer}"],
                "queryParameter": {"attributeFilter": attr_filter},
            }
            try:
                data = await iserver_client.post_feature_results(body)
                return data.get("features", [])
            except Exception:
                return []

        tasks = [query_layer(layer) for layer in layers]
        results = await asyncio.gather(*tasks)
        all_features = []
        for r in results:
            all_features.extend(r)

        if not all_features:
            return ToolResult(success=False, error=f"未找到地点：{location}").to_dict()

        # 取第一个结果的中心点
        f = all_features[0]
        geo = f.get("geometry", {})
        points = geo.get("points", [])
        if not points:
            return ToolResult(success=False, error=f"无法获取 {location} 的坐标").to_dict()

        center = [points[0]["x"], points[0]["y"]]
        properties = {}
        field_names = f.get("fieldNames", [])
        field_values = f.get("fieldValues", [])
        for i, name in enumerate(field_names):
            properties[name] = field_values[i]

        # 构建点要素 GeoJSON
        geojson_geo = server_geo_to_geojson(geo)
        geojson_features = []
        if geojson_geo:
            geojson_features.append({
                "type": "Feature",
                "geometry": geojson_geo,
                "properties": {
                    **properties,
                    "_toolName": "fly_to_location",
                    "_displayName": location,
                },
            })

        return ToolResult(
            success=True,
            data={"center": center, "zoom": 11},
            geojson={"type": "FeatureCollection", "features": geojson_features} if geojson_features else None,
            message=f"已定位到：{location}（坐标 {center[0]:.4f}, {center[1]:.4f}）",
        ).to_dict()

    except Exception as e:
        return ToolResult(success=False, error=f"定位失败: {e}").to_dict()


@tool
async def online_route_planning(origin: str, destination: str) -> dict:
    """
    在线路径规划（OSRM）：计算两点间行车路径。
    用于京津冀等非长春地区的救援路线规划（shortest_path 仅支持长春路网）。
    当需要在京津冀范围规划救援路线时使用此工具。

    Args:
        origin: 起点坐标 JSON 字符串，如 '{"lng":116.28,"lat":39.85}'
        destination: 终点坐标 JSON 字符串，如 '{"lng":116.40,"lat":39.90}'
    """
    origin = _normalize_geometry(origin)
    destination = _normalize_geometry(destination)
    if not origin or "lng" not in origin or "lat" not in origin:
        return ToolResult(success=False, error="起点坐标无效").to_dict()
    if not destination or "lng" not in destination or "lat" not in destination:
        return ToolResult(success=False, error="终点坐标无效").to_dict()

    try:
        coord_str = f"{origin['lng']},{origin['lat']};{destination['lng']},{destination['lat']}"
        url = f"https://router.project-osrm.org/route/v1/driving/{coord_str}?overview=full&geometries=geojson"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
        routes = data.get("routes", [])
        if not routes:
            raise ValueError("OSRM 未返回路径")
        route = routes[0]
        coords = route.get("geometry", {}).get("coordinates", [])
        distance_m = route.get("distance", 0)
        duration_s = route.get("duration", 0)
        if len(coords) < 2:
            raise ValueError("路径坐标不足")

        return ToolResult(
            success=True,
            data={
                "distance_m": round(distance_m, 2),
                "distance_km": round(distance_m / 1000, 2),
                "duration_min": round(duration_s / 60, 1),
                "is_fallback": False,
            },
            geojson={
                "type": "FeatureCollection",
                "features": [{
                    "type": "Feature",
                    "geometry": {"type": "LineString", "coordinates": coords},
                    "properties": {
                        "_toolName": "online_route_planning",
                        "_displayName": f"行车路径 ({round(distance_m/1000, 2)} km, {round(duration_s/60)} 分钟)",
                    },
                }],
            },
            message=f"路径规划完成，距离 {round(distance_m/1000, 2)} km，预计 {round(duration_s/60)} 分钟",
        ).to_dict()
    except Exception:
        # 降级为直线距离
        def _haversine(lng1, lat1, lng2, lat2):
            R = 6371000
            phi1, phi2 = math.radians(lat1), math.radians(lat2)
            dphi = math.radians(lat2 - lat1)
            dlambda = math.radians(lng2 - lng1)
            a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
            return 2 * R * math.asin(math.sqrt(a))

        dist = _haversine(origin["lng"], origin["lat"], destination["lng"], destination["lat"])
        coords = [[origin["lng"], origin["lat"]], [destination["lng"], destination["lat"]]]
        return ToolResult(
            success=True,
            data={
                "distance_m": round(dist, 2),
                "distance_km": round(dist / 1000, 2),
                "duration_min": None,
                "is_fallback": True,
            },
            geojson={
                "type": "FeatureCollection",
                "features": [{
                    "type": "Feature",
                    "geometry": {"type": "LineString", "coordinates": coords},
                    "properties": {
                        "_toolName": "online_route_planning",
                        "_displayName": f"直线路径 ({round(dist/1000, 2)} km, 降级)",
                        "_isFallback": True,
                    },
                }],
            },
            message=f"在线路径服务不可用，降级为直线（{round(dist/1000, 2)} km）",
        ).to_dict()


@tool
async def mock_nearby_resources(center: str, resource_type: str = "hospital", count: int = 5, radius: int = 5000) -> dict:
    """
    生成模拟的周边资源点（医院/物资点/救援队）。
    仅当 spatial_query 或 feature_search 查不到真实数据时使用。
    返回结果会标注为模拟数据，必须在最终方案中告知用户这些是模拟数据。

    Args:
        center: 中心点坐标 JSON 字符串，如 '{"lng":116.28,"lat":39.85}'
        resource_type: 资源类型，可选：hospital(医院)、supply(物资点)、rescue(救援队)
        count: 生成数量，1-10
        radius: 分布半径（米），默认 5000
    """
    center = _normalize_geometry(center)
    if not center or "lng" not in center or "lat" not in center:
        return ToolResult(success=False, error="中心点坐标无效").to_dict()

    count = max(1, min(10, count))
    radius = max(500, min(50000, radius))

    type_names = {
        "hospital": "模拟医院",
        "supply": "模拟物资点",
        "rescue": "模拟救援队",
    }
    type_name = type_names.get(resource_type, "模拟资源点")

    lng, lat = center["lng"], center["lat"]
    lat_per_m = 1 / 111000
    lng_per_m = 1 / (111000 * math.cos(math.radians(lat)))

    features = []
    for i in range(count):
        angle = random.uniform(0, 2 * math.pi)
        dist = random.uniform(radius * 0.2, radius)
        d_lng = dist * math.cos(angle) * lng_per_m
        d_lat = dist * math.sin(angle) * lat_per_m
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [round(lng + d_lng, 6), round(lat + d_lat, 6)]},
            "properties": {
                "_toolName": "mock_nearby_resources",
                "_displayName": f"{type_name}{chr(65 + i)}",
                "_mock": True,
                "_mockType": type_name,
                "type": resource_type,
                "distance_from_center_m": round(dist, 0),
            },
        })

    return ToolResult(
        success=True,
        data={
            "count": count,
            "resource_type": resource_type,
            "is_mock": True,
        },
        geojson={"type": "FeatureCollection", "features": features},
        message=f"已生成 {count} 个模拟{type_name}（半径 {radius}m 内，⚠️模拟数据）",
    ).to_dict()


# 导出所有工具列表
GIS_TOOLS = [
    feature_search,
    spatial_query,
    buffer_analysis,
    overlay_analysis,
    shortest_path,
    service_area,
    fly_to_location,
    online_route_planning,
    mock_nearby_resources,
]
