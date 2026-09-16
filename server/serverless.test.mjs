import assert from 'node:assert/strict';

process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test_token_that_is_long_enough_123456';
process.env.BOT_TOKEN = '123456789:test_bot_token_that_is_long_enough_123456';
process.env.BOT_USERNAME = 'Polytech_homework_bot';
process.env.TELEGRAM_WEBHOOK_SECRET = 'webhook_secret_12345678901234567890';
process.env.BOT_PAIRING_CODE = 'pairing_code_1234567890';
process.env.SETUP_SECRET = 'setup_secret_1234567890123456789012';
process.env.PUBLIC_BASE_URL = 'https://homework.example.test';

const database = new Map();
const telegramCalls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  if (target === process.env.UPSTASH_REDIS_REST_URL) {
    const [name, key, value, modifier] = JSON.parse(options.body);
    if (name === 'GET') return Response.json({ result: database.has(key) ? database.get(key) : null });
    if (name === 'SET') {
      if (modifier === 'NX' && database.has(key)) return Response.json({ result: null });
      database.set(key, value);
      return Response.json({ result: 'OK' });
    }
    return Response.json({ error: 'unsupported' }, { status: 400 });
  }
  if (target.startsWith('https://api.telegram.org/bot')) {
    const method = target.slice(target.lastIndexOf('/') + 1);
    const body = JSON.parse(options.body || '{}');
    telegramCalls.push({ method, body });
    if (method === 'getMe') return Response.json({ ok: true, result: { id: 7, username: 'Polytech_homework_bot' } });
    if (method === 'getFile') return Response.json({ ok: true, result: { file_path: 'documents/paper.pdf', file_size: 4 } });
    return Response.json({ ok: true, result: true });
  }
  if (target.startsWith('https://api.telegram.org/file/bot')) {
    return new Response(Uint8Array.from([37, 80, 68, 70]), { headers: { 'Content-Type': 'application/pdf', 'Content-Length': '4' } });
  }
  if (target.startsWith('https://translate.googleapis.com/translate_a/single')) {
    const source = new URLSearchParams(String(options.body)).get('q');
    return Response.json([[[`中文：${source}`, source]]]);
  }
  throw new Error('Unexpected fetch target');
};

const { POST: setup } = await import('../api/setup.mjs');
const { POST: webhook } = await import('../api/telegram.mjs');
const { GET: homework } = await import('../api/homework.mjs');
const { GET: health } = await import('../api/health.mjs');
const { GET: fileDownload } = await import('../api/file.mjs');
const { loadState, saveState, validateState } = await import('../api/_storage.mjs');

const unauthorized = await setup(new Request('https://homework.example.test/api/setup', { method: 'POST' }));
assert.equal(unauthorized.status, 401);
const setupResponse = await setup(new Request('https://homework.example.test/api/setup', {
  method: 'POST', headers: { Authorization: `Bearer ${process.env.SETUP_SECRET}` },
}));
assert.equal(setupResponse.status, 200);
const setWebhook = telegramCalls.find(call => call.method === 'setWebhook');
assert.equal(setWebhook.body.url, 'https://homework.example.test/api/telegram');
assert.equal(setWebhook.body.secret_token, process.env.TELEGRAM_WEBHOOK_SECRET);
assert.equal(setWebhook.body.max_connections, 1);

const badWebhook = await webhook(new Request('https://homework.example.test/api/telegram', {
  method: 'POST', body: JSON.stringify({ update_id: 1 }), headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': 'wrong' },
}));
assert.equal(badWebhook.status, 403);

const publicUpdate = { update_id: 1, message: { message_id: 1, from: { id: 42, is_bot: false }, chat: { id: 42, type: 'private' }, text: '/start' } };
const accessResponse = await webhook(new Request('https://homework.example.test/api/telegram', {
  method: 'POST', body: JSON.stringify(publicUpdate), headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': process.env.TELEGRAM_WEBHOOK_SECRET },
}));
assert.equal(accessResponse.status, 200);
assert.ok(telegramCalls.some(call => call.method === 'sendMessage' && call.body.chat_id === 42));

const secondUserUpdate = { update_id: 2, message: { message_id: 2, from: { id: 99, is_bot: false }, chat: { id: 99, type: 'private' }, text: '📅 Изменить расписание' } };
const secondUserResponse = await webhook(new Request('https://homework.example.test/api/telegram', {
  method: 'POST', body: JSON.stringify(secondUserUpdate), headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': process.env.TELEGRAM_WEBHOOK_SECRET },
}));
assert.equal(secondUserResponse.status, 200);
assert.ok(telegramCalls.some(call => call.method === 'sendMessage' && call.body.chat_id === 99));

const state = await loadState();
const unsafeState = structuredClone(state);
unsafeState.tasks[0].attachments = [{ type: 'link', name: 'bad', url: 'javascript:alert(1)' }];
assert.throws(() => validateState(unsafeState), /invalid_tasks/);
const unsafeHistory = structuredClone(state);
unsafeHistory.history = [{ subject: 'Неизвестный предмет', text: 'bad', due: '2026-09-18' }];
assert.throws(() => validateState(unsafeHistory), /invalid_history/);
state.tasks[0].attachments = [
  { type: 'link', name: 'example.com', url: 'https://example.com/article' },
  { type: 'file', name: 'Статья.pdf', fileId: 'telegram_file_id_1', uniqueId: 'unique_file_1', size: 4, mimeType: 'application/pdf' },
];
state.history[0] = structuredClone(state.tasks[0]);
await saveState(state);

const apiResponse = await homework();
assert.equal(apiResponse.status, 200);
const apiData = await apiResponse.json();
assert.equal(apiData.version, 7);
assert.equal(apiData.botConnected, true);
assert.equal('settingsKey' in apiData, false);
assert.equal(apiData.tasks.length, 5);
assert.equal(apiData.history.length, 5);
assert.ok(apiData.tasks[0].textZh.startsWith('中文：'));
assert.ok(apiData.history[0].textZh.startsWith('中文：'));
assert.equal(apiData.tasks[0].attachments[0].url, 'https://example.com/article');
assert.ok(apiData.tasks[0].attachments[1].url.startsWith('/api/file?'));
assert.equal('fileId' in apiData.tasks[0].attachments[1], false);
assert.equal(JSON.stringify(apiData).includes('telegram_file_id_1'), false);

const callsBeforeWrongFile = telegramCalls.length;
const wrongFile = await fileDownload(new Request('https://homework.example.test/api/file?subject=' +
  encodeURIComponent(state.tasks[0].subject) + '&index=1&key=wrong'));
assert.equal(wrongFile.status, 404);
assert.equal(telegramCalls.length, callsBeforeWrongFile);
const fileResponse = await fileDownload(new Request(new URL(apiData.tasks[0].attachments[1].url, 'https://homework.example.test')));
assert.equal(fileResponse.status, 200);
assert.equal(fileResponse.headers.get('content-type'), 'application/octet-stream');
assert.ok(fileResponse.headers.get('content-disposition').includes("filename*=UTF-8''"));
assert.deepEqual([...new Uint8Array(await fileResponse.arrayBuffer())], [37, 80, 68, 70]);

// Файл остаётся доступен из журнала, даже когда актуальное задание уже заменено.
state.tasks[0].attachments = [];
await saveState(state);
const archivedFileResponse = await fileDownload(new Request(new URL(apiData.tasks[0].attachments[1].url, 'https://homework.example.test')));
assert.equal(archivedFileResponse.status, 200);

const healthResponse = await health();
const healthData = await healthResponse.json();
assert.equal(healthData.ok, true);
assert.equal(healthData.checks.webhook, true);

const callsBeforeDuplicate = telegramCalls.length;
const duplicate = await webhook(new Request('https://homework.example.test/api/telegram', {
  method: 'POST', body: JSON.stringify(publicUpdate), headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': process.env.TELEGRAM_WEBHOOK_SECRET },
}));
assert.equal(duplicate.status, 200);
assert.equal(telegramCalls.length, callsBeforeDuplicate);

globalThis.fetch = realFetch;
console.log('PASS: Vercel API, Redis, webhook security, dynamic translation, attachments and duplicate protection');
