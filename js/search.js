// Нормализация поиска: регистр, тире и другая пунктуация не влияют на результат.
const StudentSearch = (() => {
  function normalize(value, locale = 'ru-RU') {
    return String(value ?? '')
      .normalize('NFKC')
      .toLocaleLowerCase(locale)
      .replace(/[\p{P}\p{S}]+/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim();
  }

  function includes(value, query, locale = 'ru-RU') {
    const normalizedQuery = normalize(query, locale);
    return !normalizedQuery || normalize(value, locale).includes(normalizedQuery);
  }

  return { normalize, includes };
})();

if (typeof module !== 'undefined') module.exports = StudentSearch;
