package com.gis.emergency.service;

import com.gis.emergency.common.R;
import com.gis.emergency.util.CoordConverter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.net.URI;
import java.util.*;

/**
 * 网络分析服务
 * 基于长春市路网数据（RoadNet@Changchun），通过 iServer TransportationAnalyst 服务
 * 提供最短路径分析和服务区分析两大功能。
 * <p>
 * 注意：iServer 的网络分析 API 使用 GET 请求 + JSON 字符串参数的方式，
 * 且采用长春市区图的平面坐标系（PCS_NON_EARTH），需要将前端传来的
 * WGS84 经纬度转换为平面坐标后再发请求。
 */
@Service
public class NetworkAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(NetworkAnalysisService.class);

    /** Jackson 对象映射器，用于 JSON 序列化/反序列化 */
    private static final ObjectMapper JSON_MAPPER = new ObjectMapper()
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    /** iServer 基础地址 */
    @Value("${iserver.base-url}")
    private String iserverBaseUrl;

    /** 交通网络分析服务名称（默认 transportationanalyst-sample） */
    @Value("${iserver.transport-service:transportationanalyst-sample}")
    private String transportService;

    /** 路网数据集名称 */
    private static final String NETWORK_DATA = "RoadNet@Changchun";
    /** 默认权重字段 */
    private static final String WEIGHT_FIELD = "length";

    private final RestTemplate restTemplate;

    public NetworkAnalysisService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * 最短路径分析
     * <p>
     * iServer REST API 使用 GET + .json 后缀，参数以 URL 编码的 JSON 字符串传递：
     * GET .../rest/networkanalyst/{dataset}/path.json
     * ?nodes=[{x:,y:},...]
     * &hasLeastEdgeCount=false
     * &parameter={"resultSetting":{...},"weightFieldName":"length"}
     * <p>
     * 前端传来的坐标是 WGS84 经纬度，需要先转为 Changchun 平面坐标。
     *
     * @param points     途经点列表，每项为 [lng, lat]
     * @param weightField 权重字段（如 length / time 等）
     * @return 路径分析结果，包含 pathList、pathGuideItems 等
     */
    public R<Map<String, Object>> shortestPath(List<List<Double>> points, String weightField) {
        try {
            // 将 WGS84 经纬度转换为 Changchun 平面坐标
            List<Map<String, Object>> nodeList = new ArrayList<>();
            for (List<Double> pt : points) {
                double[] planar = CoordConverter.wgs84ToChangchun(pt.get(0), pt.get(1));
                Map<String, Object> node = new LinkedHashMap<>();
                node.put("x", planar[0]);
                node.put("y", planar[1]);
                nodeList.add(node);
            }
            String nodesJson = JSON_MAPPER.writeValueAsString(nodeList);

            // 构建参数字符串
            String paramJson = buildAnalystParamJson(weightField);

            URI uri = UriComponentsBuilder.fromHttpUrl(iserverBaseUrl)
                    .pathSegment("iserver", "services", transportService,
                            "rest", "networkanalyst", NETWORK_DATA, "path.json")
                    .queryParam("nodes", nodesJson)
                    .queryParam("hasLeastEdgeCount", false)
                    .queryParam("parameter", paramJson)
                    .build(false)
                    .toUri();

            log.info("最短路径 GET 请求: {}", uri);
            return doGet(uri);
        } catch (Exception e) {
            log.error("最短路径请求构建失败: {}", e.getMessage());
            return R.error("网络分析请求构建失败: " + e.getMessage());
        }
    }

    /**
     * 服务区分析
     * <p>
     * GET .../rest/networkanalyst/{dataset}/servicearea.json
     * ?centers=[{x:4500,y:-3500}]
     * &weights=[500,1000]
     * &parameter={...}
     * <p>
     * 前端坐标需先转为 Changchun 平面坐标。
     *
     * @param center      服务区中心点 [lng, lat]
     * @param weights     服务区半径列表（米），可传入多个值生成多级服务区
     * @param weightField 权重字段
     * @return 服务区分析结果，包含 serviceAreaList、edgeFeatures 等
     */
    public R<Map<String, Object>> serviceArea(List<Double> center, List<Double> weights, String weightField) {
        try {
            // 将 WGS84 经纬度转换为 Changchun 平面坐标
            double[] planar = CoordConverter.wgs84ToChangchun(center.get(0), center.get(1));
            Map<String, Object> centerPoint = new LinkedHashMap<>();
            centerPoint.put("x", planar[0]);
            centerPoint.put("y", planar[1]);
            String centersJson = JSON_MAPPER.writeValueAsString(List.of(centerPoint));

            // 构建半径数组 JSON
            String weightsJson = JSON_MAPPER.writeValueAsString(weights);

            // 构建参数
            String paramJson = buildAnalystParamJson(weightField);

            URI uri = UriComponentsBuilder.fromHttpUrl(iserverBaseUrl)
                    .pathSegment("iserver", "services", transportService,
                            "rest", "networkanalyst", NETWORK_DATA, "servicearea.json")
                    .queryParam("centers", centersJson)
                    .queryParam("weights", weightsJson)
                    .queryParam("isAnalyzeById", false)
                    .queryParam("parameter", paramJson)
                    .build(false)
                    .toUri();

            log.info("服务区分析 GET 请求: {}", uri);
            return doGet(uri);
        } catch (Exception e) {
            log.error("服务区分析请求构建失败: {}", e.getMessage());
            return R.error("网络分析请求构建失败: " + e.getMessage());
        }
    }

    /**
     * 获取 RoadNet 路网矢量化数据
     * 从 iServer data-changchun 数据服务查询 RoadNet 要素，转为 WGS84 GeoJSON。
     * 用于前端矢量路网底图，比 tileImage 图片更清晰、可交互。
     * <p>
     * 兼容两种 iServer 返回格式：
     * 1. returnContent=true 时 features 内联返回
     * 2. 旧版本返回 childUriList，需要逐个拉取
     *
     * @param limit 获取要素数量上限（最大 5000）
     * @return GeoJSON FeatureCollection，包含道路线要素
     */
    public R<Map<String, Object>> getRoadNetwork(int limit) {
        try {
            limit = Math.min(limit, 5000); // 上限 5000 条，避免响应过大
            String listUrl = iserverBaseUrl
                    + "/iserver/services/data-changchun/rest/data/datasources/Changchun/datasets/RoadNet/features.json"
                    + "?fromIndex=0&toIndex=" + limit + "&returnContent=true";

            @SuppressWarnings("unchecked")
            Map<String, Object> listResp = restTemplate.getForObject(listUrl, Map.class);
            if (listResp == null) {
                return R.error("无法获取路网要素列表");
            }

            // 解析返回的要素列表（兼容 features 和 featureList 两种字段名）
            List<Map<String, Object>> rawFeatures = null;
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> maybeFeatures = (List<Map<String, Object>>) listResp.get("features");
            if (maybeFeatures != null) {
                rawFeatures = maybeFeatures;
            } else {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> maybeList = (List<Map<String, Object>>) listResp.get("featureList");
                rawFeatures = maybeList;
            }

            // 如果没有内联数据，回退到逐个 URI 拉取（兼容旧版本 iServer）
            if (rawFeatures == null) {
                @SuppressWarnings("unchecked")
                List<String> childUris = (List<String>) listResp.get("childUriList");
                if (childUris == null || childUris.isEmpty()) {
                    return R.ok(Map.of("type", "FeatureCollection", "features", List.of()));
                }
                rawFeatures = new ArrayList<>();
                for (String uri : childUris) {
                    try {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> f = restTemplate.getForObject(uri + ".json", Map.class);
                        if (f != null)
                            rawFeatures.add(f);
                    } catch (Exception e) {
                        log.warn("获取单个路网要素失败: {}", uri);
                    }
                }
            }

            // 统一解析为 GeoJSON FeatureCollection
            List<Map<String, Object>> geojsonFeatures = new ArrayList<>();
            for (Map<String, Object> feature : rawFeatures) {
                @SuppressWarnings("unchecked")
                Map<String, Object> geometry = (Map<String, Object>) feature.get("geometry");
                if (geometry == null || !"LINE".equals(geometry.get("type")))
                    continue;

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> pts = (List<Map<String, Object>>) geometry.get("points");
                if (pts == null || pts.size() < 2)
                    continue;

                // 将平面坐标转为 WGS84 经纬度
                List<List<Double>> coords = new ArrayList<>();
                for (Map<String, Object> pt : pts) {
                    double[] wgs84 = CoordConverter.changchunToWgs84(
                            ((Number) pt.get("x")).doubleValue(),
                            ((Number) pt.get("y")).doubleValue());
                    coords.add(List.of(wgs84[0], wgs84[1]));
                }

                Map<String, Object> geojsonGeom = new LinkedHashMap<>();
                geojsonGeom.put("type", "LineString");
                geojsonGeom.put("coordinates", coords);

                // 提取道路名称属性（fieldValues 第 7 项为道路名称）
                Map<String, Object> props = new LinkedHashMap<>();
                @SuppressWarnings("unchecked")
                List<Object> fieldValues = (List<Object>) feature.get("fieldValues");
                if (fieldValues != null && fieldValues.size() > 6 && fieldValues.get(6) != null) {
                    props.put("name", fieldValues.get(6).toString());
                }

                Map<String, Object> geojsonFeature = new LinkedHashMap<>();
                geojsonFeature.put("type", "Feature");
                geojsonFeature.put("geometry", geojsonGeom);
                geojsonFeature.put("properties", props);
                geojsonFeatures.add(geojsonFeature);
            }

            Map<String, Object> geojson = new LinkedHashMap<>();
            geojson.put("type", "FeatureCollection");
            geojson.put("features", geojsonFeatures);
            return R.ok(geojson);
        } catch (Exception e) {
            log.error("获取路网数据失败: {}", e.getMessage());
            return R.error("路网数据获取失败: " + e.getMessage());
        }
    }

    /**
     * 构建 iServer 网络分析参数 JSON 字符串
     * 配置 resultSetting 控制返回内容（边/节点几何、路径引导等），
     * 以及权重字段名称。
     *
     * @param weightField 权重字段名
     * @return JSON 字符串
     */
    private String buildAnalystParamJson(String weightField) throws Exception {
        Map<String, Object> resultSetting = new LinkedHashMap<>();
        resultSetting.put("returnEdgeFeatures", true);
        resultSetting.put("returnEdgeGeometry", true);
        resultSetting.put("returnEdgeIDs", true);
        resultSetting.put("returnNodeFeatures", true);
        resultSetting.put("returnNodeGeometry", true);
        resultSetting.put("returnNodeIDs", true);
        resultSetting.put("returnPathGuides", true);
        resultSetting.put("returnRoutes", true);

        Map<String, Object> param = new LinkedHashMap<>();
        param.put("resultSetting", resultSetting);
        param.put("weightFieldName", weightField != null ? weightField : WEIGHT_FIELD);

        return JSON_MAPPER.writeValueAsString(param);
    }

    /**
     * 通用 GET 请求发送
     * iServer 网络分析 API 使用 GET 方式传参，但返回 JSON 响应。
     * 本方法接收 String 响应后手动解析，并做 HTML 错误检测（iServer 异常时可能返回 HTML）。
     *
     * @param uri 请求地址（已包含所有参数）
     * @return 统一响应体
     */
    private R<Map<String, Object>> doGet(URI uri) {
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> raw = restTemplate.exchange(
                    uri, HttpMethod.GET, entity, String.class);
            String body = raw.getBody();
            if (body == null || body.isEmpty()) {
                return R.error("网络分析服务返回为空");
            }
            // iServer 错误时可能返回 HTML 页面而非 JSON
            if (body.trim().startsWith("<!doctype") || body.trim().startsWith("<html")) {
                log.error("iServer 返回了 HTML 而非 JSON, URL: {}", uri);
                return R.error("网络分析服务返回错误，请检查 iServer 服务和参数");
            }
            Map<String, Object> result = JSON_MAPPER.readValue(body,
                    new TypeReference<Map<String, Object>>() {
                    });
            return R.ok(result);
        } catch (Exception e) {
            log.error("网络分析请求失败: {}: {}", uri, e.getMessage());
            return R.error("网络分析失败: " + e.getMessage());
        }
    }
}
