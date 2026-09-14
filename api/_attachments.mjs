export const MAX_ATTACHMENTS = 10;
export const MAX_FILE_BYTES = 4_000_000;

export function normalizeHttpUrl(value) {
  if (typeof value !== 'string' || value.trim().length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function linkName(value) {
  try {
    const url = new URL(value);
    const path = url.pathname === '/' ? '' : url.pathname;
    return (url.hostname.replace(/^www\./i, '') + path).slice(0, 180) || 'Ссылка';
  }
  catch { return 'Ссылка'; }
}

const validName = value => typeof value === 'string' && value.length > 0 && value.length <= 180 && !/[\u0000-\u001f\u007f]/.test(value);

export function validAttachment(attachment) {
  if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment) || !validName(attachment.name)) return false;
  if (attachment.type === 'link') return normalizeHttpUrl(attachment.url) !== null;
  return attachment.type === 'file' && /^[A-Za-z0-9_-]{1,512}$/.test(attachment.fileId || '') &&
    /^[A-Za-z0-9_-]{1,128}$/.test(attachment.uniqueId || '') &&
    Number.isSafeInteger(attachment.size) && attachment.size >= 0 && attachment.size <= MAX_FILE_BYTES &&
    typeof attachment.mimeType === 'string' && attachment.mimeType.length <= 100 && !/[\u0000-\u001f\u007f]/.test(attachment.mimeType);
}

export function publicTasks(tasks) {
  return tasks.map(task => {
    if (!Array.isArray(task.attachments) || !task.attachments.length) return { ...task };
    return { ...task, attachments: task.attachments.map((attachment, index) => attachment.type === 'link' ? {
      type: 'link', name: attachment.name, url: attachment.url,
    } : {
      type: 'file', name: attachment.name, size: attachment.size,
      url: `/api/file?subject=${encodeURIComponent(task.subject)}&index=${index}&key=${encodeURIComponent(attachment.uniqueId)}`,
    }) };
  });
}
