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

import java.net.URI;
import java.util.*;

/**
 * 空间分析服务
 * 通过 iServer SpatialAnalyst 服务提供的 REST API，实现缓冲区和叠置分析功能
 */
@Service
public class SpatialAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(SpatialAnalysisService.class);

    /** iServer 基础地址 */
    @Value("${iserver.base-url}")
    private String iserverBaseUrl;

    /** 空间分析服务名称（默认 spatialanalyst-sample） */
    @Value("${iserver.spatial-service:spatialanalyst-sample}")
    private String spatialService;

    private final RestTemplate restTemplate;

    public SpatialAnalysisService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * 缓冲区分析
     * 调用 iServer /spatialanalyst/geometry/buffer 接口，对指定的几何对象生成缓冲区。
     * 源几何采用 WGS84（SRID 4326），支持自定义半径和单位。
     *
     * @param geometryObj 源几何对象（GeoJSON 格式）
     * @param distance    缓冲区半径
     * @param unit        半径单位（METER / KILOMETER 等）
     * @return 缓冲区分析结果，包含生成的缓冲区几何
     */
    public R<Map<String, Object>> buffer(Object geometryObj, double distance, String unit) {
        URI uri = UriComponentsBuilder.fromHttpUrl(iserverBaseUrl)
                .pathSegment("iserver", "services", spatialService, "restjsr", "spatialanalyst", "geometry", "buffer")
                .build(true)
                .toUri();

        // 构建请求体：源几何 + SRID + 缓冲区设置（圆头端点、双侧等距）
        Map<String, Object> body = new HashMap<>();
        body.put("sourceGeometry", geometryObj);
        body.put("sourceGeometrySRID", 4326);
        body.put("bufferSetting", Map.of(
                "endType", "ROUND",
                "leftDistance", Map.of("value", distance),
                "rightDistance", Map.of("value", distance),
                "radiusUnit", unit != null ? unit : "METER",
                "semicircleLineSegment", 10
        ));

        log.info("缓冲区分析请求: {}", uri);
        return doPost(uri, body);
    }

    /**
     * 叠置分析
     * 调用 iServer /spatialanalyst/datasets/overlay 接口，对两个数据集执行并/交/擦/剪操作。
     *
     * @param sourceDataset  源数据集名称（如 "Landuse_R@Jingjin"）
     * @param operateDataset 操作数据集名称
     * @param operation      叠置操作类型：UNION（并集）/INTERSECT（交集）/ERASE（擦除）/CLIP（裁剪）
     * @return 叠置分析结果
     */
    public R<Map<String, Object>> overlay(String sourceDataset, String operateDataset, String operation) {
        URI uri = UriComponentsBuilder.fromHttpUrl(iserverBaseUrl)
                .pathSegment("iserver", "services", spatialService, "restjsr", "spatialanalyst", "datasets", "overlay")
                .build(true)
                .toUri();

        Map<String, Object> body = new HashMap<>();
        body.put("sourceDataset", sourceDataset);
        body.put("operateDataset", operateDataset);
        body.put("operation", operation);
        body.put("tolerance", 0);

        log.info("叠置分析请求: {}", uri);
        return doPost(uri, body);
    }

    /**
     * 通用 POST 请求发送，统一处理 iServer 空间分析请求的发送和异常捕获
     *
     * @param uri         请求地址
     * @param requestBody 请求体（Map 形式，自动序列化为 JSON）
     * @return 统一响应体
     */
    @SuppressWarnings("unchecked")
    private R<Map<String, Object>> doPost(URI uri, Map<String, Object> requestBody) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    uri, HttpMethod.POST, entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {});

            return R.ok(response.getBody());
        } catch (Exception e) {
            log.error("空间分析请求失败: {}: {}", uri, e.getMessage());
            return R.error("空间分析失败: " + e.getMessage());
        }
    }
}
