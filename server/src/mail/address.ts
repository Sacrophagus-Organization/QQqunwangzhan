import type { MailAddress } from './types.js';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeLocalPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');
}

export function getMailDomain(): string {
  return process.env.DOMAIN || 'example.com';
}

export function buildAddress(localPart: string): string {
  return `${normalizeLocalPart(localPart)}@${getMailDomain()}`;
}

export function parseAddresses(value: unknown): MailAddress[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === 'string' ? { address: item } : item)
      .filter((item): item is MailAddress => !!item && typeof item.address === 'string')
      .map((item) => ({ address: item.address.trim().toLowerCase(), name: item.name?.trim() || '' }))
      .filter((item) => emailRe.test(item.address));
  }

  if (typeof value !== 'string') return [];
  return value
    .split(/[;,]/)
    .map((address) => address.trim().toLowerCase())
    .filter((address) => emailRe.test(address))
    .map((address) => ({ address }));
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
