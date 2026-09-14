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
    return Response.json({ ok: true, result: true });
  }
  throw new Error('Unexpected fetch target');
};

const { POST: setup } = await import('../api/setup.mjs');
const { POST: webhook } = await import('../api/telegram.mjs');
const { GET: homework } = await import('../api/homework.mjs');
const { GET: health } = await import('../api/health.mjs');

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

const apiResponse = await homework();
assert.equal(apiResponse.status, 200);
const apiData = await apiResponse.json();
assert.equal(apiData.version, 4);
assert.equal(apiData.botConnected, true);
assert.equal('settingsKey' in apiData, false);
assert.equal(apiData.tasks.length, 5);

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
console.log('PASS: Vercel API, Redis persistence, secret webhook, public multi-user access and duplicate protection');
