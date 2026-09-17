import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import calendar from '../js/calendar.js';
import search from '../js/search.js';

assert.equal(calendar.weekFor('2026-09-14'), 'odd');
assert.equal(calendar.weekFor('2026-09-21'), 'even');
assert.equal(calendar.nextDate('Компьютерные технологии в дизайне', calendar.defaultAnchor, '2026-09-15'), '2026-09-22');
assert.equal(search.normalize('ДИЗАЙН—мышление!'), 'дизайн мышление');
assert.equal(search.includes('Дизайн-мышление · Доцент', 'дизайн мышление'), true);
assert.equal(search.includes('ДИЗАЙН-МЫШЛЕНИЕ', 'дизайн мышление'), true);
assert.equal(search.includes('Теория дизайна', 'дизайн мышление'), false);
for (const date of ['2026-09-15', '2026-09-22']) {
  const lesson = calendar.lessonsOn(date, calendar.defaultAnchor, []).find(item =>
    item.subject === 'Компьютерные технологии в дизайне' && item.type === 'Практика');
  assert.equal(lesson.teacher, 'Ченарани Сасан');
}
for (const date of ['2026-09-17', '2026-09-24']) {
  const lessons = calendar.lessonsOn(date, calendar.defaultAnchor, []).filter(item =>
    item.subject === 'Дизайн-проектирование и исследование');
  assert.ok(lessons.length > 0);
  assert.ok(lessons.every(lesson => lesson.place === 'Главное здание, ауд. 303'));
}

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../site.webmanifest', import.meta.url), 'utf8'));
assert.equal((index.match(/data-section=/g) || []).length, 4);
assert.match(index, /data-section="communities"/);
assert.match(index, /data-section="teachers"/);
assert.match(index, /js\/search\.js/);
assert.equal(manifest.launch_handler.client_mode, 'focus-existing');
assert.doesNotMatch(index, /data-section="map"/);

const script = await readFile(new URL('../js/script.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/style.css', import.meta.url), 'utf8');
assert.match(script, /max\.ru\/join\/tzSWfIyCud01Ys7ThxuMoVsphrDH88xkv2a4zqLcC34/);
assert.match(script, /vk\.me\/join\/\/oP7C7ks8FDfuEAl4y2w3YaQ5PxgJDsEXQs=/);
assert.match(script, /1g6S19Z3uwTVmChxkFWDgujkYSo48vzDJGaQl70Jw0F0/);
assert.match(script, /teacher-search/);
assert.match(script, /autocapitalize', 'none'/);
assert.match(script, /autocorrect', 'off'/);
assert.doesNotMatch(script, /map: \{ title:/);
assert.match(script, /assets\/community-max\.svg/);
assert.match(script, /assets\/community-vk\.svg/);
assert.match(script, /assets\/community-sheet\.svg/);
assert.match(script, /function renderHomeworkJournal\(\)/);
assert.match(script, /expandedHistorySubjects/);
assert.match(script, /history-subject-toggle/);
assert.match(script, /task\.due >= todayKey/);
assert.match(script, /receivedHistory = Array\.isArray\(data\.history\)/);
assert.doesNotMatch(script, /service: 'TABLE'/);
assert.doesNotMatch(script, /button\.dataset\.week/);
assert.match(css, /\.menu-panel \{[^}]*height: 100dvh;[^}]*overflow: hidden;/s);
assert.match(css, /\.menu-panel\[open\] \{[^}]*display: flex;[^}]*flex-direction: column;/s);
assert.match(css, /\.language-switcher \{[^}]*flex: 0 0 auto;[^}]*margin: auto auto 0;/s);
assert.match(css, /@keyframes menu-enter \{ from \{ transform: translateY\(-100%\);/);
assert.match(css, /\.history-filter/);
assert.match(css, /\.history-subject/);
assert.match(css, /\.history-subject-toggle\[aria-expanded="true"\]/);
assert.match(css, /button\.history-subject-toggle:not\(:disabled\):active \{ transform: none; \}/);
assert.match(css, /\.history-entry/);

for (const asset of ['community-max.svg', 'community-vk.svg', 'community-sheet.svg']) {
  assert.match(await readFile(new URL(`../assets/${asset}`, import.meta.url), 'utf8'), /<svg/);
}

console.log('PASS: fixed week parity, homework journal, communities, teacher search and corrected practice teacher');
