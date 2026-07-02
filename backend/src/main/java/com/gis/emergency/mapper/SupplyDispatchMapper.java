package com.gis.emergency.mapper;

import com.gis.emergency.entity.SupplyDispatch;
import org.apache.ibatis.annotations.*;

import java.util.List;

/**
 * 应急物资调度总表 Mapper（注解式 CRUD）
 * Mapper 由 EmergencyApplication 上的 @MapperScan 统一扫描
 */
public interface SupplyDispatchMapper {

    @Select("SELECT * FROM tb_supply_dispatch ORDER BY depart_time DESC")
    List<SupplyDispatch> list();

    @Select("SELECT * FROM tb_supply_dispatch WHERE dispatch_id = #{dispatchId}")
    SupplyDispatch getById(String dispatchId);

    @Insert("INSERT INTO tb_supply_dispatch (dispatch_id, warn_id, storage_addr, supply_type, " +
            "supply_num, demand_area, transport_route, distance, depart_time, plan_arrive, " +
            "transport_team, dispatch_state) " +
            "VALUES (#{dispatchId}, #{warnId}, #{storageAddr}, #{supplyType}, " +
            "#{supplyNum}, #{demandArea}, #{transportRoute}, #{distance}, #{departTime}, #{planArrive}, " +
            "#{transportTeam}, #{dispatchState})")
    int insert(SupplyDispatch entity);

    @Update("UPDATE tb_supply_dispatch SET warn_id=#{warnId}, storage_addr=#{storageAddr}, " +
            "supply_type=#{supplyType}, supply_num=#{supplyNum}, demand_area=#{demandArea}, " +
            "transport_route=#{transportRoute}, distance=#{distance}, depart_time=#{departTime}, " +
            "plan_arrive=#{planArrive}, transport_team=#{transportTeam}, dispatch_state=#{dispatchState} " +
            "WHERE dispatch_id=#{dispatchId}")
    int update(SupplyDispatch entity);

    @Delete("DELETE FROM tb_supply_dispatch WHERE dispatch_id = #{dispatchId}")
    int deleteById(String dispatchId);
}
