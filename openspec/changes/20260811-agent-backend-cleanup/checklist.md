# Checklist: Agent 后端低风险清理

## 功能验收

### Agent 聊天 — 地点搜索
- [ ] 输入"朝阳区"，返回京津冀匹配结果
- [ ] 输入"南湖公园"，返回长春匹配结果（验证 changchun 数据源查询）
- [ ] 搜索结果属性字段完整（SMID、NAME 等）

### Agent 聊天 — 空间查询
- [ ] 在地图上点击一个点，500m 缓冲区内要素正确返回
- [ ] 返回要素的 properties 字段完整

### Agent 聊天 — 定位
- [ ] 输入地点名，地图正确定位飞行
- [ ] 返回的 properties 字段完整

### Agent 聊天 — 救援调度
- [ ] Pareto 资源优选结果正确（支援点排序合理）
- [ ] composite_score 和入选理由正常显示

## 规范检查

- [ ] `_parse_feature_properties` 有 docstring
- [ ] `post_feature_results` 合并后有 docstring，标注 datasource 参数
- [ ] 无未使用的 import 残留
- [ ] 无 `_composite_score` 残留引用
- [ ] 无 `post_changchun_feature_results` 残留引用

## 行为等价性检查

- [ ] `_parse_feature_properties(f)` 返回值与原内联代码完全一致
- [ ] `post_feature_results(body)` 默认查 jingjin，URL 不变
- [ ] `post_feature_results(body, datasource="changchun")` URL 与原 `post_changchun_feature_results` 完全一致
- [ ] `pareto_resource_optimize` 返回值不变（composite_score 计算逻辑未改）
