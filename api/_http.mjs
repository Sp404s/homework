import { timingSafeEqual } from 'node:crypto';

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...jsonHeaders, ...headers } });
}

export function sameSecret(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || !left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hasBearer(request, secret) {
  const value = request.headers.get('authorization') || '';
  return sameSecret(value, `Bearer ${secret || ''}`);
}

export function validPublicUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      url.pathname.replaceAll('/', '') === '' && !url.search && !url.hash ? url.origin : null;
  } catch { return null; }
}

export function validWebhookSecret(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value);
}
