import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

/* ═══════════════════════════════════════
   辅助
   ═══════════════════════════════════════ */

function parseJsonField(val: string) {
  try { return JSON.parse(val); } catch { return {}; }
}

function canEdit(req: AuthRequest): boolean {
  return req.userRole === 'admin' || req.userRole === 'editor';
}

/* ═══════════════════════════════════════
   GET /api/stories — 剧情列表（分页）
   ═══════════════════════════════════════ */
router.get('/', (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status as string;
    const isAdmin = req.userRole === 'admin' || req.userRole === 'editor';

    let where = "WHERE 1=1";
    const params: any[] = [];

    // Non-editors only see published stories
    if (!isAdmin) {
      where += " AND status = 'published'";
    } else if (statusFilter && statusFilter !== 'all') {
      where += " AND status = ?";
      params.push(statusFilter);
    }

    const total = (db.prepare(`SELECT COUNT(*) as cnt FROM stories ${where}`).get(...params) as any)?.cnt || 0;
    const rows = db.prepare(`SELECT * FROM stories ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as any[];

    const data = rows.map(r => ({
      ...r,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      authorId: r.author_id,
    }));

    res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取剧情列表失败' });
  }
});

/* ═══════════════════════════════════════
   POST /api/stories — 创建剧情
   ═══════════════════════════════════════ */
router.post('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    if (!canEdit(req)) return res.status(403).json({ error: '无权创建剧情' });

    const { title, description = '', cover = '', bgm = '' } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: '标题不能为空' });

    const id = 'st-' + uuid().slice(0, 8);
    const now = new Date().toISOString();

    db.prepare(`INSERT INTO stories (id, title, description, cover, author, author_id, bgm, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`)
      .run(id, title.trim(), description, cover, req.userName || '', req.userId || '', bgm, now, now);

    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as any;
    res.status(201).json({
      ...story,
      createdAt: story.created_at,
      updatedAt: story.updated_at,
      authorId: story.author_id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '创建失败' });
  }
});

/* ═══════════════════════════════════════
   GET /api/stories/:id — 剧情详情（元数据+角色）
   ═══════════════════════════════════════ */
router.get('/:id', (req: AuthRequest, res) => {
  try {
    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id) as any;
    if (!story) return res.status(404).json({ error: '剧情不存在' });

    const characters = (db.prepare('SELECT * FROM story_characters WHERE story_id = ? ORDER BY name')
      .all(req.params.id) as any[]).map(c => ({ ...c, nameTagColor: c.name_tag_color, defaultSprite: c.default_sprite, sprites: parseJsonField(c.sprites), storyId: c.story_id }));

    res.json({
      ...story,
      createdAt: story.created_at,
      updatedAt: story.updated_at,
      authorId: story.author_id,
      characters,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════
   PUT /api/stories/:id — 编辑剧情元数据
   ═══════════════════════════════════════ */
router.put('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    if (!canEdit(req)) return res.status(403).json({ error: '无权编辑' });

    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id) as any;
    if (!story) return res.status(404).json({ error: '剧情不存在' });

    const { title, description, cover, bgm, status } = req.body;
    const now = new Date().toISOString();

    db.prepare(`UPDATE stories SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      cover = COALESCE(?, cover),
      bgm = COALESCE(?, bgm),
      status = COALESCE(?, status),
      updated_at = ?
      WHERE id = ?`)
      .run(title?.trim() || null, description !== undefined ? description : null, cover !== undefined ? cover : null, bgm !== undefined ? bgm : null, status || null, now, req.params.id);

    const updated = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id) as any;
    res.json({
      ...updated,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      authorId: updated.author_id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '更新失败' });
  }
});

/* ═══════════════════════════════════════
   DELETE /api/stories/:id — 删除剧情（级联）
   ═══════════════════════════════════════ */
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'admin') return res.status(403).json({ error: '仅管理员可删除' });

    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id) as any;
    if (!story) return res.status(404).json({ error: '剧情不存在' });

    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM story_progress WHERE story_id = ?').run(req.params.id);
      db.prepare('DELETE FROM story_choices WHERE story_id = ?').run(req.params.id);
      db.prepare('DELETE FROM story_lines WHERE story_id = ?').run(req.params.id);
      db.prepare('DELETE FROM story_scenes WHERE story_id = ?').run(req.params.id);
      db.prepare('DELETE FROM story_characters WHERE story_id = ?').run(req.params.id);
      db.prepare('DELETE FROM stories WHERE id = ?').run(req.params.id);
    });
    deleteTx();

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '删除失败' });
  }
});

/* ═══════════════════════════════════════
   GET /api/stories/:id/play — 获取完整播放数据
   ═══════════════════════════════════════ */
router.get('/:id/play', (req: AuthRequest, res) => {
  try {
    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id) as any;
    if (!story) return res.status(404).json({ error: '剧情不存在' });

    const characters = (db.prepare('SELECT * FROM story_characters WHERE story_id = ?').all(req.params.id) as any[])
      .map(c => ({ ...c, storyId: c.story_id, nameTagColor: c.name_tag_color, defaultSprite: c.default_sprite, sprites: parseJsonField(c.sprites) }));

    const scenes = (db.prepare('SELECT * FROM story_scenes WHERE story_id = ? ORDER BY "order"').all(req.params.id) as any[])
      .map(s => ({ ...s, storyId: s.story_id, bgmVolume: s.bgm_volume }));

    const lines = (db.prepare('SELECT * FROM story_lines WHERE story_id = ? ORDER BY "order"').all(req.params.id) as any[])
      .map(l => ({ ...l, storyId: l.story_id, sceneId: l.scene_id, characterName: l.character_name, leftImage: l.left_image || undefined, rightImage: l.right_image || undefined }));

    const choices = (db.prepare('SELECT * FROM story_choices WHERE story_id = ?').all(req.params.id) as any[])
      .map(c => ({ ...c, storyId: c.story_id, lineId: c.line_id, targetLineOrder: c.target_line_order }));

    res.json({
      story: {
        ...story,
        createdAt: story.created_at,
        updatedAt: story.updated_at,
        authorId: story.author_id,
      },
      characters,
      scenes,
      lines,
      choices,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════
   PUT /api/stories/:id/scenes — 批量更新场景
   ═══════════════════════════════════════ */
router.put('/:id/scenes', authMiddleware, (req: AuthRequest, res) => {
  try {
    if (!canEdit(req)) return res.status(403).json({ error: '无权编辑' });

    const story = db.prepare('SELECT id FROM stories WHERE id = ?').get(req.params.id) as any;
    if (!story) return res.status(404).json({ error: '剧情不存在' });

    const scenes = req.body.scenes as any[];
    if (!Array.isArray(scenes)) return res.status(400).json({ error: 'scenes 须为数组' });

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM story_scenes WHERE story_id = ?').run(req.params.id);
      const insert = db.prepare(
        'INSERT INTO story_scenes (id, story_id, name, background, bgm, bgm_volume, "order", transition) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      for (const s of scenes) {
        const id = s.id || 'st-sc-' + uuid().slice(0, 8);
        insert.run(id, req.params.id, s.name || '未命名场景', s.background || '', s.bgm || '', s.bgmVolume ?? 0.3, s.order ?? 0, s.transition || 'none');
      }
    });
    tx();

    const updated = db.prepare('SELECT * FROM story_scenes WHERE story_id = ? ORDER BY "order"').all(req.params.id) as any[];
    res.json(updated.map(s => ({ ...s, storyId: s.story_id, bgmVolume: s.bgm_volume })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════
   PUT /api/stories/:id/lines — 批量更新台词
   ═══════════════════════════════════════ */
router.put('/:id/lines', authMiddleware, (req: AuthRequest, res) => {
  try {
    if (!canEdit(req)) return res.status(403).json({ error: '无权编辑' });

    const story = db.prepare('SELECT id FROM stories WHERE id = ?').get(req.params.id) as any;
    if (!story) return res.status(404).json({ error: '剧情不存在' });

    const lines = req.body.lines as any[];
    if (!Array.isArray(lines)) return res.status(400).json({ error: 'lines 须为数组' });

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM story_lines WHERE story_id = ?').run(req.params.id);
      const insert = db.prepare(
        'INSERT INTO story_lines (id, story_id, scene_id, speaker, character_name, text, left_image, right_image, effect, sfx, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      for (const l of lines) {
        const id = l.id || 'st-ln-' + uuid().slice(0, 8);
        insert.run(id, req.params.id, l.sceneId || '', l.speaker || 'narrator', l.characterName || '', l.text || '', l.leftImage || '', l.rightImage || '', l.effect || 'none', l.sfx || '', l.order ?? 0);
      }
    });
    tx();

    const updated = db.prepare('SELECT * FROM story_lines WHERE story_id = ? ORDER BY "order"').all(req.params.id) as any[];
    res.json(updated.map(l => ({ ...l, storyId: l.story_id, sceneId: l.scene_id, characterName: l.character_name, leftImage: l.left_image || undefined, rightImage: l.right_image || undefined })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════
   PUT /api/stories/:id/characters — 批量更新角色
   ═══════════════════════════════════════ */
router.put('/:id/characters', authMiddleware, (req: AuthRequest, res) => {
  try {
    if (!canEdit(req)) return res.status(403).json({ error: '无权编辑' });

    const story = db.prepare('SELECT id FROM stories WHERE id = ?').get(req.params.id) as any;
    if (!story) return res.status(404).json({ error: '剧情不存在' });

    const characters = req.body.characters as any[];
    if (!Array.isArray(characters)) return res.status(400).json({ error: 'characters 须为数组' });

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM story_characters WHERE story_id = ?').run(req.params.id);
      const insert = db.prepare(
        'INSERT INTO story_characters (id, story_id, name, default_sprite, name_tag_color, sprites) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const c of characters) {
        const id = c.id || 'st-ch-' + uuid().slice(0, 8);
        insert.run(id, req.params.id, c.name || '未命名', c.defaultSprite || '', c.nameTagColor || '#c9a96e', JSON.stringify(c.sprites || {}));
      }
    });
    tx();

    const updated = db.prepare('SELECT * FROM story_characters WHERE story_id = ?').all(req.params.id) as any[];
    res.json(updated.map(c => ({ ...c, storyId: c.story_id, nameTagColor: c.name_tag_color, defaultSprite: c.default_sprite, sprites: parseJsonField(c.sprites) })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════
   PUT /api/stories/:id/choices — 批量更新选项
   ═══════════════════════════════════════ */
router.put('/:id/choices', authMiddleware, (req: AuthRequest, res) => {
  try {
    if (!canEdit(req)) return res.status(403).json({ error: '无权编辑' });

    const story = db.prepare('SELECT id FROM stories WHERE id = ?').get(req.params.id) as any;
    if (!story) return res.status(404).json({ error: '剧情不存在' });

    const choices = req.body.choices as any[];
    if (!Array.isArray(choices)) return res.status(400).json({ error: 'choices 须为数组' });

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM story_choices WHERE story_id = ?').run(req.params.id);
      const insert = db.prepare(
        'INSERT INTO story_choices (id, story_id, line_id, text, target_line_order) VALUES (?, ?, ?, ?, ?)'
      );
      for (const c of choices) {
        const id = c.id || 'st-cl-' + uuid().slice(0, 8);
        insert.run(id, req.params.id, c.lineId || '', c.text || '', c.targetLineOrder ?? 0);
      }
    });
    tx();

    const updated = db.prepare('SELECT * FROM story_choices WHERE story_id = ?').all(req.params.id) as any[];
    res.json(updated.map(c => ({ ...c, storyId: c.story_id, lineId: c.line_id, targetLineOrder: c.target_line_order })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════
   GET /api/stories/:id/progress — 获取阅读进度
   ═══════════════════════════════════════ */
router.get('/:id/progress', authMiddleware, (req: AuthRequest, res) => {
  try {
    const row = db.prepare('SELECT * FROM story_progress WHERE user_id = ? AND story_id = ?')
      .get(req.userId, req.params.id) as any;
    if (!row) return res.json({ sceneIndex: 0, lineIndex: 0 });
    res.json({ sceneIndex: row.scene_index, lineIndex: row.line_index, updatedAt: row.updated_at });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════
   POST /api/stories/:id/progress — 保存进度
   ═══════════════════════════════════════ */
router.post('/:id/progress', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { sceneIndex = 0, lineIndex = 0 } = req.body;
    const now = new Date().toISOString();

    db.prepare(`INSERT INTO story_progress (id, user_id, story_id, scene_index, line_index, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, story_id) DO UPDATE SET scene_index = ?, line_index = ?, updated_at = ?`)
      .run('st-pr-' + uuid().slice(0, 8), req.userId, req.params.id, sceneIndex, lineIndex, now, sceneIndex, lineIndex, now);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
