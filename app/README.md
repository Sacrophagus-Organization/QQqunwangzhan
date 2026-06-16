# 🗿 石棺 — 明日方舟解谜群博客网站

> 面向 QQ 群内部的私密解密记录与谜题协作平台。
> 基于 React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui 构建。

---

## 📋 目录

1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [快速开始](#快速开始)
4. [项目结构](#项目结构)
5. [路由表](#路由表)
6. [核心架构](#核心架构)
   - [认证系统](#认证系统)
   - [数据存储](#数据存储)
   - [权限系统](#权限系统)
   - [富文本编辑器](#富文本编辑器)
7. [各模块详解](#各模块详解)
   - [登录页](#登录页-loginpage)
   - [首页](#首页-homepage)
   - [解密记录](#解密记录-decryptrecords--recorddetail)
   - [自制谜题](#自制谜题-custompuzzles)
   - [解密Wiki](#解密wiki-decryptwiki)
8. [主题与样式](#主题与样式)
9. [TypeScript 类型定义](#typescript-类型定义)
10. [常用开发任务](#常用开发任务)
11. [部署指南](#部署指南)
12. [常见问题](#常见问题)

---

## 项目概述

**石棺（原名谜域）** 是一个面向明日方舟玩家解密群的内部博客网站。核心功能：

- 🔐 **登录认证** — 用户名+密码注册/登录，访客无法访问任何内容
- 📝 **解密记录** — 每条记录一个独立页面，支持富文本编辑，包含大量明日方舟 PV4 解密归档
- 🧩 **自制谜题** — 创建/发布谜题，提交答案自动判定，支持文件附件
- 📚 **解密Wiki** — 密码学知识库，分类浏览，包含凯撒密码、摩斯密码等词条
- ✏️ **编辑权限** — 只有内容创建者和管理员可以修改内容

---

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 19.2 |
| 语言 | TypeScript | 5.9 |
| 构建工具 | Vite | 7.3 |
| CSS 框架 | Tailwind CSS | 3.4.19 |
| UI 组件库 | shadcn/ui (基于 Radix UI) | 最新 |
| 路由 | react-router-dom | 7.17 |
| 图标 | lucide-react | 0.562 |
| 表单 | react-hook-form + zod | 7.70 / 4.3 |
| 图表 | recharts | 2.15 |
| 主题切换 | next-themes | 0.4 |

---

## 快速开始

### 环境要求

- **Node.js** ≥ 20.19（推荐 22.x）
- **npm** ≥ 10.x
- Windows / macOS / Linux 均可

### 安装与运行

```bash
# 1. 进入项目目录
cd qunwangzhan/app

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 浏览器访问
# http://localhost:5173
```

### 默认管理员账号

| 用户名 | 密码 | 说明 |
|--------|------|------|
| `Admin` | `admin123` | 拥有编辑所有内容的权限 |

> ⚠️ **首次登录后务必修改管理员密码** — 密码通过简单哈希存储在浏览器 localStorage 中，生产环境建议接入后端。

### 可用命令

```bash
npm run dev       # 启动开发服务器 (热更新)
npm run build     # 生产构建 (输出到 dist/)
npm run preview   # 预览生产构建
npm run lint      # 运行 ESLint
```

---

## 项目结构

```
app/
├── index.html                      # 入口 HTML
├── package.json                    # 依赖配置
├── vite.config.ts                  # Vite 配置（含 @ 路径别名）
├── tailwind.config.js              # Tailwind 主题配置
├── tsconfig.json                   # TypeScript 配置
├── tsconfig.app.json               # 应用 TS 配置（严格模式）
├── postcss.config.js               # PostCSS 配置
│
└── src/
    ├── main.tsx                    # React 入口，挂载 <App/>
    ├── App.tsx                     # 路由定义，顶层布局
    ├── App.css                     # 全局 App 样式
    ├── index.css                   # Tailwind + CSS 变量主题 + 自定义样式
    │
    ├── types/
    │   └── index.ts                # 所有 TypeScript 类型/接口定义
    │
    ├── contexts/
    │   └── AuthContext.tsx          # 认证上下文 (登录/注册/登出/权限)
    │
    ├── components/
    │   ├── Navbar.tsx               # 顶部导航栏（桌面+移动端）
    │   ├── ProtectedRoute.tsx       # 路由守卫（未登录→跳转登录页）
    │   ├── DiamondLogo.tsx          # 菱形 Logo（明日方舟源石风格）
    │   ├── RichTextEditor.tsx       # 富文本编辑器（核心组件）
    │   └── ui/                      # shadcn/ui 组件 (53个)
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── dialog.tsx
    │       ├── input.tsx
    │       ├── select.tsx
    │       ├── tabs.tsx
    │       ├── badge.tsx
    │       ├── textarea.tsx
    │       ├── label.tsx
    │       └── ...（共 53 个组件）
    │
    ├── pages/
    │   ├── LoginPage.tsx            # 登录/注册页
    │   ├── HomePage.tsx             # 首页仪表盘
    │   ├── DecryptRecords.tsx       # 解密记录列表页
    │   ├── RecordDetail.tsx         # 解密记录详情页（/records/:id）
    │   ├── CustomPuzzles.tsx        # 自制谜题（创建/浏览/解答/编辑）
    │   └── DecryptWiki.tsx          # 解密Wiki（分类浏览/搜索/编辑）
    │
    ├── hooks/
    │   └── use-mobile.ts            # 移动端检测 Hook
    │
    └── lib/
        └── utils.ts                 # 工具函数 (cn/classnames)
```

---

## 路由表

| 路径 | 页面 | 组件 | 是否需要登录 |
|------|------|------|-------------|
| `/login` | 登录/注册 | `LoginPage` | ❌ |
| `/` | 首页仪表盘 | `HomePage` | ✅ |
| `/records` | 解密记录列表 | `DecryptRecords` | ✅ |
| `/records/:id` | 解密记录详情 | `RecordDetail` | ✅ |
| `/puzzles` | 自制谜题 | `CustomPuzzles` | ✅ |
| `/wiki` | 解密Wiki | `DecryptWiki` | ✅ |
| `*` | 404 → 重定向首页 | `Navigate` | — |

路由定义在 `src/App.tsx` 中，所有需要登录的页面都被 `<ProtectedRoute>` 包裹。

---

## 核心架构

### 认证系统

**文件**: `src/contexts/AuthContext.tsx`

```
登录流程:
  用户输入用户名+密码
  → 从 localStorage 读取用户列表
  → 对密码做简单哈希 (simpleHash)
  → 匹配用户名+密码哈希
  → 生成 token (base64 编码)
  → 保存登录状态到 React state + localStorage
  → 重定向到首页

注册流程:
  用户输入用户名+密码+QQ号
  → 检查用户名是否重复
  → 创建新用户对象
  → 保存到 localStorage
  → 自动登录
```

**关键函数**:

- `simpleHash(str)` — 将字符串转换为哈希（非加密，仅用于 localStorage 存储保护）
- `initializeDefaultUser()` — 首次使用时自动创建 Admin 账号
- `useAuth()` — 自定义 Hook，在任何组件中获取认证状态

**使用示例**:
```tsx
const { user, login, register, logout, isAuthenticated } = useAuth();
if (isAuthenticated) { /* 已登录 */ }
```

### 数据存储

**所有数据存储在浏览器 localStorage 中**，没有后端服务器。

| Key | 存储内容 | 类型 |
|-----|---------|------|
| `arkpuzzle_users` | 用户列表 | `User[]` |
| `arkpuzzle_auth` | 当前登录状态 | `{ user, token }` |
| `arkpuzzle_records` | 解密记录 | `DecryptRecord[]` |
| `arkpuzzle_puzzles` | 谜题 | `Puzzle[]` |
| `arkpuzzle_wiki` | Wiki 词条 | `WikiEntry[]` |

**数据迁移**：每个模块的 `getXxx()` 函数都会自动补全旧数据缺失的字段（如 `attachments`），确保向后兼容。

**局限性**:
- localStorage 容量约 5-10MB
- 文件附件通过 base64 编码存储，大文件（>5MB）会被标记为"过大"不予保存
- 数据仅在当前浏览器中可用，换设备不会同步

### 权限系统

**函数**: `canEdit(user, item)` — 定义在各自的页面文件中

```typescript
function canEdit(user, record) {
  if (!user || !record) return false;
  return user.id === record.authorId || user.role === 'admin';
}
```

权限检查点:
1. 解密记录详情页 — 标题右侧"编辑"按钮
2. 谜题详情弹窗 — 标题右侧"编辑"按钮
3. Wiki 词条展开 — 底部"编辑词条"按钮

### 富文本编辑器

**文件**: `src/components/RichTextEditor.tsx`

核心基于浏览器原生 `contentEditable` + `document.execCommand`。

**工具栏功能**:
| 按钮 | 功能 | 实现方式 |
|------|------|---------|
| **B** | 加粗 | `document.execCommand('bold')` |
| **U** | 下划线 | `document.execCommand('underline')` |
| **Aa** | 字号 (12px~32px) | 包裹 `<span style="font-size:...">` |
| 🎨 | 文字颜色 (10色) | `document.execCommand('foreColor')` |
| ≡/≡/≡ | 左/中/右对齐 | `document.execCommand('justifyLeft/Center/Right')` |
| ▮▮▮ | 黑色马赛克 | 插入 `<span class="spoiler-text">`，hover 时显示 |
| 🖼 | 插入图片 | 创建 `<input type="file">` → FileReader → `<img>` + 拖拽缩放 |

**导出的辅助函数**:
- `htmlToPlainText(html)` — 提取纯文本
- `htmlToSummary(html, maxLen)` — 截取摘要

**自定义 CSS 类**:
- `.spoiler-text` — 黑色遮盖，hover 显示青色文字
- `.rich-image-container` — 图片容器，带拖拽缩放手柄
- `.rich-editor-content` — 只读渲染容器

---

## 各模块详解

### 登录页 (`LoginPage`)

**路由**: `/login`

- 双 Tab：登录 / 注册
- 密码可见切换
- 背景特效：六边形网格 + 斜线纹理 + 辉光动画
- 登录后自动跳转首页

**关键代码位置**: `src/pages/LoginPage.tsx`

---

### 首页 (`HomePage`)

**路由**: `/`

- 欢迎横幅 + 统计卡片（解密记录数/谜题数/Wiki词条数/成员数）
- 近期解密记录列表（卡片式，点击跳转）
- 活跃谜题列表
- 快速入口（浏览记录/挑战谜题/查阅Wiki/关于石棺）

**关键代码位置**: `src/pages/HomePage.tsx`

---

### 解密记录 (`DecryptRecords` + `RecordDetail`)

#### 列表页 `/records`

- 搜索 + 重要程度筛选 + 排序
- 每条记录显示：标题、摘要、日期、作者、标签、附件数
- 点击整行 → 跳转 `/records/:id`
- 「新建记录」→ 富文本编辑器 → 提交后自动跳转到新记录页面

#### 详情页 `/records/:id`

- 全宽阅读视图
- 标题、摘要、元信息、正文（富文本渲染）
- 附件下载
- **编辑按钮**（仅作者/管理员可见）→ 弹出编辑对话框 → 可修改所有字段

**关键代码位置**:
- 列表: `src/pages/DecryptRecords.tsx`
- 详情: `src/pages/RecordDetail.tsx`

**PV4 解密数据**:
- 记录 ID: `rec-pv4`
- 自动注入逻辑：每次 `DecryptRecords` 挂载时检测是否存在，不存在则注入
- 详情页 URL: `/records/rec-pv4`

---

### 自制谜题 (`CustomPuzzles`)

**路由**: `/puzzles`

- 三栏卡片网格布局
- Tab 切换：全部/未解决/已解决
- 分类筛选 + 搜索
- **创建谜题**: 标题、描述、正文(富文本)、分类、难度、提示、答案、附件、标签
- **解答**: 提交答案 → 自动比对（大小写不敏感）→ 正确/错误提示
- **详情弹窗**: 查看完整内容 + 提示 + 编辑按钮
- **编辑按钮**: 仅作者/管理员可见

**谜题分类**:
- 密码学 (`cipher`)
- 逻辑推理 (`logic`)
- 模式识别 (`pattern`)
- 数学 (`math`)
- 剧情考据 (`lore`)
- 其他 (`other`)

**难度等级**:
- 简单 (`easy`) — 绿色
- 中等 (`medium`) — 黄色
- 困难 (`hard`) — 橙色
- 极难 (`extreme`) — 红色

**关键代码位置**: `src/pages/CustomPuzzles.tsx`

---

### 解密Wiki (`DecryptWiki`)

**路由**: `/wiki`

- 左侧分类导航（桌面端）/ 下拉选择（移动端）
- 词条展开/折叠查看
- 搜索功能
- **新建词条**: 标题、分类、内容(富文本)、附件、标签
- **编辑按钮**: 展开后底部可见，仅作者/管理员

**预设分类**:
- 密码学基础
- 经典密码（凯撒、摩斯、维吉尼亚）
- 现代加密（Base64）
- 游戏考据
- 解密工具
- 符号体系

**关键代码位置**: `src/pages/DecryptWiki.tsx`

---

## 主题与样式

### CSS 变量主题

主题定义在 `src/index.css` 的 `:root` 和 `.dark` 选择器中：

```css
:root {
  --background: 228 30% 5%;       /* 深蓝黑背景 #080b18 */
  --foreground: 210 40% 92%;      /* 浅色文字 */
  --primary: 190 100% 50%;        /* 青色主色调 #00d4ff */
  --accent: 261 73% 60%;          /* 紫色强调色 #a855f7 */
  --card: 228 25% 8%;             /* 卡片背景 */
  --border: 228 20% 18%;          /* 边框颜色 */
  --radius: 0.5rem;               /* 圆角半径 */
}
```

### 自定义工具类

| 类名 | 效果 |
|------|------|
| `glow-cyan` | 青色辉光阴影 |
| `glow-purple` | 紫色辉光阴影 |
| `border-glow` | 发光边框 |
| `text-glow-cyan` | 青色文字发光 |
| `glass-card` | 玻璃拟态卡片 |
| `hex-grid-bg` | 六边形网格背景 |
| `mono-text` | 等宽字体 |
| `spoiler-text` | 马赛克文字（hover 显示） |

### 图标

使用 **lucide-react** 图标库。查找图标: https://lucide.dev/icons/

```tsx
import { FileText, Puzzle, BookOpen } from 'lucide-react';
<FileText className="h-5 w-5 text-primary" />
```

### Logo

`src/components/DiamondLogo.tsx` — 自定义菱形 SVG（明日方舟源石风格），参数：
- `size`: 尺寸 (默认 24)
- `className`: 额外样式

---

## TypeScript 类型定义

所有类型在 `src/types/index.ts` 中定义：

```typescript
// 用户
interface User {
  id: string;
  username: string;
  password: string;        // 哈希存储
  qqNumber: string;
  role: 'admin' | 'member';
  createdAt: string;
}

// 文件附件
interface FileAttachment {
  id: string;
  name: string;
  size: number;            // 字节
  type: string;            // MIME 类型
  dataUrl: string;         // base64 数据 (过大则空字符串)
  uploadedAt: string;
}

// 解密记录
interface DecryptRecord {
  id: string;
  title: string;
  content: string;         // HTML 富文本
  summary: string;
  date: string;            // YYYY-MM-DD
  tags: string[];
  author: string;
  authorId: string;
  importance: 'normal' | 'important' | 'critical';
  attachments: FileAttachment[];
  createdAt: string;       // ISO 8601
  updatedAt: string;
}

// 谜题
interface Puzzle {
  id: string;
  title: string;
  description: string;
  content: string;         // HTML 富文本
  category: 'cipher' | 'logic' | 'pattern' | 'math' | 'lore' | 'other';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  hint: string;
  solution: string;
  status: 'unsolved' | 'solved';
  author: string;
  authorId: string;
  solvedBy?: string;
  solvedById?: string;
  solvedAt?: string;
  attempts: number;
  tags: string[];
  attachments: FileAttachment[];
  createdAt: string;
  updatedAt: string;
}

// Wiki词条
interface WikiEntry {
  id: string;
  title: string;
  content: string;         // HTML 富文本
  category: string;
  tags: string[];
  author: string;
  authorId: string;
  attachments: FileAttachment[];
  lastUpdated: string;
  createdAt: string;
}
```

---

## 常用开发任务

### 1. 添加新的导航项

**步骤**:

1. 在 `src/components/Navbar.tsx` 的 `navItems` 数组中添加新项:
```tsx
const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/records', label: '解密记录', icon: FileText },
  // 添加新项:
  { path: '/new-page', label: '新页面', icon: Bookmark },
];
```

2. 创建页面文件 `src/pages/NewPage.tsx`:
```tsx
export default function NewPage() {
  return <div>新页面内容</div>;
}
```

3. 在 `src/App.tsx` 添加路由:
```tsx
import NewPage from '@/pages/NewPage';

// 在 <Routes> 中添加:
<Route path="/new-page" element={
  <ProtectedRoute>
    <AppLayout><NewPage /></AppLayout>
  </ProtectedRoute>
} />
```

### 2. 添加新的 localStorage 数据存储

```typescript
// 在页面文件中定义:
const MY_KEY = 'arkpuzzle_mydata';

function getMyData(): MyType[] {
  try {
    const d = localStorage.getItem(MY_KEY);
    return d ? JSON.parse(d) : [];
  } catch { return []; }
}

function saveMyData(data: MyType[]) {
  localStorage.setItem(MY_KEY, JSON.stringify(data));
}

// 在组件中使用:
const [data, setData] = useState<MyType[]>(() => {
  const saved = getMyData();
  return saved.length > 0 ? saved : initialData;
});
```

### 3. 修改主题颜色

编辑 `src/index.css` 中的 CSS 变量：

```css
:root {
  --primary: 190 100% 50%;     /* HSL 格式: 色相 饱和度 亮度 */
  --background: 228 30% 5%;
  /* ... */
}
```

修改后全局生效，无需改动组件代码。

### 4. 添加新的 shadcn/ui 组件

项目已内置 53 个 shadcn/ui 组件。如需添加新组件：

```bash
npx shadcn@latest add <component-name>
```

例如添加 `date-picker`:
```bash
npx shadcn@latest add date-picker
```

### 5. 使用图标

访问 https://lucide.dev/icons/ 搜索图标名称，然后：

```tsx
import { Camera, Music } from 'lucide-react';
<Camera className="h-5 w-5" />
```

### 6. 调试 localStorage

在浏览器控制台中:

```javascript
// 查看所有数据
Object.keys(localStorage).filter(k => k.startsWith('arkpuzzle_')).forEach(k => {
  console.log(k, JSON.parse(localStorage.getItem(k)));
});

// 清除所有数据（重置网站）
['arkpuzzle_users','arkpuzzle_auth','arkpuzzle_records','arkpuzzle_puzzles','arkpuzzle_wiki']
  .forEach(k => localStorage.removeItem(k));
```

### 7. 添加新的谜题分类/难度

在 `src/pages/CustomPuzzles.tsx` 中:

```typescript
const catLabels: Record<PuzzleType['category'], string> = {
  cipher: '密码学',
  logic: '逻辑推理',
  // 添加新分类:
  steganography: '隐写术',
  // ...
};
```

同时在 `src/types/index.ts` 的 `Puzzle.category` 类型中添加新值:
```typescript
category: 'cipher' | 'logic' | 'pattern' | 'math' | 'lore' | 'steganography' | 'other';
```

---

## 部署指南

### 方式一：静态文件部署（推荐）

```bash
# 1. 构建
npm run build

# 2. 产物在 dist/ 目录，包含:
#    - index.html
#    - assets/index-[hash].js
#    - assets/index-[hash].css

# 3. 上传 dist/ 到任何静态托管:
#    - GitHub Pages
#    - Vercel (拖拽 dist/ 即可)
#    - Netlify (拖拽 dist/ 即可)
#    - CloudStudio / EdgeOne Pages (腾讯云)
#    - 任何 Nginx/Apache 服务器
```

### 方式二：Vercel 一键部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
cd app
vercel --prod
```

### 方式三：Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### ⚠️ 部署注意事项

1. **本地存储限制**: 当前所有数据存储在浏览器 localStorage 中，多设备不共享
2. **如需后端**: 建议使用 Supabase/Firebase 或自建 API 替代 localStorage
3. **文件附件**: base64 编码会显著增大存储，生产环境建议使用对象存储（OSS/S3）
4. **密码安全**: 当前使用简单哈希，生产环境应使用 bcrypt + JWT + 后端验证

---

## 常见问题

### Q: 页面黑屏/空白？

**A**: 通常是 localStorage 中旧数据缺少新字段导致。解决方法：
1. 打开浏览器控制台 (F12)
2. 执行: `['arkpuzzle_records','arkpuzzle_puzzles','arkpuzzle_wiki'].forEach(k => localStorage.removeItem(k))`
3. 刷新页面

### Q: 修改后页面没更新？

**A**: Vite HMR 偶尔失效，手动刷新浏览器 (Ctrl+R) 或重启 `npm run dev`。

### Q: 如何重置管理员密码？

**A**: 清除 localStorage 中的 `arkpuzzle_users`，刷新页面后会自动创建默认 Admin 账号 (admin123)。

### Q: 如何添加新用户？

**A**: 在登录页切换到"注册"Tab，输入用户名、密码、QQ号即可注册。

### Q: 为什么附件下载不了？

**A**: 如果文件过大(>5MB)，base64 编码后超过限制，文件不会被完整保存。此时需要从群文件手动获取。

### Q: TypeScript 编译报错？

**A**: 运行 `npx tsc --noEmit` 查看详细错误。常见原因：
- 忘记 `import type` 区分类型导入（tsconfig 启用了 `verbatimModuleSyntax`）
- 未使用的变量/参数（启用了 `noUnusedLocals` / `noUnusedParameters`）

### Q: 如何接入后端？

**A**: 建议步骤:
1. 将所有 `localStorage` 操作替换为 API 调用
2. 将 `AuthContext` 中的 `simpleHash` 替换为 JWT 认证
3. 文件上传改为 multipart/form-data 上传到服务器/OSS
4. 参考后端框架: Express.js (Node) / FastAPI (Python) / Gin (Go)
