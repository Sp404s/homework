import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import calendar from '../js/calendar.js';

assert.equal(calendar.weekFor('2026-09-14'), 'odd');
assert.equal(calendar.weekFor('2026-09-21'), 'even');
assert.equal(calendar.nextDate('Компьютерные технологии в дизайне', calendar.defaultAnchor, '2026-09-15'), '2026-09-22');
for (const date of ['2026-09-15', '2026-09-22']) {
  const lesson = calendar.lessonsOn(date, calendar.defaultAnchor, []).find(item =>
    item.subject === 'Компьютерные технологии в дизайне' && item.type === 'Практика');
  assert.equal(lesson.teacher, 'Ченарани Сасан');
}

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.equal((index.match(/data-section=/g) || []).length, 5);
assert.match(index, /data-section="communities"/);
assert.match(index, /data-section="teachers"/);

const script = await readFile(new URL('../js/script.js', import.meta.url), 'utf8');
assert.match(script, /max\.ru\/join\/tzSWfIyCud01Ys7ThxuMoVsphrDH88xkv2a4zqLcC34/);
assert.match(script, /vk\.me\/join\/\/oP7C7ks8FDfuEAl4y2w3YaQ5PxgJDsEXQs=/);
assert.match(script, /1g6S19Z3uwTVmChxkFWDgujkYSo48vzDJGaQl70Jw0F0/);
assert.match(script, /teacher-search/);
assert.match(script, /assets\/community-max\.svg/);
assert.match(script, /assets\/community-vk\.svg/);
assert.match(script, /assets\/community-sheet\.svg/);
assert.doesNotMatch(script, /service: 'TABLE'/);
assert.doesNotMatch(script, /button\.dataset\.week/);

for (const asset of ['community-max.svg', 'community-vk.svg', 'community-sheet.svg']) {
  assert.match(await readFile(new URL(`../assets/${asset}`, import.meta.url), 'utf8'), /<svg/);
}

console.log('PASS: fixed week parity, communities, teacher search and corrected practice teacher');
