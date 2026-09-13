import http from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import calendar from '../js/calendar.js';
import { createController } from './bot.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dataDir = process.env.STUDENT_DATA_DIR || path.join(root, 'server', 'private');
const stateFile = path.join(dataDir, 'state.json');
const token = process.env.BOT_TOKEN; delete process.env.BOT_TOKEN;
const webOnly = process.argv.includes('--web-only');
await mkdir(dataDir, { recursive: true });
let state;
try { state = JSON.parse(await readFile(stateFile, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw new Error('База не прочитана. Существующий файл не изменён.');
  state = { owner: null, offset: 0, tasks: JSON.parse(await readFile(path.join(root, 'server', 'seed.json'), 'utf8')) };
}
if (!Array.isArray(state.tasks)) throw new Error('Неверный формат базы заданий.');
if (!calendar.validAnchor(state.weekAnchor)) state.weekAnchor = { ...calendar.defaultAnchor };
if (!Array.isArray(state.scheduleChanges)) state.scheduleChanges = [];
if (state.pending && !state.pending.kind) state.pending = null;
let queue = Promise.resolve();
function save() {
  const snapshot = JSON.stringify(state, null, 2);
  queue = queue.catch(() => {}).then(async () => {
    await writeFile(`${stateFile}.tmp`, snapshot, { mode: 0o600 });
    await rename(`${stateFile}.tmp`, stateFile);
  });
  return queue;
}
let connected = false;
let status = webOnly ? 'web-only' : 'connecting';
let lastSuccess = 0;
const pairingCode = randomBytes(16).toString('hex');
const expires = Date.now() + 1800000;
async function telegram(method, body = {}) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(35000),
    });
    const result = await response.json();
    if (!result.ok) {
      if ((method === 'editMessageText' || method === 'editMessageReplyMarkup') && result.error_code === 400 && result.description?.includes('message is not modified')) return {};
      if (method === 'answerCallbackQuery' && result.error_code === 400) return {};
      const error = new Error(`Telegram ${result.error_code}`);
      error.code = result.error_code; error.retry = result.parameters?.retry_after;
      throw error;
    }
    return result.result;
  } catch (error) {
    if (Number.isInteger(error.code)) throw error;
    throw new Error('Telegram network unavailable');
  }
}
const bot = createController({ state, save, telegram });
async function handle(update) {
  if (!state.owner) {
    const msg = update.message;
    const candidate = msg?.text?.match(/^\/start ([a-f0-9]+)$/)?.[1] || '';
    if (msg?.chat.type === 'private' && !msg.from.is_bot && Date.now() < expires && candidate.length === pairingCode.length && timingSafeEqual(Buffer.from(candidate), Buffer.from(pairingCode))) {
      state.owner = msg.from.id; await save(); await bot.menu(msg.chat.id);
      console.log('Владелец подтверждён.');
    }
    return;
  }
  await bot.handle(update);
}
const publicFiles = new Map([
  ['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']],
  ['/css/style.css', ['css/style.css', 'text/css']], ['/js/script.js', ['js/script.js', 'text/javascript']],
  ['/js/calendar.js', ['js/calendar.js', 'text/javascript']], ['/assets/logo.svg', ['assets/logo.svg', 'image/svg+xml']],
  ['/assets/chevron-down.svg', ['assets/chevron-down.svg', 'image/svg+xml']],
]);
const port = Number(process.env.PORT || 3210);
const settingsKey = randomBytes(24).toString('hex');
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) { res.writeHead(403); return res.end(); }
  try {
    const pathname = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
    if (req.method === 'POST' && pathname === '/api/week') {
      if (req.headers.origin !== `http://${req.headers.host}` || req.headers['x-settings-key'] !== settingsKey) { res.writeHead(403); return res.end(); }
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 1024) { res.writeHead(413); return res.end(); } }
      const anchor = JSON.parse(body);
      if (!calendar.validAnchor(anchor)) { res.writeHead(400); return res.end(); }
      state.weekAnchor = { monday: anchor.monday, parity: anchor.parity, confirmed: true };
      await save(); res.writeHead(204); return res.end();
    }
    if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
    if (pathname === '/api/homework') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ version: 3, tasks: state.tasks, scheduleChanges: state.scheduleChanges, weekAnchor: state.weekAnchor, settingsKey,
        botConnected: connected && Date.now() - lastSuccess < 70000, botStatus: status, today: calendar.today() }));
    }
    const file = publicFiles.get(pathname);
    if (!file) { res.writeHead(404); return res.end('Not found'); }
    const bytes = await readFile(path.join(root, file[0]));
    res.setHeader('Content-Type', file[1] + '; charset=utf-8'); res.end(bytes);
  } catch { res.writeHead(500); res.end('Server error'); }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'Сервер уже запущен: http://127.0.0.1:3210. Второй экземпляр не нужен.' : `Ошибка запуска сервера: ${error.code}`); process.exit(1); });
server.listen(port, '127.0.0.1', async () => {
  await save();
  console.log(`Сайт: http://127.0.0.1:${port}`);
  if (webOnly) return;
  if (!token) { status = 'no-token'; console.error('Нет токена. Запустите Start-bot.cmd.'); return; }
  let initialized = false;
  while (true) {
    try {
      if (!initialized) {
        const me = await telegram('getMe');
        if (me.username?.toLowerCase() !== 'polytech_homework_bot') { status = 'wrong-bot'; console.error('Токен другого бота.'); break; }
        const hook = await telegram('getWebhookInfo');
        if (hook.url) { status = 'webhook-conflict'; console.error('Бот подключён к другому серверу через webhook.'); break; }
        console.log('Подключён @Polytech_homework_bot.');
        if (state.owner) await bot.menu(state.owner);
        else console.log(`Отправьте боту: /start ${pairingCode}`);
        initialized = true;
      }
      const updates = await telegram('getUpdates', { offset: state.offset || 0, timeout: 5, allowed_updates: ['message', 'callback_query'] });
      connected = true; lastSuccess = Date.now(); status = 'connected';
      for (const update of updates) {
        if (update.update_id < (state.offset || 0)) continue;
        try { await handle(update); }
        catch (error) {
          if (error.code !== 400 && error.code !== 403) throw error;
          console.error(`Сообщение Telegram не обработано (код ${error.code}). Следующие сообщения будут приняты.`);
        }
        state.offset = update.update_id + 1; await save();
      }
    } catch (error) {
      connected = false;
      if (error.code === 401 || error.code === 409 || error.code === 403) {
        status = `telegram-${error.code}`;
        console.error(`Telegram ${error.code}: проверьте токен, блокировку бота и другие экземпляры.`); break;
      }
      status = 'reconnecting'; console.error('Нет связи с Telegram. Повторное подключение…');
      await new Promise(resolve => setTimeout(resolve, Math.max(5000, (error.retry || 0) * 1000)));
    }
  }
});
