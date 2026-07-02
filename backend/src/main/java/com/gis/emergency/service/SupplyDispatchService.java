package com.gis.emergency.service;

import com.gis.emergency.entity.SupplyDispatch;
import com.gis.emergency.mapper.SupplyDispatchMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 应急物资调度总表 Service
 * 承担参数校验 + 业务封装；事务由 MyBatis 默认自动提交
 */
@Service
public class SupplyDispatchService {

    @Autowired
    private SupplyDispatchMapper supplyDispatchMapper;

    public List<SupplyDispatch> list() {
        return supplyDispatchMapper.list();
    }

    public SupplyDispatch getById(String dispatchId) {
        return supplyDispatchMapper.getById(dispatchId);
    }

    public int create(SupplyDispatch entity) {
        if (entity.getDispatchId() == null || entity.getDispatchId().isBlank()) {
            throw new IllegalArgumentException("dispatch_id 不能为空");
        }
        return supplyDispatchMapper.insert(entity);
    }

    public int update(String dispatchId, SupplyDispatch entity) {
        if (dispatchId == null || dispatchId.isBlank()) {
            throw new IllegalArgumentException("dispatch_id 不能为空");
        }
        entity.setDispatchId(dispatchId);
        return supplyDispatchMapper.update(entity);
    }

    public int delete(String dispatchId) {
        if (dispatchId == null || dispatchId.isBlank()) {
            throw new IllegalArgumentException("dispatch_id 不能为空");
        }
        return supplyDispatchMapper.deleteById(dispatchId);
    }
}
