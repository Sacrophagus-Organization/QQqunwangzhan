import { db } from './db.js';

console.log('[Seed] Seeding initial data...');

// Check if already seeded
const existing = db.prepare('SELECT COUNT(*) as cnt FROM records').get() as any;
if (existing.cnt > 0) {
  console.log('[Seed] Data already exists, skipping.');
  process.exit(0);
}

const now = new Date().toISOString();

// PV4 Record
db.prepare(`INSERT INTO records (id, title, content, summary, date, tags, author, author_id, importance, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
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
  '解密群归档', 'admin-001', 'critical', now, now
);

// Sample records
const records = [
  { id: 'rec-1', title: '第七章隐藏剧情密码破译', summary: '通过摩斯密码和凯撒密码的组合，破解了第七章隐藏剧情线索。', date: '2026-06-15', tags: ['主线剧情', '密码学', '摩斯密码'], content: '<p>在第七章主线剧情中，发现了隐藏在博士对话中的<b>摩斯密码</b>。</p><h3 style="font-size:16px;color:#f0c040;">步骤：</h3><ol><li>提取大写字母</li><li>凯撒密码偏移3位</li><li>得到坐标：<span class="spoiler-text">S-07-A3-Φ</span></li></ol>', importance: 'critical' },
  { id: 'rec-2', title: '源石技艺符号体系初步分析', summary: '整理并分类了游戏中的源石技艺符号，发现其与真实炼金术符号存在对应。', date: '2026-06-12', tags: ['符号学', '世界观', '源石技艺'], content: '<p>已识别<b>7种基础符号</b>和<b>23种组合符号</b>。</p><ul><li>元素类：火/水/风/土</li><li>属性类：强化/削弱/转换</li><li>联动类：共鸣/排斥/中和</li></ul>', importance: 'important' },
  { id: 'rec-3', title: '罗德岛内部加密通信协议逆向', summary: '逆向工程揭示了游戏内部通信加密机制，使用AES-128加密，密钥来源于干员档案编号。', date: '2026-06-08', tags: ['通信协议', '加密', '逆向工程'], content: '<p>通过对游戏数据包的抓取，成功逆向出罗德岛内部通信加密算法。<b>AES-128加密</b>，密钥来源<span style="color:#00d4ff;">干员档案编号组合</span>。</p>', importance: 'normal' },
];

for (const r of records) {
  db.prepare(`INSERT INTO records (id, title, content, summary, date, tags, author, author_id, importance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    r.id, r.title, r.content, r.summary, r.date, JSON.stringify(r.tags), 'Dr.Kuro', 'admin-001', r.importance, now, now
  );
}

// Sample puzzles
const puzzles = [
  { id: 'puz-1', title: '源石结晶排列之谜', description: '在一张源石结晶分布图中，隐藏着一组数字密码。', content: '<p><b>谜题正文</b></p><pre style="font-family:monospace;color:#00d4ff;">X X O X X\nO X X O X\nX O X X O\nX X O O X\nO X X X O</pre><p>晶体分布与经典密码学有关。<b>请问隐藏的信息？</b></p>', category: 'cipher', difficulty: 'hard', hint: '将X视为1，O视为0，每行构成5位二进制数。', solution: '二进制→十进制→字母: VMRSN', status: 'unsolved', tags: ['密码学', '二进制'], attempts: 5 },
  { id: 'puz-2', title: '莱茵生命实验编号推理', description: '找出实验编号RL-XXX的规律。', content: '<p style="font-family:monospace;font-size:18px;color:#00d4ff;">RL-001, RL-003, RL-007, RL-015, RL-031, RL-063, ???</p>', category: 'math', difficulty: 'medium', hint: '注意二进制：1, 11, 111, 1111...', solution: '2^7-1=127 → RL-127', status: 'solved', tags: ['数学', '数列'], attempts: 3, solvedBy: 'Closure', solvedById: 'admin-001', solvedAt: now },
  { id: 'puz-3', title: '深海猎人坐标推演', description: '根据行动轨迹推演下一个目标坐标。', content: '<pre style="font-family:monospace;color:#00d4ff;">(3,1,4) (1,5,9) (2,6,5) (3,5,8) (?,?,?)</pre>', category: 'pattern', difficulty: 'extreme', hint: 'Z = (X*Y) % 10', solution: '(9,7,3)', status: 'unsolved', tags: ['坐标', '数学'], attempts: 12 },
];

for (const p of puzzles) {
  db.prepare(`INSERT INTO puzzles (id, title, description, content, category, difficulty, hint, solution, status, author, author_id, attempts, tags, solved_by, solved_by_id, solved_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    p.id, p.title, p.description, p.content, p.category, p.difficulty, p.hint, p.solution,
    p.status, 'Dr.Kuro', 'admin-001', p.attempts, JSON.stringify(p.tags),
    p.solvedBy || null, p.solvedById || null, p.solvedAt || null, now, now
  );
}

// Sample wiki
const wiki = [
  { id: 'wiki-1', title: '凯撒密码（Caesar Cipher）', content: '<h2 style="font-size:18px;color:#00d4ff;">概述</h2><p>最古老的加密方式。向后移动k位。</p><p><b>加密：</b>E(x)=(x+k) mod 26<br><b>解密：</b>D(x)=(x-k) mod 26</p><p>ARKNIGHTS k=3 → <span style="color:#00d4ff;">DUNQLJKWV</span></p>', category: '经典密码', tags: ['凯撒密码', '替换密码'] },
  { id: 'wiki-2', title: '摩斯密码（Morse Code）', content: '<h2 style="font-size:18px;color:#00d4ff;">编码表</h2><pre style="font-size:13px;">A .-  B -... C -.-. D -..  E .\nF ..-. G --.  H .... I ..   J .---\nK -.-  L .-.. M --   N -.   O ---\nP .--. Q --.- R .-.  S ...  T -\nU ..-  V ...- W .--  X -..- Y -.--\n0 ----- 1 .---- 2 ..--- ... 9 ----.</pre>', category: '经典密码', tags: ['摩斯密码', '编码'] },
  { id: 'wiki-3', title: 'Base64编码', content: '<h2 style="font-size:18px;color:#00d4ff;">特征识别</h2><ul><li>长度为4的倍数</li><li>仅含字母数字+/=</li><li>常用=填充</li></ul>', category: '现代加密', tags: ['Base64'] },
  { id: 'wiki-4', title: '源石技艺符号全览', content: '<h2 style="font-size:18px;color:#00d4ff;">基础符号</h2><p><b>火</b>攻击 | <b>水</b>治疗 | <b>风</b>速度 | <b>土</b>防御</p><p>↑强化 ↓削弱 ↔转换 ⊕共鸣</p>', category: '符号体系', tags: ['源石技艺'] },
  { id: 'wiki-5', title: '维吉尼亚密码', content: '<h2 style="font-size:18px;color:#00d4ff;">概述</h2><p>使用关键词的多表替换密码。「孤星」活动中使用变体。</p>', category: '经典密码', tags: ['维吉尼亚密码'] },
  { id: 'wiki-6', title: '解密工具推荐', content: '<h2 style="font-size:18px;color:#00d4ff;">Web工具</h2><ul><li><b>CyberChef</b> — 最强在线加解密</li><li><b>dCode</b> — 密码学工具集</li></ul><h2 style="font-size:18px;color:#00d4ff;">本地</h2><ul><li>Python: pycryptodome</li><li>Hashcat</li></ul>', category: '解密工具', tags: ['工具'] },
];

for (const w of wiki) {
  db.prepare(`INSERT INTO wiki_entries (id, title, content, category, tags, author, author_id, last_updated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    w.id, w.title, w.content, w.category, JSON.stringify(w.tags), 'Dr.Kuro', 'admin-001', now, now
  );
}

console.log('[Seed] Done! Created admin, 4 records, 3 puzzles, 6 wiki entries.');
