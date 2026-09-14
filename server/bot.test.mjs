import assert from 'node:assert/strict';
import { createController, keyboard } from './bot.mjs';
import cal from '../js/calendar.js';

const state = { owner: null, tasks: [{ subject: 'Английский язык', text: 'Старое задание' }], weekAnchor: { ...cal.defaultAnchor }, scheduleChanges: [], pending: null, pendingByUser: {} };
const sent = []; let saved;
const bot = createController({ state, save: async () => { saved = JSON.parse(JSON.stringify(state)); }, now: () => new Date('2026-09-13T12:00:00Z'),
  telegram: async (method, body) => { sent.push({ method, ...body }); return {}; } });
const msg = (text, id = 42) => bot.handle({ message: { from: { id }, chat: { id, type: 'private' }, text } });
const pending = (id = 42) => state.pendingByUser[String(id)];
const click = (action, value = '', id = 42) => bot.handle({ callback_query: { id: 'cb', from: { id }, message: { message_id: 9, chat: { id, type: 'private' } }, data: `w:${pending(id).nonce}:${action}:${value}` } });
assert.equal(keyboard.keyboard.length, 3);
await msg('📅 Изменить расписание', 99); assert.equal(pending(99).stage, 'source');
await msg('✏️ Изменить домашнее задание'); assert.equal(pending().stage, 'subject');
assert.equal(pending(99).stage, 'source');
await msg('/cancel'); assert.equal(pending(), undefined);
assert.equal(pending(99).stage, 'source');
await msg('/cancel', 99); assert.equal(pending(99), undefined);
await msg('📅 Изменить расписание');
assert.equal(pending().stage, 'source');
await click('date', '2026-02-30'); assert.equal(pending().stage, 'source');
await click('date', '2026-09-15');
await click('lesson', '1'); // Английский, вторник нечётной недели.
await click('move'); await click('date', '2026-09-16');
await click('hour', '13'); await click('minute', '15');
await click('hour', '12'); await click('minute', '00'); // конец раньше начала не принимается
assert.equal(pending().stage, 'hour');
await click('hour', '14'); await click('minute', '55');
assert.equal(state.scheduleChanges.length, 0); // подтверждение обязательно
await click('save');
assert.equal(saved.scheduleChanges.length, 1);
assert.ok(!cal.lessonsOn('2026-09-15', state.weekAnchor, state.scheduleChanges).some(l => l.subject === 'Английский язык'));
assert.equal(cal.lessonsOn('2026-09-16', state.weekAnchor, state.scheduleChanges)[0].time, '13:15–14:55');
assert.equal(cal.nextDate('Английский язык', state.weekAnchor, '2026-09-13', state.scheduleChanges), '2026-09-16');
await msg('✏️ Изменить домашнее задание'); await click('subject', '0');
await msg('Текст <статьи> & пересказ'); await click('date', '2026-09-18');
assert.equal(pending().stage, 'confirm');
await click('save');
assert.equal(state.tasks[0].due, '2026-09-18'); assert.equal(state.tasks[0].dueTime, undefined);
assert.equal(cal.taskDate(state.tasks[0], state.weekAnchor, state.scheduleChanges, new Date('2026-09-20T12:00:00Z')), '2026-09-18');
const n = sent.length; await msg('📋 Посмотреть список заданного');
assert.equal(sent.length, n + 1); assert.ok(sent.at(-1).text.includes('<b>Английский язык</b> (18.09.2026)'));
assert.ok(sent.at(-1).text.includes('&lt;статьи&gt; &amp;'));
await msg('📅 Изменить расписание'); await click('date', '2026-09-16'); await click('lesson', '0');
await click('remove'); await click('save'); assert.equal(cal.lessonsOn('2026-09-16', state.weekAnchor, state.scheduleChanges).length, 0);
await msg('📅 Изменить расписание'); await click('date', '2026-09-16'); await click('lesson', '0');
await click('restore'); await click('save'); assert.equal(state.scheduleChanges.length, 0);
assert.ok(cal.lessonsOn('2026-09-15', state.weekAnchor, []).some(l => l.subject === 'Английский язык'));
await msg('📅 Изменить расписание'); await click('date', '2026-09-19'); await click('new'); await click('subject', '5');
await click('hour', '10'); await click('minute', '00'); await click('hour', '11'); await click('minute', '40'); await click('save');
assert.equal(cal.lessonsOn('2026-09-19', state.weekAnchor, state.scheduleChanges)[0].subject, 'Теория дизайна');
await msg('✏️ Изменить домашнее задание'); await click('subject', '0'); await click('keep'); await click('auto'); await click('save');
assert.equal(state.tasks[0].due, undefined);
assert.equal(cal.nextDate('История и методология науки', state.weekAnchor, '2026-09-13'), '2026-09-21');
for (const packet of sent) {
  for (const row of packet.reply_markup?.inline_keyboard || []) for (const button of row) assert.ok(Buffer.byteLength(button.callback_data) <= 64);
}
console.log('PASS: 3 buttons, public multi-user access, isolated dialogs, calendar/time validation, move/cancel/restore/add, deadlines, list, callback sizes');
