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

@Service
public class ThematicSearchService {

    private static final Logger log = LoggerFactory.getLogger(ThematicSearchService.class);

    @Value("${iserver.base-url}")
    private String iserverBaseUrl;

    @Value("${iserver.map-service:map-jingjin}")
    private String mapService;

    @Value("${iserver.map-name:京津地区地图}")
    private String mapName;

    @Value("${iserver.search.expect-count:100}")
    private int expectCount;

    private final RestTemplate restTemplate;

    public ThematicSearchService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

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

    private static final Map<String, List<String>> LEVEL_LAYERS = Map.of(
            "province", List.of("Province_L", "County_P"),
            "county",   List.of("County_P"),
            "town",     List.of("Town_P"),
            "all",      List.of("County_P", "Town_P", "Road_L", "Railway_L",
                                "River_L", "Lake_R", "Landuse_R", "Geomor_R", "Coastline_L")
    );

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

        // Query via map service — single request with all layer params
        List<Map<String, Object>> allFeatures = queryByMapService(layers, attrFilter);

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

        log.info("Search '{}' (level={}): {} features in {}ms", keyword, level, totalCount, elapsed);
        return R.ok(result);
    }

    /**
     * Query all layers in a single request via map service's queryResults endpoint.
     * Uses the same approach as the experiment code (城市查询.html).
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> queryByMapService(List<String> layerNames, String attrFilter) {
        // Encode map name for URI path (Chinese characters not allowed in raw path segments)
        String encodedMapName = UriUtils.encodePathSegment(mapName, StandardCharsets.UTF_8);
        String urlStr = iserverBaseUrl + "/iserver/services/" + mapService + "/rest/maps/" + encodedMapName + "/queryResults";
        URI uri = URI.create(urlStr);

        // Build queryParams — matching FilterParameter format from reference code
        List<Map<String, Object>> queryParamsList = new ArrayList<>();
        for (String layer : layerNames) {
            Map<String, Object> qp = new HashMap<>();
            qp.put("name", layer + "@" + "Jingjin");
            qp.put("attributeFilter", attrFilter);
            queryParamsList.add(qp);
        }

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("queryMode", "SQLQuery");
        requestBody.put("queryParams", queryParamsList);
        requestBody.put("expectCount", expectCount);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        log.info("Querying map service: {} layers, URI: {}", layerNames.size(), uri);

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    uri, HttpMethod.POST, entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {});

            Map<String, Object> body = response.getBody();
            if (body == null) return List.of();

            List<Map<String, Object>> allFeatures = new ArrayList<>();
            List<Map<String, Object>> recordsets = (List<Map<String, Object>>) body.get("recordsets");
            if (recordsets == null || recordsets.isEmpty()) {
                log.warn("Map query returned no recordsets");
                return List.of();
            }

            for (int i = 0; i < recordsets.size() && i < layerNames.size(); i++) {
                Map<String, Object> rs = recordsets.get(i);
                String shortName = layerNames.get(i);

                // features is a GeoJSON FeatureCollection object, extract the features array
                Object featuresObj = rs.get("features");
                if (!(featuresObj instanceof Map)) continue;
                Map<String, Object> fc = (Map<String, Object>) featuresObj;
                List<Map<String, Object>> features = (List<Map<String, Object>>) fc.get("features");
                if (features == null) continue;

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
            log.warn("Map service query failed at URI {}: {}", uri, e.getMessage());
            return List.of();
        }
    }

    private String extractName(Map<String, Object> props, String layerName) {
        if (props == null) return "未命名要素";
        for (String field : new String[]{"NAME", "Name", "name", "名称", "地名", "类型"}) {
            Object val = props.get(field);
            if (val != null && !val.toString().isEmpty()) return val.toString();
        }
        return "未命名要素 (SMID: " + props.getOrDefault("SMID", "?") + ")";
    }
}
