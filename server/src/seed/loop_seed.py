# -*- coding: utf-8 -*-
"""LOOP 节点1-4 seed（替代 loopSeed.ts）：zip 打包 + DB 插入。

运行:
  1. 先设置素材目录环境变量 LOOP_ASSET_DIR（指向 LOOP 素材根目录，需含 节点1/节点2/节点4）
     例(Windows):  set LOOP_ASSET_DIR=D:\\QQ下载\\loop && python server/src/seed/loop_seed.py
     例(Linux):    LOOP_ASSET_DIR=/path/to/loop python3 server/src/seed/loop_seed.py
  2. 随后运行: cd server && npx tsx src/seed/sanitize_loop.ts  (过 sanitizeRichHtml)

可选环境变量 LOOP_PROJECT_ROOT：项目根目录，默认取本脚本所在目录向上三级。
"""
import os, re, sys, shutil, sqlite3, zipfile, html, datetime, json
sys.stdout.reconfigure(encoding='utf-8')

# 项目根：默认 server/src/seed -> 上溯三级，可用 LOOP_PROJECT_ROOT 覆盖
BASE = os.environ.get(
    'LOOP_PROJECT_ROOT',
    os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')),
)
# 素材目录：必须通过环境变量指定（本地/服务器路径不同，不得硬编码）
ASSET = os.environ.get('LOOP_ASSET_DIR')
if not ASSET or not os.path.isdir(ASSET):
    print(f'[fatal] LOOP_ASSET_DIR 未设置或路径不存在: {ASSET!r}')
    print('       例: LOOP_ASSET_DIR=D:\\QQ下载\\loop python server/src/seed/loop_seed.py')
    sys.exit(1)
UPLOADS = os.path.join(BASE, 'server', 'uploads')
DB = os.path.join(BASE, 'server', 'data', 'arkoverseer.db')

STORY_ID = 'st-loop-memo1'
PUZZLE_ID = 'puz-loop-node1'
SCENE_ID = 'sc-loop-memo1-1'
CRASH_NAME = 'crash_11020122_143300.log'
CRASH_ID = 'att-loop-crash'
ARCHIVE_ID = 'att-loop-archive'

NODE1 = os.path.join(ASSET, '节点1')
NODE2 = os.path.join(ASSET, '节点2')
NODE4 = os.path.join(ASSET, '节点4')

now = datetime.datetime.now(datetime.timezone.utc).isoformat()

# ---------- 1. zip 打包 ----------
def pack(name, files):
    os.makedirs(UPLOADS, exist_ok=True)
    dst = os.path.join(UPLOADS, name)
    if os.path.exists(dst):
        os.remove(dst)
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as z:
        for arch, src in files.items():
            z.write(src, arch)
    print(f'[zip] {name} <- {list(files)} ({os.path.getsize(dst)} B)')

pack('archive.zip', {'zoot_archive_01.png': os.path.join(NODE1, 'archive', 'zoot_archive_01.png')})
pack('loop.zip', {
    '如果走到尽头.txt': os.path.join(NODE2, '如果走到尽头.txt'),
    'revord{recovered}.wav': os.path.join(NODE2, 'revord{recovered}.wav'),
})
node4_files = {}
for fn in sorted(os.listdir(NODE4)):
    p = os.path.join(NODE4, fn)
    if os.path.isfile(p):
        node4_files[fn] = p
pack('loop-node4.zip', node4_files)

# ---------- 2. DB ----------
bak = DB + '.bak-seed'
if not os.path.exists(bak):
    shutil.copy2(DB, bak)
    print('[db] backup ->', bak)

conn = sqlite3.connect(DB)
cur = conn.cursor()

cur.executescript('''
CREATE TABLE IF NOT EXISTS sarcophagus_codes (
  id TEXT PRIMARY KEY, code TEXT, file_name TEXT, file_path TEXT,
  download_token TEXT, token_expires_at TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY, title TEXT, description TEXT, cover TEXT, author TEXT,
  author_id TEXT, bgm TEXT, status TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS story_scenes (
  id TEXT PRIMARY KEY, story_id TEXT, name TEXT, background TEXT, bgm TEXT,
  bgm_volume REAL, "order" INTEGER, transition TEXT);
CREATE TABLE IF NOT EXISTS story_lines (
  id TEXT PRIMARY KEY, story_id TEXT, scene_id TEXT, speaker TEXT, character_name TEXT,
  text TEXT, left_image TEXT, right_image TEXT, effect TEXT, sfx TEXT, "order" INTEGER);
CREATE TABLE IF NOT EXISTS story_characters (
  id TEXT PRIMARY KEY, story_id TEXT, name TEXT, default_sprite TEXT,
  name_tag_color TEXT, sprites TEXT);
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY, entity_type TEXT, entity_id TEXT, name TEXT, size INTEGER,
  mime_type TEXT, file_path TEXT, uploaded_at TEXT);
CREATE TABLE IF NOT EXISTS puzzles (
  id TEXT PRIMARY KEY, title TEXT, description TEXT, content TEXT, category TEXT,
  difficulty TEXT, hint TEXT, solution TEXT, status TEXT, author TEXT, author_id TEXT,
  solved_by TEXT, solved_by_id TEXT, solved_at TEXT, attempts INTEGER, tags TEXT,
  created_at TEXT, updated_at TEXT);
''')

# sarcophagus codes
# 明文验证码不写入仓库（仓库为公开），改从 gitignore 的外部文件读取：
#   server/seed-assets/sarco_codes.json
#   格式: [["<CODE>", "loop.zip"], ["<CODE>", "loop-node4.zip"]]
CODES_FILE = os.path.join(BASE, 'server', 'seed-assets', 'sarco_codes.json')
if not os.path.isfile(CODES_FILE):
    print(f'[fatal] 缺少石棺验证码文件（含明文，已被 gitignore）: {CODES_FILE}')
    print('        请创建该文件，格式: [["<CODE>","loop.zip"],["<CODE>","loop-node4.zip"]]')
    sys.exit(1)
with open(CODES_FILE, encoding='utf-8') as _f:
    SARCO_CODES = [(str(c), str(n)) for c, n in json.load(_f)]

for code, fname in SARCO_CODES:
    cur.execute(
        'INSERT OR REPLACE INTO sarcophagus_codes (id, code, file_name, file_path, created_at, updated_at) VALUES (?,?,?,?,?,?)',
        (f'code-{fname}', code, fname, os.path.join(UPLOADS, fname), now, now))
    print('[code]', code, '->', fname)

# story
cur.execute(
    'INSERT OR REPLACE INTO stories (id, title, description, cover, author, author_id, bgm, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    (STORY_ID, 'MEMO #1', '工程部内部记录，失而复得。系统正在拒绝被删除。', '', '系统', 'system', '', 'published', now, now))
cur.execute(
    'INSERT OR REPLACE INTO story_scenes (id, story_id, name, background, bgm, bgm_volume, "order", transition) VALUES (?,?,?,?,?,?,?,?)',
    (SCENE_ID, STORY_ID, 'memo#1', '', '', 0.3, 1, 'none'))
# 角色立绘映射：干员A 固定左侧、干员B 固定右侧，'? ? ?' 无立绘
SPRITE_MAP = {
    '? ? ?': '',
    '工程部干员A': '/loop/sprites/工程部干员_左.png',
    '工程部干员B': '/loop/sprites/工程部干员_右.png',
}
for i, (ch, color) in enumerate([('? ? ?', '#9ca3af'), ('工程部干员A', '#f59e0b'), ('工程部干员B', '#38bdf8')], 1):
    cur.execute(
        'INSERT OR REPLACE INTO story_characters (id, story_id, name, default_sprite, name_tag_color, sprites) VALUES (?,?,?,?,?,?)',
        (f'ch-loop-memo1-{i}', STORY_ID, ch, SPRITE_MAP[ch], color, '[]'))

# memo#1.md -> story_lines
# speaker 映射：干员A 在左、干员B 在右，'? ? ?' 用 mystery（无立绘，不触发左右高亮）
SPEAKER_MAP = {
    '? ? ?': 'mystery',
    '工程部干员A': 'left',
    '工程部干员B': 'right',
}
def parse_memo(text):
    out = []
    current = None
    buf = []
    def flush():
        if buf:
            out.append((SPEAKER_MAP.get(current, 'narrator'), current, '\n'.join(buf)))
            buf.clear()
    for raw in text.splitlines():
        s = raw.strip()
        if not s or s.startswith('#'):
            continue
        m = re.match(r'^\[([^\]]+)\]\s*(?:[:：]\s*(.*))?$', s)
        if m:
            name = m.group(1).strip()
            rest = (m.group(2) or '').strip()
            if name in ('...', '记录异常中断'):
                flush(); current = None
                out.append(('narrator', '', '……' if name == '...' else '记录异常中断'))
                continue
            flush(); current = name
            if rest:
                out.append((SPEAKER_MAP.get(name, 'narrator'), name, rest))
            continue
        if current is None:
            out.append(('narrator', '', s))
        else:
            buf.append(s)
    flush()
    return out

memo_text = open(os.path.join(NODE1, 'memo#1.md'), encoding='utf-8').read()
lines_data = parse_memo(memo_text)
for i, (spk, ch, txt) in enumerate(lines_data, 1):
    cur.execute(
        'INSERT OR REPLACE INTO story_lines (id, story_id, scene_id, speaker, character_name, text, left_image, right_image, effect, sfx, "order") VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        (f'ln-loop-memo1-{i:03d}', STORY_ID, SCENE_ID, spk, ch, txt, '', '', 'none', '', i))
print('[story] lines:', len(lines_data))

# crash attachment (story)
# 注意：用 copyfile 而非 copy2——源文件是 2022 年的 mtime，copy2 保留旧 mtime
# 会被 startDiskCleanup() 判定为过期文件（30天）立即删除。
crash_dst = os.path.join(UPLOADS, CRASH_NAME)
shutil.copyfile(os.path.join(NODE1, CRASH_NAME), crash_dst)
cur.execute(
    'INSERT OR REPLACE INTO attachments (id, entity_type, entity_id, name, size, mime_type, file_path, uploaded_at) VALUES (?,?,?,?,?,?,?,?)',
    (CRASH_ID, 'story', STORY_ID, CRASH_NAME, os.path.getsize(crash_dst), 'text/plain', crash_dst, now))
print('[att] crash ->', CRASH_ID)

# puzzle: INTRODUCTION 分段 + 剧情链接
intro = open(os.path.join(NODE1, 'INTRODUCTION #1.txt'), encoding='utf-8').read().strip()
paras = [p.strip() for p in re.split(r'\n\s*\n', intro) if p.strip()]
parts = ['<p>' + html.escape(p).replace('\n', '<br/>') + '</p>' for p in paras]
parts.append(f'<p><a href="/juqing?story={STORY_ID}&after=crash&file={CRASH_ID}" style="color:#f59e0b;font-weight:bold">memo#1</a></p>')
content = '\n'.join(parts)
cur.execute(
    'INSERT OR REPLACE INTO puzzles (id, title, description, content, category, difficulty, hint, solution, status, author, author_id, attempts, tags, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    (PUZZLE_ID, '啥子杯#2', '从旧信封中取出的一段引言。', content, '剧情', 'hard', '', '', 'unsolved', '系统', 'system', 0, '["loop","节点1"]', now, now))
print('[puzzle]', PUZZLE_ID, 'paras:', len(paras))

# archive.zip attachment (puzzle)
zp = os.path.join(UPLOADS, 'archive.zip')
cur.execute(
    'INSERT OR REPLACE INTO attachments (id, entity_type, entity_id, name, size, mime_type, file_path, uploaded_at) VALUES (?,?,?,?,?,?,?,?)',
    (ARCHIVE_ID, 'puzzle', PUZZLE_ID, 'archive.zip', os.path.getsize(zp), 'application/zip', zp, now))
print('[att] archive.zip ->', ARCHIVE_ID)

conn.commit()
conn.close()
print('[done]')
