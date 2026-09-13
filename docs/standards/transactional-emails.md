# 认证与系统事务邮件规范 (Auth & Transactional Email Standards)

本文档定义了 Pagepod 中所有系统事务邮件、认证确认信及双语模板的设计与安全规范。

---

## 1. 双语国际化排版规范 (English First, Chinese Second)

- **排版结构**：面向国际化与出海标准，所有系统事务邮件、模版与双语通知一律遵循“**英文为主（首行/主标题）、中文为辅（次行/辅助说明）**”，如：
  ```
  Confirm your email address / 验证您的邮箱账号
  ```
- **操作按钮**：操作按钮文案统一采用双语格式：
  ```
  Confirm & Sign In / 验证邮箱并登录
  ```

---

## 2. 官方品牌形象与邮件客户端兼容 (Branded Email Assets)

- **CDN 官方 Logo**：邮件头部必须引入生产环境全球 CDN 托管的官方 Logo（`https://www.pagepod.dev/logo.png`），以 30x30 Retina 视网膜规格配合 1px 精细微边框与圆角呈现；
- **严禁使用 Base64 Data URI**：Base64 会被主流邮件服务商（Gmail、Outlook、QQ 邮箱、网易 163）判定为垃圾邮件高危特征并直接拒信或进垃圾箱；
- **回退通道**：操作按钮下方必须保留纯文本链接回退通道，确保极端文本模式或无法点击外部链接的环境下，用户仍可复制 URL 完成验证。

---

## 3. 自适应验证码与剪贴板容错 (Adaptive Verification Token)

- **严禁文案硬编码位数**：前端提示、占位符与邮件文案中严禁硬编码“6 位数字验证码”或“000000”，统一采用自适应的“数字验证码 / Verification Code”；
- **全链路空格清洗**：前端 OTP 输入框与后端 Action 必须在处理前通过 `.replace(/[\s-]+/g, "")` 自动清洗剪贴板带入的视觉空格与连字符；
- **输入框宽度自适应**：前端输入框上限放宽至 10 位，完美兼容 Supabase 后端配置的 6~10 位 OTP。
