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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Service
public class NetworkAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(NetworkAnalysisService.class);

    private static final ObjectMapper JSON_MAPPER = new ObjectMapper()
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Value("${iserver.base-url}")
    private String iserverBaseUrl;

    @Value("${iserver.transport-service:transportationanalyst-sample}")
    private String transportService;

    private static final String NETWORK_DATA = "RoadNet@Changchun";
    private static final String WEIGHT_FIELD = "length";

    private final RestTemplate restTemplate;
    private final ExecutorService featureExecutor = Executors.newFixedThreadPool(20);

    public NetworkAnalysisService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * 最短路径分析。
     * iServer REST API 使用 GET + .json 后缀，参数以 URL 编码的 JSON 字符串传递。
     * GET .../rest/networkanalyst/{dataset}/path.json
     * ?nodes=[{x:,y:},...]
     * &hasLeastEdgeCount=false
     * &parameter={"resultSetting":{...},"weightFieldName":"length"}
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

            // Build parameter as JSON string
            String paramJson = buildAnalystParamJson(weightField);

            URI uri = UriComponentsBuilder.fromHttpUrl(iserverBaseUrl)
                    .pathSegment("iserver", "services", transportService,
                            "rest", "networkanalyst", NETWORK_DATA, "path.json")
                    .queryParam("nodes", nodesJson)
                    .queryParam("hasLeastEdgeCount", false)
                    .queryParam("parameter", paramJson)
                    .build(false)
                    .toUri();

            log.info("Shortest path GET: {}", uri);
            return doGet(uri);
        } catch (Exception e) {
            log.error("Failed to build shortest path request: {}", e.getMessage());
            return R.error("网络分析请求构建失败: " + e.getMessage());
        }
    }

    /**
     * 服务区分析。
     * GET .../rest/networkanalyst/{dataset}/servicearea.json
     * ?centers=[{x:4500,y:-3500}]
     * &weights=[500,1000]
     * &parameter={...}
     */
    public R<Map<String, Object>> serviceArea(List<Double> center, List<Double> weights, String weightField) {
        try {
            // 将 WGS84 经纬度转换为 Changchun 平面坐标
            double[] planar = CoordConverter.wgs84ToChangchun(center.get(0), center.get(1));
            Map<String, Object> centerPoint = new LinkedHashMap<>();
            centerPoint.put("x", planar[0]);
            centerPoint.put("y", planar[1]);
            String centersJson = JSON_MAPPER.writeValueAsString(List.of(centerPoint));

            // Build weights as JSON array: [500, 1000]
            String weightsJson = JSON_MAPPER.writeValueAsString(weights);

            // Build parameter
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

            log.info("Service area GET: {}", uri);
            return doGet(uri);
        } catch (Exception e) {
            log.error("Failed to build service area request: {}", e.getMessage());
            return R.error("网络分析请求构建失败: " + e.getMessage());
        }
    }

    /**
     * 从 iServer data-changchun 服务查询 RoadNet 路网要素，转为 WGS84 GeoJSON。
     * 用于前端矢量路网底图（替代模糊的 tileImage 图片）。
     */
    public R<Map<String, Object>> getRoadNetwork(int limit) {
        try {
            limit = Math.min(limit, 2000); // 上限 2000
            String listUrl = iserverBaseUrl
                    + "/iserver/services/data-changchun/rest/data/datasources/Changchun/datasets/RoadNet/features.json"
                    + "?fromIndex=0&toIndex=" + limit;

            @SuppressWarnings("unchecked")
            Map<String, Object> listResp = restTemplate.getForObject(listUrl, Map.class);
            if (listResp == null) {
                return R.error("无法获取路网要素列表");
            }

            @SuppressWarnings("unchecked")
            List<String> childUris = (List<String>) listResp.get("childUriList");
            if (childUris == null || childUris.isEmpty()) {
                return R.ok(Map.of("type", "FeatureCollection", "features", List.of()));
            }

            // 并行拉取每个 feature，转为 WGS84 GeoJSON
            List<CompletableFuture<Map<String, Object>>> futures = childUris.stream()
                    .map(uri -> CompletableFuture.supplyAsync(() -> {
                        try {
                            return (Map<String, Object>) restTemplate.getForObject(uri + ".json", Map.class);
                        } catch (Exception e) {
                            log.warn("获取要素失败: {}", uri);
                            return null;
                        }
                    }, featureExecutor))
                    .collect(Collectors.toList());

            List<Map<String, Object>> geojsonFeatures = new ArrayList<>();
            for (int i = 0; i < futures.size(); i++) {
                Map<String, Object> feature = futures.get(i).get();
                if (feature == null)
                    continue;

                @SuppressWarnings("unchecked")
                Map<String, Object> geometry = (Map<String, Object>) feature.get("geometry");
                if (geometry == null || !"LINE".equals(geometry.get("type")))
                    continue;

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> pts = (List<Map<String, Object>>) geometry.get("points");
                if (pts == null || pts.size() < 2)
                    continue;

                // 转 WGS84
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

                // 属性：道路名称
                Map<String, Object> props = new LinkedHashMap<>();
                @SuppressWarnings("unchecked")
                List<Object> fieldValues = (List<Object>) feature.get("fieldValues");
                if (fieldValues != null && fieldValues.size() > 9 && fieldValues.get(9) != null) {
                    props.put("name", fieldValues.get(9).toString());
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
     * 构建 parameter 参数的 JSON 字符串。
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
     * 发送 GET 请求，接收 String 响应，手动解析 JSON。
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
            if (body.trim().startsWith("<!doctype") || body.trim().startsWith("<html")) {
                log.error("iServer returned HTML, URL: {}", uri);
                return R.error("网络分析服务返回错误，请检查 iServer 服务和参数");
            }
            Map<String, Object> result = JSON_MAPPER.readValue(body,
                    new TypeReference<Map<String, Object>>() {
                    });
            return R.ok(result);
        } catch (Exception e) {
            log.error("Network analysis failed at {}: {}", uri, e.getMessage());
            return R.error("网络分析失败: " + e.getMessage());
        }
    }
}
