# Spec: GIS 工具层（GIS Tools）

> 模块：后端 Tool Layer + 前端结果渲染
> 职责：将 iServer GIS 操作封装为 Agent 可调用的标准化 Tool

---

## 场景 1：专题检索工具 (feature_search)

### Given-When-Then

#### 正常场景：关键字搜索
- **Given** iServer 服务正常运行，Jingjin 数据源可用
- **When** Agent 调用 `feature_search` 工具，参数 `keyword="朝阳区"`, `level="county"`
- **Then**
  - 工具返回 `success=true`
  - 返回 `data.total` 为匹配的要素总数
  - 返回 `data.features` 为要素列表，每个要素含 `displayName`、`datasetName`、`properties`
  - 返回 `geojson` 为 FeatureCollection，可直接渲染到地图
  - 返回 `message` 为人类可读摘要，如"找到 1 个县级行政区：朝阳区"

#### 边界场景：空关键字
- **Given** 用户输入为空或纯空格
- **When** Agent 调用 `feature_search`，参数 `keyword="   "`
- **Then**
  - 工具返回 `success=false`
  - 返回 `error="关键字不能为空"`

#### 异常场景：iServer 不可用
- **Given** iServer 服务宕机或网络不通
- **When** Agent 调用 `feature_search`
- **Then**
  - 工具返回 `success=false`
  - 返回 `error="iServer 请求失败: ..."`
  - 不抛出异常到上层

---

## 场景 2：空间查询工具 (spatial_query)

### Given-When-Then

#### 正常场景：圆形范围查询
- **Given** iServer 服务正常，给定一个圆形 GeoJSON 几何
- **When** Agent 调用 `spatial_query`，参数 `geometry={type:"Polygon",coordinates:...}`, `mode="circle"`
- **Then**
  - 工具返回 `success=true`
  - 返回要素列表和 GeoJSON，格式同 feature_search
  - 查询模式为 INTERSECT

#### 边界场景：几何无效
- **Given** 传入的 geometry 格式错误（如不是 Polygon）
- **When** 调用 spatial_query
- **Then**
  - 返回 `success=false`
  - 返回 `error="几何格式无效"`

---

## 场景 3：缓冲区分析工具 (buffer_analysis)

### Given-When-Then

#### 正常场景：点缓冲区
- **Given** 输入一个 Point GeoJSON，半径 500 米
- **When** Agent 调用 `buffer_analysis`，参数 `geometry={type:"Point",coordinates:[116.4,39.9]}`, `distance=500`
- **Then**
  - 返回 `success=true`
  - 返回 `geojson` 为缓冲区面（Polygon FeatureCollection）
  - 返回 `message` 包含缓冲区面积等摘要信息

#### 边界场景：半径为 0 或负数
- **Given** distance <= 0
- **When** 调用 buffer_analysis
- **Then**
  - 返回 `success=false`
  - 返回 `error="缓冲区半径必须大于 0"`

---

## 场景 4：叠置分析工具 (overlay_analysis)

### Given-When-Then

#### 正常场景：土地利用与地貌求交集
- **Given** 源数据集 Landuse_R，操作数据集 Geomor_R，操作 INTERSECT
- **When** Agent 调用 `overlay_analysis`，参数 `source_dataset="Landuse_R@Jingjin"`, `operate_dataset="Geomor_R@Jingjin"`, `operation="INTERSECT"`
- **Then**
  - 返回 `success=true`
  - 返回 `data.feature_count` 为结果要素数
  - 返回 `geojson` 为叠置结果

#### 边界场景：不支持的操作类型
- **Given** operation 参数不是 UNION/INTERSECT/ERASE/CLIP 之一
- **When** 调用 overlay_analysis
- **Then**
  - 返回 `success=false`
  - 返回 `error="不支持的叠置操作类型: xxx"`

---

## 场景 5：最短路径工具 (shortest_path)

### Given-When-Then

#### 正常场景：两点间最短路径
- **Given** 长春路网数据可用，输入两个点坐标
- **When** Agent 调用 `shortest_path`，参数 `points=[{lng:125.3,lat:43.8},{lng:125.4,lat:43.9}]`
- **Then**
  - 返回 `success=true`
  - 返回 `data.distance_m` 为路径长度（米）
  - 返回 `geojson` 为路径线（LineString FeatureCollection）
  - 自动切换到长春底图（由前端根据事件类型处理）

#### 边界场景：点数不足
- **Given** points 长度 < 2
- **When** 调用 shortest_path
- **Then**
  - 返回 `success=false`
  - 返回 `error="最短路径需要至少 2 个点"`

---

## 场景 6：服务区分析工具 (service_area)

### Given-When-Then

#### 正常场景：点服务区
- **Given** 长春路网可用，中心点 + 半径 500 米
- **When** Agent 调用 `service_area`，参数 `center={lng:125.3,lat:43.8}`, `radius=500`
- **Then**
  - 返回 `success=true`
  - 返回 `data.edge_count` 为服务区内路段数
  - 返回 `geojson` 为服务区边集合（LineString FeatureCollection）

---

## 场景 7：地图定位工具 (fly_to_location)

### Given-When-Then

#### 正常场景：按地名定位
- **Given** 输入地点名称"朝阳区"
- **When** Agent 调用 `fly_to_location`，参数 `location="朝阳区"`
- **Then**
  - 返回 `success=true`
  - 返回 `data.center` 为 [lng, lat]
  - 返回 `data.zoom` 为建议缩放级别
  - 前端收到 tool_result 后自动执行 flyTo

#### 正常场景：按坐标定位
- **Given** 输入经纬度坐标
- **When** Agent 调用 `fly_to_location`，参数 `location={lng:116.4,lat:39.9}`
- **Then**
  - 返回 `success=true`
  - 返回 center 和 zoom

---

## 工具输出统一契约

### 必须字段
所有 Tool 必须返回以下结构（Pydantic 模型）：

```python
{
  "success": bool,           # 是否成功
  "data": dict,              # 具体结果数据
  "geojson": dict | None,    # 可直接渲染的 GeoJSON FeatureCollection
  "message": str,            # 人类可读摘要
  "error": str | None        # 错误信息（success=false 时）
}
```

### geojson 约定
- 统一为 `FeatureCollection` 格式，即使只有一个要素
- 坐标系统一为 WGS84 (EPSG:4326)
- properties 中必须包含 `_toolName` 和 `_displayName` 用于前端展示
