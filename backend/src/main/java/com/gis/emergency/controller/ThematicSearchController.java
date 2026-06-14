package com.gis.emergency.controller;

import com.gis.emergency.common.R;
import com.gis.emergency.service.ThematicSearchService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 专题检索接口
 * 根据地物名称关键字搜索各地理数据集中的要素
 */
@RestController
@RequestMapping("/api/thematic")
public class ThematicSearchController {

    private final ThematicSearchService thematicSearchService;

    public ThematicSearchController(ThematicSearchService thematicSearchService) {
        this.thematicSearchService = thematicSearchService;
    }

    /**
     * 关键字搜索
     * @param keyword 搜索关键字（按 NAME 字段模糊匹配）
     * @param level 搜索层级：all/province/county/town
     */
    @GetMapping("/search")
    public R<Map<String, Object>> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "all") String level) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return R.error("搜索关键字不能为空");
        }
        return thematicSearchService.search(keyword.trim(), level);
    }
}
