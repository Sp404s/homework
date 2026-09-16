import { json, hasBearer, validPublicUrl, validWebhookSecret } from './_http.mjs';
import { loadState, saveState, validatePublicSnapshot } from './_storage.mjs';
import { createTelegram, telegramConfigured } from './_telegram.mjs';

export async function POST(request) {
  const setupSecret = process.env.SETUP_SECRET || '';
  if (setupSecret.length < 32) return json({ error: 'service_not_configured' }, 503);
  if (!hasBearer(request, setupSecret)) return json({ error: 'unauthorized' }, 401);

  const baseUrl = validPublicUrl(process.env.PUBLIC_BASE_URL);
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  if (!baseUrl || !validWebhookSecret(webhookSecret) || !telegramConfigured()) {
    return json({ error: 'service_not_configured' }, 503);
  }

  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 300000) return json({ error: 'payload_too_large' }, 413);
    const raw = await request.text();
    if (raw.length > 300000) return json({ error: 'payload_too_large' }, 413);
    const body = raw ? JSON.parse(raw) : {};
    const telegram = createTelegram();
    const me = await telegram('getMe');
    const expected = (process.env.BOT_USERNAME || 'Polytech_homework_bot').replace(/^@/, '').toLowerCase();
    if (!me?.username || me.username.toLowerCase() !== expected) return json({ error: 'wrong_bot_token' }, 409);

    await telegram('setWebhook', {
      url: `${baseUrl}/api/telegram`,
      secret_token: webhookSecret,
      allowed_updates: ['message', 'callback_query'],
      max_connections: 1,
      drop_pending_updates: false,
    });
    const state = await loadState();
    if (!state.webhookActive && body.snapshot) {
      const snapshot = validatePublicSnapshot(body.snapshot);
      state.tasks = snapshot.tasks;
      state.history = snapshot.history;
      state.weekAnchor = snapshot.weekAnchor;
      state.scheduleChanges = snapshot.scheduleChanges;
    }
    state.webhookActive = true;
    state.botUsername = me.username;
    await saveState(state);
    return json({ ok: true, bot: `@${me.username}`, webhook: `${baseUrl}/api/telegram`, next: 'ready' });
  } catch {
    return json({ error: 'setup_failed' }, 502);
  }
}
