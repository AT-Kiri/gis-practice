---
paths: "**/*.{tsx,vue}"
---

# 前端通用规则（从 Claude Code 迁移）

## 样式
- 布局优先用 Flexbox/Grid，不用 `float` 或 `position` 硬算
- 响应式用 CSS `clamp()` 或媒体查询，不用 JS 算宽度
- 颜色和间距用设计 Token 变量，不写死数值

## 性能
- 大列表用虚拟滚动（vue-virtual-scroller 等）
- 避免不必要的 `watch` 重新执行
- 图片加 `loading="lazy"` 和尺寸占位

## 状态
- UI 状态（加载中、空态、错误态）必须全部覆盖
- 表单状态用受控组件 + 校验
