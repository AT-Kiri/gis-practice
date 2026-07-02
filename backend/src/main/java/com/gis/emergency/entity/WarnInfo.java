package com.gis.emergency.entity;

/**
 * 气象灾害预警主表实体（tb_warn_info）
 * DATETIME 字段统一映射为 String，格式 'yyyy-MM-dd HH:mm:ss'
 */
public class WarnInfo {

    private String warnId;            // 预警唯一编号（主键）
    private String districtCode;      // 所属京津冀区域编码
    private Integer disasterType;     // 灾害类型 1暴雨 2大风 3沙尘 4强对流
    private Integer warnLevel;        // 预警等级 1蓝 2黄 3橙 4红
    private String realMeteorData;    // 实时气象数据
    private Float riskScore;          // AHP熵权综合风险分值
    private String releaseTime;       // 预警发布时间
    private String validEndTime;      // 预警失效时间
    private String warnContent;       // 预警研判内容
    private Integer pushStatus;       // 推送状态 0未推送 1已推送
    private String createUser;        // 发布责任人ID

    public String getWarnId() { return warnId; }
    public void setWarnId(String warnId) { this.warnId = warnId; }

    public String getDistrictCode() { return districtCode; }
    public void setDistrictCode(String districtCode) { this.districtCode = districtCode; }

    public Integer getDisasterType() { return disasterType; }
    public void setDisasterType(Integer disasterType) { this.disasterType = disasterType; }

    public Integer getWarnLevel() { return warnLevel; }
    public void setWarnLevel(Integer warnLevel) { this.warnLevel = warnLevel; }

    public String getRealMeteorData() { return realMeteorData; }
    public void setRealMeteorData(String realMeteorData) { this.realMeteorData = realMeteorData; }

    public Float getRiskScore() { return riskScore; }
    public void setRiskScore(Float riskScore) { this.riskScore = riskScore; }

    public String getReleaseTime() { return releaseTime; }
    public void setReleaseTime(String releaseTime) { this.releaseTime = releaseTime; }

    public String getValidEndTime() { return validEndTime; }
    public void setValidEndTime(String validEndTime) { this.validEndTime = validEndTime; }

    public String getWarnContent() { return warnContent; }
    public void setWarnContent(String warnContent) { this.warnContent = warnContent; }

    public Integer getPushStatus() { return pushStatus; }
    public void setPushStatus(Integer pushStatus) { this.pushStatus = pushStatus; }

    public String getCreateUser() { return createUser; }
    public void setCreateUser(String createUser) { this.createUser = createUser; }
}
