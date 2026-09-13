import seed from '../server/seed.json' with { type: 'json' };
import calendar from '../js/calendar.js';

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
    (task.due === undefined || calendar.validDate(task.due));
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

export function freshState() {
  return {
    owner: null,
    tasks: structuredClone(seed),
    weekAnchor: { ...calendar.defaultAnchor },
    scheduleChanges: [],
    pending: null,
    lastUpdateId: -1,
    webhookActive: false,
  };
}

export function validateState(input) {
  if (!input || typeof input !== 'object') throw new Error('invalid_state');
  if (!Array.isArray(input.tasks) || input.tasks.length > calendar.subjects.length || !input.tasks.every(validTask)) throw new Error('invalid_tasks');
  if (!Array.isArray(input.scheduleChanges) || input.scheduleChanges.length > 200 || !input.scheduleChanges.every(validChange)) throw new Error('invalid_changes');
  if (input.owner !== null && (!Number.isSafeInteger(input.owner) || input.owner <= 0)) throw new Error('invalid_owner');
  if (input.pending !== null && input.pending !== undefined && (typeof input.pending !== 'object' || JSON.stringify(input.pending).length > 50000)) throw new Error('invalid_pending');
  return {
    owner: input.owner ?? null,
    tasks: input.tasks,
    weekAnchor: calendar.validAnchor(input.weekAnchor) ? input.weekAnchor : { ...calendar.defaultAnchor },
    scheduleChanges: input.scheduleChanges,
    pending: input.pending || null,
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
    weekAnchor: input.weekAnchor,
    scheduleChanges: input.scheduleChanges,
    pending: null,
    lastUpdateId: -1,
    webhookActive: false,
  });
  return { tasks: checked.tasks, weekAnchor: checked.weekAnchor, scheduleChanges: checked.scheduleChanges };
}

export async function loadState() {
  const stored = await command(['GET', stateKey]);
  if (stored !== null && stored !== undefined) {
    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
    return validateState(parsed);
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
  if (encoded.length > 250000) throw new Error('state_too_large');
  await command(['SET', stateKey, encoded]);
  return clean;
}
