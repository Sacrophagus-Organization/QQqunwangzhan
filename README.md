# 石棺 (Sarcophagus) — 明日方舟解谜群博客网站

> 面向 QQ 群内部的私密解密记录与谜题协作平台  
> React 19 + Express + SQLite + JWT 全栈架构  
> 正式上线：**[sarcophagus.org.cn](https://sarcophagus.org.cn)**

---

## 功能

- **JWT 认证 + 注册审核** — 新用户注册后需管理员审核通过
- **解密记录** — 富文本编辑，马赛克/图片/链接/GIF插入，附件上传，含 PV4 全阶段解密归档
- **自制谜题** — 创建/发布谜题，提交答案自动判定，威胁等级+印章状态展示
- **解密Wiki** — 密码学知识库，分类浏览，词条折叠展开
- **留言板 + 评论区** — 富文本编辑，点赞，嵌套回复，评论折叠
- **点赞系统** — 记录/谜题/Wiki/留言/评论全实体通用 LikeButton
- **管理员面板** — 审核用户、管理内容（`/lynchpin-admin`）
- **石棺彩蛋** — CRT 终端解密页面，访问代码验证，自运行程序效果
- **系统崩溃特效** — WinXP 风格全屏崩溃转场动画，Glitch + 代码瀑布 + CRT 关机（`/test`，admin 专属）
- **页面访问控制** — 数据库驱动三级系统（public/member/admin），前后端统一控制，访客 Navbar 自适应
- **BGM 系统** — 赛博朋克风背景音乐，路由切换，循环+间隔播放，崩溃特效联动静音
- **用户头像** — 上传+拖拽定位+缩放裁剪，GIF 自动跳过裁剪保留动画

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
# -> http://localhost:5173
```

---

## 部署

### 生产上线（首次）

```bash
# 需先配置 DNS 解析到服务器 IP
sudo bash go_live.sh     # 自动完成：Nginx 配置 -> SSL 证书 -> 防火墙 -> JWT 更新
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
│   │   │   ├── auth.ts      # JWT 认证
│   │   │   └── pageAccess.ts # 页面访问控制中间件
│   │   ├── lib/
│   │   │   └── rateLimiter.ts # 频率限制（含公开API限速器）
│   │   └── routes/
│   │       ├── auth.ts      # 注册/登录/头像上传
│   │       ├── records.ts   # 解密记录 CRUD
│   │       ├── puzzles.ts   # 谜题 CRUD
│   │       ├── wiki.ts      # Wiki CRUD
│   │       ├── files.ts     # 文件上传/下载
│   │       ├── messages.ts  # 留言板 CRUD
│   │       ├── comments.ts  # 评论 CRUD
│   │       ├── likes.ts     # 点赞 API
│   │       ├── sarcophagus.ts # 石棺彩蛋 API
│   │       ├── site.ts      # 公开配置接口
│   │       └── admin.ts     # 用户审核 + 页面访问控制
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
│       │   ├── SystemCrashOverlay.tsx  # 系统崩溃转场动画
│       │   ├── CommentSection.tsx     # 评论区（含折叠）
│       │   ├── PageAccessRoute.tsx    # 页面访问控制路由守卫
│       │   ├── ForbiddenPage.tsx      # 403 禁止访问页
│       │   ├── MaintenancePage.tsx    # 页面维护页
│       │   ├── AdminRoute.tsx         # 管理员路由守卫
│       │   ├── PageAccessRoute.tsx    # 页面访问控制路由守卫
│       │   ├── MaintenancePage.tsx    # 页面维护提示页
│       │   └── Footer.tsx             # 全局页脚
│       ├── pages/         # 页面
│       │   ├── HomePage.tsx / LoginPage.tsx / TestPage.tsx
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

### 2026-06-29 — 页面访问控制系统 + 安全性修复 + 性能优化

**页面访问控制系统：**
- 新增 `page_access` 表 + `PageAccessRoute` 前端路由守卫 + `optionalAuth` 服务端中间件，支持 public / member / admin 三级访问控制
- `ForbiddenPage`（403）和 `MaintenancePage`（维护页自动跳转）组件
- Navbar 访客模式：仅显示 public 页面链接 + 登录按钮
- AdminPage 控制面板可动态切换页面等级

**安全性修复（代码审查结果）：**
- 15 个路由端点添加 `authMiddleware` 保护（puzzles/records/wiki/messages 的 POST/PUT/DELETE/PIN）
- messages.ts DELETE 操作使用事务包裹，防止删除过程半途失败导致数据不一致
- sarcophagus.ts 下载端点新增 IP 限速器（10次/分钟/窗口）
- pageAccess.ts JWT 密钥加固（静态 import + 环境变量检查）

**性能修复：**
- 全局限速器仅对写操作（POST/PUT/DELETE）生效，GET 读操作不再受限——修复了 429 导致的黑屏和登录状态丢失
- GET API 使用 `optionalAuth` 动态判断权限，公开页面无需登录即可加载数据
- HomePage API 调用添加 `?limit=5` 减少首页数据加载量

**Bug 修复：**
- 多个页面列表 API 改为适配分页响应格式（`res.data` 提取），修复 `filter/slice is not a function` 崩溃
- React `{0 && <Component/>}` 渲染文字 "0" 的经典陷阱修复（`!!isAnonymous` 强制转布尔）
- 留言板新增评论计数显示

**其他：**
- 删除冗余 `/sarcophagus/admin` 页面（功能已合并至 `/lynchpin-admin`）
- AdminPage 页面访问控制移除无用的 is_enabled 开关
- **API 客户端修复**：`getToken()` 返回 `null` 时不再发送 `Authorization: Bearer null`
- **Admin 管理面板新增「页面访问」Tab**：可视化配置各页面访问级别和开关，修改即时生效
- **公开配置接口** `GET /api/site/page-access`：无需认证，过滤 admin 路由，前端启动时自动拉取

### 2026-06-27 — 系统崩溃转场特效 / admin 专属测试页

- **SystemCrashOverlay 全屏崩溃动画**：WinXP 风格系统崩溃转场（~16.7s），四阶段推进：Glitch 撕裂 → 16 个疯狂弹窗对角线加速暴增 → 代码瀑布逐行喷涌 → 终幕大字「LOOP IS ETERNAL」从废墟浮现
- **Web Audio 音效引擎**：background 低频嗡鸣持续爬升音量 / 刺耳双路方波警报 / 最终弹窗后持续癫狂蜂鸣 + 页面抽搐撕扯直至 CRT 关机
- **Glitch 视觉系统**：30px 极端 RGB 通道分离 + 40% 面积剪裁撕裂 + 密集黑闪 + 烧屏残留线模拟屏幕物理损毁，贯穿 glitch→dialogs→code→finale 全阶段
- **CRT 显示器关机动画**：屏幕纵向塌缩为水平亮线 → 汇聚为光点 → 熄灭，纯黑遮盖层脱离动画作用域确保全屏覆盖
- **BGM 联动**：BackgroundMusic 监听 `crash-overlay-start/end` 自定义事件自动暂停/恢复背景音乐
- **/test admin 专页**：AdminRoute 保护，仅 admin 角色可访问，非 admin 弹回首页；跳转前清除 auth token 确保持续停留在登录页

### 2026-06-25 #3 — HomePage Hero 专区重构与视觉特效增强

- **Hero 布局重构**: 左右不对称分割 (65%/35%)，左侧超大流光渐变 SARCOPHAGUS 标题，右侧源石冷青色块 + 用户状态
- **石棺光孔阵列**: 新增 `.sarcophagus-lights` 双层光孔背景效果 (11个青色光孔)，应用于 Hero 右侧色块
- **菱形碎片系统**: 新增 `.rhombus` 装饰类，7个异步浮动菱形碎片覆盖全页背景，`.rhombus-icon-box` hover 180度旋转
- **DNA 螺旋水印**: 新增 `.dna-helix-bg` 伪元素旋转斜纹水印，30s 循环旋转
- **Glitch 故障效果**: 新增 `.glitch-burst` 径向脉冲背景，4s 呼吸周期
- **移除重复数据**: Hero 右侧色块不再显示解密记录/活跃谜题统计 (下方 Stats Grid 已有)
- **TERMINAL_SARCO 入口**: 回归 Hero 右侧色块底部，hover 高亮 + 字距展开，点击进入 `/sarcophagus` 石棺终端

### 2026-06-25 — 前端视觉全面升级

- **展示字体体系**: 引入 Orbitron (大标题展示) + Rajdhani (次级标题)，正文保持 Inter，新增 `.font-display` / `.font-heading` 工具类
- **卡片三层层级**: `.card-elevated` (重层级，实色背景+强边框) / `.glass-card` (中层级) / `.card-subtle` (轻层级)，解决全站 glass-card 扁平问题
- **动画库大幅扩充**: 入场动画 (fade-up/scale-in/blur-in/slide 共6种) / 旋转光流边框 `.card-glow-border` / 流光渐变文字 `.text-gradient-flow` / 呼吸辉光 / 数据扫描线 / 柔和浮动 / 闪烁星点 / 3D倾斜 `.tilt-3d` / 徽章弹跳 / 加载点跳动
- **全局组件升级**: Navbar Logo hover 旋转 + 导航呼吸辉光 / NotificationTicker LIVE指示灯 + 滚动修复 / CommentSection/LikeButton hover微交互 + 点赞缩放弹跳
- **HomePage**: Hero 重层级卡片 + 光流边框 + 扫描线 + 流光大标题 / 假数据状态面板弱化为纯装饰 / 统计交错入场 + 光流边框 / 快速入口3D倾斜
- **LoginPage**: 保留Logo脉冲仪式感 / 流光标题 / 卡片扫描线 + 多彩闪烁装饰点 / 表单交错入场
- **全量页面**: DecryptRecords/CustomPuzzles/DecryptWiki/RecordDetail/MessageBoard/AdminPage -- 流光标题 / 扫描线 / 列表stagger入场 / 呼吸辉光 / 正文对比度提升 (/70 -> /90) / 卡片hover微交互
- **Sarcophagus**: 保持原样不动 (CRT终端美学已极致，强制暗色)
- 新增 `useInView` Hook (IntersectionObserver 滚动触发动画)
- `prefers-reduced-motion` 无障碍降级覆盖所有新增动画

### 2026-06-24 — 稳定性修复 / 分页系统 / Nginx 超时保护

- **OOM 复盘与修复**：复盘 June 24 凌晨服务不可用事件，根因为 VS Code Server 长期内存泄漏 (600MB+) 配合大响应体耗尽系统内存，已优化
- **分页系统**：留言板和评论区新增服务端分页 (每页 10/30 条)，前端加载更多按钮，彻底杜绝大响应体阻塞事件循环
- **内容限制回调**：单条评论/留言上限从 2000 万回调至 1000 万字符，配合分页保障安全
- **Nginx 超时保护**：`proxy_read_timeout 10s`，单请求超过 10 秒自动 504，防止慢请求拖死全站；响应缓冲上限防止内存写盘
- **系统级防护**：新增 2GB swap 分区，内存告急时提供缓冲带避免 OOM Kill；VS Code Server 默认关闭不占资源

### 2026-06-24 — 安全性修复与代码健壮性

P0 紧急:
- **#1 XSS 漏洞**: 前端新增 `sanitize.ts` (DOMPurify)，5 处 `dangerouslySetInnerHTML` 渲染前消毒（MessageBoard/CommentSection/RecordDetail/DecryptWiki/CustomPuzzles）；后端新增 `sanitize.ts` (sanitize-html)，写入前消毒（纵深防御）
- **#2 限速器误伤图片**: `index.ts` 全局限速器跳过 `GET /api/images/`，浏览图片不再被 429

P1 高:
- **#4 删用户不级联**: `admin.ts` 删除用户改为事务级联清理其留言/评论/记录/谜题/Wiki/点赞/头像与图片文件
- **#5 图片文件无清理**: 新增 `imageCleanup.ts`：编辑留言时删除不再引用的图片；删除各实体时清理内容图片；修复 puzzles/wiki 删除时附件未删除的磁盘泄漏
- **#6 Nginx 安全头丢失**: `nginx.conf` 的 `/api/images/` location 补齐全部安全头（HSTS/CSP/X-Content-Type-Options 等）

P2 中:
- **#7 无分页**: records/puzzles/wiki 列表支持可选 `?page=&limit=`（无参时向后兼容返回数组）
- **#8 N+1 查询**: 新增 `attachments.ts` 的 `getAttachmentsMap` 批量查询，三个路由列表消除 N+1，移除重复的本地 `getAttachments`
- **#9 递归删除评论低效**: `comments.ts` 改用递归 CTE 一次性查出后代并批量删除
- **#10 限速器内存泄漏**: `sarcophagus.ts` 增加定时清理过期限速条目（`.unref()`）
- **#11 avatar-info 无认证**: 该端点添加 `authMiddleware`
- **#12 JSON.parse 无异常**: `safeParseTags` 包裹 try/catch，非法 tags 不再导致 500

### 2026-06-23 — 图片编辑器增强 / GIF 全面支持 / 内容限制放开 / 时区修复

- **图片编辑器增强**：默认 400px 宽度 + 悬浮尺寸预设工具栏（小/中/大/100%）+ 增强拖拽手柄（22px+箭头图标+实时像素标签）+ 编辑回显自动恢复交互
- **GIF 全面支持**：头像上传检测到 GIF 跳过 Canvas 裁剪完整保留动画；编辑器 GIF 自动显示紫色「GIF」徽章；上传 API 根据 MIME 类型动态匹配文件扩展名
- **图片占位框残留修复**：图片插入/拖拽缩放/工具栏操作后现在正确触发状态更新，评论提交不再显示占位框
- **预览模式隔离**：图片交互元素（工具栏/手柄/GIF徽章）改用 CSS class 控制 + `[contenteditable]` 属性作用域，预览模式下彻底隐藏
- **内容限制大幅放开**：评论/留言上限提升至 2000 万字符（≈15MB base64），记录/Wiki/谜题移除限制（依赖权限系统保护）
- **头像尺寸放大**：评论区 24x24 -> 32x32，留言板 32x32 -> 40x40（≈2x 面积），AvatarDisplay 改用 `absolute inset-0` 修复 GIF 头像缩放
- **时区统一修复**：服务端全部改用 `new Date().toISOString()`（带 `Z` 后缀），前端统一用 `toLocaleString('zh-CN')` 展示，历史数据自动转换
- **安全依赖升级**：multer 1.4.5 -> 2.0.1（CVE-2025-47944/48997），vite 7.2.4 -> 7.3.5（CVE-2026-53571）

### 2026-06-22 #2 — 安全加固 / 下载认证修复 / 频率限制

- **安全头完整覆盖**：Nginx 新增 CSP/Referrer-Policy/Permissions-Policy，服务端引入 helmet + morgan
- **Admin 密码环境变量化**：种子密码从硬编码改为 `ADMIN_PASSWORD` 环境变量读取，`bcrypt.compareSync` -> `async compare` 防时序攻击
- **频率限制**：登录/注册/谜题提交接口增加 `express-rate-limit` 限流保护
- **内容长度校验**：评论/留言 <= 2000万字符，记录/Wiki/谜题无限制（权限保护）
- **AdminRoute 专属守卫**：`/lynchpin-admin` + `/sarcophagus/admin` 双重校验（登录+admin角色），Navbar 角色权限收窄仅 admin 可见控制台
- **下载认证修复**：新增 `apiDownload` 统一携带 JWT Token，修复附件下载 401 错误
- **全局 Footer**：版权信息 + ICP 备案号，flex 布局确保始终底部
- **LikeButton 增强**：新增 `initialLiked` prop + `useEffect` 同步外部状态，刷新后保持点赞状态

### 2026-06-22 — 前端视觉全面升级 / 头像裁剪重写

- **6 项视觉美化**：全宽沉浸式 Hero（状态面板+计数动画+进度条）/ 谜题威胁等级条+印章状态 / 解密记录档案色带+扫描线 / 统一骨架屏 / 页面入场淡入动画 / 全局通知滚动条
- **A11y 增强**：`prefers-reduced-motion` 媒体查询，动效敏感用户自动停用全部动画
- **10 个新动画 Keyframe** 统一注册到 Tailwind config（fade-in-up / count-up / archive-scan / threat-pulse / seal-stamp 等）
- **差异化页面背景**：首页 hex-grid / 记录 archive-bg 扫描线 / 谜题 grid-dot 坐标纸 / Wiki book-spine 书脊 / 留言板 warm-glow 径向光晕
- **头像裁剪完全重写**：修复 zoom + 拖动后坐标映射错误，采用 CSS `transform:scale` + 两步 Canvas 渲染方案
- **马赛克功能修复**：CSS 简化为纯涂黑无溢出 / 零宽空格光标锚点 / 点击固定显示 / 重复按下取消马赛克 / 保留富文本格式
- **点赞系统**：LikeButton 通用组件，支持记录/谜题/Wiki/留言/评论全实体

### 2026-06-21 #2 — BGM / 头像 / 评论折叠 / 终端自运行

- **全局 BGM 系统**：两套背景音乐（`sarcophagus-bgm.mp3` / `caidan.mp3`），路由感知自动切换，5 秒间隔循环，3 秒首次播放延迟
- **每小时语音播报**：首页进入时用广播风电子女声播报 "Welcome back, Doctor"
- **终端自运行程序**：不定时输出明日方舟世界观系统日志，滴声+淡入动画
- **评论折叠**：根评论预览3条+展开；嵌套回复自动折叠，逐层展开
- **用户自定义头像**：上传 -> 拖拽定位 -> 缩放裁剪 -> Canvas 输出 200x200，全站同步
- **Bug修复**：成功弹窗重复弹出（animationEnd 事件冒泡）

### 2026-06-21 — CRT 终端复古未来主义视觉升级

- **7 项视觉升级**：球面暗角 / 数据雨背景 / HUD 状态面板 / 色散标题 / 扫描边框 / 闪烁光标 / 三层粒子系统
- CRT 开机动画时序优化：白点 350ms 彻底消失，总时长从 2400ms 缩短至 1700ms
- 新增左侧 HUD 面板（xl 屏可见）：系统指标（CPU/MEM/NET/ENC）+ 加密通道状态
- `/sarcophagus` 页面完整重构：Multi-layer 深度背景 + Matrix 风格数据雨 + SVG 扫描边框

### 2026-06-20 — 石棺彩蛋终端上线

- 新增 `/sarcophagus` 石棺远程访问协议终端页面（CRT 开机动画）
- Admin 管理面板 `/sarcophagus/admin`：访问代码增删改 + 文件上传
- 访问代码验证逻辑：AUTH_OK -> 下载模因污染文件 / AUTH_FAIL -> 错误提示
- CRT 老电视效果：扫描线 + 雪花噪点 + 内容渐清晰

### 2026-06-17 — 正式上线

- 启用 HTTPS（Let's Encrypt 免费证书，自动续期）
- 域名绑定 `sarcophagus.org.cn`
- 修复 ESM 兼容性 Bug（`require('fs')` -> `import { unlinkSync }`）
- 修复附件下载中文文件名乱码（使用 `res.attachment()` RFC 5987 编码）
- 安全加固：HSTS / TLS 1.2+ / 防火墙（仅开放 22/80/443）
- 新增 `go_live.sh` 一键上线脚本

---

## 安全

- 所有 API 需 JWT 认证（除登录/注册/石棺下载令牌/公开页面 GET 读接口/公开配置接口）
- 页面访问控制：数据库驱动，GET 读接口按页面配置可选放开，写操作始终需认证
- 公开 API 限流：120次/分钟/IP（公开页面 GET）、30次/分钟/IP（配置接口）
- 内容编辑仅限作者本人 + admin
- `lynchpin` SSH 密钥、`.env`、`*.db` 已加入 `.gitignore`
- 后端端口 3001 不对外开放，仅 Nginx 反向代理
