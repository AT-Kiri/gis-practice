package com.gis.emergency.controller;

import com.gis.emergency.common.R;
import com.gis.emergency.service.ThematicSearchService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/thematic")
public class ThematicSearchController {

    private final ThematicSearchService thematicSearchService;

    public ThematicSearchController(ThematicSearchService thematicSearchService) {
        this.thematicSearchService = thematicSearchService;
    }

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
