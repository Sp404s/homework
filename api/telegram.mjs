import { createController } from '../server/bot.mjs';
import { json, sameSecret, validWebhookSecret } from './_http.mjs';
import { loadState, saveState } from './_storage.mjs';
import { createTelegram, telegramConfigured } from './_telegram.mjs';

export async function POST(request) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  if (!validWebhookSecret(webhookSecret) || !telegramConfigured()) return json({ error: 'service_not_configured' }, 503);
  if (!sameSecret(request.headers.get('x-telegram-bot-api-secret-token') || '', webhookSecret)) {
    return json({ error: 'forbidden' }, 403);
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 1000000) return json({ error: 'payload_too_large' }, 413);

  try {
    const raw = await request.text();
    if (raw.length > 1000000) return json({ error: 'payload_too_large' }, 413);
    const update = JSON.parse(raw);
    if (!Number.isSafeInteger(update?.update_id) || update.update_id < 0) return json({ error: 'invalid_update' }, 400);

    const state = await loadState();
    if (update.update_id <= state.lastUpdateId) return json({ ok: true });
    const telegram = createTelegram();
    const bot = createController({ state, save: async () => {}, telegram });

    if (!state.owner) {
      const message = update.message;
      const from = message?.from;
      const candidate = message?.text?.match(/^\/start\s+([A-Za-z0-9_-]+)$/)?.[1] || '';
      const pairingCode = process.env.BOT_PAIRING_CODE || '';
      if (message?.chat?.type === 'private' && from && !from.is_bot && sameSecret(candidate, pairingCode)) {
        state.owner = from.id;
        state.pending = null;
        await bot.menu(message.chat.id);
      }
    } else {
      await bot.handle(update);
    }

    state.lastUpdateId = update.update_id;
    state.webhookActive = true;
    state.lastUpdateAt = new Date().toISOString();
    await saveState(state);
    return json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook failed', { code: error?.code || 'internal' });
    return json({ error: 'temporary_failure' }, 500);
  }
}
