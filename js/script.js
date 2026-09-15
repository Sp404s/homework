// Live Server показывает только файлы, поэтому открываем сервер с API бота.
if (['127.0.0.1', 'localhost'].includes(location.hostname) && location.port === '5500') {
  location.replace(`http://${location.hostname}:3210/`);
}
const LANGUAGE_KEY = 'student-language';
const interfaceCopy = {
  ru: {
    locale: 'ru-RU', documentLanguage: 'ru', pageTitle: 'Домашка', logoAlt: 'Логотип',
    openMenu: 'Открыть меню', closeMenu: 'Закрыть меню', menu: 'Меню', navigation: 'Разделы портала',
    language: 'Язык', footer: 'Учёба, сообщества и преподаватели',
    sections: {
      homework: { title: 'Домашние задания', description: '' },
      map: { title: 'Карта', description: 'Здесь появится карта учебного заведения и расположение корпусов.' },
      schedule: { title: 'Расписание', description: '' },
      communities: { title: 'Сообщества', description: 'Группы по предметам и общая таблица для записи.' },
      teachers: { title: 'Преподаватели', description: 'Поиск по ФИО или названию предмета.' },
    },
    today: 'Сегодня', week: 'Неделя:', previousWeek: '‹ Неделя', currentWeek: 'Сегодня', nextWeek: 'Неделя ›',
    parityLabel: 'Чётность текущей недели', evenWeek: 'Чётная неделя', oddWeek: 'Нечётная неделя',
    saveError: 'Не удалось сохранить. Запустите сервер и откройте http://127.0.0.1:3210.',
    noLessons: 'Нет занятий', classCount: count => `${count} зан.`, todayMarker: 'Сегодня', changedMarker: 'Изменено',
    scheduleChange: 'Изменение расписания', cancelled: 'занятие отменено', movedTo: 'перенесено на',
    dueDate: 'Дата сдачи:', noDueLesson: 'нет занятия в расписании', further: 'В дальнейшем',
    openLiveSite: 'Открыть сайт с актуальными заданиями', attachments: 'Вложения', link: 'Ссылка', file: 'Файл',
    openCommunity: 'Перейти в группу', openTable: 'Открыть таблицу', officialProfile: 'Профиль СПбПУ',
    teacherSearch: 'ФИО или предмет', noTeachers: 'Ничего не найдено', photoLater: 'Фото позже',
  },
  zh: {
    locale: 'zh-CN', documentLanguage: 'zh-CN', pageTitle: '作业', logoAlt: '标志',
    openMenu: '打开菜单', closeMenu: '关闭菜单', menu: '菜单', navigation: '门户栏目',
    language: '语言', footer: '学习、社群与教师',
    sections: {
      homework: { title: '家庭作业', description: '' },
      map: { title: '地图', description: '这里将显示校园地图和各教学楼的位置。' },
      schedule: { title: '课程表', description: '' },
      communities: { title: '社群', description: '课程群组和报名表。' },
      teachers: { title: '教师', description: '可按姓名或课程搜索。' },
    },
    today: '今天', week: '本周：', previousWeek: '‹ 上一周', currentWeek: '今天', nextWeek: '下一周 ›',
    parityLabel: '当前周单双周', evenWeek: '双周', oddWeek: '单周',
    saveError: '保存失败。请启动服务器并打开 http://127.0.0.1:3210。',
    noLessons: '没有课程', classCount: count => `${count} 节课`, todayMarker: '今天', changedMarker: '有变更',
    scheduleChange: '课程变更', cancelled: '课程已取消', movedTo: '改至',
    dueDate: '截止日期：', noDueLesson: '课程表中没有该课程', further: '后续任务',
    openLiveSite: '打开包含最新作业的网站', attachments: '附件', link: '链接', file: '文件',
    openCommunity: '加入群组', openTable: '打开表格', officialProfile: 'SPbPU 主页',
    teacherSearch: '姓名或课程', noTeachers: '未找到结果', photoLater: '照片稍后添加',
  },
};

const chineseContent = {
  subjects: {
    'Английский язык': '英语',
    'Иностранный язык в профессиональной коммуникации (английский)': '专业交流英语',
    'Компьютерные технологии в дизайне': '设计中的计算机技术',
    'Дизайн-проектирование и исследование': '设计项目与研究',
    'ИИ в отрасли': '行业人工智能',
    'Искусственный интеллект в отрасли': '行业人工智能',
    'История и методология науки': '科学史与科学方法论',
    'Теория дизайна': '设计理论',
    'Дизайн-мышление': '设计思维',
  },
  types: { 'Лекция': '讲座', 'Практика': '实践课', 'КПР': '课程项目', 'Занятие': '课程' },
  teachers: {
    'Курочкина Анна Александровна': '库罗奇金娜·安娜·亚历山德罗芙娜',
    'Князева Елена Валерьевна': '克尼亚泽娃·叶莲娜·瓦列里耶芙娜',
    'Четина Мария Михайловна': '切季娜·玛丽亚·米哈伊洛芙娜',
    'Шур Семен Юрьевич': '舒尔·谢苗·尤里耶维奇',
    'Ченарани Сасан': '萨桑·切纳拉尼',
    'Михайлова Алла Леонидовна': '米哈伊洛娃·阿拉·列昂尼多芙娜',
    'Зубов Андрей Генрихович': '祖博夫·安德烈·根里霍维奇',
    'Зубов Андрей Гендрихович': '祖博夫·安德烈·根里霍维奇',
    'Киреев Артур Генрихович': '基列耶夫·阿尔图尔·根里霍维奇',
  },
  tasks: {
    'Выбрать научную статью, подготовить её содержание на русском языке и подготовиться к пересказу.': '选择一篇科学论文，用俄语准备内容摘要，并准备复述。',
    'Выбрать тему будущего VR-пространства: например, космос, лес, музей, библиотека или другой вариант.': '选择未来 VR 空间的主题，例如太空、森林、博物馆、图书馆或其他主题。',
    'Работать над проектом продукта из орехов и сухофруктов: изучить технологии производства, целевую аудиторию и аналоги.': '开展坚果和干果产品项目：研究生产技术、目标受众和同类产品。',
    'Разработать форму и упаковку продукта, фирменный стиль и рекламные носители. Срок этого этапа пока не указан.': '设计产品造型与包装、品牌视觉和广告载体。此阶段的截止日期尚未确定。',
    'Подготовить доклад на тему «Как устроены нейросети».': '准备题为《神经网络如何工作》的报告。',
    'Подготовить реферат и презентацию на тему «Научные открытия, изменившие мир». Открытие должно быть совершено не раньше второй половины XIX века.': '准备题为《改变世界的科学发现》的论文和演示文稿。所选发现不得早于19世纪下半叶。',
  },
};

let language = localStorage.getItem(LANGUAGE_KEY) === 'zh' ? 'zh' : 'ru';
function copy() { return interfaceCopy[language]; }
function translated(group, value) {
  if (language !== 'zh' || value === undefined || value === null) return value;
  return chineseContent[group]?.[value] || value;
}
function translatedTask(task, field = 'text') {
  const value = task[field];
  if (language !== 'zh') return value;
  return task[`${field}Zh`] || translated('tasks', value);
}
function translatedPlace(value) {
  if (language !== 'zh' || !value) return value;
  return value.replace('Аудитория и корпус не указаны', '未注明教学楼和教室')
    .replace('Главное здание', '主楼')
    .replace('Гидротехнический корпус-2', '水利工程二号楼')
    .replace('Научно-исследовательский корпус', '科研楼')
    .replace(', ауд. ', '，教室 ');
}
function formattedDate(date, options) { return date.toLocaleDateString(copy().locale, options); }
function formattedDateKey(value) {
  if (language === 'ru') return StudentCalendar.format(value);
  const date = new Date(`${value}T12:00:00`);
  return formattedDate(date, { year: 'numeric', month: 'long', day: 'numeric' });
}

const buttons = document.querySelectorAll('[data-section]');
const title = document.querySelector('#section-title');
const description = document.querySelector('#section-description');
const content = document.querySelector('#content');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Чётность привязана к календарю: неделя 14–20 сентября 2026 года является нечётной.
const weekAnchor = { ...StudentCalendar.defaultAnchor };
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

const communitiesPanel = document.createElement('div');
communitiesPanel.className = 'communities-panel';
communitiesPanel.hidden = true;
document.querySelector('#content').append(communitiesPanel);

const teachersPanel = document.createElement('div');
teachersPanel.className = 'teachers-panel';
teachersPanel.hidden = true;
document.querySelector('#content').append(teachersPanel);

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

const communities = [
  {
    icon: 'assets/community-max.svg', kind: 'max', title: 'Дизайн-мышление', titleZh: '设计思维',
    note: 'Группа предмета в MAX', noteZh: 'MAX 课程群组',
    url: 'https://max.ru/join/tzSWfIyCud01Ys7ThxuMoVsphrDH88xkv2a4zqLcC34',
  },
  {
    icon: 'assets/community-vk.svg', kind: 'vk', title: 'Теория дизайна', titleZh: '设计理论',
    note: 'Беседа предмета во ВКонтакте', noteZh: 'VK 课程群聊',
    url: 'https://vk.me/join//oP7C7ks8FDfuEAl4y2w3YaQ5PxgJDsEXQs=',
  },
  {
    icon: 'assets/community-sheet.svg', kind: 'sheet', title: 'Таблица для записи', titleZh: '报名表',
    note: 'Общая таблица Google Sheets', noteZh: 'Google Sheets 共享表格',
    url: 'https://docs.google.com/spreadsheets/d/1g6S19Z3uwTVmChxkFWDgujkYSo48vzDJGaQl70Jw0F0/edit?usp=sharing',
  },
];

const teachers = [
  {
    name: 'Курочкина Анна Александровна', nameZh: '库罗奇金娜·安娜·亚历山德罗芙娜',
    role: 'Профессор · Высшая школа сервиса и торговли', roleZh: '教授 · 服务与贸易高等学校',
    subjects: 'История и методология науки', subjectsZh: '科学史与科学方法论',
    profile: 'https://imet.spbstu.ru/person/kurochkina_anna_aleksandrovna/',
  },
  {
    name: 'Князева Елена Валерьевна', nameZh: '克尼亚泽娃·叶莲娜·瓦列里耶芙娜',
    role: 'Доцент · Высшая школа дизайна и архитектуры', roleZh: '副教授 · 设计与建筑高等学校',
    subjects: 'Теория дизайна', subjectsZh: '设计理论',
    profile: 'https://www.spbstu.ru/university/about-the-university/personalities/166756_knyazeva_elena_valerevna/',
  },
  {
    name: 'Четина Мария Михайловна', nameZh: '切季娜·玛丽亚·米哈伊洛芙娜',
    role: 'Доцент · Высшая школа лингвистики и педагогики', roleZh: '副教授 · 语言学与教育高等学校',
    subjects: 'Английский язык', subjectsZh: '英语',
    profile: 'https://hum.spbstu.ru/ling_asp/',
  },
  {
    name: 'Ченарани Сасан', nameZh: '萨桑·切纳拉尼',
    role: 'Ассистент · Высшая школа дизайна и архитектуры', roleZh: '助教 · 设计与建筑高等学校',
    subjects: 'Компьютерные технологии в дизайне · практика', subjectsZh: '设计中的计算机技术 · 实践课',
    profile: 'https://design.spbstu.ru/person/chenarani_sasan/',
  },
  {
    name: 'Щур Семен Юрьевич', nameZh: '舒尔·谢苗·尤里耶维奇',
    role: 'Доцент · Высшая школа дизайна и архитектуры', roleZh: '副教授 · 设计与建筑高等学校',
    subjects: 'Компьютерные технологии в дизайне · лекция', subjectsZh: '设计中的计算机技术 · 讲座',
    profile: 'https://ice.spbstu.ru/person/shur_semen_urevich/',
  },
  {
    name: 'Зубов Андрей Гендрихович', nameZh: '祖博夫·安德烈·根里霍维奇',
    role: 'Доцент · Высшая школа дизайна и архитектуры', roleZh: '副教授 · 设计与建筑高等学校',
    subjects: 'Дизайн-проектирование и исследование', subjectsZh: '设计项目与研究',
    profile: 'https://design.spbstu.ru/person/?paging=2',
  },
  {
    name: 'Михайлова Алла Леонидовна', nameZh: '米哈伊洛娃·阿拉·列昂尼多芙娜',
    role: 'Доцент · Высшая школа дизайна и архитектуры', roleZh: '副教授 · 设计与建筑高等学校',
    subjects: 'Искусственный интеллект в отрасли', subjectsZh: '行业人工智能',
    profile: 'https://design.spbstu.ru/person/?paging=7',
  },
  {
    name: 'Киреев Артур Генрихович', nameZh: '基列耶夫·阿尔图尔·根里霍维奇',
    role: 'Доцент · Высшая школа технологического предпринимательства', roleZh: '副教授 · 技术创业高等学校',
    subjects: 'Дизайн-мышление', subjectsZh: '设计思维',
    profile: 'https://gste.spbstu.ru/person/kireev_artur_genrihovich/',
  },
];

const localized = (item, field) => language === 'zh' ? item[`${field}Zh`] || item[field] : item[field];

function renderCommunities() {
  communitiesPanel.replaceChildren();
  const grid = element('div', '', 'community-grid');
  for (const community of communities) {
    const card = element('a', '', `community-card community-card--${community.kind}`);
    card.href = community.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    const mark = element('span', '', 'community-mark');
    mark.setAttribute('aria-hidden', 'true');
    const icon = element('img');
    icon.src = community.icon;
    icon.alt = '';
    mark.append(icon);
    const body = element('span', '', 'community-body');
    body.append(element('strong', localized(community, 'title')), element('span', localized(community, 'note')),
      element('span', community.kind === 'sheet' ? copy().openTable : copy().openCommunity, 'community-action'));
    card.append(mark, body, element('span', '↗', 'community-arrow'));
    grid.append(card);
  }
  communitiesPanel.append(grid);
}

let teacherSearch = '';
function teacherInitials(name) {
  return name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}
function renderTeachers() {
  teachersPanel.replaceChildren();
  const search = element('input', '', 'teacher-search');
  search.type = 'search';
  search.value = teacherSearch;
  search.placeholder = copy().teacherSearch;
  search.setAttribute('aria-label', copy().teacherSearch);
  search.autocomplete = 'off';
  search.addEventListener('input', () => { teacherSearch = search.value; renderTeachers(); teachersPanel.querySelector('input').focus(); });
  teachersPanel.append(search);
  const query = teacherSearch.trim().toLocaleLowerCase(language === 'zh' ? 'zh-CN' : 'ru-RU');
  const matches = teachers.filter(teacher => !query || [teacher.name, teacher.nameZh, teacher.role, teacher.roleZh,
    teacher.subjects, teacher.subjectsZh].join(' ').toLocaleLowerCase().includes(query));
  if (!matches.length) {
    teachersPanel.append(element('p', copy().noTeachers, 'empty-search'));
    return;
  }
  const grid = element('div', '', 'teacher-grid');
  for (const teacher of matches) {
    const card = element('article', '', 'teacher-card');
    const photo = element('div', '', 'teacher-photo');
    if (teacher.photo) {
      const image = element('img');
      image.src = teacher.photo;
      image.alt = localized(teacher, 'name');
      image.loading = 'lazy';
      photo.append(image);
    } else {
      photo.textContent = teacherInitials(teacher.name);
      photo.setAttribute('aria-label', copy().photoLater);
    }
    const info = element('div', '', 'teacher-info');
    info.append(element('h3', localized(teacher, 'name')), element('p', localized(teacher, 'role'), 'teacher-role'),
      element('p', localized(teacher, 'subjects'), 'teacher-subject'));
    const profile = element('a', copy().officialProfile, 'teacher-profile');
    profile.href = teacher.profile;
    profile.target = '_blank';
    profile.rel = 'noopener noreferrer';
    info.append(profile);
    card.append(photo, info);
    grid.append(card);
  }
  teachersPanel.append(grid);
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

function daysUntil(due, now = new Date()) {
  const [year, month, day] = due.split('-').map(Number);
  // Сравниваем календарные дни, без влияния времени суток и перехода часов.
  return Math.round((Date.UTC(year, month - 1, day) -
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}
function safeAttachmentUrl(attachment) {
  if (!attachment || typeof attachment.url !== 'string') return null;
  try {
    const url = new URL(attachment.url, location.origin);
    if (attachment.type === 'link' && ['http:', 'https:'].includes(url.protocol)) return url.href;
    if (attachment.type === 'file' && url.origin === location.origin && url.pathname === '/api/file') return url.href;
  } catch { /* Неправильная ссылка не отображается. */ }
  return null;
}
function appendHomeworkAttachments(card, task) {
  if (!Array.isArray(task.attachments) || !task.attachments.length) return;
  const block = element('div', '', 'homework-attachments');
  block.append(element('strong', copy().attachments));
  const list = element('div', '', 'attachment-list');
  for (const attachment of task.attachments) {
    const url = safeAttachmentUrl(attachment);
    if (!url) continue;
    const kind = attachment.type === 'link' ? copy().link : copy().file;
    const link = element('a', `${kind}: ${attachment.name}`, 'attachment-link');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (attachment.type === 'file') link.download = attachment.name;
    list.append(link);
  }
  if (list.children.length) { block.append(list); card.append(block); }
}
function renderHomework() {
  homeworkPanel.replaceChildren();
  const today = new Date();
  homeworkPanel.append(element('p', `${copy().today} ${formattedDate(today, {
    day: 'numeric', month: 'long', year: 'numeric',
  })}`, 'today-label'));
  if (location.protocol === 'file:') {
    const link = element('a', copy().openLiveSite);
    link.href = 'http://127.0.0.1:3210';
    homeworkPanel.append(link);
  }
  const cards = element('div', '', 'homework-list');
  homework.map((task) => ({ ...task, due: StudentCalendar.taskDate(task, weekAnchor, scheduleChanges, today) }))
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')).forEach((task, index) => {
    if (!task.due) {
      const card = element('article', '', 'homework-card');
      card.style.setProperty('--item-index', index);
      card.append(element('h3', translated('subjects', task.subject)),
        element('p', `${copy().dueDate} ${copy().noDueLesson}`), element('p', translatedTask(task)));
      appendHomeworkAttachments(card, task);
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
    deadline.append(element('strong', formattedDate(date)));
    deadline.dateTime = task.due;
    meta.append(element('span', copy().dueDate), deadline);
    card.append(element('h3', translated('subjects', task.subject)), meta, element('p', translatedTask(task)));
    if (task.next) {
      const next = element('div', '', 'homework-next');
      next.append(element('strong', copy().further), element('p', translatedTask(task, 'next')));
      card.append(next);
    }
    appendHomeworkAttachments(card, task);
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
  const dateFormat = new Intl.DateTimeFormat(copy().locale, { day: 'numeric', month: 'long' });
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  schedulePanel.append(element('p', `${copy().today} ${formattedDate(today, {
    day: 'numeric', month: 'long', year: 'numeric',
  })}`, 'today-label'));
  schedulePanel.append(element('p', `${copy().week} ${dateFormat.format(monday)} — ${dateFormat.format(sunday)}`, 'week-range'));
  const weekNav = element('div', '', 'week-switcher');
  for (const [label, offset] of [[copy().previousWeek, -1], [copy().currentWeek, 0], [copy().nextWeek, 1]]) {
    const button = element('button', label); button.type = 'button';
    button.addEventListener('click', () => { viewWeekOffset = offset ? viewWeekOffset + offset : 0; renderSchedule(); });
    weekNav.append(button);
  }
  schedulePanel.append(weekNav);
  const parityBadge = element('p', selectedWeek === 'even' ? copy().evenWeek : copy().oddWeek, 'week-parity-badge');
  parityBadge.setAttribute('aria-label', copy().parityLabel);
  schedulePanel.append(parityBadge);
  const days = schedule[selectedWeek].map((day, index) => {
    const date = StudentCalendar.addDays(`${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`, index);
    return { ...day, lessons: StudentCalendar.lessonsOn(date, weekAnchor, scheduleChanges), dateKey: date };
  });
  days.forEach(({ day, lessons, dateKey }, index) => {
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
    label.append(element('span', language === 'zh' ? ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'][index] : day, 'day-name'),
      element('span', dateFormat.format(date) + (isToday ? ` · ${copy().todayMarker}` : '') +
        (changes.length ? ` · ${copy().changedMarker}` : ''), 'day-date'));
    const status = element('span', lessons.length ? copy().classCount(lessons.length) : copy().noLessons, 'day-status');
    toggle.append(label, status);
    if (lessons.length || changes.length) {
      const arrow = element('span', '', 'day-arrow');
      arrow.setAttribute('aria-hidden', 'true');
      toggle.append(arrow);
    } else {
      toggle.title = copy().noLessons;
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
      const lessonType = element('span', translated('types', type || 'Занятие'), 'lesson-type');
      const normalizedType = String(type || '').toLocaleLowerCase('ru-RU');
      if (normalizedType.includes('практик')) lessonType.classList.add('lesson-type--practice');
      else if (normalizedType.includes('лекц')) lessonType.classList.add('lesson-type--lecture');
      topLine.append(element('span', time, 'lesson-time'), lessonType);
      const details = element('div');
      if (changed) { item.classList.add('lesson-changed'); details.append(element('span', copy().scheduleChange, 'change-badge')); }
      details.append(element('h4', translated('subjects', subject)), element('p', translated('teachers', teacher)),
        element('p', translatedPlace(place), 'lesson-place'));
      item.append(topLine, details);
      list.append(item);
    });
    for (const change of changes) {
      if (change.cancelled || (change.sourceDate === dateKey && change.date !== dateKey)) {
        const separator = language === 'zh' ? '，' : ', ';
        list.append(element('li', `${translated('subjects', change.subject)}: ${change.cancelled ? copy().cancelled :
          copy().movedTo + ' ' + formattedDateKey(change.date) + separator + change.time}`, 'lesson change-note'));
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

function applyLanguage(nextLanguage) {
  language = nextLanguage === 'zh' ? 'zh' : 'ru';
  localStorage.setItem(LANGUAGE_KEY, language);
  const labels = copy();
  document.documentElement.lang = labels.documentLanguage;
  document.title = labels.pageTitle;
  document.querySelector('.site-logo').alt = labels.logoAlt;
  menuToggle.setAttribute('aria-label', labels.openMenu);
  menuClose.setAttribute('aria-label', labels.closeMenu);
  document.querySelector('#menu-title').textContent = labels.menu;
  document.querySelector('.menu-navigation').setAttribute('aria-label', labels.navigation);
  document.querySelector('.language-switcher').setAttribute('aria-label', labels.language);
  document.querySelector('#site-footer').textContent = labels.footer;
  buttons.forEach((button) => {
    button.querySelector('span').textContent = labels.sections[button.dataset.section].title;
  });
  document.querySelectorAll('[data-language]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.language === language));
  });
  const activeButton = Array.from(buttons).find((button) => button.getAttribute('aria-pressed') === 'true') || buttons[0];
  const section = labels.sections[activeButton.dataset.section];
  title.textContent = section.title;
  description.textContent = section.description;
  description.hidden = !section.description;
  renderHomework();
  renderSchedule();
  renderCommunities();
  renderTeachers();
}

document.querySelectorAll('[data-language]').forEach((button) => {
  button.addEventListener('click', () => applyLanguage(button.dataset.language));
});
applyLanguage(language);

let activeSection = 'homework';
let sectionSwitching = false;
async function switchSection(button) {
  const key = button.dataset.section;
  const section = copy().sections[key];
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
  communitiesPanel.hidden = key !== 'communities';
  teachersPanel.hidden = key !== 'teachers';
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
  if (location.protocol === 'file:' || syncingHomework) return;
  syncingHomework = true;
  try {
    const response = await fetch('/api/homework', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('API unavailable');
    const data = await response.json();
    const receivedChanges = Array.isArray(data.scheduleChanges) ? data.scheduleChanges : [];
    const changesChanged = JSON.stringify(scheduleChanges) !== JSON.stringify(receivedChanges);
    scheduleChanges = receivedChanges;
    if (changesChanged) renderSchedule();
    const knownSubjects = new Set(Object.values(schedule).flatMap((days) => days.flatMap((day) => day.lessons.map((item) => item.subject))));
    knownSubjects.add('Английский язык');
    knownSubjects.add('ИИ в отрасли');
    const validAttachment = attachment => attachment && ['link', 'file'].includes(attachment.type) &&
      typeof attachment.name === 'string' && attachment.name.length > 0 && attachment.name.length <= 180 && safeAttachmentUrl(attachment);
    if (!Array.isArray(data.tasks) || data.tasks.length > 50 || !data.tasks.every((task) =>
      task && knownSubjects.has(task.subject) && typeof task.text === 'string' && task.text.length <= 4000 &&
      (task.next === undefined || (typeof task.next === 'string' && task.next.length <= 4000)) &&
      (task.textZh === undefined || (typeof task.textZh === 'string' && task.textZh.length <= 8000)) &&
      (task.nextZh === undefined || (typeof task.nextZh === 'string' && task.nextZh.length <= 8000)) &&
      (task.attachments === undefined || (Array.isArray(task.attachments) && task.attachments.length <= 10 && task.attachments.every(validAttachment))))) throw new Error('Invalid data');
    if (changesChanged || JSON.stringify(homework) !== JSON.stringify(data.tasks)) {
      homework = data.tasks;
      renderHomework();
    }
  } catch { /* Оставляем последнюю загруженную версию без служебной надписи. */ }
  finally { syncingHomework = false; }
}
syncHomework();
setInterval(syncHomework, 5000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncHomework(); });
