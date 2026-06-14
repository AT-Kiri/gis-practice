package com.gis.emergency.controller;

import com.gis.emergency.common.R;
import com.gis.emergency.service.NetworkAnalysisService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/network")
public class NetworkAnalysisController {

    private final NetworkAnalysisService service;

    public NetworkAnalysisController(NetworkAnalysisService service) {
        this.service = service;
    }

    @PostMapping("/shortest-path")
    public R<Map<String, Object>> shortestPath(@RequestBody Map<String, Object> params) {
        @SuppressWarnings("unchecked")
        List<List<Double>> points = (List<List<Double>>) params.get("points");
        String weightField = (String) params.getOrDefault("weightField", "length");

        if (points == null || points.size() < 2) {
            return R.error("至少需要2个路径点");
        }
        return service.shortestPath(points, weightField);
    }

    @GetMapping("/road-network")
    public R<Map<String, Object>> roadNetwork(@RequestParam(defaultValue = "300") int limit) {
        return service.getRoadNetwork(limit);
    }

    @PostMapping("/service-area")
    public R<Map<String, Object>> serviceArea(@RequestBody Map<String, Object> params) {
        @SuppressWarnings("unchecked")
        List<Double> center = (List<Double>) params.get("center");
        Object weightsObj = params.get("weights");
        String weightField = (String) params.getOrDefault("weightField", "length");

        if (center == null || center.size() < 2) {
            return R.error("服务区中心点不能为空");
        }

        @SuppressWarnings("unchecked")
        List<Double> weights = weightsObj instanceof List ? (List<Double>) weightsObj : List.of(500.0);

        return service.serviceArea(center, weights, weightField);
    }
}
