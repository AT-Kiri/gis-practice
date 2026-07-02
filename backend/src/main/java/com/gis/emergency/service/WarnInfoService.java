package com.gis.emergency.service;

import com.gis.emergency.entity.WarnInfo;
import com.gis.emergency.mapper.WarnInfoMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 气象灾害预警主表 Service
 * 承担参数校验 + 业务封装；事务由 MyBatis 默认自动提交（单表 CRUD 无需显式事务）
 */
@Service
public class WarnInfoService {

    @Autowired
    private WarnInfoMapper warnInfoMapper;

    public List<WarnInfo> list() {
        return warnInfoMapper.list();
    }

    public WarnInfo getById(String warnId) {
        return warnInfoMapper.getById(warnId);
    }

    public int create(WarnInfo entity) {
        if (entity.getWarnId() == null || entity.getWarnId().isBlank()) {
            throw new IllegalArgumentException("warn_id 不能为空");
        }
        return warnInfoMapper.insert(entity);
    }

    public int update(String warnId, WarnInfo entity) {
        if (warnId == null || warnId.isBlank()) {
            throw new IllegalArgumentException("warn_id 不能为空");
        }
        entity.setWarnId(warnId);
        return warnInfoMapper.update(entity);
    }

    public int delete(String warnId) {
        if (warnId == null || warnId.isBlank()) {
            throw new IllegalArgumentException("warn_id 不能为空");
        }
        return warnInfoMapper.deleteById(warnId);
    }
}
