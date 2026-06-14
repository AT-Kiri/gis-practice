package com.gis.emergency.controller;

import com.gis.emergency.common.R;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 健康检查接口
 * 用于前端/运维确认后端服务是否正常运行
 */
@RestController
public class HealthController {

    @GetMapping("/api/health")
    public R<String> health() {
        return R.ok("京津冀城市综合防灾应急管理系统后端运行正常");
    }
}
