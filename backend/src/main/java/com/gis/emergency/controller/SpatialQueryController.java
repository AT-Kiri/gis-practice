package com.gis.emergency.controller;

import com.gis.emergency.common.R;
import com.gis.emergency.service.SpatialQueryService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/spatial")
public class SpatialQueryController {

    private final SpatialQueryService spatialQueryService;

    public SpatialQueryController(SpatialQueryService spatialQueryService) {
        this.spatialQueryService = spatialQueryService;
    }

    @PostMapping("/query")
    public R<Map<String, Object>> query(@RequestBody Map<String, Object> params) {
        Object geometry = params.get("geometry");
        if (geometry == null) {
            return R.error("查询几何不能为空");
        }
        return spatialQueryService.query(geometry);
    }
}
