-- ============================================================
-- 京津冀城市综合防灾应急管理系统 - 数据库 Schema
-- 自动建表脚本（启动时执行，幂等：IF NOT EXISTS）
-- 严格按用户给定字段类型，引擎 InnoDB，字符集 utf8mb4
-- ============================================================

-- 表 1：气象灾害预警主表
CREATE TABLE IF NOT EXISTS tb_warn_info (
  warn_id          VARCHAR(30)   PRIMARY KEY COMMENT '预警唯一编号',
  district_code    VARCHAR(20)   COMMENT '所属京津冀区域编码（京/津/冀区县）',
  disaster_type    TINYINT       COMMENT '灾害类型：1暴雨 2大风 3沙尘 4强对流',
  warn_level       TINYINT       COMMENT '预警等级：1蓝 2黄 3橙 4红',
  real_meteor_data TEXT          COMMENT '实时气象数据（雨量、风速、温压）',
  risk_score       FLOAT         COMMENT 'AHP熵权法综合风险分值',
  release_time     DATETIME      COMMENT '预警发布时间',
  valid_end_time   DATETIME      COMMENT '预警失效时间',
  warn_content     VARCHAR(1000) COMMENT '预警研判内容、风险范围',
  push_status      TINYINT       COMMENT '叫应推送状态：0未推送 1已推送',
  create_user      VARCHAR(30)   COMMENT '发布责任人ID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='气象灾害预警主表';

-- 表 2：协同叫应处置表
CREATE TABLE IF NOT EXISTS tb_coord_response (
  response_id     VARCHAR(30)  PRIMARY KEY COMMENT '处置记录编号',
  warn_id         VARCHAR(30)  COMMENT '外键，关联预警表',
  union_area      VARCHAR(100) COMMENT '联动区域（通武廊/津冀等）',
  duty_user       VARCHAR(50)  COMMENT '基层责任人、值班人员',
  contact_phone   VARCHAR(20)  COMMENT '叫应联系电话',
  call_mode       TINYINT     COMMENT '叫应方式：1短信 2电话 3平台消息',
  response_state  TINYINT     COMMENT '应答状态：0未接通 1已应答 2已处置',
  dispose_task    TEXT         COMMENT '协同处置任务、管控措施',
  joint_cmd       TEXT         COMMENT '跨区域联动指令内容',
  feedback_time   DATETIME     COMMENT '责任人反馈时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='协同叫应处置表';

-- 表 3：应急物资调度总表
CREATE TABLE IF NOT EXISTS tb_supply_dispatch (
  dispatch_id     VARCHAR(30)  PRIMARY KEY COMMENT '调度单号',
  warn_id         VARCHAR(30)  COMMENT '外键，关联预警表',
  storage_addr    VARCHAR(200) COMMENT '物资储备库位置（含经纬度）',
  supply_type     VARCHAR(100) COMMENT '物资类型：排水/救生/医疗等',
  supply_num      INT          COMMENT '调拨物资数量',
  demand_area     VARCHAR(100) COMMENT '物资需求受灾区域',
  transport_route TEXT         COMMENT '最优配送路径（算法输出）',
  distance        FLOAT        COMMENT '运输里程',
  depart_time     DATETIME     COMMENT '出库时间',
  plan_arrive     DATETIME     COMMENT '预计送达时间',
  transport_team  VARCHAR(100) COMMENT '运输救援队伍',
  dispatch_state  TINYINT      COMMENT '调度状态：0待出库 1运输中 2已送达'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='应急物资调度总表';
