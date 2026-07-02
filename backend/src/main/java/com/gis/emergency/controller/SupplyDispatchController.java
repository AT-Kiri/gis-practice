package com.gis.emergency.controller;

import com.gis.emergency.common.R;
import com.gis.emergency.entity.SupplyDispatch;
import com.gis.emergency.service.SupplyDispatchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 应急物资调度总表 REST API
 * 端点：GET 列表 / GET 单条 / POST 新增 / PUT 更新 / DELETE 删除
 * 异常由 GlobalExceptionHandler 统一处理（IllegalArgumentException → 400）
 */
@RestController
@RequestMapping("/api/supply-dispatch")
public class SupplyDispatchController {

    @Autowired
    private SupplyDispatchService supplyDispatchService;

    @GetMapping
    public R<List<SupplyDispatch>> list() {
        return R.ok(supplyDispatchService.list());
    }

    @GetMapping("/{dispatchId}")
    public R<SupplyDispatch> getById(@PathVariable String dispatchId) {
        return R.ok(supplyDispatchService.getById(dispatchId));
    }

    @PostMapping
    public R<Integer> create(@RequestBody SupplyDispatch entity) {
        return R.ok(supplyDispatchService.create(entity));
    }

    @PutMapping("/{dispatchId}")
    public R<Integer> update(@PathVariable String dispatchId, @RequestBody SupplyDispatch entity) {
        return R.ok(supplyDispatchService.update(dispatchId, entity));
    }

    @DeleteMapping("/{dispatchId}")
    public R<Integer> delete(@PathVariable String dispatchId) {
        return R.ok(supplyDispatchService.delete(dispatchId));
    }
}
