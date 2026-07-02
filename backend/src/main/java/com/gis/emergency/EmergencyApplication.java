package com.gis.emergency;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 京津冀城市综合防灾应急管理系统 — 后端启动入口
 */
@SpringBootApplication
@MapperScan("com.gis.emergency.mapper")
public class EmergencyApplication {

    public static void main(String[] args) {
        SpringApplication.run(EmergencyApplication.class, args);
    }
}
