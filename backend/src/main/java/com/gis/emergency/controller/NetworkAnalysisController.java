package com.gis.emergency.controller;

import com.gis.emergency.common.R;
import com.gis.emergency.service.NetworkAnalysisService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 网络分析接口
 * 基于长春市路网数据，提供最短路径分析和服务区分析功能
 */
@RestController
@RequestMapping("/api/network")
public class NetworkAnalysisController {

    private final NetworkAnalysisService service;

    public NetworkAnalysisController(NetworkAnalysisService service) {
        this.service = service;
    }

    /**
     * 最短路径分析
     * @param params 包含 points（途经点列表）和 weightField（权重字段）
     */
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

    /**
     * 获取 RoadNet 路网矢量化数据（用于前端叠加显示）
     * @param limit 返回要素数量上限
     */
    @GetMapping("/road-network")
    public R<Map<String, Object>> roadNetwork(@RequestParam(defaultValue = "2000") int limit) {
        return service.getRoadNetwork(limit);
    }

    /**
     * 服务区分析
     * @param params 包含 center（中心点）、weights（半径列表）、weightField（权重字段）
     */
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
