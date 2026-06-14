package com.gis.emergency.controller;

import com.gis.emergency.common.R;
import com.gis.emergency.service.SpatialQueryService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 空间查询接口
 * 提供通过几何图形（点/矩形/圆形）进行空间叠加查询的功能
 */
@RestController
@RequestMapping("/api/spatial")
public class SpatialQueryController {

    private final SpatialQueryService spatialQueryService;

    public SpatialQueryController(SpatialQueryService spatialQueryService) {
        this.spatialQueryService = spatialQueryService;
    }

    /**
     * 空间查询：查找与指定几何相交的所有地物要素
     * @param params 请求体，包含 geometry（GeoJSON 几何对象）
     * @return 查询结果，包含要素列表、各数据集统计和耗时
     */
    @PostMapping("/query")
    public R<Map<String, Object>> query(@RequestBody Map<String, Object> params) {
        Object geometry = params.get("geometry");
        if (geometry == null) {
            return R.error("查询几何不能为空");
        }
        return spatialQueryService.query(geometry);
    }
}
