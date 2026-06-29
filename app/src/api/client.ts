const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('arkoverseer_token');
}

export function setToken(token: string) {
  localStorage.setItem('arkoverseer_token', token);
}

export function clearToken() {
  localStorage.removeItem('arkoverseer_token');
}

/** 构建 headers：只在有 token 时发送 Authorization，避免发送 "Bearer null" */
function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: buildHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || '请求失败');
  }
  return res.json();
}

export async function apiPost<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || '请求失败');
  }
  return res.json();
}

export async function apiPut<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || '请求失败');
  }
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || '请求失败');
  }
  return res.json();
}

export async function apiUpload(entityType: string, entityId: string, files: File[]): Promise<any[]> {
  const formData = new FormData();
  formData.append('entityType', entityType);
  formData.append('entityId', entityId);
  files.forEach(f => formData.append('files', f));
  const res = await fetch(`${API_BASE}/files`, {
    method: 'POST',
    headers: buildHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error('上传失败');
  return res.json();
}

export async function apiDownload(url: string, filename: string) {
  const res = await fetch(url, {
    headers: buildHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '下载失败' }));
    throw new Error(err.error || '下载失败');
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export async function apiUploadImage(file: File): Promise<{ url: string; filename: string; size: number }> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${API_BASE}/images/upload`, {
    method: 'POST',
    headers: buildHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '上传失败' }));
    throw new Error(err.error || '上传失败');
  }
  return res.json();
}

export async function apiUploadAvatar(blob: Blob, ext?: string): Promise<string> {
  const formData = new FormData();
  let filename: string;
  if (ext) {
    filename = 'avatar' + (ext.startsWith('.') ? ext : '.' + ext);
  } else if (blob.type === 'image/gif') {
    filename = 'avatar.gif';
  } else if (blob.type === 'image/webp') {
    filename = 'avatar.webp';
  } else if (blob.type === 'image/jpeg') {
    filename = 'avatar.jpg';
  } else {
    filename = 'avatar.png';
  }
  formData.append('avatar', blob, filename);
  const res = await fetch(`${API_BASE}/auth/avatar`, {
    method: 'POST',
    headers: buildHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '上传失败' }));
    throw new Error(err.error || '上传失败');
  }
  const data = await res.json();
  return data.avatarUrl;
}
