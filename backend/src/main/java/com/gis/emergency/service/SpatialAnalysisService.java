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

@Service
public class SpatialAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(SpatialAnalysisService.class);

    @Value("${iserver.base-url}")
    private String iserverBaseUrl;

    @Value("${iserver.spatial-service:spatialanalyst-sample}")
    private String spatialService;

    private final RestTemplate restTemplate;

    public SpatialAnalysisService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Buffer analysis on a geometry via iServer spatial analyst service.
     */
    public R<Map<String, Object>> buffer(Object geometryObj, double distance, String unit) {
        URI uri = UriComponentsBuilder.fromHttpUrl(iserverBaseUrl)
                .pathSegment("iserver", "services", spatialService, "restjsr", "spatialanalyst", "geometry", "buffer")
                .build(true)
                .toUri();

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

        log.info("Buffer analysis at {}", uri);
        return doPost(uri, body);
    }

    /**
     * Overlay analysis between two datasets via iServer spatial analyst service.
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

        log.info("Overlay analysis at {}", uri);
        return doPost(uri, body);
    }

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
            log.error("Spatial analysis failed at {}: {}", uri, e.getMessage());
            return R.error("空间分析失败: " + e.getMessage());
        }
    }
}
