package com.gis.emergency.service;

import com.gis.emergency.entity.CoordResponse;
import com.gis.emergency.mapper.CoordResponseMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 协同叫应处置表 Service
 * 承担参数校验 + 业务封装；事务由 MyBatis 默认自动提交
 */
@Service
public class CoordResponseService {

    @Autowired
    private CoordResponseMapper coordResponseMapper;

    public List<CoordResponse> list() {
        return coordResponseMapper.list();
    }

    public CoordResponse getById(String responseId) {
        return coordResponseMapper.getById(responseId);
    }

    public int create(CoordResponse entity) {
        if (entity.getResponseId() == null || entity.getResponseId().isBlank()) {
            throw new IllegalArgumentException("response_id 不能为空");
        }
        return coordResponseMapper.insert(entity);
    }

    public int update(String responseId, CoordResponse entity) {
        if (responseId == null || responseId.isBlank()) {
            throw new IllegalArgumentException("response_id 不能为空");
        }
        entity.setResponseId(responseId);
        return coordResponseMapper.update(entity);
    }

    public int delete(String responseId) {
        if (responseId == null || responseId.isBlank()) {
            throw new IllegalArgumentException("response_id 不能为空");
        }
        return coordResponseMapper.deleteById(responseId);
    }
}
