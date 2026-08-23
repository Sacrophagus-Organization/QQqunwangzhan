# Mail Module

当前实现是站内企业邮箱系统，不依赖外部邮箱 API，不需要开放 25/465/587/993 等邮件端口。

用户申请邮箱后，邮件只在本站已开通邮箱的用户之间投递。发送给未开通的地址会被拒绝，避免出现发送成功但无人收到的情况。

## Provider

`providers/MailProvider.ts` 保留统一接口，便于未来接入真实企业邮箱服务商。

当前运行时固定使用 `LocalMailProvider`：

- 创建站内邮箱账号。
- 发送邮件时写入发件人发件箱。
- 为每个站内收件人创建收件箱副本。
- 支持附件上传与下载。

`EnterpriseMailProvider` 仅作为未来扩展模板保留，默认不会被启用。

## Environment

站内邮箱模式只需要：

```bash
MAIL_DOMAIN=example.com
MAIL_PROVIDER=local
```

开发时仍需网站本身的环境变量：

```bash
JWT_SECRET=dev-secret-please-change
ADMIN_PASSWORD=admin123
```

## API

All endpoints require site login.

```text
GET    /api/mail/account
POST   /api/mail/account
GET    /api/mail/folders
GET    /api/mail/messages?folder=inbox&page=1&pageSize=20&q=keyword
GET    /api/mail/messages/:id
POST   /api/mail/messages
POST   /api/mail/drafts
PUT    /api/mail/messages/:id/read
PUT    /api/mail/messages/:id/star
PUT    /api/mail/messages/:id/move
DELETE /api/mail/messages/:id
GET    /api/mail/messages/:messageId/attachments/:attachmentId/download
```

`POST /api/mail/messages` and `POST /api/mail/drafts` accept `multipart/form-data`:

- `to`, `cc`, `bcc`: comma or semicolon separated local mailbox addresses.
- `subject`
- `bodyHtml`
- `bodyText` optional
- `attachments` repeated file fields.

## Ports

站内邮箱不需要邮件协议端口。开发和生产只需要网站端口：

```text
dev frontend: 5173
dev backend: 3001
production: 80 / 443
```

## 邮件正文与图片预览

- 写信、群发通知、Bot 自动回复的正文统一使用 Markdown。
- 新正文以 Markdown 原文存入 `body_html`，`body_text` 由服务端 `markdownToPlainText` 生成，用于列表摘要和 Bot 关键词匹配。
- 旧版富文本 HTML 邮件仍可正常显示。

### 非编辑页图片交互

正文图片在收件箱、邮件监控等非编辑页面中支持：

- 鼠标悬停图片时，右下角显示下载按钮。
- 点击图片打开全屏预览覆盖层，背景变暗。
- 预览支持：
  - 鼠标滚轮以指针位置为中心缩放
  - 拖拽平移
  - 左右旋转 90°
  - 放大、缩小、重置
  - 右上角按钮、点击背景或 `Esc` 关闭
  - 右下角下载图片
