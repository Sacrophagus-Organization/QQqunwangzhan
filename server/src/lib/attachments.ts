import { db } from '../db.js';

export interface AttachmentDTO {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  uploadedAt: string;
}

function toDTO(a: any): AttachmentDTO {
  return {
    id: a.id,
    name: a.name,
    size: a.size,
    type: a.mime_type,
    dataUrl: `/api/files/${a.id}`,
    uploadedAt: a.uploaded_at,
  };
}

/** 查询单个实体的附件 */
export function getAttachments(type: string, entityId: string): AttachmentDTO[] {
  return (db.prepare('SELECT * FROM attachments WHERE entity_type=? AND entity_id=?').all(type, entityId) as any[])
    .map(toDTO);
}

/** 批量查询多个实体的附件（消除 N+1 查询），返回 { entityId: AttachmentDTO[] } */
export function getAttachmentsMap(type: string, entityIds: string[]): Record<string, AttachmentDTO[]> {
  const map: Record<string, AttachmentDTO[]> = {};
  if (entityIds.length === 0) return map;
  for (const id of entityIds) map[id] = [];
  const placeholders = entityIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT * FROM attachments WHERE entity_type=? AND entity_id IN (${placeholders})`
  ).all(type, ...entityIds) as any[];
  for (const a of rows) {
    (map[a.entity_id] ||= []).push(toDTO(a));
  }
  return map;
}

/** 安全解析 tags JSON，避免非法数据导致 500 */
export function safeParseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
