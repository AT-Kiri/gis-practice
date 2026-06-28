"""
iServer REST API 客户端封装
直接调用 SuperMap iServer REST API，不依赖 SuperMap Python SDK
参考前端 FeatureSearch/SpatialQuery/SpatialAnalysis/NetworkAnalysis 组件的实现逻辑
"""
import httpx
import math
import json
from app.config import settings


class IServerClient:
    """iServer REST API 统一客户端"""

    def __init__(self):
        self.base_url = settings.iserver_url
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self.client.aclose()

    # ==================== 数据查询 ====================

    async def post_feature_results(self, body: dict) -> dict:
        """
        调用 iServer featureResults 接口（京津冀数据源）
        POST /iserver/services/data-jingjin/rest/data/featureResults.json?returnContent=true
        """
        url = f"{self.base_url}/iserver/services/data-jingjin/rest/data/featureResults.json?returnContent=true"
        resp = await self.client.post(url, json=body)
        resp.raise_for_status()
        return resp.json()

    async def post_changchun_feature_results(self, body: dict) -> dict:
        """
        调用 iServer featureResults 接口（长春数据源）
        POST /iserver/services/data-changchun/rest/data/featureResults.json?returnContent=true
        """
        url = f"{self.base_url}/iserver/services/data-changchun/rest/data/featureResults.json?returnContent=true"
        resp = await self.client.post(url, json=body)
        resp.raise_for_status()
        return resp.json()

    async def get_datasets(self) -> list:
        """获取数据集列表"""
        url = f"{self.base_url}/iserver/services/data-jingjin/rest/data/datasources/Jingjin/datasets.json"
        resp = await self.client.get(url)
        resp.raise_for_status()
        data = resp.json()
        return data.get("datasetNames", [])

    # ==================== 空间分析 ====================

    async def geometry_buffer(self, geometry: dict, distance: float) -> dict:
        """
        几何缓冲区分析
        POST /iserver/services/spatialanalyst-sample/restjsr/spatialanalyst/geometry/buffer.json?returnContent=true
        注意：iServer 该接口的缓冲区参数字段名为 analystParameter（非 bufferSetting），
        参考 SuperMap iClient SDK GeometryBufferAnalystParameters.toObject() 的实现。
        """
        url = f"{self.base_url}/iserver/services/spatialanalyst-sample/restjsr/spatialanalyst/geometry/buffer.json?returnContent=true"

        # 将米转为度（WGS84 近似）
        lat = 39.9
        if geometry.get("type") == "POINT" and geometry.get("points"):
            lat = geometry["points"][0]["y"]
        degree_distance = meters_to_degrees(distance, lat)

        body = {
            "sourceGeometry": geometry,
            "analystParameter": {
                "endType": "ROUND",
                "leftDistance": {"value": degree_distance},
                "rightDistance": {"value": degree_distance},
                "semicircleLineSegment": 10,
            },
        }
        resp = await self.client.post(url, json=body)
        resp.raise_for_status()
        return resp.json()

    async def dataset_overlay(self, source_dataset: str, operate_dataset: str, operation: str) -> dict:
        """
        数据集叠置分析
        POST /iserver/services/spatialanalyst-sample/restjsr/spatialanalyst/datasets/{source}/overlay.json
        """
        url = f"{self.base_url}/iserver/services/spatialanalyst-sample/restjsr/spatialanalyst/datasets/{source_dataset}/overlay.json"

        body = {
            "operateDataset": operate_dataset,
            "operation": operation,
            "tolerance": 0,
            "resultSetting": {
                "dataReturnMode": "DATASET_AND_RECORDSET",
                "expectCount": 1000,
            },
        }
        resp = await self.client.post(url, json=body)
        resp.raise_for_status()
        return resp.json()

    # ==================== 网络分析 ====================

    async def find_path(self, nodes: list, weight_field: str = "length") -> dict:
        """
        最短路径分析
        GET /iserver/services/transportationanalyst-sample/rest/networkanalyst/RoadNet@Changchun/path.json
        """
        base = f"{self.base_url}/iserver/services/transportationanalyst-sample/rest/networkanalyst/RoadNet@Changchun"
        url = f"{base}/path.json"

        params = {
            "nodes": json.dumps([{"x": n["x"], "y": n["y"]} for n in nodes]),
            "parameter": json.dumps({
                "weightFieldName": weight_field,
                "resultSetting": {
                    "returnEdgeFeatures": True,
                    "returnEdgeGeometry": True,
                    "returnPathGuides": True,
                    "returnRoutes": True,
                },
            }),
            "hasLeastEdgeCount": "false",
        }
        resp = await self.client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()

    async def find_service_areas(self, centers: list, weights: list, weight_field: str = "length") -> dict:
        """
        服务区分析
        GET /iserver/services/transportationanalyst-sample/rest/networkanalyst/RoadNet@Changchun/serviceareas.json
        """
        base = f"{self.base_url}/iserver/services/transportationanalyst-sample/rest/networkanalyst/RoadNet@Changchun"
        url = f"{base}/serviceareas.json"

        params = {
            "centers": json.dumps(centers),
            "weights": json.dumps(weights),
            "parameter": json.dumps({
                "weightFieldName": weight_field,
                "resultSetting": {
                    "returnEdgeFeatures": True,
                    "returnEdgeGeometry": True,
                },
            }),
            "isAnalyzeById": "false",
        }
        resp = await self.client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()


# ==================== 工具函数 ====================

# 京津冀数据源配置（参考前端 FeatureSearch.vue）
DATASOURCE = "Jingjin"

LAYER_NAMES = {
    "County_P": "县级市", "Town_P": "乡镇", "Road_L": "道路", "Railway_L": "铁路",
    "River_L": "河流", "Lake_R": "湖泊", "Landuse_R": "土地利用", "Geomor_R": "地貌",
    "Coastline_L": "海岸线", "Province_L": "省界",
}

NAME_FIELD_MAP = {
    "County_P": "ADMINNAME",
    "Town_P": "NAME", "Road_L": "NAME", "Railway_L": "NAME", "River_L": "NAME",
    "Lake_R": None, "Landuse_R": "LANDTYPE", "Geomor_R": "GEO_TYPE",
    "Coastline_L": None, "Province_L": "NAME",
}

LEVEL_LAYERS = {
    "province": ["Province_L", "County_P"],
    "county": ["County_P"],
    "town": ["Town_P"],
    "all": ["County_P", "Town_P", "Road_L", "Railway_L", "River_L", "Lake_R", "Landuse_R", "Geomor_R", "Coastline_L"],
}

# 长春数据源配置（POI 点状要素，平面坐标需转换为 WGS84）
CHANGCHUN_DATASOURCE = "Changchun"
CHANGCHUN_POI_LAYERS = ["Park", "Hospital", "School", "Government", "Company", "ResidentialPoint", "ScientificResearch"]
CHANGCHUN_LAYER_NAMES = {
    "Park": "公园", "Hospital": "医院", "School": "学校",
    "Government": "政府机关", "Company": "公司",
    "ResidentialPoint": "居民点", "ScientificResearch": "科研机构",
}

# 长春平面坐标 ↔ WGS84 转换参数（参考前端 map.js）
CC = {
    "lngMin": 125.15, "lngMax": 125.45,
    "latMin": 43.74185, "latMax": 43.99815,
    "xMin": 47.5066, "xMax": 8958.0372,
    "yMin": -7668.9829, "yMax": -54.7406,
}


def changchun_to_wgs84(x: float, y: float) -> tuple:
    """长春平面坐标 → WGS84 经纬度"""
    lng = (x - CC["xMin"]) / (CC["xMax"] - CC["xMin"]) * (CC["lngMax"] - CC["lngMin"]) + CC["lngMin"]
    lat = (y - CC["yMin"]) / (CC["yMax"] - CC["yMin"]) * (CC["latMax"] - CC["latMin"]) + CC["latMin"]
    return [lng, lat]


def wgs84_to_changchun(lng: float, lat: float) -> tuple:
    """WGS84 经纬度 → 长春平面坐标"""
    x = (lng - CC["lngMin"]) / (CC["lngMax"] - CC["lngMin"]) * (CC["xMax"] - CC["xMin"]) + CC["xMin"]
    y = (lat - CC["latMin"]) / (CC["latMax"] - CC["latMin"]) * (CC["yMax"] - CC["yMin"]) + CC["yMin"]
    return [x, y]


def meters_to_degrees(meters: float, latitude: float = 39.9) -> float:
    """将米为单位的距离转换为度（基于 WGS84 近似）"""
    meters_per_degree_lat = 111000
    meters_per_degree_lng = 111000 * math.cos(latitude * math.pi / 180)
    return meters / ((meters_per_degree_lat + meters_per_degree_lng) / 2)


def geojson_to_server_geo(g: dict) -> dict:
    """GeoJSON Geometry → iServer Server JSON 格式"""
    if not g or not g.get("type"):
        return g
    if g["type"] == "Point":
        return {"type": "POINT", "points": [{"x": g["coordinates"][0], "y": g["coordinates"][1]}], "parts": [1]}
    if g["type"] == "LineString":
        return {"type": "LINE", "points": [{"x": x, "y": y} for x, y in g["coordinates"]], "parts": [len(g["coordinates"])]}
    if g["type"] == "Polygon":
        ring = g["coordinates"][0]
        return {"type": "REGION", "points": [{"x": x, "y": y} for x, y in ring], "parts": [len(ring)]}
    return g


def server_geo_to_geojson(g: dict) -> dict | None:
    """iServer Server JSON geometry → GeoJSON geometry（坐标保持原值，不做变换）"""
    if not g or not g.get("points"):
        return None
    t = g["type"]
    if t in ("POINT", "NODE"):
        return {"type": "Point", "coordinates": [g["points"][0]["x"], g["points"][0]["y"]]}
    if t == "LINE":
        return {"type": "LineString", "coordinates": [[p["x"], p["y"]] for p in g["points"]]}
    if t in ("REGION", "POLYGON"):
        if g.get("parts") and len(g["parts"]) > 1:
            rings = []
            idx = 0
            for count in g["parts"]:
                rings.append([[p["x"], p["y"]] for p in g["points"][idx:idx + count]])
                idx += count
            return {"type": "Polygon", "coordinates": rings}
        return {"type": "Polygon", "coordinates": [[[p["x"], p["y"]] for p in g["points"]]]}
    return None


def convert_changchun_geometry(g: dict) -> dict | None:
    """iServer 几何对象（长春平面坐标）→ GeoJSON（WGS84）"""
    if not g or not g.get("points"):
        return None
    t = g["type"]
    if t in ("POINT", "NODE"):
        lng, lat = changchun_to_wgs84(g["points"][0]["x"], g["points"][0]["y"])
        return {"type": "Point", "coordinates": [lng, lat]}
    if t == "LINE":
        return {"type": "LineString", "coordinates": [changchun_to_wgs84(p["x"], p["y"]) for p in g["points"]]}
    if t in ("REGION", "POLYGON"):
        parts = g.get("parts", [len(g["points"])])
        rings = []
        idx = 0
        for count in parts:
            rings.append([changchun_to_wgs84(p["x"], p["y"]) for p in g["points"][idx:idx + count]])
            idx += count
        return {"type": "Polygon", "coordinates": rings}
    return None


def extract_display_name(properties: dict) -> str:
    """从 iServer 要素属性中提取最佳显示名称"""
    if not properties:
        return "未命名要素"
    for field in ["NAME", "Name", "name", "ADMINNAME", "KIND", "KD", "名称", "类型", "LANDTYPE", "GEO_TYPE"]:
        val = properties.get(field)
        if val is not None and str(val).strip():
            return str(val)
    return f"未命名要素 (SMID: {properties.get('SMID', '?')})"


# 全局单例
iserver_client = IServerClient()
