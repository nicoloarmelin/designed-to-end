export function normalize(text) {
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it').trim();
}
export function filterFormats(formats, {query='',categories=new Set(),recurrence='',dimension='',variability='',caseOnly=false}={}) {
  const words=normalize(query).split(/\s+/).filter(Boolean);
  return formats.filter(f => words.every(w=>normalize(f.name+' '+f.title+' '+f.category).includes(w))
    && (!categories.size||categories.has(f.category))
    && (!recurrence||f.recurrenceGroup===recurrence)
    && (!dimension||f.dimension===dimension)
    && (!variability||f.variabilityGroup===variability)
    && (!caseOnly||f.cases.length>0));
}
