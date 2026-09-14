import { randomBytes } from 'node:crypto';
import cal from '../js/calendar.js';
import { MAX_ATTACHMENTS, MAX_FILE_BYTES, linkName, normalizeHttpUrl } from '../api/_attachments.mjs';

export const keyboard = { keyboard: [
  [{ text: '📅 Изменить расписание' }],
  [{ text: '✏️ Изменить домашнее задание' }],
  [{ text: '📋 Посмотреть список заданного' }],
], resize_keyboard: true, is_persistent: true };
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const rows = (values, n) => Array.from({ length: Math.ceil(values.length / n) }, (_, i) => values.slice(i * n, (i + 1) * n));

export function createController({ state, save, telegram, translateTask = async task => task, now = () => new Date() }) {
  const send = (chat, text, extra = {}) => telegram('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: keyboard, ...extra });
  const menu = chat => send(chat, 'Выберите действие кнопками ниже.');
  function btn(text, action, value = '') {
    return { text, callback_data: `w:${state.pending.nonce}:${action}:${value}` };
  }
  async function panel(chat, text, buttons, messageId) {
    const reply_markup = { inline_keyboard: [...buttons, [btn('Отмена · Главное меню', 'cancel')]] };
    if (messageId) return telegram('editMessageText', { chat_id: chat, message_id: messageId, text, parse_mode: 'HTML', reply_markup });
    return send(chat, text, { reply_markup });
  }
  async function begin(chat, kind) {
    state.pending = { kind, nonce: randomBytes(6).toString('hex'), stage: kind === 'schedule' ? 'source' : 'subject' };
    if (kind === 'schedule') return calendarPanel(chat, 'source');
    return subjectPanel(chat);
  }
  function subjectPanel(chat, id) {
    const p = state.pending;
    p.stage = 'subject';
    return panel(chat, 'Выберите предмет:', cal.subjects.map((s, i) => [btn(s, 'subject', String(i))]), id);
  }
  function calendarPanel(chat, purpose, month, id) {
    const p = state.pending;
    p.stage = purpose;
    const current = month || cal.today(now()).slice(0, 7);
    const first = current + '-01';
    if (!cal.validDate(first) || Math.abs(Number(current.slice(0, 4)) - Number(cal.today(now()).slice(0, 4))) > 5) return;
    const firstDate = cal.parse(first);
    const label = firstDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const prev = new Date(firstDate); prev.setUTCMonth(prev.getUTCMonth() - 1);
    const next = new Date(firstDate); next.setUTCMonth(next.getUTCMonth() + 1);
    const cells = Array(cal.weekday(first)).fill(null).map(() => btn('·', 'noop'));
    for (let d = 1; d <= 31; d++) {
      const date = `${current}-${String(d).padStart(2, '0')}`;
      if (!cal.validDate(date)) break;
      cells.push(btn((date === cal.today(now()) ? '• ' : '') + d, 'date', date));
    }
    while (cells.length % 7) cells.push(btn('·', 'noop'));
    const buttons = [[btn('‹', 'month', cal.iso(prev).slice(0, 7)), btn(label, 'noop'), btn('›', 'month', cal.iso(next).slice(0, 7))],
      ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(s => btn(s, 'noop')), ...rows(cells, 7)];
    if (purpose === 'due') buttons.unshift([btn('Автоматически по расписанию', 'auto')]);
    const title = purpose === 'source' ? 'Выберите дату занятия, которое нужно изменить' : purpose === 'target' ? 'На какую дату перенести занятие?' : 'Выберите дату сдачи задания';
    return panel(chat, `<b>${title}</b>\n${p.subject ? esc(p.subject) : ''}`, buttons, id);
  }
  function lessonPanel(chat, date, id) {
    const p = state.pending;
    p.stage = 'lesson'; p.sourceDate = date;
    p.options = cal.lessonsOn(date, state.weekAnchor, state.scheduleChanges);
    for (const change of state.scheduleChanges) {
      if ((change.sourceDate === date || (change.cancelled && change.date === date)) && !p.options.some(l => l.id === change.id)) p.options.push({ ...change, changed: true });
    }
    return panel(chat, `<b>${cal.format(date)}</b>\nВыберите занятие или добавьте новое.`, [
      ...p.options.map((l, i) => [btn(`${l.cancelled ? 'Отменено · ' : l.changed ? 'Изменено · ' : ''}${l.time} · ${l.subject} (${l.type})`, 'lesson', String(i))]),
      [btn('＋ Добавить занятие', 'new')], [btn('Выбрать другую дату', 'source')],
    ], id);
  }
  function lessonActions(chat, id) {
    const p = state.pending;
    p.stage = 'action';
    const buttons = [[btn('Перенести / изменить время', 'move')], [btn('Отменить занятие', 'remove')]];
    if (p.lesson.changed) buttons.push([btn('Вернуть обычное расписание', 'restore')]);
    return panel(chat, `<b>${esc(p.subject)}</b>\n${cal.format(p.sourceDate)} · ${p.lesson.time}`, buttons, id);
  }
  function timePanel(chat, purpose, id) {
    const p = state.pending; p.stage = 'hour'; p.timePurpose = purpose;
    const buttons = rows(Array.from({ length: 24 }, (_, h) => btn(String(h).padStart(2, '0'), 'hour', String(h))), 6);
    return panel(chat, purpose === 'end' ? 'Выберите час окончания занятия' : 'Выберите час начала занятия', buttons, id);
  }
  function attachmentLines(attachments = []) {
    return attachments.map((attachment, index) => {
      const label = attachment.type === 'link' ? 'Ссылка' : 'Файл';
      return `${index + 1}. ${label}: ${esc(attachment.name)}`;
    }).join('\n');
  }
  function attachmentPanel(chat, id) {
    const p = state.pending;
    p.stage = 'attachments';
    if (!Array.isArray(p.attachments)) p.attachments = [];
    const current = p.attachments.length ? attachmentLines(p.attachments) : 'Вложений пока нет.';
    const buttons = [[btn('🔗 Добавить ссылку', 'addlink')], [btn('📎 Добавить файл', 'addfile')]];
    for (let i = 0; i < p.attachments.length; i++) {
      buttons.push([btn(`Удалить ${i + 1}: ${p.attachments[i].name.slice(0, 24)}`, 'deleteattachment', String(i))]);
    }
    buttons.push([btn('Продолжить к сроку сдачи', 'attachmentsdone')]);
    return panel(chat, `<b>Вложения</b> (${p.attachments.length}/${MAX_ATTACHMENTS})\n${current}\n\nФайлы и ссылки будут доступны всем посетителям сайта.`, buttons, id);
  }
  function attachmentPrompt(chat, kind, id, error = '') {
    const p = state.pending;
    p.stage = kind;
    const instruction = kind === 'link' ? 'Отправьте ссылку, начинающуюся с http:// или https://.' :
      `Отправьте файл как документ или фотографию. Максимальный размер — ${MAX_FILE_BYTES / 1_000_000} МБ.`;
    return panel(chat, `${error ? `${esc(error)}\n\n` : ''}${instruction}\nВложение будет публично доступно на сайте.`, [[btn('Назад к вложениям', 'attachments')]], id);
  }
  function uploadedFile(message, count) {
    const document = message.document;
    const photo = Array.isArray(message.photo) ? message.photo.at(-1) : null;
    const source = document || photo;
    if (!source || !Number.isSafeInteger(source.file_size) || !/^[A-Za-z0-9_-]{1,512}$/.test(source.file_id || '') ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(source.file_unique_id || '')) return null;
    const name = String(document?.file_name || `Фото ${count + 1}.jpg`).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 180);
    return {
      type: 'file', name: name || `Файл ${count + 1}`, fileId: source.file_id,
      uniqueId: source.file_unique_id, size: source.file_size, mimeType: document?.mime_type || 'image/jpeg',
    };
  }
  function confirm(chat, id) {
    const p = state.pending; p.stage = 'confirm';
    let text;
    if (p.kind === 'homework') {
      const date = cal.taskDate(p, state.weekAnchor, state.scheduleChanges, now());
      const attachmentText = p.attachments?.length ? `\n\n<b>Вложения:</b>\n${attachmentLines(p.attachments)}` : '';
      text = `<b>${esc(p.subject)}</b> (${cal.format(date)})\n\n${esc(p.text)}${attachmentText}\n\n${p.due ? 'Дата выбрана вручную.' : 'Дата будет автоматически следовать расписанию.'}`;
    } else {
      text = `<b>${esc(p.subject)}</b>\n` + (p.operation === 'cancel' ? `Отменить занятие ${cal.format(p.sourceDate)}?` : p.operation === 'restore' ? 'Убрать это изменение и вернуть обычное расписание?' : `${p.lesson ? 'Было: ' + cal.format(p.sourceDate) + ' · ' + p.lesson.time + '\n' : ''}Будет: ${cal.format(p.targetDate)} · ${p.start}–${p.end}`);
    }
    return panel(chat, text + '\n\nСохранить изменения на сайте?', [[btn('✓ Сохранить', 'save')]], id);
  }
  async function commit(chat, id) {
    const p = state.pending;
    if (p.stage !== 'confirm') return;
    const oldTasks = state.tasks;
    const oldChanges = state.scheduleChanges;
    if (p.kind === 'homework') {
      const task = await translateTask({ subject: p.subject, text: p.text, ...(p.next ? { next: p.next } : {}), ...(p.due ? { due: p.due } : {}),
        ...(p.attachments?.length ? { attachments: structuredClone(p.attachments) } : {}) });
      state.tasks = [...state.tasks.filter(t => t.subject !== p.subject), task];
    } else {
      const l = p.lesson;
      const changeId = l?.changed ? l.id : l ? `${l.sourceDate}/${l.sourceId}` : `new-${p.nonce}`;
      state.scheduleChanges = state.scheduleChanges.filter(c => c.id !== changeId);
      if (p.operation !== 'restore') state.scheduleChanges.push({
        id: changeId, sourceDate: l?.sourceDate || null, sourceId: l?.sourceId || null,
        date: p.targetDate || p.sourceDate, time: p.start ? `${p.start}–${p.end}` : l.time,
        subject: p.subject, type: l?.type || 'Дополнительное занятие', teacher: l?.teacher || 'Преподаватель не указан', place: l?.place || 'Аудитория не указана',
        cancelled: p.operation === 'cancel', updatedAt: now().toISOString(),
      });
    }
    state.pending = null;
    try { await save(); } catch (e) { state.tasks = oldTasks; state.scheduleChanges = oldChanges; state.pending = p; throw e; }
    if (id) await telegram('editMessageReplyMarkup', { chat_id: chat, message_id: id, reply_markup: { inline_keyboard: [] } });
    return send(chat, 'Сохранено. Открытый сайт обновится в течение 5 секунд.');
  }
  function pages() {
    const out = []; let page = '<b>Список заданного</b>\n\n';
    for (const subject of cal.subjects) {
      const task = state.tasks.find(t => t.subject === subject);
      const due = cal.taskDate(task || { subject }, state.weekAnchor, state.scheduleChanges, now());
      const title = `<b>${esc(subject)}</b> (${cal.format(due)})`;
      const attachments = task?.attachments?.length ? '\nВложения:\n' + task.attachments.map((attachment, index) =>
        `${index + 1}. ${attachment.type === 'link' ? 'Ссылка' : 'Файл'}: ${attachment.name}` +
        (attachment.type === 'link' ? `\n${attachment.url}` : '')).join('\n') : '';
      const body = task ? task.text + (task.next ? '\nВ дальнейшем: ' + task.next : '') + attachments : 'Задание пока не добавлено.';
      let part = ''; const parts = [];
      for (const ch of body) { const s = esc(ch); if (part.length + s.length > 2500) { parts.push(part); part = ''; } part += s; }
      parts.push(part);
      for (const part of parts) { const block = title + '\n' + part + '\n\n'; if (page.length + block.length > 3600) { out.push(page.trim()); page = ''; } page += block; }
    }
    if (page) out.push(page.trim());
    return out;
  }
  async function list(chat, number = 0, id) {
    const all = pages(); const n = Math.min(Math.max(0, number), all.length - 1);
    const controls = [];
    if (n) controls.push({ text: '‹ Назад', callback_data: `list:${n - 1}` });
    if (n < all.length - 1) controls.push({ text: 'Далее ›', callback_data: `list:${n + 1}` });
    const extra = { parse_mode: 'HTML', reply_markup: { inline_keyboard: controls.length ? [controls] : [] } };
    const text = all[n] + (all.length > 1 ? `\n\n${n + 1}/${all.length}` : '');
    return id ? telegram('editMessageText', { chat_id: chat, message_id: id, text, ...extra }) : send(chat, text, controls.length ? extra : {});
  }
  async function handleCurrent(update) {
    const cb = update.callback_query; const msg = cb?.message || update.message; const from = cb?.from || msg?.from;
    if (!msg || msg.chat.type !== 'private' || !from || from.is_bot) return;
    const chat = msg.chat.id;
    if (!cb) {
      const text = msg.text?.trim() || '';
      if (text === '📅 Изменить расписание') return begin(chat, 'schedule');
      if (['✏️ Изменить домашнее задание', '✏️ Добавить / изменить', '/add'].includes(text)) return begin(chat, 'homework');
      if (['📋 Посмотреть список заданного', '📋 Предметы и задания', '/list'].includes(text)) return list(chat);
      if (['/start', '/cancel', '✖️ Отмена'].includes(text)) { state.pending = null; return menu(chat); }
      if (state.pending?.stage === 'link') {
        const url = normalizeHttpUrl(text);
        if (!url) return attachmentPrompt(chat, 'link', undefined, 'Ссылка не распознана.');
        if (state.pending.attachments.length >= MAX_ATTACHMENTS) return attachmentPanel(chat);
        state.pending.attachments.push({ type: 'link', name: linkName(url), url });
        return attachmentPanel(chat);
      }
      if (state.pending?.stage === 'file') {
        const attachment = uploadedFile(msg, state.pending.attachments.length);
        if (!attachment) return attachmentPrompt(chat, 'file', undefined, 'Отправьте файл как документ или фотографию.');
        if (attachment.size > MAX_FILE_BYTES) return attachmentPrompt(chat, 'file', undefined, `Файл больше ${MAX_FILE_BYTES / 1_000_000} МБ.`);
        if (state.pending.attachments.length >= MAX_ATTACHMENTS) return attachmentPanel(chat);
        state.pending.attachments.push(attachment);
        return attachmentPanel(chat);
      }
      if (state.pending?.stage === 'text' && text && !text.startsWith('/')) {
        if (text.length > 3000) return send(chat, 'Сократите текст до 3000 символов.');
        state.pending.text = text; delete state.pending.next;
        return attachmentPanel(chat);
      }
      return menu(chat);
    }
    await telegram('answerCallbackQuery', { callback_query_id: cb.id });
    const listMatch = cb.data?.match(/^list:(\d+)$/);
    if (listMatch) return list(chat, Number(listMatch[1]), msg.message_id);
    const match = cb.data?.match(/^w:([a-f0-9]+):([a-z]+):(.*)$/);
    const p = state.pending;
    if (!match || !p || match[1] !== p.nonce) return send(chat, 'Это меню устарело. Выберите действие заново.');
    const [, , action, value] = match; const id = msg.message_id;
    if (action === 'noop') return;
    if (action === 'cancel') { state.pending = null; return menu(chat); }
    if (action === 'attachments' && p.kind === 'homework') return attachmentPanel(chat, id);
    if (action === 'addlink' && p.kind === 'homework' && p.stage === 'attachments') return attachmentPrompt(chat, 'link', id);
    if (action === 'addfile' && p.kind === 'homework' && p.stage === 'attachments') return attachmentPrompt(chat, 'file', id);
    if (action === 'deleteattachment' && p.kind === 'homework' && p.stage === 'attachments' && /^\d+$/.test(value)) {
      const index = Number(value);
      if (index >= 0 && index < p.attachments.length) p.attachments.splice(index, 1);
      return attachmentPanel(chat, id);
    }
    if (action === 'attachmentsdone' && p.kind === 'homework' && p.stage === 'attachments') return calendarPanel(chat, 'due', undefined, id);
    // Завершаем старый открытый выбор часов домашки уже без времени.
    if (p.kind === 'homework' && ['hour', 'minute'].includes(p.stage)) { delete p.dueTime; return confirm(chat, id); }
    if (action === 'month' && ['source', 'target', 'due'].includes(p.stage)) return calendarPanel(chat, p.stage, value, id);
    if (action === 'source') return calendarPanel(chat, 'source', undefined, id);
    if (action === 'date' && cal.validDate(value)) {
      if (p.stage === 'source') return lessonPanel(chat, value, id);
      if (p.stage === 'target') { p.targetDate = value; return timePanel(chat, 'start', id); }
      if (p.stage === 'due') { p.due = value; delete p.dueTime; return confirm(chat, id); }
    }
    if (action === 'lesson' && p.stage === 'lesson' && p.options[Number(value)]) { p.lesson = p.options[Number(value)]; p.subject = p.lesson.subject; return lessonActions(chat, id); }
    if (action === 'new' && p.stage === 'lesson') { p.targetDate = p.sourceDate; p.operation = 'add'; return subjectPanel(chat, id); }
    if (action === 'subject' && p.stage === 'subject' && cal.subjects[Number(value)]) {
      p.subject = cal.subjects[Number(value)];
      if (p.kind === 'schedule') return timePanel(chat, 'start', id);
      p.stage = 'text';
      const existing = state.tasks.find(t => t.subject === p.subject);
      p.attachments = structuredClone(existing?.attachments || []);
      return panel(chat, `<b>${esc(p.subject)}</b>\nОтправьте новый текст задания.${existing ? '\nИли оставьте прежний текст и измените только срок.' : ''}`, existing ? [[btn('Оставить прежний текст', 'keep')]] : [], id);
    }
    if (action === 'keep' && p.stage === 'text') {
      const existing = state.tasks.find(t => t.subject === p.subject);
      if (existing) { p.text = existing.text; p.next = existing.next; return attachmentPanel(chat, id); }
    }
    if (action === 'auto' && p.stage === 'due') { delete p.due; delete p.dueTime; return confirm(chat, id); }
    if (action === 'move' && p.stage === 'action') { p.operation = 'move'; return calendarPanel(chat, 'target', p.sourceDate.slice(0, 7), id); }
    if (action === 'remove' && p.stage === 'action') { p.operation = 'cancel'; return confirm(chat, id); }
    if (action === 'restore' && p.stage === 'action' && p.lesson.changed) { p.operation = 'restore'; return confirm(chat, id); }
    if (action === 'hour' && p.stage === 'hour' && /^\d+$/.test(value) && Number(value) < 24) {
      p.hour = Number(value); p.stage = 'minute';
      return panel(chat, `Час: ${String(p.hour).padStart(2, '0')}. Выберите минуты:`, rows(Array.from({ length: 60 }, (_, m) => btn(String(m).padStart(2, '0'), 'minute', String(m))), 6), id);
    }
    if (action === 'minute' && p.stage === 'minute' && /^\d+$/.test(value) && Number(value) < 60) {
      const time = `${String(p.hour).padStart(2, '0')}:${value.padStart(2, '0')}`;
      if (p.timePurpose === 'start') { p.start = time; return timePanel(chat, 'end', id); }
      if (p.timePurpose === 'end') {
        if (time <= p.start) return timePanel(chat, 'end', id);
        p.end = time;
      }
      return confirm(chat, id);
    }
    if (action === 'save') return commit(chat, id);
  }

  async function handle(update) {
    const cb = update.callback_query; const msg = cb?.message || update.message; const from = cb?.from || msg?.from;
    if (!msg || msg.chat.type !== 'private' || !from || from.is_bot) return;
    if (!state.pendingByUser || typeof state.pendingByUser !== 'object' || Array.isArray(state.pendingByUser)) state.pendingByUser = {};
    const userKey = String(from.id);
    const previousPending = state.pending || null;
    state.pending = state.pendingByUser[userKey] || null;
    try {
      return await handleCurrent(update);
    } finally {
      if (state.pending) state.pendingByUser[userKey] = state.pending;
      else delete state.pendingByUser[userKey];
      state.pending = previousPending;
    }
  }
  return { handle, menu, list, pages };
}
