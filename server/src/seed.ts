import { db } from './db.js';

console.log('[Seed] Seeding initial data...');

// Check if already seeded
const existing = db.prepare('SELECT COUNT(*) as cnt FROM records').get() as any;
if (existing.cnt > 0) {
  console.log('[Seed] Data already exists, skipping.');
  process.exit(0);
}

const now = new Date().toISOString();

// PV4 Record - the only seeded record
db.prepare(`INSERT INTO records (id, title, content, summary, date, tags, author, author_id, importance, pinned, sort_order, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
  'rec-pv4',
  '明日方舟 PV4 全阶段解密记录（完整版）',
  `<h2 style="font-size:18px;color:#00d4ff;"><b>📋 文档概述</b></h2>
<p>本文档为明日方舟PV4全解密流程的完整归档，共包含 <b>13个工作表</b>。</p>
<h2 style="font-size:18px;color:#00d4ff;margin-top:16px;"><b>🔭 一、一二阶段解密流程（115条记录）</b></h2>
<p><b>核心发现：</b>PV4画面中出现的物品与<b>中国古代星宿体系</b>存在精确对应。</p>
<h2 style="font-size:18px;color:#00d4ff;margin-top:16px;"><b>🌐 二、三阶段解密 — Lynchpin 网站</b></h2>
<p>网站：<span style="color:#00d4ff;font-family:monospace;">lynchpin.hypergryph.com</span></p>
<p>关键线索：<span class="spoiler-text">synchronized</span> 和 <span class="spoiler-text">Stand by My Side</span></p>
<h2 style="font-size:18px;color:#00d4ff;margin-top:16px;"><b>🔢 三、noise 音频二进制编码</b></h2>
<p>noise_1f5fdb.mp3 XMP元数据全面分析，编辑工具Adobe Audition 22.5。</p>
<h2 style="font-size:18px;color:#00d4ff;margin-top:16px;"><b>📝 四、bymyside 答题里程碑</b></h2>
<p>截至2025-02-15 01:20，答题完成序号 ≥ <b>50,000</b>。</p>
<h2 style="font-size:18px;color:#00d4ff;margin-top:16px;"><b>📖 五、聂鲁达《诗十八》</b></h2>
<blockquote style="border-left:3px solid rgba(0,212,255,0.3);padding-left:12px;color:#94a3b8;font-style:italic;">我在这里爱你。在黑暗的松林里，风脱身而去。月亮在漂浮的水面上发出磷光。</blockquote>
<p>完整Excel文档（36MB，13个工作表）请在群文件中获取。</p>`,
  '从一二阶段星宿对应、三阶段Lynchpin网站、noise音频二进制编码、到bymyside答题里程碑的全流程解密归档。',
  '2025-02-15',
  JSON.stringify(['PV4', '星宿', 'Lynchpin', 'bymyside', 'noise', '二进制', '聂鲁达', '全面解密']),
  '解密群归档', 'admin-001', 'critical', 1, 0, now, now
);

console.log('[Seed] Done! Created PV4 record.');
