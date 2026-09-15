// Общий календарь сайта и бота. Все даты относятся к Europe/Moscow.
const StudentCalendar = (() => {
  function today(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const get = type => parts.find(p => p.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  const parse = iso => new Date(iso + 'T12:00:00Z');
  const iso = date => date.toISOString().slice(0, 10);
  const addDays = (date, n) => { const d = parse(date); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const weekday = date => (parse(date).getUTCDay() + 6) % 7;
  const dayNumber = date => Math.floor(parse(typeof date === 'string' ? date : today(date)).getTime() / 86400000);
  const mondayDay = date => { const s = typeof date === 'string' ? date : today(date); return dayNumber(s) - weekday(s); };
  const defaultAnchor = { monday: 20703, parity: 'even', confirmed: true };
  const validAnchor = a => a && Number.isInteger(a.monday) && (a.monday + 3) % 7 === 0 && ['even', 'odd'].includes(a.parity);
  const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(parse(s).getTime()) && iso(parse(s)) === s;
  const validTime = s => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  function weekFor(date, anchor = defaultAnchor) {
    const offset = Math.round((mondayDay(date) - anchor.monday) / 7);
    return Math.abs(offset % 2) === 0 ? anchor.parity : (anchor.parity === 'even' ? 'odd' : 'even');
  }
  const names = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const subjects = ['Английский язык', 'Компьютерные технологии в дизайне', 'Дизайн-проектирование и исследование', 'ИИ в отрасли', 'История и методология науки', 'Теория дизайна', 'Дизайн-мышление'];
  const aliases = { 'Иностранный язык в профессиональной коммуникации (английский)': subjects[0], 'Искусственный интеллект в отрасли': subjects[3] };
  const canonical = subject => aliases[subject] || subject;
  const L = (time, subject, type, teacher, place = 'Аудитория и корпус не указаны') => ({ time, subject, type, teacher, place });
  const theory = L('10:00–11:40', subjects[5], 'Лекция', 'Князева Елена Валерьевна', 'Главное здание, ауд. 304');
  const english = place => L('12:00–13:40', subjects[0], 'Практика', 'Четина Мария Михайловна', place);
  const computers = L('14:00–15:40', subjects[1], 'Практика', 'Ченарани Сасан', 'Главное здание, ауд. 301А');
  const design = [L('12:00–13:40', subjects[2], 'Практика', 'Зубов Андрей Гендрихович'), L('14:00–15:40', subjects[2], 'КПР', 'Зубов Андрей Гендрихович', 'Главное здание, ауд. 303')];
  const friday = [L('12:00–13:40', subjects[6], 'Лекция', 'Киреев Артур Генрихович', 'Научно-исследовательский корпус, ГЗ.14'), L('14:00–15:40', subjects[6], 'Практика', 'Киреев Артур Генрихович', 'Научно-исследовательский корпус, ГЗ.14')];
  const base = {
    even: [
      [L('12:00–13:40', subjects[4], 'Лекция', 'Курочкина Анна Александровна', 'Главное здание, ауд. 280'), L('14:00–15:40', subjects[4], 'Практика', 'Курочкина Анна Александровна')],
      [theory, english(), computers, L('16:00–17:40', subjects[3], 'Практика', 'Михайлова Алла Леонидовна', 'Главное здание, ауд. 301А')], [],
      [L('10:00–11:40', subjects[1], 'Лекция', 'Шур Семен Юрьевич', 'Гидротехнический корпус-2, ауд. 514'), ...design, L('16:00–17:40', subjects[3], 'Лекция', 'Михайлова Алла Леонидовна', 'Главное здание, ауд. 301А')], friday, [], [],
    ],
    odd: [[], [theory, english('Главное здание, ауд. 303'), computers], [], design, friday, [], []],
  };
  const schedule = Object.fromEntries(Object.entries(base).map(([parity, days]) => [parity, days.map((lessons, d) => ({ day: names[d], lessons: lessons.map((l, i) => ({ ...l, id: `${parity}-${d}-${i}` })) }))]));
  function lessonsOn(date, anchor = defaultAnchor, changes = []) {
    const originals = schedule[weekFor(date, anchor)][weekday(date)].lessons;
    const result = originals.filter(l => !changes.some(c => c.sourceDate === date && c.sourceId === l.id)).map(l => ({ ...l, sourceDate: date, sourceId: l.id }));
    for (const c of changes) if (!c.cancelled && c.date === date) result.push({ ...c, changed: true });
    return result.sort((a, b) => a.time.localeCompare(b.time));
  }
  function nextDate(subject, anchor = defaultAnchor, now = new Date(), changes = []) {
    const start = typeof now === 'string' ? now : today(now);
    for (let i = 0; i < 370; i++) {
      const date = addDays(start, i);
      if (lessonsOn(date, anchor, changes).some(l => canonical(l.subject) === canonical(subject))) return date;
    }
    return null;
  }
  const taskDate = (task, anchor, changes = [], now = new Date()) => validDate(task.due) ? task.due : nextDate(task.subject, anchor, now, changes);
  const format = date => validDate(date) ? date.split('-').reverse().join('.') : 'не указана';
  return { today, parse, iso, addDays, weekday, names, subjects, canonical, mondayDay, defaultAnchor, validAnchor, validDate, validTime, weekFor, schedule, lessonsOn, nextDate, taskDate, format };
})();
if (typeof module !== 'undefined') module.exports = StudentCalendar;
