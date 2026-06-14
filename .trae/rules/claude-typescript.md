---
paths: "**/*.{ts,tsx}"
---

# TypeScript / JavaScript 规则（从 Claude Code 迁移）

## 类型
- NEVER 使用 `any` — 用 `unknown` 配合类型收窄
- 优先用 `interface` 定义对象类型，`type` 用于联合/交叉类型
- 函数参数和返回值必须有类型标注

## 导入导出
- 使用 named export，不用 default export
- 导入路径优先用别名（`@/`），不用相对路径 `../../`

## 异步
- 全部使用 `async/await`，不用裸 `.then()`
- Promise 并发用 `Promise.all()`，串行用 `for...of`

## 风格
- 2 空格缩进
- 行尾不加分号
- 字符串优先用单引号，模板字符串用反引号
