package com.gis.emergency.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * 应用通用配置
 * 主要提供 RestTemplate Bean，用于后端调用 iServer REST API
 */
@Configuration
public class AppConfig {

    /** 创建 RestTemplate，设置连接超时 5 秒、读取超时 30 秒 */
    @Bean
    public RestTemplate restTemplate() {
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(30).toMillis());
        return new RestTemplate(factory);
    }
}
