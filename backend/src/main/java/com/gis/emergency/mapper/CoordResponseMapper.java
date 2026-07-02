package com.gis.emergency.mapper;

import com.gis.emergency.entity.CoordResponse;
import org.apache.ibatis.annotations.*;

import java.util.List;

/**
 * 协同叫应处置表 Mapper（注解式 CRUD）
 * Mapper 由 EmergencyApplication 上的 @MapperScan 统一扫描
 */
public interface CoordResponseMapper {

    @Select("SELECT * FROM tb_coord_response ORDER BY feedback_time DESC")
    List<CoordResponse> list();

    @Select("SELECT * FROM tb_coord_response WHERE response_id = #{responseId}")
    CoordResponse getById(String responseId);

    @Insert("INSERT INTO tb_coord_response (response_id, warn_id, union_area, duty_user, " +
            "contact_phone, call_mode, response_state, dispose_task, joint_cmd, feedback_time) " +
            "VALUES (#{responseId}, #{warnId}, #{unionArea}, #{dutyUser}, " +
            "#{contactPhone}, #{callMode}, #{responseState}, #{disposeTask}, #{jointCmd}, #{feedbackTime})")
    int insert(CoordResponse entity);

    @Update("UPDATE tb_coord_response SET warn_id=#{warnId}, union_area=#{unionArea}, " +
            "duty_user=#{dutyUser}, contact_phone=#{contactPhone}, call_mode=#{callMode}, " +
            "response_state=#{responseState}, dispose_task=#{disposeTask}, joint_cmd=#{jointCmd}, " +
            "feedback_time=#{feedbackTime} WHERE response_id=#{responseId}")
    int update(CoordResponse entity);

    @Delete("DELETE FROM tb_coord_response WHERE response_id = #{responseId}")
    int deleteById(String responseId);
}
