// Live Server показывает только файлы, поэтому открываем сервер с API бота.
if (['127.0.0.1', 'localhost'].includes(location.hostname) && location.port === '5500') {
  location.replace(`http://${location.hostname}:3210/`);
}
// Разделы студенческого портала.
const sections = {
  homework: {
    title: 'Домашние задания',
    description: '',
  },
  map: {
    title: 'Карта',
    description: 'Здесь появится карта учебного заведения и расположение корпусов.',
  },
  schedule: {
    title: 'Расписание',
    description: 'Неделя определяется автоматически. Переключатель ниже позволяет локально уточнить чётность на этом устройстве.',
  },
};

const buttons = document.querySelectorAll('[data-section]');
const title = document.querySelector('#section-title');
const description = document.querySelector('#section-description');
const content = document.querySelector('#content');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function calendarDay(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}
function mondayDay(date) {
  return StudentCalendar.mondayDay(date);
}
function readWeekOverride() {
  try {
    const value = JSON.parse(localStorage.getItem('student-week-override') || 'null');
    return StudentCalendar.validAnchor(value) ? value : null;
  } catch { return null; }
}
const isLocalServer = ['127.0.0.1', 'localhost'].includes(location.hostname);
let localWeekOverride = readWeekOverride();
// Сервер задаёт общую неделю, а публичный переключатель хранит личное уточнение только на устройстве посетителя.
let weekAnchor = localWeekOverride || { ...StudentCalendar.defaultAnchor };
let settingsKey = '';
let weekSaving = false;
function weekFor(date) {
  return StudentCalendar.weekFor(date, weekAnchor);
}
let selectedWeek = weekFor(new Date());
const schedule = StudentCalendar.schedule;
let scheduleChanges = [];
let viewWeekOffset = 0;

const schedulePanel = document.createElement('div');
schedulePanel.hidden = true;
document.querySelector('#content').append(schedulePanel);

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function setLessonListExpanded(list, toggle, expanded, animated = true) {
  if (list._accordionAnimation) list._accordionAnimation.cancel();
  toggle.setAttribute('aria-expanded', String(expanded));
  if (!animated || reducedMotion.matches || typeof list.animate !== 'function') {
    list.hidden = !expanded;
    return;
  }
  list.hidden = false;
  const fullHeight = list.scrollHeight;
  const currentHeight = expanded ? 0 : list.getBoundingClientRect().height;
  const animation = list.animate([
    { height: `${currentHeight}px`, opacity: expanded ? 0 : 1, transform: expanded ? 'translateY(-8px)' : 'translateY(0)' },
    { height: `${expanded ? fullHeight : 0}px`, opacity: expanded ? 1 : 0, transform: expanded ? 'translateY(0)' : 'translateY(-8px)' },
  ], { duration: expanded ? 280 : 210, easing: 'cubic-bezier(.22, 1, .36, 1)' });
  list._accordionAnimation = animation;
  animation.addEventListener('finish', () => {
    list.hidden = !expanded;
    list._accordionAnimation = null;
    animation.cancel();
  }, { once: true });
}

// Задания повторяются; срок рассчитывается по ближайшему занятию.
let homework = [
  { subject: 'Английский язык',
    text: 'Выбрать научную статью, подготовить её содержание на русском языке и подготовиться к пересказу.' },
  { subject: 'Компьютерные технологии в дизайне',
    text: 'Выбрать тему будущего VR-пространства: например, космос, лес, музей, библиотека или другой вариант.' },
  { subject: 'Дизайн-проектирование и исследование',
    text: 'Работать над проектом продукта из орехов и сухофруктов: изучить технологии производства, целевую аудиторию и аналоги.',
    next: 'Разработать форму и упаковку продукта, фирменный стиль и рекламные носители. Срок этого этапа пока не указан.' },
  { subject: 'ИИ в отрасли',
    text: 'Подготовить доклад на тему «Как устроены нейросети».' },
  { subject: 'История и методология науки',
    text: 'Подготовить реферат и презентацию на тему «Научные открытия, изменившие мир». Открытие должно быть совершено не раньше второй половины XIX века.' },
];
const homeworkPanel = element('div', '', 'homework-panel');
document.querySelector('#content').append(homeworkPanel);

function nextLessonDate(subject, now = new Date()) {
  return StudentCalendar.nextDate(subject, weekAnchor, now, scheduleChanges);
}

async function persistWeek(anchor) {
  if (location.protocol === 'file:') throw new Error('Откройте сайт через сервер');
  if (!isLocalServer) {
    localWeekOverride = anchor;
    localStorage.setItem('student-week-override', JSON.stringify(anchor));
    return;
  }
  const response = await fetch('/api/week', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Settings-Key': settingsKey },
    body: JSON.stringify(anchor), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Неделя не сохранена');
}


function daysUntil(due, now = new Date()) {
  const [year, month, day] = due.split('-').map(Number);
  // Сравниваем календарные дни, без влияния времени суток и перехода часов.
  return Math.round((Date.UTC(year, month - 1, day) -
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}
function dayWord(count) {
  const n = Math.abs(count);
  if (n % 100 >= 11 && n % 100 <= 14) return 'дней';
  if (n % 10 === 1) return 'день';
  if (n % 10 >= 2 && n % 10 <= 4) return 'дня';
  return 'дней';
}
function deadlineLabel(days) {
  if (days === 0) return 'Сдать сегодня';
  if (days === 1) return 'Сдать завтра';
  if (days < 0) return `Срок прошёл ${-days} ${dayWord(days)} назад`;
  return `Через ${days} ${dayWord(days)}`;
}
function renderHomework() {
  homeworkPanel.replaceChildren();
  const today = new Date();
  homeworkPanel.append(element('p', `Сегодня ${today.toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })}`, 'today-label'));
  if (location.protocol === 'file:') {
    const link = element('a', 'Открыть сайт с актуальными заданиями');
    link.href = 'http://127.0.0.1:3210';
    homeworkPanel.append(link);
  }
  const cards = element('div', '', 'homework-list');
  homework.map((task) => ({ ...task, due: StudentCalendar.taskDate(task, weekAnchor, scheduleChanges, today) }))
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')).forEach((task, index) => {
    if (!task.due) {
      const card = element('article', '', 'homework-card');
      card.style.setProperty('--item-index', index);
      card.append(element('h3', task.subject), element('p', 'Дата сдачи: нет занятия в расписании'), element('p', task.text));
      cards.append(card);
      return;
    }
    const days = daysUntil(task.due, today);
    const card = element('article', '', 'homework-card');
    card.style.setProperty('--item-index', index);
    if (days === 0) card.classList.add('due-today');
    const [year, month, day] = task.due.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const meta = element('div', '', 'homework-meta');
    const deadline = element('time');
    deadline.append(element('strong', date.toLocaleDateString('ru-RU')));
    deadline.dateTime = task.due;
    meta.append(element('span', 'Дата сдачи:'), deadline);
    card.append(element('h3', task.subject), meta, element('p', task.text));
    if (task.next) {
      const next = element('div', '', 'homework-next');
      next.append(element('strong', 'В дальнейшем'), element('p', task.next));
      card.append(next);
    }
    cards.append(card);
  });
  homeworkPanel.append(cards);
}
renderHomework();

function renderSchedule() {
  const expanded = new Set(Array.from(schedulePanel.querySelectorAll('.day-toggle[aria-expanded="true"]')).map(button => button.dataset.date));
  schedulePanel.replaceChildren();
  const today = new Date(StudentCalendar.today() + 'T12:00:00');
  selectedWeek = weekFor(today);
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  monday.setDate(monday.getDate() + viewWeekOffset * 7);
  selectedWeek = weekFor(monday);
  const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  schedulePanel.append(element('p', `Сегодня ${dateFormat.format(today)} ${today.getFullYear()} г.`, 'today-label'));
  schedulePanel.append(element('p', `Неделя: ${dateFormat.format(monday)} — ${dateFormat.format(sunday)}`, 'week-range'));
  const weekNav = element('div', '', 'week-switcher');
  for (const [label, offset] of [['‹ Неделя', -1], ['Сегодня', 0], ['Неделя ›', 1]]) {
    const button = element('button', label); button.type = 'button';
    button.addEventListener('click', () => { viewWeekOffset = offset ? viewWeekOffset + offset : 0; renderSchedule(); });
    weekNav.append(button);
  }
  schedulePanel.append(weekNav);
  const switcher = element('div', '', 'week-switcher');
  switcher.setAttribute('role', 'group');
  switcher.setAttribute('aria-label', 'Чётность текущей недели');
  for (const [key, label] of [['even', 'Чётная неделя'], ['odd', 'Нечётная неделя']]) {
    const button = element('button', label);
    button.type = 'button';
    button.dataset.week = key;
    button.setAttribute('aria-pressed', String(selectedWeek === key));
    button.addEventListener('click', async () => {
      if (weekSaving) return;
      weekSaving = true;
      try {
        // Получаем свежий ключ даже после перезапуска сервера.
        if (location.protocol !== 'file:') {
          const response = await fetch('/api/homework', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
          if (!response.ok) throw new Error('Нет сервера');
          settingsKey = (await response.json()).settingsKey || '';
        }
        const anchor = { monday: mondayDay(monday), parity: key, confirmed: true };
        await persistWeek(anchor);
        weekAnchor = anchor;
        renderSchedule();
        renderHomework();
        schedulePanel.querySelector(`[data-week="${key}"]`).focus();
      } catch {
        const notice = element('p', 'Не удалось сохранить. Запустите сервер и откройте http://127.0.0.1:3210.', 'week-range');
        notice.setAttribute('role', 'alert');
        schedulePanel.prepend(notice);
      } finally { weekSaving = false; }
    });
    switcher.append(button);
  }
  schedulePanel.append(switcher);
  const days = schedule[selectedWeek].map((day, index) => {
    const date = StudentCalendar.addDays(`${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`, index);
    return { ...day, lessons: StudentCalendar.lessonsOn(date, weekAnchor, scheduleChanges), dateKey: date };
  });
  days.forEach(({ day, lessons, note, dateKey }, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    const isToday = date.toDateString() === today.toDateString();
    const dayBlock = element('article', '', 'schedule-day');
    dayBlock.style.setProperty('--item-index', index);
    if (isToday) dayBlock.classList.add('is-today');
    if (!lessons.length) dayBlock.classList.add('is-empty');
    const changes = scheduleChanges.filter(c => c.date === dateKey || c.sourceDate === dateKey);
    if (changes.length) dayBlock.classList.add('is-changed');
    const heading = element('h3');
    const toggle = element('button', '', 'day-toggle');
    toggle.type = 'button';
    toggle.dataset.date = dateKey;
    toggle.disabled = !lessons.length && !changes.length;
    const label = element('span', '', 'day-label');
    label.append(element('span', day, 'day-name'),
      element('span', dateFormat.format(date) + (isToday ? ' · Сегодня' : '') + (changes.length ? ' · Изменено' : ''), 'day-date'));
    const status = element('span', lessons.length ? `${lessons.length} зан.` : 'Нет занятий', 'day-status');
    toggle.append(label, status);
    if (lessons.length || changes.length) {
      const arrow = element('span', '', 'day-arrow');
      arrow.setAttribute('aria-hidden', 'true');
      toggle.append(arrow);
    } else {
      toggle.title = note;
    }
    heading.append(toggle);
    dayBlock.append(heading);
    const list = element('ul', '', 'lesson-list');
    list.id = `day-lessons-${index}`;
    list.hidden = !(isToday || expanded.has(dateKey));
    if (lessons.length || changes.length) {
      toggle.setAttribute('aria-controls', list.id);
      toggle.setAttribute('aria-expanded', String(!list.hidden));
      toggle.addEventListener('click', () => {
        setLessonListExpanded(list, toggle, toggle.getAttribute('aria-expanded') !== 'true');
      });
    }
    lessons.forEach(({ time, subject, type, teacher, place, changed }) => {
      const item = element('li', '', 'lesson');
      const topLine = element('div', '', 'lesson-topline');
      const lessonType = element('span', type || 'Занятие', 'lesson-type');
      const normalizedType = String(type || '').toLocaleLowerCase('ru-RU');
      if (normalizedType.includes('практик')) lessonType.classList.add('lesson-type--practice');
      else if (normalizedType.includes('лекц')) lessonType.classList.add('lesson-type--lecture');
      topLine.append(element('span', time, 'lesson-time'), lessonType);
      const details = element('div');
      if (changed) { item.classList.add('lesson-changed'); details.append(element('span', 'Изменение расписания', 'change-badge')); }
      details.append(element('h4', subject), element('p', teacher), element('p', place, 'lesson-place'));
      item.append(topLine, details);
      list.append(item);
    });
    for (const change of changes) {
      if (change.cancelled || (change.sourceDate === dateKey && change.date !== dateKey)) {
        list.append(element('li', `${change.subject}: ${change.cancelled ? 'занятие отменено' : 'перенесено на ' + StudentCalendar.format(change.date) + ', ' + change.time}`, 'lesson change-note'));
      }
    }
    if (lessons.length || changes.length) dayBlock.append(list);
    schedulePanel.append(dayBlock);
  });
}
renderSchedule();
// Обновляем даты при смене дня, в том числе после возвращения во вкладку.
let renderedDate = new Date().toDateString();
function refreshDate() {
  const currentDate = new Date().toDateString();
  if (currentDate !== renderedDate) {
    renderedDate = currentDate;
    renderSchedule();
    renderHomework();
  }
}
setInterval(refreshDate, 60000);
document.addEventListener('visibilitychange', refreshDate);

const menuPanel = document.querySelector('#site-menu');
const menuToggle = document.querySelector('.menu-toggle');
const menuClose = document.querySelector('.menu-close');
let menuCloseTimer;

function closeMenu() {
  if (!menuPanel.open || menuPanel.classList.contains('is-closing')) return;
  if (reducedMotion.matches) { menuPanel.close(); return; }
  menuPanel.classList.add('is-closing');
  menuCloseTimer = window.setTimeout(() => {
    if (menuPanel.open) menuPanel.close();
  }, 190);
}

menuToggle.addEventListener('click', () => {
  menuPanel.classList.remove('is-closing');
  menuPanel.showModal();
  menuToggle.setAttribute('aria-expanded', 'true');
  document.body.classList.add('menu-open');
  menuClose.focus();
});
menuClose.addEventListener('click', closeMenu);
menuPanel.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeMenu();
});
menuPanel.addEventListener('close', () => {
  window.clearTimeout(menuCloseTimer);
  menuPanel.classList.remove('is-closing');
  menuToggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
  menuToggle.focus();
});
menuPanel.addEventListener('click', (event) => {
  const bounds = menuPanel.getBoundingClientRect();
  if (event.target === menuPanel && (event.clientY > bounds.bottom || event.clientY < bounds.top ||
      event.clientX < bounds.left || event.clientX > bounds.right)) closeMenu();
});

let activeSection = 'homework';
let sectionSwitching = false;
async function switchSection(button) {
  const key = button.dataset.section;
  const section = sections[key];
  if (!section || sectionSwitching || key === activeSection) return;
  sectionSwitching = true;
  content.classList.add('is-switching');
  if (!reducedMotion.matches && typeof content.animate === 'function') {
    const outgoing = content.animate([
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-8px)' },
    ], { duration: 130, easing: 'ease-in', fill: 'forwards' });
    try { await outgoing.finished; } catch { /* Анимация могла быть отменена браузером. */ }
    outgoing.cancel();
  }
  activeSection = key;
  title.textContent = section.title;
  description.textContent = section.description;
  description.hidden = !section.description;
  schedulePanel.hidden = key !== 'schedule';
  homeworkPanel.hidden = key !== 'homework';
  buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  if (!reducedMotion.matches && typeof content.animate === 'function') {
    const incoming = content.animate([
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 260, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    try { await incoming.finished; } catch { /* Анимация могла быть отменена браузером. */ }
  }
  content.classList.remove('is-switching');
  sectionSwitching = false;
}

buttons.forEach((button) => {
  button.addEventListener('click', async () => {
    closeMenu();
    await switchSection(button);
  });
});

// Токен бота не используется в браузере: он остаётся в серверном процессе.
let syncingHomework = false;
async function syncHomework() {
  if (location.protocol === 'file:' || syncingHomework || weekSaving) return;
  syncingHomework = true;
  try {
    const response = await fetch('/api/homework', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('API unavailable');
    const data = await response.json();
    if (weekSaving) return;
    settingsKey = data.settingsKey || settingsKey;
    const receivedChanges = Array.isArray(data.scheduleChanges) ? data.scheduleChanges : [];
    const changesChanged = JSON.stringify(scheduleChanges) !== JSON.stringify(receivedChanges);
    scheduleChanges = receivedChanges;
    let anchorChanged = false;
    if (StudentCalendar.validAnchor(data.weekAnchor)) {
      const receivedAnchor = localWeekOverride || data.weekAnchor;
      anchorChanged = JSON.stringify(weekAnchor) !== JSON.stringify(receivedAnchor);
      weekAnchor = receivedAnchor;
      if (anchorChanged || changesChanged) renderSchedule();
    }
    const knownSubjects = new Set(Object.values(schedule).flatMap((days) => days.flatMap((day) => day.lessons.map((item) => item.subject))));
    knownSubjects.add('Английский язык');
    knownSubjects.add('ИИ в отрасли');
    if (!Array.isArray(data.tasks) || data.tasks.length > 50 || !data.tasks.every((task) =>
      task && knownSubjects.has(task.subject) && typeof task.text === 'string' && task.text.length <= 4000 &&
      (task.next === undefined || (typeof task.next === 'string' && task.next.length <= 4000)))) throw new Error('Invalid data');
    if (anchorChanged || changesChanged || JSON.stringify(homework) !== JSON.stringify(data.tasks)) {
      homework = data.tasks;
      renderHomework();
    }
  } catch { /* Оставляем последнюю загруженную версию без служебной надписи. */ }
  finally { syncingHomework = false; }
}
syncHomework();
setInterval(syncHomework, 5000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncHomework(); });
