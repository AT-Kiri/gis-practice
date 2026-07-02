package com.gis.emergency.entity;

/**
 * 应急物资调度总表实体（tb_supply_dispatch）
 * DATETIME 字段统一映射为 String，格式 'yyyy-MM-dd HH:mm:ss'
 */
public class SupplyDispatch {

    private String dispatchId;        // 调度单号（主键）
    private String warnId;            // 外键，关联预警表
    private String storageAddr;       // 物资储备库位置
    private String supplyType;        // 物资类型
    private Integer supplyNum;        // 调拨数量
    private String demandArea;        // 需求受灾区域
    private String transportRoute;    // 最优配送路径
    private Float distance;           // 运输里程
    private String departTime;        // 出库时间
    private String planArrive;        // 预计送达时间
    private String transportTeam;     // 运输救援队伍
    private Integer dispatchState;    // 调度状态 0待出库 1运输中 2已送达

    public String getDispatchId() { return dispatchId; }
    public void setDispatchId(String dispatchId) { this.dispatchId = dispatchId; }

    public String getWarnId() { return warnId; }
    public void setWarnId(String warnId) { this.warnId = warnId; }

    public String getStorageAddr() { return storageAddr; }
    public void setStorageAddr(String storageAddr) { this.storageAddr = storageAddr; }

    public String getSupplyType() { return supplyType; }
    public void setSupplyType(String supplyType) { this.supplyType = supplyType; }

    public Integer getSupplyNum() { return supplyNum; }
    public void setSupplyNum(Integer supplyNum) { this.supplyNum = supplyNum; }

    public String getDemandArea() { return demandArea; }
    public void setDemandArea(String demandArea) { this.demandArea = demandArea; }

    public String getTransportRoute() { return transportRoute; }
    public void setTransportRoute(String transportRoute) { this.transportRoute = transportRoute; }

    public Float getDistance() { return distance; }
    public void setDistance(Float distance) { this.distance = distance; }

    public String getDepartTime() { return departTime; }
    public void setDepartTime(String departTime) { this.departTime = departTime; }

    public String getPlanArrive() { return planArrive; }
    public void setPlanArrive(String planArrive) { this.planArrive = planArrive; }

    public String getTransportTeam() { return transportTeam; }
    public void setTransportTeam(String transportTeam) { this.transportTeam = transportTeam; }

    public Integer getDispatchState() { return dispatchState; }
    public void setDispatchState(Integer dispatchState) { this.dispatchState = dispatchState; }
}
