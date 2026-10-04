export function normalize(text) {
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it').trim();
}

export function filterItems(items, { query = '', categories = new Set(), kinds = new Set(), year = '' } = {}) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return items.filter(item => {
    const text = normalize(`${item.title} ${item.fullTitle} ${item.category} ${item.kind} ${item.year || ''}`);
    return words.every(word => text.includes(word))
      && (!categories.size || categories.has(item.category))
      && (!kinds.size || kinds.has(item.kind))
      && (!year || (year === 'undated' ? !item.year : item.year === Number(year)));
  });
}
