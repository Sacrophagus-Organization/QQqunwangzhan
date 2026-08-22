# LOOP 专题部署注意事项（sarcophagus.org.cn）

> 本文档记录把本地 LOOP（谜题循环）新增功能部署到生产服务器 `101.133.135.110`
> （域名 `sarcophagus.org.cn`）时的操作顺序与关键注意点。
> 仅涉及 LOOP 本次新增内容；普通全量部署流程见 `README.md` / `redeploy.sh`。

## 0. 服务器现状（部署前已知）

| 项目 | 状态 |
|---|---|
| 服务 | `arkoverseer` + `nginx` 均 active |
| 运行方式 | systemd **tsx 直跑源码**：`node 22.22.3 .../tsx/dist/cli.mjs src/index.ts`，`WorkingDirectory=server` |
| 代码版本 | git HEAD `dba2643`（07-08），**本地所有未提交改动服务器上均不存在** |
| 数据库 | 20 个真实用户；`puzzles` 表为空；stories 仅 3 条测试草稿；attachments 空；sarcophagus_codes 仅 1 条测试 |
| uploads | 含 `avatars/images/mail` 等真实用户数据，**不可覆盖** |
| 前端 | express 托管 `app/dist` |

## 1. 素材与数据库（最关键，分两步）

### 1.1 数据库「只增不覆盖」
服务器 DB 有真实用户数据，**绝不能直接上传本地 DB 覆盖**。
采用增量插入（固定 id `INSERT OR REPLACE`，当前表为空零冲突）：

- 故事 `st-loop-memo1`（MEMO #1，含 1 场景 / 3 角色 / N 句台词）
- 谜题 `puz-loop-node1`（标题「啥子杯#2」，content 含 `memo#1` 剧情链接）
- 附件 2 条：`att-loop-crash`（crash 日志）+ `att-loop-archive`（archive.zip）
- 石棺密码 2 条：`code-loop.zip` / `code-loop-node4.zip`

### 1.2 素材上传
本地上传以下文件到服务器 `server/uploads/`：

```
archive.zip           (约 1.9M)
loop.zip              (约 20.8M)
loop-node4.zip        (约 1.6M)
crash_11020122_143300.log  (约 5K)
```

⚠️ **mtime 陷阱**：`startDiskCleanup()` 会按 mtime 清理 30 天前的文件。
scp/cp 产生的新 mtime 没问题，但**不要 `cp -p`** 保留旧时间戳（crash 日志源文件是 2022 年的）。

### 1.3 seed 执行
`server/src/seed/loop_seed.py` 为本地/服务器通用 seed（路径已参数化，不硬编码）：

```bash
# 服务器上（素材路径按实际修改）
LOOP_ASSET_DIR=/path/to/loop  python3 server/src/seed/loop_seed.py
cd server && npx tsx src/seed/sanitize_loop.ts   # 过 sanitizeRichHtml
```

若服务器素材目录无法完整提供（节点素材在本地 Windows），
可写一个等价服务器版脚本：跳过 zip 打包，直接对 DB 做 `INSERT OR REPLACE`，
zip 文件用 scp 上传到 `server/uploads/` 后只写 DB 行。

## 2. 服务端同步与重启

- **无需 build**：systemd 用 tsx 直跑 `src/index.ts`。
- 同步整个 `server/src`：新增 `routes/loopPuzzle.ts`、`data/loopNode6.ts`、
  `seed/`（loop_seed.py + sanitize_loop.ts），修改 `db.ts` / `index.ts` /
  `routes/puzzles.ts` / `routes/sarcophagus.ts` / `routes/mailAdmin.ts` /
  `mail/MailService.ts`。
- **无新增 npm 依赖**，不需要 `npm install`。
- 重启后 `db.ts` 自动建表（`CREATE TABLE IF NOT EXISTS` + `INSERT OR IGNORE`，幂等安全）：
  `puzzle_progress` 等新表自动创建。
- 重启：`systemctl restart arkoverseer`

⚠️ **不要动** systemd 环境里的 `JWT_SECRET` / `ADMIN_PASSWORD` / `NODE_VERSION`。
服务器未配置 `DOMAIN` / `MAIL_*`（mail 会 fallback），与现状一致，非本次引入。

## 3. 前端必须在服务器上重新构建

express 托管 `app/dist`，构建会把 `public/loop` 复制进 `dist/loop`。

⚠️ **node 版本**：服务器默认 `node -v` 是 v26.3.0，但 systemd 用的是
mise 的 22.22.3。构建必须用同一版本，建议：

```bash
cd /home/admin/arkoverseer/app
/home/admin/.local/share/mise/installs/node/22.22.3/bin/npm run build
```

本地 `dist` 也可作兜底上传（`base='/'` 一致）。

## 4. 路由与静态资源（已确认可行）

- `index.ts` 新增 `/loop`、`/loop/` 显式路由 → `dist/loop/index.html`；
  `express.static` 托管 dist，`/loop/fig1.png`、`/loop/sprites/*` 走静态，互不冲突。
- `loop/index.html` 仅引用 `fonts.googleapis.com`（nginx CSP 已允许），
  无外部脚本，**nginx 无需改动**（非 `/api` 已全量代理到 3001）。

## 5. 验证清单

1. `curl https://sarcophagus.org.cn/api/puzzles` → 出现「啥子杯#2」且 **无 `solution` 字段**
2. 浏览器打开 `/loop` → 论文页正常（fig1.png、sprites 可加载）
3. `/THEDARKSIDESOFTHETWINTERRAHOPES` → LoopNode6Board 正常渲染
4. 石棺 `/sarcophagus`：输入密码 `TURKEYSCIENTIST` → 下载 loop.zip；
   输入长密码 → 下载 loop-node4.zip；且下载次数回写 `puzzle_progress`（node6 联动）
5. 崩溃封印：glitch 触发后提交按钮被封印（`crash-sealed-btn` 样式），
   CrashSubmitButton 调 `/api/puzzles/:id/seal` 返回 403/正确状态

## 6. 部署顺序（汇总）

1. 同步 `app/`（源码 + public，不含 node_modules/dist）与 `server/src/`、`server/uploads/`（4 个素材）
2. 服务器跑 seed（或服务器版等价脚本）→ 插入 loop 剧情/谜题/附件/密码数据
3. node 22 执行 `npm run build` 构建前端
4. `systemctl restart arkoverseer`
5. 按第 5 节验证

> 安全：本文档不含明文密码与私钥。素材路径按实际环境调整。
