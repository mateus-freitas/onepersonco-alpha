import { isIP } from 'node:net';
import { IdeaError, strictKeys } from './ideas.mjs';

function privateIPv4(host) {
  if (isIP(host) !== 4) return false;
  const [a, b] = host.split('.').map(Number);
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 100 && b >= 64 && b <= 127);
}
export function allowedHost(host, port, lan = false) {
  if (typeof host !== 'string') return false;
  const match = /^(localhost|127\.0\.0\.1|\[::1\]|\d+\.\d+\.\d+\.\d+)(?::([1-9]\d*))?$/.exec(host);
  if (!match || Number(match[2] ?? 80) !== port) return false;
  return ['localhost', '127.0.0.1', '[::1]'].includes(match[1]) || (lan && privateIPv4(match[1]));
}
export function allowedOrigin(origin, host, port, lan = false) {
  if (origin === undefined) return true;
  return allowedHost(host, port, lan) && origin === `http://${host}`;
}
export const ideaErrorStatus = e => ({ invalid: 400, not_found: 404, conflict: 409, locked: 503, corrupt: 500 })[e.code] || 500;
export const ideaErrorPayload = e => ({ ok: false, code: ['invalid', 'not_found', 'conflict', 'locked', 'corrupt'].includes(e.code) ? e.code : 'internal', error: e.message, ...(e.current ? { current: e.current } : {}) });
export async function ideaRequest(store, pathname, body) {
  if (pathname === '/idea/add') {
    strictKeys(body, ['title', 'original', 'sourceUrl', 'projectId', 'requestId'], 'add');
    if (typeof body.requestId !== 'string' || !body.requestId.trim()) throw new IdeaError('invalid', 'requestId required');
    return store.add(body);
  }
  strictKeys(body, ['id', 'revision', 'patch'], 'update');
  if (typeof body.id !== 'string') throw new IdeaError('invalid', 'id required');
  return store.update(body.id, body.revision, body.patch, { allowOriginal: true });
}
