package com.gis.emergency.service;

import com.gis.emergency.common.R;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Service
public class SpatialQueryService {

    private static final Logger log = LoggerFactory.getLogger(SpatialQueryService.class);

    @Value("${iserver.base-url}")
    private String iserverBaseUrl;

    @Value("${iserver.data-service}")
    private String dataService;

    @Value("${iserver.datasource}")
    private String datasource;

    private final RestTemplate restTemplate;

    // IO 密集型任务，使用独立线程池避免占用 ForkJoinPool
    private static final ExecutorService IO_EXECUTOR = Executors.newFixedThreadPool(9);

    // Spatial query modes for iServer
    private static final String SPATIAL_QUERY_MODE = "INTERSECT";

    // Datasets to query
    public static final List<String> DATASETS = List.of(
            "County_P", "Town_P", "Road_L", "Railway_L",
            "River_L", "Lake_R", "Landuse_R", "Geomor_R", "Coastline_L");

    // Display names for datasets
    public static final Map<String, String> DATASET_NAMES = Map.ofEntries(
            Map.entry("County_P", "县级市"),
            Map.entry("Town_P", "乡镇"),
            Map.entry("Road_L", "道路"),
            Map.entry("Railway_L", "铁路"),
            Map.entry("River_L", "河流"),
            Map.entry("Lake_R", "湖泊"),
            Map.entry("Landuse_R", "土地利用"),
            Map.entry("Geomor_R", "地貌"),
            Map.entry("Coastline_L", "海岸线"));

    public SpatialQueryService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Query features across all datasets that intersect the given geometry.
     */
    public R<Map<String, Object>> query(Object geometryObj) {
        long startTime = System.currentTimeMillis();

        // Query all datasets concurrently
        List<CompletableFuture<Map<String, Object>>> futures = DATASETS.stream()
                .map(dataset -> CompletableFuture.supplyAsync(() -> queryDataset(dataset, geometryObj), IO_EXECUTOR))
                .collect(Collectors.toList());

        // Collect results
        Map<String, Object> result = new LinkedHashMap<>();
        List<Map<String, Object>> allFeatures = new ArrayList<>();
        Map<String, Integer> datasetCounts = new LinkedHashMap<>();
        int totalCount = 0;

        for (int i = 0; i < futures.size(); i++) {
            try {
                Map<String, Object> datasetResult = futures.get(i).get();
                String datasetName = DATASETS.get(i);
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> features = (List<Map<String, Object>>) datasetResult.get("features");
                if (features != null && !features.isEmpty()) {
                    datasetCounts.put(DATASET_NAMES.getOrDefault(datasetName, datasetName), features.size());
                    totalCount += features.size();
                    allFeatures.addAll(features);
                }
            } catch (Exception e) {
                log.warn("Query dataset {} failed: {}", DATASETS.get(i), e.getMessage());
            }
        }

        long elapsed = System.currentTimeMillis() - startTime;
        result.put("total", totalCount);
        result.put("datasetCounts", datasetCounts);
        result.put("features", allFeatures);
        result.put("elapsed", elapsed);

        log.info("Spatial query completed: {} features found in {}ms", totalCount, elapsed);
        return R.ok(result);
    }

    /**
     * Query a single dataset from iServer data service.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> queryDataset(String datasetName, Object geometryObj) {
        String url = String.format("%s/iserver/services/%s/rest/data/datasources/%s/datasets/%s/features",
                iserverBaseUrl, dataService, datasource, datasetName);

        // Build request body for iServer spatial query
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("spatialQueryMode", SPATIAL_QUERY_MODE);
        requestBody.put("geometry", geometryObj);
        requestBody.put("returnContent", true);
        requestBody.put("fromIndex", 0);
        requestBody.put("toIndex", 199);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url + "?returnContent=true&fromIndex=0&toIndex=199",
                    HttpMethod.POST,
                    entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    });

            Map<String, Object> body = response.getBody();
            if (body == null) {
                return Map.of("dataset", datasetName, "features", List.of());
            }

            List<Map<String, Object>> features = (List<Map<String, Object>>) body.get("features");
            if (features == null) {
                return Map.of("dataset", datasetName, "features", List.of());
            }

            // Normalize: add dataset info, extract key display field
            List<Map<String, Object>> normalized = new ArrayList<>();
            for (Map<String, Object> feature : features) {
                Map<String, Object> normFeature = new LinkedHashMap<>();
                Map<String, Object> properties = (Map<String, Object>) feature.get("properties");
                Map<String, Object> geometry = (Map<String, Object>) feature.get("geometry");

                normFeature.put("dataset", datasetName);
                normFeature.put("datasetName", DATASET_NAMES.getOrDefault(datasetName, datasetName));
                normFeature.put("geometry", geometry);
                normFeature.put("properties", properties != null ? properties : new HashMap<>());

                // Extract best display name
                String displayName = extractDisplayName(properties, datasetName);
                normFeature.put("displayName", displayName);

                // Extract SMID for identification
                normFeature.put("smid", properties != null ? properties.get("SMID") : null);

                normalized.add(normFeature);
            }

            return Map.of("dataset", datasetName, "features", normalized);
        } catch (Exception e) {
            log.warn("Failed to query {}: {}", datasetName, e.getMessage());
            return Map.of("dataset", datasetName, "features", List.of());
        }
    }

    /**
     * Extract the best display name from feature properties.
     */
    private String extractDisplayName(Map<String, Object> properties, String datasetName) {
        if (properties == null)
            return "未命名要素";

        // Try common name fields
        for (String field : new String[] { "NAME", "Name", "name", "名称", "地名", "类型" }) {
            Object val = properties.get(field);
            if (val != null && !val.toString().isEmpty()) {
                return val.toString();
            }
        }

        // For Landuse_R / Geomor_R, use 类型 field (Chinese)
        Object type = properties.get("类型");
        if (type != null && !type.toString().isEmpty()) {
            return type.toString();
        }

        return "未命名要素 (SMID: " + properties.getOrDefault("SMID", "?") + ")";
    }
}
