// Database utilities for D1

export function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

export function formatDateTime(date = new Date()) {
  return date.toISOString().replace('T', ' ').split('.')[0];
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getMonthRange(date = new Date()) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return {
    start: formatDate(start),
    end: formatDate(end)
  };
}

export function parseMonth(text) {
  const months = {
    'январь': 0, 'января': 0, 'jan': 0, 'january': 0,
    'февраль': 1, 'февраля': 1, 'feb': 1, 'february': 1,
    'март': 2, 'марта': 2, 'mar': 2, 'march': 2,
    'апрель': 3, 'апреля': 3, 'apr': 3, 'april': 3,
    'май': 4, 'мая': 4, 'may': 4,
    'июнь': 5, 'июня': 5, 'jun': 5, 'june': 5,
    'июль': 6, 'июля': 6, 'jul': 6, 'july': 6,
    'август': 7, 'августа': 7, 'aug': 7, 'august': 7,
    'сентябрь': 8, 'сентября': 8, 'sep': 8, 'september': 8,
    'октябрь': 9, 'октября': 9, 'oct': 9, 'october': 9,
    'ноябрь': 10, 'ноября': 10, 'nov': 10, 'november': 10,
    'декабрь': 11, 'декабря': 11, 'dec': 11, 'december': 11
  };

  const lower = text.toLowerCase().trim();
  if (months.hasOwnProperty(lower)) {
    const now = new Date();
    return new Date(now.getFullYear(), months[lower], 1);
  }
  return null;
}

export function getMonthName(date = new Date(), lang = 'ru') {
  const months = {
    ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
         'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    en: ['January', 'February', 'March', 'April', 'May', 'June',
         'July', 'August', 'September', 'October', 'November', 'December']
  };
  return months[lang][date.getMonth()];
}
