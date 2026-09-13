import { json, validPublicUrl, validWebhookSecret } from './_http.mjs';
import { loadState, storageConfigured } from './_storage.mjs';
import { telegramConfigured } from './_telegram.mjs';

export async function GET() {
  const checks = {
    database: false,
    botToken: telegramConfigured(),
    webhookSecret: validWebhookSecret(process.env.TELEGRAM_WEBHOOK_SECRET),
    pairingCode: /^[A-Za-z0-9_-]{16,64}$/.test(process.env.BOT_PAIRING_CODE || ''),
    publicUrl: Boolean(validPublicUrl(process.env.PUBLIC_BASE_URL)),
    webhook: false,
    owner: false,
  };
  if (storageConfigured()) {
    try {
      const state = await loadState();
      checks.database = true;
      checks.webhook = state.webhookActive;
      checks.owner = Boolean(state.owner);
    } catch { /* Возвращаем только состояние проверки, без деталей подключения. */ }
  }
  return json({ ok: Object.values(checks).every(Boolean), checks }, checks.database ? 200 : 503);
}
