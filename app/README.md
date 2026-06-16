# 🗿 石棺 — 明日方舟解谜群博客网站

> 面向 QQ 群内部的私密解密记录与谜题协作平台。
> React 19 + Express + SQLite + JWT 全栈架构，部署在 2C2G 服务器。

---

## 📋 目录

1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [快速开始（本地开发）](#快速开始本地开发)
4. [项目结构](#项目结构)
5. [路由表](#路由表)
6. [后端架构](#后端架构)
   - [数据库](#数据库)
   - [API 接口](#api-接口)
   - [认证系统](#认证系统)
   - [权限系统](#权限系统)
   - [文件上传](#文件上传)
7. [前端架构](#前端架构)
   - [富文本编辑器](#富文本编辑器)
   - [审核系统](#审核系统)
8. [各模块详解](#各模块详解)
9. [主题与样式](#主题与样式)
10. [常用开发任务](#常用开发任务)
11. [部署指南](#部署指南)
12. [服务器运维](#服务器运维)

---

## 项目概述

**石棺（原名谜域）** 是一个面向明日方舟玩家解密群的内部博客网站。

核心功能：
- 🔐 **JWT 认证 + 注册审核** — 新用户注册后需管理员审核通过才能登录
- 📝 **解密记录** — 每条记录独立页面，支持富文本编辑，含 PV4 全阶段解密归档
- 🧩 **自制谜题** — 创建/发布谜题，提交答案自动判定，支持文件附件
- 📚 **解密Wiki** — 密码学知识库，分类浏览
- 🛡️ **管理员审核** — 隐藏路径 `/lynchpin-admin`，admin 批准/拒绝新注册用户
- ✏️ **权限编辑** — 仅内容创建者和管理员可修改

### 线上地址

```
http://101.133.135.110
管理员: Admin / admin123
审核页面: http://101.133.135.110/lynchpin-admin
```

---

## 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 19 + TypeScript 5.9 | SPA |
| 构建工具 | Vite 7 | 开发代理 `/api` → `3001` |
| CSS | Tailwind CSS 3.4 + shadcn/ui | 深色 Arknights 主题 |
| 路由 | react-router-dom 7 | SPA + 路由守卫 |
| 后端 | Express 4 | RESTful API |
| 数据库 | SQLite (better-sqlite3) | 单文件，零配置 |
| 认证 | JWT + bcryptjs | Token 有效期 7 天 |
| 文件存储 | multer + 本地磁盘 | `server/uploads/` |
| 服务器 | Ubuntu 24.04 | Node 22 LTS (mise) + Nginx + systemd |

---

## 快速开始（本地开发）

### 环境要求

- **Node.js** ≥ 20（推荐 22 LTS）
- **npm** ≥ 10

### 启动步骤

```bash
# 1. 克隆
git clone https://github.com/Sacrophagus-Organization/QQqunwangzhan.git
cd QQqunwangzhan

# 2. 安装后端依赖
cd server
npm install

# 3. 初始化数据库 + 种子数据
npx tsx src/seed.ts

# 4. 启动后端（端口 3001）
npm run dev

# --- 新终端 ---

# 5. 安装前端依赖
cd app
npm install

# 6. 启动前端（端口 5173，自动代理 API 到 3001）
npm run dev

# 7. 浏览器访问
# http://localhost:5173
```

---

## 项目结构

```
QQqunwangzhan/
├── server/                        # Express 后端
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example               # 环境变量模板
│   ├── data/                      # SQLite 数据库（自动创建）
│   ├── uploads/                   # 上传文件存储
│   └── src/
│       ├── index.ts               # 入口，API 路由 + 静态文件服务
│       ├── db.ts                  # 数据库建表 + 种子 Admin
│       ├── seed.ts                # 初始数据注入
│       ├── middleware/
│       │   └── auth.ts            # JWT 验证 + 生成
│       └── routes/
│           ├── auth.ts            # 注册(待审核)/登录/会话
│           ├── records.ts         # 解密记录 CRUD
│           ├── puzzles.ts         # 谜题 CRUD + 解答判定
│           ├── wiki.ts            # Wiki 词条 CRUD
│           ├── files.ts           # 文件上传/下载/删除
│           └── admin.ts           # 用户审核(admin only)
│
├── app/                           # React 前端
│   ├── package.json
│   ├── vite.config.ts             # 含 API 代理配置
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx               # React 入口
│       ├── App.tsx                # 路由定义
│       ├── index.css              # 全局主题 + Arknights 样式
│       ├── api/
│       │   └── client.ts          # fetch 封装 + JWT 自动注入
│       ├── contexts/
│       │   └── AuthContext.tsx     # 登录/注册/登出/JWT 管理
│       ├── components/
│       │   ├── Navbar.tsx          # 导航栏 + 待审核角标
│       │   ├── ProtectedRoute.tsx  # 路由守卫
│       │   ├── DiamondLogo.tsx     # 菱形源石 Logo
│       │   ├── RichTextEditor.tsx  # 富文本编辑器
│       │   └── ui/                 # 53 个 shadcn/ui 组件
│       ├── pages/
│       │   ├── LoginPage.tsx       # 登录/注册
│       │   ├── HomePage.tsx        # 首页仪表盘
│       │   ├── DecryptRecords.tsx  # 解密记录列表
│       │   ├── RecordDetail.tsx    # 解密记录详情 + 编辑
│       │   ├── CustomPuzzles.tsx   # 谜题列表 + 创建/解答/编辑
│       │   ├── DecryptWiki.tsx     # Wiki 词条列表 + 编辑
│       │   └── AdminPage.tsx       # 管理员审核面板
│       └── types/
│           └── index.ts           # TypeScript 类型定义
│
├── deploy.sh                      # 一键部署脚本
├── nginx.conf                     # Nginx 反向代理配置
└── .gitignore
```

---

## 路由表

| 路径 | 页面 | 权限 | 说明 |
|------|------|------|------|
| `/login` | LoginPage | 公开 | 登录/注册 |
| `/` | HomePage | 已登录 | 首页仪表盘 |
| `/records` | DecryptRecords | 已登录 | 记录列表 |
| `/records/:id` | RecordDetail | 已登录 | 记录详情+编辑 |
| `/puzzles` | CustomPuzzles | 已登录 | 谜题列表+创建+解答 |
| `/wiki` | DecryptWiki | 已登录 | Wiki 词条 |
| `/lynchpin-admin` | AdminPage | 已登录+admin | 审核面板（无导航入口） |

---

## 后端架构

### 数据库

SQLite 单文件：`server/data/arkoverseer.db`（首次启动自动创建）

**users 表：**
```
id         TEXT PK     用户 ID
username   TEXT UNIQUE 用户名
password   TEXT        bcrypt 哈希
qq_number  TEXT        QQ 号
role       TEXT        admin / member
status     TEXT        active / pending / rejected
created_at TEXT        注册时间
```

**records / puzzles / wiki_entries 表：**
```
id, title, content(HTML), summary, tags(JSON数组),
author, author_id, created_at, updated_at ...
```
puzzles 额外有 `category, difficulty, hint, solution, status, attempts, solved_by, solved_at`

**attachments 表：**
```
id, entity_type(record/puzzle/wiki), entity_id,
name, size, mime_type, file_path
```

### API 接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | ❌ | 注册（状态=pending） |
| POST | `/api/auth/login` | ❌ | 登录（拦截 pending/rejected） |
| GET | `/api/auth/me` | ✅ | 获取当前用户 |
| GET | `/api/records` | ✅ | 记录列表 |
| POST | `/api/records` | ✅ | 创建记录 |
| GET | `/api/records/:id` | ✅ | 记录详情 |
| PUT | `/api/records/:id` | ✅* | 编辑记录 |
| DELETE | `/api/records/:id` | ✅* | 删除记录 |
| GET | `/api/puzzles` | ✅ | 谜题列表 |
| POST | `/api/puzzles` | ✅ | 创建谜题 |
| PUT | `/api/puzzles/:id` | ✅* | 编辑谜题 |
| POST | `/api/puzzles/:id/solve` | ✅ | 提交答案 |
| GET | `/api/wiki` | ✅ | Wiki 列表 |
| POST | `/api/wiki` | ✅ | 创建词条 |
| PUT | `/api/wiki/:id` | ✅* | 编辑词条 |
| POST | `/api/files` | ✅ | 上传文件 |
| GET | `/api/files/:id` | ❌ | 下载文件 |
| DELETE | `/api/files/:id` | ✅ | 删除文件 |
| GET | `/api/admin/users` | 🔴 | 用户列表 |
| POST | `/api/admin/users/:id/approve` | 🔴 | 通过注册 |
| POST | `/api/admin/users/:id/reject` | 🔴 | 拒绝注册 |
| DELETE | `/api/admin/users/:id` | 🔴 | 删除用户 |

> ✅* = 仅作者本人或 admin 可操作
> 🔴 = 仅 admin 可操作

### 认证系统

```
注册流程:
  POST /api/auth/register
  → bcrypt 加密密码 → 写入数据库 (status=pending)
  → 返回"等待审核"提示
  → Admin 在 /lynchpin-admin 审核通过
  → 用户 status 变为 active

登录流程:
  POST /api/auth/login
  → 查询用户 → 检查 status
  → pending → "等待审核"
  → rejected → "已被拒绝"
  → active → bcrypt 比对密码 → 生成 JWT
  → 返回 { token, user }
```

**JWT 配置：**
- 密钥：`JWT_SECRET` 环境变量（默认 `arkoverseer-secret-change-in-production`）
- 有效期：7 天
- 前端存储：localStorage (`arkoverseer_token`)

### 权限系统

```typescript
// 内容编辑权限
canEdit(user, item) => user.id === item.authorId || user.role === 'admin'

// 管理员审核权限
adminOnly → req.userRole === 'admin'
```

### 文件上传

- 使用 multer 中间件，文件存储在 `server/uploads/`
- 文件大小限制：50MB
- 上传后记录到 attachments 表，关联 entity_type + entity_id
- 下载通过 `/api/files/:id` 流式传输

---

## 前端架构

### 富文本编辑器

**文件：** `app/src/components/RichTextEditor.tsx`

基于 `contentEditable` + `document.execCommand`。

工具栏功能：
| 按钮 | 功能 | 说明 |
|------|------|------|
| **B** | 加粗 | `execCommand('bold')` |
| **U** | 下划线 | `execCommand('underline')` |
| Aa | 字号 12~32px | 包裹 `<span style="font-size:">` |
| 🎨 | 颜色 10 色 | `execCommand('foreColor')` |
| 对齐 | 左/中/右 | `execCommand('justifyLeft/Center/Right')` |
| ▮▮▮ | 马赛克 | 选中文字遮盖，hover 显示 |
| 🖼 | 图片 | 上传后支持右下角拖拽缩放 |

### 审核系统

- 注册后用户状态为 `pending`，无法登录
- Admin 登录后，Navbar 用户菜单显示红色待审核角标
- 点击「管理员控制台」进入 `/lynchpin-admin`（无导航入口，只能直接输入 URL）
- 审核面板列出所有用户，可「通过」「拒绝」「删除」

---

## 各模块详解

### 解密记录

- **列表页** `/records` — 搜索、筛选、排序、摘要卡片
- **详情页** `/records/:id` — 全宽阅读、附件下载、编辑按钮
- 新建后自动跳转详情页

### 自制谜题

- 三栏卡片网格，Tab 切换全部/未解/已解
- 创建：标题、描述、正文(富文本)、分类、难度、提示、答案、附件
- 解答：提交答案 → 大小写不敏感比对
- 详情弹窗内可编辑（作者/admin）

### 解密Wiki

- 左侧分类导航 / 搜索 / 展开折叠
- 分类：密码学基础、经典密码、现代加密、游戏考据、解密工具、符号体系

---

## 主题与样式

### CSS 变量（`index.css`）

```css
--background: 228 30% 5%;     /* 深蓝黑 */
--primary: 190 100% 50%;      /* 青色 #00d4ff */
--accent: 261 73% 60%;        /* 紫色 #a855f7 */
```

### 自定义类

| 类名 | 效果 |
|------|------|
| `glass-card` | 玻璃拟态卡片 |
| `glow-cyan` | 青色辉光阴影 |
| `border-glow` | 发光边框 |
| `hex-grid-bg` | 六边形网格背景 |
| `spoiler-text` | 马赛克文字 (hover 显示) |
| `mono-text` | JetBrains Mono 等宽字体 |

---

## 常用开发任务

### 添加新页面

1. 创建 `app/src/pages/NewPage.tsx`
2. 在 `app/src/App.tsx` 添加路由（参考现有路由结构）
3. 如需导航入口，在 `Navbar.tsx` 的 `navItems` 添加

### 添加新 API

1. 在 `server/src/routes/` 创建路由文件
2. 在 `server/src/index.ts` 注册 `app.use('/api/xxx', xxxRoutes)`
3. 前端在 `app/src/api/client.ts` 已有通用 `apiGet/apiPost/apiPut/apiDelete`

### 添加 shadcn 组件

```bash
cd app && npx shadcn@latest add <component-name>
```

### 修改主题色

编辑 `app/src/index.css` 中的 CSS 变量，全局生效。

---

## 部署指南

### 生产服务器部署

服务器已配置好一键脚本：

```bash
# 拉取最新代码
cd /home/admin/arkoverseer
git pull

# 构建并重启
bash redeploy.sh
```

### 初次部署到新服务器

```bash
# 1. 克隆
git clone https://github.com/Sacrophagus-Organization/QQqunwangzhan.git /opt/arkoverseer
cd /opt/arkoverseer

# 2. 安装 Node 22 LTS (推荐 mise)
curl https://mise.run | sh
mise install node@22.22.3

# 3. 部署
bash deploy.sh

# 4. 配置 Nginx
sudo cp nginx.conf /etc/nginx/sites-available/arkoverseer
sudo ln -s /etc/nginx/sites-available/arkoverseer /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 服务器运维

### 服务管理

```bash
# 查看状态
sudo systemctl status arkoverseer

# 重启
sudo systemctl restart arkoverseer

# 查看日志
sudo journalctl -u arkoverseer -f

# 重载 Nginx
sudo systemctl reload nginx
```

### 数据库备份

```bash
cp /home/admin/arkoverseer/server/data/arkoverseer.db ~/backups/arkoverseer-$(date +%Y%m%d).db
```

### 更新部署

```bash
cd /home/admin/arkoverseer
git pull
bash redeploy.sh
```

### 修改 JWT 密钥

```bash
sudo nano /etc/systemd/system/arkoverseer.service
# 修改 Environment=JWT_SECRET=xxx
sudo systemctl daemon-reload
sudo systemctl restart arkoverseer
```

### 环境变量

在 `/etc/systemd/system/arkoverseer.service` 中配置：
```
Environment=PORT=3001
Environment=JWT_SECRET=your-random-secret
```
