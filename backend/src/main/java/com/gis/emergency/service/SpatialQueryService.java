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

/**
 * 空间查询服务
 * 当用户在地图上绘制几何图形（点/矩形/圆形）后，
 * 通过 iServer Data 服务的 REST API 并发查询所有地理数据集中与该图形相交的要素。
 */
@Service
public class SpatialQueryService {

    private static final Logger log = LoggerFactory.getLogger(SpatialQueryService.class);

    /** iServer 基础地址 */
    @Value("${iserver.base-url}")
    private String iserverBaseUrl;

    /** 数据服务名称 */
    @Value("${iserver.data-service}")
    private String dataService;

    /** 数据源名称（如 Jingjin） */
    @Value("${iserver.datasource}")
    private String datasource;

    private final RestTemplate restTemplate;

    /** IO 密集型任务，使用独立线程池避免占用 ForkJoinPool */
    private static final ExecutorService IO_EXECUTOR = Executors.newFixedThreadPool(9);

    /** iServer 空间查询模式：INTERSECT（相交查询） */
    private static final String SPATIAL_QUERY_MODE = "INTERSECT";

    /** 需要查询的所有数据集列表 */
    public static final List<String> DATASETS = List.of(
            "County_P", "Town_P", "Road_L", "Railway_L",
            "River_L", "Lake_R", "Landuse_R", "Geomor_R", "Coastline_L");

    /** 数据集英文名 → 中文显示名映射 */
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
     * 执行空间查询
     * 并发查询所有数据集，收集与指定几何相交的地物要素。
     * 使用 CompletableFuture 并行加速，减少多数据集串行查询的等待时间。
     *
     * @param geometryObj 查询几何图形（GeoJSON Geometry 对象）
     * @return 查询结果，包含总数、各数据集统计和要素列表
     */
    public R<Map<String, Object>> query(Object geometryObj) {
        long startTime = System.currentTimeMillis();

        // 并发查询所有数据集
        List<CompletableFuture<Map<String, Object>>> futures = DATASETS.stream()
                .map(dataset -> CompletableFuture.supplyAsync(() -> queryDataset(dataset, geometryObj), IO_EXECUTOR))
                .collect(Collectors.toList());

        // 收集结果
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
                log.warn("查询数据集 {} 失败: {}", DATASETS.get(i), e.getMessage());
            }
        }

        long elapsed = System.currentTimeMillis() - startTime;
        result.put("total", totalCount);
        result.put("datasetCounts", datasetCounts);
        result.put("features", allFeatures);
        result.put("elapsed", elapsed);

        log.info("空间查询完成: 找到 {} 个要素, 耗时 {}ms", totalCount, elapsed);
        return R.ok(result);
    }

    /**
     * 查询单个数据集中与指定几何相交的要素
     * 调用 iServer Data 服务的 POST /datasets/{name}/features 接口，
     * 使用 INTERSECT 空间查询模式。
     *
     * @param datasetName  数据集名称
     * @param geometryObj  查询几何
     * @return 标准化后的查询结果，包含 dataset 名和 features 列表
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> queryDataset(String datasetName, Object geometryObj) {
        String url = String.format("%s/iserver/services/%s/rest/data/datasources/%s/datasets/%s/features",
                iserverBaseUrl, dataService, datasource, datasetName);

        // 构建空间查询请求体
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

            // 标准化：补充数据集信息、提取显示名称和 SMID
            List<Map<String, Object>> normalized = new ArrayList<>();
            for (Map<String, Object> feature : features) {
                Map<String, Object> normFeature = new LinkedHashMap<>();
                Map<String, Object> properties = (Map<String, Object>) feature.get("properties");
                Map<String, Object> geometry = (Map<String, Object>) feature.get("geometry");

                normFeature.put("dataset", datasetName);
                normFeature.put("datasetName", DATASET_NAMES.getOrDefault(datasetName, datasetName));
                normFeature.put("geometry", geometry);
                normFeature.put("properties", properties != null ? properties : new HashMap<>());

                // 提取最佳显示名称
                String displayName = extractDisplayName(properties, datasetName);
                normFeature.put("displayName", displayName);

                // 提取 SMID 用于要素标识
                normFeature.put("smid", properties != null ? properties.get("SMID") : null);

                normalized.add(normFeature);
            }

            return Map.of("dataset", datasetName, "features", normalized);
        } catch (Exception e) {
            log.warn("查询数据集 {} 失败: {}", datasetName, e.getMessage());
            return Map.of("dataset", datasetName, "features", List.of());
        }
    }

    /**
     * 从要素属性中提取最佳显示名称
     * 按优先级依次尝试：NAME > Name > name > 名称 > 地名 > 类型
     * 对于 Landuse_R / Geomor_R 等数据集，"类型"字段通常更有意义
     *
     * @param properties  要素属性字典
     * @param datasetName 数据集名称（用于兜底显示）
     * @return 显示名称
     */
    private String extractDisplayName(Map<String, Object> properties, String datasetName) {
        if (properties == null)
            return "未命名要素";

        // 尝试常见的名称字段
        for (String field : new String[] { "NAME", "Name", "name", "名称", "地名", "类型" }) {
            Object val = properties.get(field);
            if (val != null && !val.toString().isEmpty()) {
                return val.toString();
            }
        }

        // 对于 Landuse_R / Geomor_R，优先使用"类型"字段
        Object type = properties.get("类型");
        if (type != null && !type.toString().isEmpty()) {
            return type.toString();
        }

        return "未命名要素 (SMID: " + properties.getOrDefault("SMID", "?") + ")";
    }
}
