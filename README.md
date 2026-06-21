# 🗿 石棺 (Sarcophagus) — 明日方舟解谜群博客网站

> 面向 QQ 群内部的私密解密记录与谜题协作平台  
> React 19 + Express + SQLite + JWT 全栈架构  
> 正式上线：**[sarcophagus.org.cn](https://sarcophagus.org.cn)**

---

## 功能

- 🔐 **JWT 认证 + 注册审核** — 新用户注册后需管理员审核通过
- 📝 **解密记录** — 富文本编辑，马赛克/图片/链接插入，附件上传，含 PV4 全阶段解密归档
- 🧩 **自制谜题** — 创建/发布谜题，提交答案自动判定，威胁等级+印章状态展示
- 📚 **解密Wiki** — 密码学知识库，分类浏览，词条折叠展开
- 💬 **留言板 + 评论区** — 富文本编辑，点赞，嵌套回复，评论折叠
- 👍 **点赞系统** — 记录/谜题/Wiki/留言/评论全实体通用 LikeButton
- 🛡️ **管理员面板** — 审核用户、管理内容（`/lynchpin-admin`）
- 🖥️ **石棺彩蛋** — CRT 终端解密页面，访问代码验证，自运行程序效果
- 🎵 **BGM 系统** — 赛博朋克风背景音乐，路由切换，循环+间隔播放
- 🖼️ **用户头像** — 上传+拖拽定位+缩放裁剪，CSS transform + Canvas 两步渲染

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| 后端 | Express 4 + tsx |
| 数据库 | SQLite (better-sqlite3) |
| 认证 | JWT + bcryptjs |
| 部署 | Ubuntu 24.04 + Nginx + Let's Encrypt + systemd |

---

## 快速开始

```bash
git clone https://github.com/Sacrophagus-Organization/QQqunwangzhan.git
cd QQqunwangzhan

# 后端
cd server && npm install && npx tsx src/seed.ts && npm run dev

# 前端（新终端）
cd app && npm install && npm run dev
# → http://localhost:5173
```

---

## 部署

### 生产上线（首次）

```bash
# 需先配置 DNS 解析到服务器 IP
sudo bash go_live.sh     # 自动完成：Nginx 配置 → SSL 证书 → 防火墙 → JWT 更新
```

### 日常更新

```bash
cd /home/admin/arkoverseer
git pull
bash redeploy.sh          # 构建前端 + 重启服务
```

### 验证部署

```bash
bash verify.sh
```

---

## 项目结构

```
├── server/                # Express 后端
│   ├── src/
│   │   ├── index.ts       # 入口
│   │   ├── db.ts          # 数据库 + Admin 种子
│   │   ├── seed.ts        # 初始数据
│   │   ├── middleware/
│   │   │   └── auth.ts    # JWT 认证
│   │   └── routes/
│   │       ├── auth.ts    # 注册/登录/头像上传
│   │       ├── records.ts # 解密记录 CRUD
│   │       ├── puzzles.ts # 谜题 CRUD
│   │       ├── wiki.ts    # Wiki CRUD
│   │       ├── files.ts   # 文件上传/下载
│   │       ├── messages.ts # 留言板 CRUD
│   │       ├── comments.ts # 评论 CRUD
│   │       ├── sarcophagus.ts # 石棺彩蛋 API
│   │       └── admin.ts   # 用户审核
│   └── uploads/avatars/   # 用户头像存储
├── app/                   # React 前端
│   ├── public/
│   │   └── assets/audio/  # BGM 音频文件
│   └── src/
│       ├── components/    # 组件（Navbar, RichTextEditor, shadcn/ui 等）
│       │   ├── AvatarDisplay.tsx      # 通用头像组件
│       │   ├── AvatarUpload.tsx       # 头像上传+拖动缩放裁剪
│       │   ├── BackgroundMusic.tsx    # 全局 BGM 管理
│       │   ├── NotificationTicker.tsx # 顶部站点信息滚动条
│       │   ├── CountingNumber.tsx     # 数字计数动画
│       │   ├── Skeleton.tsx           # 骨架屏加载组件
│       │   ├── LikeButton.tsx         # 通用点赞按钮
│       │   ├── RoleApply.tsx          # 角色申请组件
│       │   ├── TerminalAutopilot.tsx  # 终端自运行程序
│       │   └── CommentSection.tsx     # 评论区（含折叠）
│       ├── pages/         # 页面
│       │   ├── HomePage.tsx / LoginPage.tsx
│       │   ├── MessageBoard.tsx     # 留言板
│       │   ├── SarcophagusTerminal.tsx # 石棺彩蛋终端
│       │   └── AdminPage.tsx / Records / Puzzles / Wiki
│       ├── contexts/      # AuthContext
│       └── api/           # API 客户端
├── go_live.sh             # 生产上线脚本（Nginx + SSL + 防火墙）
├── redeploy.sh            # 日常更新脚本
├── full_deploy.sh         # 初次部署脚本
├── deploy.sh              # 一键部署
├── verify.sh              # 验证脚本
├── nginx.conf             # Nginx HTTPS 生产配置
└── .gitignore
```

---

## 更新日志

### 2026-06-22 — 前端视觉全面升级 + 头像裁剪重写

- 🎨 **6 项视觉美化**：全宽沉浸式 Hero（状态面板+计数动画+进度条）/ 谜题威胁等级条+印章状态 / 解密记录档案色带+扫描线 / 统一骨架屏 / 页面入场淡入动画 / 全局通知滚动条
- ♿ **A11y 增强**：`prefers-reduced-motion` 媒体查询，动效敏感用户自动停用全部动画
- 🎯 **10 个新动画 Keyframe** 统一注册到 Tailwind config（fade-in-up / count-up / archive-scan / threat-pulse / seal-stamp 等）
- 🎨 **差异化页面背景**：首页 hex-grid / 记录 archive-bg 扫描线 / 谜题 grid-dot 坐标纸 / Wiki book-spine 书脊 / 留言板 warm-glow 径向光晕
- 🖼️ **头像裁剪完全重写**：修复 zoom + 拖动后坐标映射错误，采用 CSS `transform:scale` + 两步 Canvas 渲染方案
- 🖊️ **马赛克功能修复**：CSS 简化为纯涂黑无溢出 / 零宽空格光标锚点 / 点击固定显示 / 重复按下取消马赛克 / 保留富文本格式
- 👍 **点赞系统**：LikeButton 通用组件，支持记录/谜题/Wiki/留言/评论全实体

### 2026-06-21 #2 — BGM · 头像 · 评论折叠 · 终端自运行

- 🎵 **全局 BGM 系统**：两套背景音乐（`sarcophagus-bgm.mp3` / `caidan.mp3`），路由感知自动切换，5 秒间隔循环，3 秒首次播放延迟
- 🔊 **每小时语音播报**：首页进入时用广播风电子女声播报 "Welcome back, Doctor"
- 🖥️ **终端自运行程序**：不定时输出明日方舟世界观系统日志，滴声+淡入动画
- 💬 **评论折叠**：根评论预览3条+展开；嵌套回复自动折叠，逐层展开
- 🖼️ **用户自定义头像**：上传 → 拖拽定位 → 缩放裁剪 → Canvas 输出 200×200，全站同步
- 🐛 **Bug修复**：成功弹窗重复弹出（animationEnd 事件冒泡）

### 2026-06-21 — CRT 终端复古未来主义视觉升级

- 🎨 **7 项视觉升级**：球面暗角 / 数据雨背景 / HUD 状态面板 / 色散标题 / 扫描边框 / 闪烁光标 / 三层粒子系统
- 🚀 CRT 开机动画时序优化：白点 350ms 彻底消失，总时长从 2400ms 缩短至 1700ms
- 🖥️ 新增左侧 HUD 面板（xl 屏可见）：系统指标（CPU/MEM/NET/ENC）+ 加密通道状态
- 📦 `/sarcophagus` 页面完整重构：Multi-layer 深度背景 + Matrix 风格数据雨 + SVG 扫描边框

### 2026-06-20 — 石棺彩蛋终端上线

- ✅ 新增 `/sarcophagus` 石棺远程访问协议终端页面（CRT 开机动画）
- ✅ Admin 管理面板 `/sarcophagus/admin`：访问代码增删改 + 文件上传
- ✅ 访问代码验证逻辑：AUTH_OK → 下载模因污染文件 / AUTH_FAIL → 错误提示
- ✅ CRT 老电视效果：扫描线 + 雪花噪点 + 内容渐清晰

### 2026-06-17 — 正式上线

- ✅ 启用 HTTPS（Let's Encrypt 免费证书，自动续期）
- ✅ 域名绑定 `sarcophagus.org.cn`
- ✅ 修复 ESM 兼容性 Bug（`require('fs')` → `import { unlinkSync }`）
- ✅ 修复附件下载中文文件名乱码（使用 `res.attachment()` RFC 5987 编码）
- ✅ 安全加固：HSTS / TLS 1.2+ / 防火墙（仅开放 22/80/443）
- ✅ 新增 `go_live.sh` 一键上线脚本

---

## 安全

- 所有 API 需 JWT 认证（除登录/注册/文件下载）
- 内容编辑仅限作者本人 + admin
- `lynchpin` SSH 密钥、`.env`、`*.db` 已加入 `.gitignore`
- 后端端口 3001 不对外开放，仅 Nginx 反向代理
