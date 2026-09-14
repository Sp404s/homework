import calendar from '../js/calendar.js';
import { json } from './_http.mjs';
import { MAX_FILE_BYTES } from './_attachments.mjs';
import { loadState } from './_storage.mjs';
import { downloadTelegramFile, telegramConfigured } from './_telegram.mjs';

function disposition(name) {
  const safe = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_').slice(0, 180) || 'file';
  const encoded = encodeURIComponent(name).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const subject = url.searchParams.get('subject') || '';
    const indexText = url.searchParams.get('index') || '';
    const key = url.searchParams.get('key') || '';
    if (!calendar.subjects.includes(subject) || !/^\d{1,2}$/.test(indexText)) return json({ error: 'invalid_attachment' }, 400);
    const index = Number(indexText);
    const state = await loadState();
    const attachment = state.tasks.find(task => task.subject === subject)?.attachments?.[index];
    if (!attachment || attachment.type !== 'file' || attachment.uniqueId !== key || attachment.size > MAX_FILE_BYTES) {
      return json({ error: 'attachment_not_found' }, 404);
    }
    if (!telegramConfigured()) return json({ error: 'service_not_configured' }, 503);
    const upstream = await downloadTelegramFile(attachment.fileId);
    const headers = {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': disposition(attachment.name),
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Content-Type-Options': 'nosniff',
    };
    const length = Number(upstream.headers.get('content-length'));
    if (Number.isSafeInteger(length) && length >= 0 && length <= MAX_FILE_BYTES) headers['Content-Length'] = String(length);
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error('Attachment download failed', { code: error?.code || 'internal' });
    return json({ error: 'attachment_unavailable' }, 502);
  }
}
