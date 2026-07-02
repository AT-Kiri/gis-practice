package com.gis.emergency.mapper;

import com.gis.emergency.entity.WarnInfo;
import org.apache.ibatis.annotations.*;

import java.util.List;

/**
 * 气象灾害预警主表 Mapper（注解式 CRUD）
 * Mapper 由 EmergencyApplication 上的 @MapperScan 统一扫描
 */
public interface WarnInfoMapper {

    @Select("SELECT * FROM tb_warn_info ORDER BY release_time DESC")
    List<WarnInfo> list();

    @Select("SELECT * FROM tb_warn_info WHERE warn_id = #{warnId}")
    WarnInfo getById(String warnId);

    @Insert("INSERT INTO tb_warn_info (warn_id, district_code, disaster_type, warn_level, " +
            "real_meteor_data, risk_score, release_time, valid_end_time, warn_content, push_status, create_user) " +
            "VALUES (#{warnId}, #{districtCode}, #{disasterType}, #{warnLevel}, " +
            "#{realMeteorData}, #{riskScore}, #{releaseTime}, #{validEndTime}, #{warnContent}, #{pushStatus}, #{createUser})")
    int insert(WarnInfo entity);

    @Update("UPDATE tb_warn_info SET district_code=#{districtCode}, disaster_type=#{disasterType}, " +
            "warn_level=#{warnLevel}, real_meteor_data=#{realMeteorData}, risk_score=#{riskScore}, " +
            "release_time=#{releaseTime}, valid_end_time=#{validEndTime}, warn_content=#{warnContent}, " +
            "push_status=#{pushStatus}, create_user=#{createUser} WHERE warn_id=#{warnId}")
    int update(WarnInfo entity);

    @Delete("DELETE FROM tb_warn_info WHERE warn_id = #{warnId}")
    int deleteById(String warnId);
}
