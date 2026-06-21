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

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
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
    headers: { Authorization: `Bearer ${getToken()}` },
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
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  if (!res.ok) throw new Error('上传失败');
  return res.json();
}

export async function apiUploadAvatar(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('avatar', blob, 'avatar.png');
  const res = await fetch(`${API_BASE}/auth/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '上传失败' }));
    throw new Error(err.error || '上传失败');
  }
  const data = await res.json();
  return data.avatarUrl;
}
