export function telegramConfigured() {
  return /^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(process.env.BOT_TOKEN || '');
}

export function createTelegram() {
  const token = process.env.BOT_TOKEN || '';
  if (!/^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(token)) throw new Error('telegram_not_configured');
  return async function telegram(method, body = {}) {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    let result;
    try { result = await response.json(); } catch { throw new Error('telegram_unavailable'); }
    if (!response.ok || !result.ok) {
      if ((method === 'editMessageText' || method === 'editMessageReplyMarkup') && result?.error_code === 400 && result?.description?.includes('message is not modified')) return {};
      if (method === 'answerCallbackQuery' && result?.error_code === 400) return {};
      const error = new Error('telegram_api_error');
      error.code = result?.error_code;
      throw error;
    }
    return result.result;
  };
}
