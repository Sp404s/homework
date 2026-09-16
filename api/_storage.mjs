import seed from '../server/seed.json' with { type: 'json' };
import calendar from '../js/calendar.js';
import { MAX_ATTACHMENTS, validAttachment } from './_attachments.mjs';
import { createHash } from 'node:crypto';

const stateKey = process.env.STUDENT_STATE_KEY || 'student-portal:state:v1';
const redisUrl = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const redisToken = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';

export function storageConfigured() {
  return /^https:\/\//.test(redisUrl()) && redisToken().length >= 20;
}

async function command(parts) {
  if (!storageConfigured()) throw new Error('storage_not_configured');
  const response = await fetch(redisUrl(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parts),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('storage_unavailable');
  const data = await response.json();
  if (data.error) throw new Error('storage_command_failed');
  return data.result;
}

function validTask(task) {
  return task && calendar.subjects.includes(task.subject) && typeof task.text === 'string' && task.text.length <= 4000 &&
    (task.next === undefined || (typeof task.next === 'string' && task.next.length <= 4000)) &&
    (task.textZh === undefined || (typeof task.textZh === 'string' && task.textZh.length <= 8000)) &&
    (task.nextZh === undefined || (typeof task.nextZh === 'string' && task.nextZh.length <= 8000)) &&
    (task.due === undefined || calendar.validDate(task.due)) &&
    (task.attachments === undefined || (Array.isArray(task.attachments) && task.attachments.length <= MAX_ATTACHMENTS && task.attachments.every(validAttachment)));
}

function materializeTask(task, anchor, changes, now = new Date()) {
  if (calendar.validDate(task.due)) return { ...task };
  const due = calendar.nextDate(task.subject, anchor, now, changes);
  return due ? { ...task, due } : { ...task };
}

function normalizeHistory(history, tasks, anchor, changes) {
  const source = Array.isArray(history) ? history : tasks;
  const unique = new Map();
  for (const item of source.map(task => materializeTask(task, anchor, changes))) {
    const key = `${item.subject}\u0000${item.due || ''}\u0000${item.text}`;
    unique.set(key, item);
  }
  return [...unique.values()].slice(-200);
}

function translationKey(source) {
  return `${stateKey}:translation:zh:${createHash('sha256').update(source).digest('hex')}`;
}

export async function loadCachedTranslation(source) {
  if (typeof source !== 'string' || !source || source.length > 4000) return null;
  const value = await command(['GET', translationKey(source)]);
  return typeof value === 'string' && value.length <= 8000 ? value : null;
}

export async function saveCachedTranslation(source, translated) {
  if (typeof source !== 'string' || !source || source.length > 4000 ||
      typeof translated !== 'string' || !translated || translated.length > 8000) return false;
  await command(['SET', translationKey(source), translated, 'EX', '31536000']);
  return true;
}

function validChange(change) {
  return change && typeof change.id === 'string' && change.id.length <= 200 &&
    (change.sourceDate === null || calendar.validDate(change.sourceDate)) &&
    (change.sourceId === null || (typeof change.sourceId === 'string' && change.sourceId.length <= 200)) &&
    calendar.validDate(change.date) && /^\d{2}:\d{2}–\d{2}:\d{2}$/.test(change.time) &&
    calendar.subjects.includes(change.subject) && typeof change.type === 'string' && change.type.length <= 100 &&
    typeof change.teacher === 'string' && change.teacher.length <= 300 && typeof change.place === 'string' && change.place.length <= 300 &&
    typeof change.cancelled === 'boolean';
}

function validPendingByUser(value) {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_pending_users');
  const entries = Object.entries(value);
  if (entries.length > 500 || JSON.stringify(value).length > 200000) throw new Error('invalid_pending_users');
  for (const [userId, pending] of entries) {
    if (!/^[1-9]\d{0,18}$/.test(userId) || !pending || typeof pending !== 'object' || Array.isArray(pending) || JSON.stringify(pending).length > 50000) {
      throw new Error('invalid_pending_users');
    }
  }
  return value;
}

export function freshState() {
  const tasks = structuredClone(seed).map(task => materializeTask(task, calendar.defaultAnchor, []));
  return {
    owner: null,
    tasks,
    history: structuredClone(tasks),
    weekAnchor: { ...calendar.defaultAnchor },
    scheduleChanges: [],
    pending: null,
    pendingByUser: {},
    lastUpdateId: -1,
    webhookActive: false,
  };
}

export function validateState(input) {
  if (!input || typeof input !== 'object') throw new Error('invalid_state');
  if (!Array.isArray(input.tasks) || input.tasks.length > calendar.subjects.length || !input.tasks.every(validTask)) throw new Error('invalid_tasks');
  if (!Array.isArray(input.scheduleChanges) || input.scheduleChanges.length > 200 || !input.scheduleChanges.every(validChange)) throw new Error('invalid_changes');
  if (input.history !== undefined && (!Array.isArray(input.history) || input.history.length > 200 || !input.history.every(validTask))) throw new Error('invalid_history');
  if (input.owner !== null && (!Number.isSafeInteger(input.owner) || input.owner <= 0)) throw new Error('invalid_owner');
  if (input.pending !== null && input.pending !== undefined && (typeof input.pending !== 'object' || JSON.stringify(input.pending).length > 50000)) throw new Error('invalid_pending');
  const weekAnchor = { ...calendar.defaultAnchor };
  const tasks = input.tasks.map(task => materializeTask(task, weekAnchor, input.scheduleChanges));
  return {
    owner: input.owner ?? null,
    tasks,
    history: normalizeHistory(input.history, tasks, weekAnchor, input.scheduleChanges),
    weekAnchor,
    scheduleChanges: input.scheduleChanges,
    pending: input.pending || null,
    pendingByUser: validPendingByUser(input.pendingByUser),
    lastUpdateId: Number.isSafeInteger(input.lastUpdateId) ? input.lastUpdateId : -1,
    webhookActive: input.webhookActive === true,
    ...(typeof input.botUsername === 'string' ? { botUsername: input.botUsername.slice(0, 100) } : {}),
    ...(typeof input.lastUpdateAt === 'string' ? { lastUpdateAt: input.lastUpdateAt.slice(0, 40) } : {}),
  };
}

export function validatePublicSnapshot(input) {
  if (!input || typeof input !== 'object') throw new Error('invalid_snapshot');
  const checked = validateState({
    owner: null,
    tasks: input.tasks,
    history: input.history,
    weekAnchor: input.weekAnchor,
    scheduleChanges: input.scheduleChanges,
    pending: null,
    lastUpdateId: -1,
    webhookActive: false,
  });
  return { tasks: checked.tasks, history: checked.history, weekAnchor: checked.weekAnchor, scheduleChanges: checked.scheduleChanges };
}

export async function loadState() {
  const stored = await command(['GET', stateKey]);
  if (stored !== null && stored !== undefined) {
    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
    const clean = validateState(parsed);
    // Persist one-time schema migrations (for example history and fixed due dates),
    // otherwise a legacy automatic deadline would move again on every request.
    if (JSON.stringify(clean) !== JSON.stringify(parsed)) {
      await command(['SET', stateKey, JSON.stringify(clean)]);
    }
    return clean;
  }
  const initial = freshState();
  const created = await command(['SET', stateKey, JSON.stringify(initial), 'NX']);
  if (created) return initial;
  const concurrent = await command(['GET', stateKey]);
  return validateState(typeof concurrent === 'string' ? JSON.parse(concurrent) : concurrent);
}

export async function saveState(state) {
  const clean = validateState(state);
  const encoded = JSON.stringify(clean);
  if (encoded.length > 900000) throw new Error('state_too_large');
  await command(['SET', stateKey, encoded]);
  return clean;
}
