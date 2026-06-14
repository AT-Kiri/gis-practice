package com.gis.emergency.service;

import com.gis.emergency.common.R;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * 专题检索服务
 * 根据地物名称关键字，通过 iServer 地图服务的 queryResults 接口，
 * 在京津冀地区多个地理数据集中模糊搜索匹配的要素。
 */
@Service
public class ThematicSearchService {

    private static final Logger log = LoggerFactory.getLogger(ThematicSearchService.class);

    /** iServer 基础地址 */
    @Value("${iserver.base-url}")
    private String iserverBaseUrl;

    /** 地图服务名称（默认 map-jingjin） */
    @Value("${iserver.map-service:map-jingjin}")
    private String mapService;

    /** 地图名称（默认 京津地区地图） */
    @Value("${iserver.map-name:京津地区地图}")
    private String mapName;

    /** 单次查询期望返回的最大数量 */
    @Value("${iserver.search.expect-count:100}")
    private int expectCount;

    private final RestTemplate restTemplate;

    public ThematicSearchService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /** 数据集英文名 → 中文名映射 */
    private static final Map<String, String> LAYER_NAMES = Map.ofEntries(
            Map.entry("County_P", "县级市"),
            Map.entry("Town_P", "乡镇"),
            Map.entry("Road_L", "道路"),
            Map.entry("Railway_L", "铁路"),
            Map.entry("River_L", "河流"),
            Map.entry("Lake_R", "湖泊"),
            Map.entry("Landuse_R", "土地利用"),
            Map.entry("Geomor_R", "地貌"),
            Map.entry("Coastline_L", "海岸线"),
            Map.entry("Province_L", "省界")
    );

    /** 搜索层级 → 对应数据集列表映射 */
    private static final Map<String, List<String>> LEVEL_LAYERS = Map.of(
            "province", List.of("Province_L", "County_P"),
            "county",   List.of("County_P"),
            "town",     List.of("Town_P"),
            "all",      List.of("County_P", "Town_P", "Road_L", "Railway_L",
                                "River_L", "Lake_R", "Landuse_R", "Geomor_R", "Coastline_L")
    );

    /**
     * 执行关键字搜索
     * 根据关键词和层级范围，在指定数据集中进行属性模糊查询（NAME like '%keyword%'）。
     *
     * @param keyword 搜索关键字
     * @param level   搜索层级（all/province/county/town）
     * @return 搜索结果，包含总数、各数据集统计和要素列表
     */
    public R<Map<String, Object>> search(String keyword, String level) {
        long startTime = System.currentTimeMillis();
        List<String> layers = LEVEL_LAYERS.getOrDefault(level, LEVEL_LAYERS.get("all"));

        // 转义 SQL LIKE 通配符和单引号，防止 SQL 注入
        String escapedKeyword = keyword
                .replace("\\", "\\\\")
                .replace("'", "''")
                .replace("%", "\\%")
                .replace("_", "\\_");
        String attrFilter = String.format("NAME like '%%%s%%' ESCAPE '\\'", escapedKeyword);

        // 通过地图服务单次请求查询所有图层
        List<Map<String, Object>> allFeatures = queryByMapService(layers, attrFilter);

        // 统计各数据集结果数量
        Map<String, Object> result = new LinkedHashMap<>();
        Map<String, Integer> layerCounts = new LinkedHashMap<>();
        int totalCount = 0;
        for (Map<String, Object> f : allFeatures) {
            String ds = (String) f.get("dataset");
            layerCounts.merge(LAYER_NAMES.getOrDefault(ds, ds), 1, Integer::sum);
            totalCount++;
        }

        long elapsed = System.currentTimeMillis() - startTime;
        result.put("total", totalCount);
        result.put("datasetCounts", layerCounts);
        result.put("features", allFeatures);
        result.put("elapsed", elapsed);

        log.info("专题检索 '{}' (层级={}): 找到 {} 个要素, 耗时 {}ms", keyword, level, totalCount, elapsed);
        return R.ok(result);
    }

    /**
     * 通过地图服务的 queryResults 接口批量查询多个图层
     * 使用 SQLQuery 模式，在单次 POST 请求中传入多个图层的 FilterParameter，
     * 一次性获取所有匹配要素。
     *
     * @param layerNames 要查询的图层名称列表
     * @param attrFilter 属性过滤条件（SQL WHERE 子句）
     * @return 标准化后的要素列表
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> queryByMapService(List<String> layerNames, String attrFilter) {
        // 对地图名称进行 URL 编码（中文不能直接出现在 URI 路径段中）
        String encodedMapName = UriUtils.encodePathSegment(mapName, StandardCharsets.UTF_8);
        String urlStr = iserverBaseUrl + "/iserver/services/" + mapService + "/rest/maps/" + encodedMapName + "/queryResults";
        URI uri = URI.create(urlStr);

        // 为每个图层构建 FilterParameter
        List<Map<String, Object>> queryParamsList = new ArrayList<>();
        for (String layer : layerNames) {
            Map<String, Object> qp = new HashMap<>();
            qp.put("name", layer + "@" + "Jingjin");
            qp.put("attributeFilter", attrFilter);
            queryParamsList.add(qp);
        }

        // 构建完整的请求体
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("queryMode", "SQLQuery");
        requestBody.put("queryParams", queryParamsList);
        requestBody.put("expectCount", expectCount);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        log.info("地图服务查询: {} 个图层, URI: {}", layerNames.size(), uri);

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    uri, HttpMethod.POST, entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {});

            Map<String, Object> body = response.getBody();
            if (body == null) return List.of();

            // 解析 recordsets（每个图层一个 recordset）
            List<Map<String, Object>> allFeatures = new ArrayList<>();
            List<Map<String, Object>> recordsets = (List<Map<String, Object>>) body.get("recordsets");
            if (recordsets == null || recordsets.isEmpty()) {
                log.warn("地图查询无返回结果");
                return List.of();
            }

            // 遍历每个 recordset，提取 features（GeoJSON FeatureCollection 格式）
            for (int i = 0; i < recordsets.size() && i < layerNames.size(); i++) {
                Map<String, Object> rs = recordsets.get(i);
                String shortName = layerNames.get(i);

                Object featuresObj = rs.get("features");
                if (!(featuresObj instanceof Map)) continue;
                Map<String, Object> fc = (Map<String, Object>) featuresObj;
                List<Map<String, Object>> features = (List<Map<String, Object>>) fc.get("features");
                if (features == null) continue;

                // 标准化处理：提取必要字段（dataset、geometry、properties、displayName、smid）
                for (Map<String, Object> feature : features) {
                    Map<String, Object> norm = new LinkedHashMap<>();
                    norm.put("dataset", shortName);
                    norm.put("datasetName", LAYER_NAMES.getOrDefault(shortName, shortName));
                    norm.put("geometry", feature.get("geometry"));
                    norm.put("properties", feature.get("properties") != null ? feature.get("properties") : new HashMap<>());

                    Map<String, Object> props = (Map<String, Object>) feature.get("properties");
                    norm.put("displayName", extractName(props, shortName));
                    norm.put("smid", props != null ? props.get("SMID") : null);
                    allFeatures.add(norm);
                }
            }

            return allFeatures;
        } catch (Exception e) {
            log.warn("地图服务查询失败: {}: {}", uri, e.getMessage());
            return List.of();
        }
    }

    /**
     * 从属性中提取最佳显示名称
     * 优先尝试 NAME、Name、name 等常见名称字段，取第一个非空值
     *
     * @param props     要素属性
     * @param layerName 所在图层名称
     * @return 显示名称
     */
    private String extractName(Map<String, Object> props, String layerName) {
        if (props == null) return "未命名要素";
        for (String field : new String[]{"NAME", "Name", "name", "名称", "地名", "类型"}) {
            Object val = props.get(field);
            if (val != null && !val.toString().isEmpty()) return val.toString();
        }
        return "未命名要素 (SMID: " + props.getOrDefault("SMID", "?") + ")";
    }
}
