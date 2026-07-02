package com.gis.emergency.controller;

import com.gis.emergency.common.R;
import com.gis.emergency.entity.WarnInfo;
import com.gis.emergency.service.WarnInfoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 气象灾害预警主表 REST API
 * 端点：GET 列表 / GET 单条 / POST 新增 / PUT 更新 / DELETE 删除
 * 异常由 GlobalExceptionHandler 统一处理（IllegalArgumentException → 400）
 */
@RestController
@RequestMapping("/api/warn-info")
public class WarnInfoController {

    @Autowired
    private WarnInfoService warnInfoService;

    @GetMapping
    public R<List<WarnInfo>> list() {
        return R.ok(warnInfoService.list());
    }

    @GetMapping("/{warnId}")
    public R<WarnInfo> getById(@PathVariable String warnId) {
        return R.ok(warnInfoService.getById(warnId));
    }

    @PostMapping
    public R<Integer> create(@RequestBody WarnInfo entity) {
        return R.ok(warnInfoService.create(entity));
    }

    @PutMapping("/{warnId}")
    public R<Integer> update(@PathVariable String warnId, @RequestBody WarnInfo entity) {
        return R.ok(warnInfoService.update(warnId, entity));
    }

    @DeleteMapping("/{warnId}")
    public R<Integer> delete(@PathVariable String warnId) {
        return R.ok(warnInfoService.delete(warnId));
    }
}
