package com.gis.emergency.entity;

/**
 * 协同叫应处置表实体（tb_coord_response）
 * DATETIME 字段统一映射为 String，格式 'yyyy-MM-dd HH:mm:ss'
 */
public class CoordResponse {

    private String responseId;        // 处置记录编号（主键）
    private String warnId;            // 外键，关联预警表
    private String unionArea;         // 联动区域
    private String dutyUser;          // 基层责任人
    private String contactPhone;      // 叫应联系电话
    private Integer callMode;         // 叫应方式 1短信 2电话 3平台消息
    private Integer responseState;    // 应答状态 0未接通 1已应答 2已处置
    private String disposeTask;       // 协同处置任务
    private String jointCmd;          // 跨区域联动指令
    private String feedbackTime;      // 反馈时间

    public String getResponseId() { return responseId; }
    public void setResponseId(String responseId) { this.responseId = responseId; }

    public String getWarnId() { return warnId; }
    public void setWarnId(String warnId) { this.warnId = warnId; }

    public String getUnionArea() { return unionArea; }
    public void setUnionArea(String unionArea) { this.unionArea = unionArea; }

    public String getDutyUser() { return dutyUser; }
    public void setDutyUser(String dutyUser) { this.dutyUser = dutyUser; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public Integer getCallMode() { return callMode; }
    public void setCallMode(Integer callMode) { this.callMode = callMode; }

    public Integer getResponseState() { return responseState; }
    public void setResponseState(Integer responseState) { this.responseState = responseState; }

    public String getDisposeTask() { return disposeTask; }
    public void setDisposeTask(String disposeTask) { this.disposeTask = disposeTask; }

    public String getJointCmd() { return jointCmd; }
    public void setJointCmd(String jointCmd) { this.jointCmd = jointCmd; }

    public String getFeedbackTime() { return feedbackTime; }
    public void setFeedbackTime(String feedbackTime) { this.feedbackTime = feedbackTime; }
}
