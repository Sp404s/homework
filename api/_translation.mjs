import { loadCachedTranslation, saveCachedTranslation } from './_storage.mjs';

const memory = new Map();
const MAX_SOURCE_LENGTH = 4000;
const MAX_TRANSLATION_LENGTH = 8000;

function validSource(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_SOURCE_LENGTH;
}

function validTranslation(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_TRANSLATION_LENGTH &&
    /[\u3400-\u9fff]/u.test(value);
}

export async function translateTextToChinese(source) {
  if (!validSource(source)) return null;
  if (memory.has(source)) return memory.get(source);

  try {
    const cached = await loadCachedTranslation(source);
    if (validTranslation(cached)) {
      memory.set(source, cached);
      return cached;
    }
  } catch { /* Перевод всё равно можно получить без кэша. */ }

  try {
    const body = new URLSearchParams({ q: source });
    const response = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const translated = Array.isArray(data?.[0]) ? data[0].map(part => part?.[0] || '').join('').trim() : '';
    if (!validTranslation(translated)) return null;
    memory.set(source, translated);
    try { await saveCachedTranslation(source, translated); } catch { /* Память процесса остаётся запасным кэшем. */ }
    return translated;
  } catch { return null; }
}

export async function translateTask(task) {
  const [textZh, nextZh] = await Promise.all([
    task.textZh || translateTextToChinese(task.text),
    task.next ? (task.nextZh || translateTextToChinese(task.next)) : null,
  ]);
  return {
    ...task,
    ...(validTranslation(textZh) ? { textZh } : {}),
    ...(task.next && validTranslation(nextZh) ? { nextZh } : {}),
  };
}

export async function translateTasks(tasks) {
  return Promise.all(tasks.map(translateTask));
}
