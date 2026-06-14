package com.gis.emergency.controller;

import com.gis.emergency.common.R;
import com.gis.emergency.service.SpatialAnalysisService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/spatial-analysis")
public class SpatialAnalysisController {

    private final SpatialAnalysisService service;

    public SpatialAnalysisController(SpatialAnalysisService service) {
        this.service = service;
    }

    @PostMapping("/buffer")
    public R<Map<String, Object>> buffer(@RequestBody Map<String, Object> params) {
        Object geometry = params.get("geometry");
        Object distanceObj = params.get("distance");
        String unit = (String) params.getOrDefault("unit", "METER");

        if (geometry == null) return R.error("几何数据不能为空");
        double distance = 100;
        if (distanceObj instanceof Number) distance = ((Number) distanceObj).doubleValue();

        return service.buffer(geometry, distance, unit);
    }

    @PostMapping("/overlay")
    public R<Map<String, Object>> overlay(@RequestBody Map<String, Object> params) {
        String source = (String) params.get("sourceDataset");
        String operate = (String) params.get("operateDataset");
        String operation = (String) params.getOrDefault("operation", "UNION");

        if (source == null || operate == null) return R.error("源数据集和操作数据集不能为空");

        return service.overlay(source, operate, operation);
    }
}
