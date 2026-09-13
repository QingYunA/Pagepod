# 商业化支付与交易安全规范 (Commercial Payment & Security Standards)

本文档定义了 Pagepod 中商业化付费方案、结账鉴权及支付交易接口的安全与幂等规范。

---

## 1. 前置强制鉴权与意图无缝恢复 (Auth Gate & Payment Resumption)

- **前置鉴权拦截**：未登录用户严禁初始化或唤起真实支付 SDK；
- **意图参数携带**：点击付费方案若未登录，必须通过 URL 编码携带意图跳转：`/login?from=${encodeURIComponent('/pricing?tier=' + tier)}`；
- **登录后无缝弹窗闭环**：登录成功回跳后，定价页必须自动响应式解析 `tier` 参数并自动弹出对应结账弹窗，实现零二次点击的无缝闭环；
- **Suspense 边界保护**：定价与支付客户端组件必须外层包裹 `<Suspense fallback={null}>`，避免 Next.js 静态预渲染 de-opt。

---

## 2. 支付捕获防越权与幂等短路防御 (IDOR & Idempotency Defense)

- **IDOR 所有权核验**：支付捕获端点（如 `/api/payments/*/capture-order`）必须比对本地订单 `order.userId` 与当前 Session `currentUser.id`（管理员除外），不匹配严禁向支付渠道发起 capture，直接返回 `403 Forbidden`；
- **本地订单存在性验证**：若本地无此订单直接返回 `404 Not Found`，绝不盲目向上游发起扣款；
- **短路防重复扣款 (Idempotency Short-Circuit)**：捕获接口必须前置检查本地订单状态，若已为 `completed` 则立即短路返回已有 `captureId`，严禁重复调用上游支付渠道扣款 API。
