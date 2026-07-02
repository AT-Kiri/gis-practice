package com.gis.emergency.controller;

import com.gis.emergency.common.R;
import com.gis.emergency.entity.CoordResponse;
import com.gis.emergency.service.CoordResponseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 协同叫应处置表 REST API
 * 端点：GET 列表 / GET 单条 / POST 新增 / PUT 更新 / DELETE 删除
 * 异常由 GlobalExceptionHandler 统一处理（IllegalArgumentException → 400）
 */
@RestController
@RequestMapping("/api/coord-response")
public class CoordResponseController {

    @Autowired
    private CoordResponseService coordResponseService;

    @GetMapping
    public R<List<CoordResponse>> list() {
        return R.ok(coordResponseService.list());
    }

    @GetMapping("/{responseId}")
    public R<CoordResponse> getById(@PathVariable String responseId) {
        return R.ok(coordResponseService.getById(responseId));
    }

    @PostMapping
    public R<Integer> create(@RequestBody CoordResponse entity) {
        return R.ok(coordResponseService.create(entity));
    }

    @PutMapping("/{responseId}")
    public R<Integer> update(@PathVariable String responseId, @RequestBody CoordResponse entity) {
        return R.ok(coordResponseService.update(responseId, entity));
    }

    @DeleteMapping("/{responseId}")
    public R<Integer> delete(@PathVariable String responseId) {
        return R.ok(coordResponseService.delete(responseId));
    }
}
