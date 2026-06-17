# 🗿 石棺 (Sarcophagus) — 明日方舟解谜群博客网站

> 面向 QQ 群内部的私密解密记录与谜题协作平台  
> React 19 + Express + SQLite + JWT 全栈架构  
> 正式上线：**[sarcophagus.org.cn](https://sarcophagus.org.cn)**

---

## 功能

- 🔐 **JWT 认证 + 注册审核** — 新用户注册后需管理员审核通过
- 📝 **解密记录** — 富文本编辑，附件上传，含 PV4 全阶段解密归档
- 🧩 **自制谜题** — 创建/发布谜题，提交答案自动判定
- 📚 **解密Wiki** — 密码学知识库，分类浏览
- 🛡️ **管理员面板** — 审核用户、管理内容（`/lynchpin-admin`）

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
│   │       ├── auth.ts    # 注册/登录
│   │       ├── records.ts # 解密记录 CRUD
│   │       ├── puzzles.ts # 谜题 CRUD
│   │       ├── wiki.ts    # Wiki CRUD
│   │       ├── files.ts   # 文件上传/下载
│   │       └── admin.ts   # 用户审核
│   └── .env.example
├── app/                   # React 前端
│   └── src/
│       ├── components/    # 组件（Navbar, RichTextEditor, shadcn/ui）
│       ├── pages/         # 页面（Records, Puzzles, Wiki, Admin）
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
