## Decisions

### 1. 前端架构

```
SpatialAnalysis.vue
├── 模式切换（缓冲区 / 叠置分析）
├── 缓冲区模式
│   ├── 绘制工具栏（点/线/面 + 清除）
│   ├── 半径输入（Slider + 数字输入）
│   └── 执行按钮
├── 叠置模式
│   ├── 源数据集选择
│   ├── 操作数据集选择
│   ├── 操作类型选择（UNION/INTERSECT/ERASE/CLIP）
│   └── 执行按钮
└── 地图结果展示（GeoJSON source + layer）
```

### 2. iServer API 对照

| 功能 | iServer 端点 | SDK 类 |
|---|---|---|
| 缓冲区分析 | `POST /geometry/buffer` | `GeometryBufferAnalystParameters` |
| 叠置分析 | `POST /datasets/overlay` | `DatasetOverlayAnalystParameters` |

### 3. 缓冲区参数
- `sourceGeometry`: GeoJSON Feature
- `bufferSetting.endType`: ROUND
- `bufferSetting.leftDistance/rightDistance`: 用户输入的米数
- `radiusUnit`: METER

### 4. 叠置操作类型
- UNION（并集）、INTERSECT（交集）、ERASE（擦除）、CLIP（裁剪）
