import { MAX_FILE_BYTES } from './_attachments.mjs';

export function telegramConfigured() {
  return /^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(process.env.BOT_TOKEN || '');
}

export async function downloadTelegramFile(fileId) {
  if (!/^[A-Za-z0-9_-]{1,512}$/.test(fileId || '')) throw new Error('invalid_file_id');
  const telegram = createTelegram();
  const file = await telegram('getFile', { file_id: fileId });
  if (!file || typeof file.file_path !== 'string' || file.file_path.length > 512 ||
      !/^[A-Za-z0-9_./-]+$/.test(file.file_path) || file.file_path.includes('..') ||
      (Number.isSafeInteger(file.file_size) && file.file_size > MAX_FILE_BYTES)) throw new Error('invalid_telegram_file');
  const token = process.env.BOT_TOKEN || '';
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok || !response.body) throw new Error('telegram_file_unavailable');
  return response;
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
