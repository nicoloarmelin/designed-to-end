import { items } from './items.js?v=100';
import { InfiniteGrid } from './infinite-grid.js?v=100';
import { filterItems } from './catalogue.js?v=100';

const $ = selector => document.querySelector(selector);
const map = $('#map');
const detail = $('#detail');
const filters = $('#filters');
const welcome = $('#onboarding');
const state = { query: '', categories: new Set(), kinds: new Set(), year: '' };
items.forEach((item, index) => { item.archiveNumber = index + 1; });
let results = items;
let currentIndex = 0;
let searchTimer;
let detailTrigger;
const grid = new InfiniteGrid(map, $('#tiles'), items, openDetail);

function renderFormat(item) {
  const format = item.format;
  $('#detail-meta').replaceChildren();
  const fields = [['Documento', item.kind], ['Edizione dell’immagine', item.year || 'Anno non specifico'],
    ['Formato', format.name], ['Stato della ricerca', format.status],
    ['Titolare', format.owner], ['Produttore dell’edizione', format.producer],
    ['Fondazione / prima edizione', format.firstEdition], ['Ricorrenza', format.recurrence],
    ['Periodo censito', format.period], ['Sede', format.location],
    ['Variabilità', format.variability], ['Edizioni confrontate', format.comparedEditions]];
  for (const [label, value] of fields) {
    const group = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value || 'Non documentato';
    group.append(dt, dd);
    $('#detail-meta').append(group);
  }
  $('#detail-context').textContent = `${item.note.startsWith(format.summary) ? '' : format.summary + '\n\n'}Segni permanenti: ${format.permanentSigns}.\n\nPeriodo e fase della variabilità: ${format.variabilityPeriod || 'Non documentati'}.`;
  $('#detail-limits').textContent = format.limitations || 'Nessuna lacuna specificata nel foglio di ricerca.';
  $('#detail-references').replaceChildren();
  for (const source of format.sources) {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.textContent = source.title;
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    li.append(link);
    $('#detail-references').append(li);
  }
}

function openDetail(item, trigger) {
  if (searchTimer) applyFilters();
  if (!results.includes(item)) return;
  grid.stop();
  detailTrigger = trigger;
  map.classList.add('explored');
  currentIndex = Math.max(0, results.indexOf(item));
  renderDetail();
  if (!detail.open) detail.showModal();
}

function renderDetail() {
  resetImageZoom();
  const item = results[currentIndex];
  setDetailView('image');
  detail.style.setProperty('--title-size', item.title.length > 24 ? '43px' : item.title.length > 16 ? '53px' : '68px');
  $('#detail-title').textContent = item.title;
  $('#detail-category').textContent = item.category;
  $('#detail-subtitle').textContent = item.fullTitle === item.title ? 'Documento visivo dell’archivio' : item.fullTitle;
  const gallery = item.gallery.length ? item.gallery : [{ src: item.src, label: item.kind }];
  const showImage = image => {
    resetImageZoom();
    const related = items.find(entry => entry.src === image.src) || item;
    $('#detail-image').src = image.src;
    $('#detail-image').alt = `${item.title} — ${image.label}`;
    $('#detail-stage').style.background = 'transparent';
    $('#detail-image').dataset.kind = related.kind;
    updateImageTone();
    $('#detail-teaser').textContent = related.note.length > 185 ? related.note.slice(0, 182).replace(/\s+\S*$/, '') + '…' : related.note;
    $('#detail-document-label').textContent = `${related.kind} / ${related.year || 's.d.'}`;
    $('#detail-image').style.padding = related.kind === 'Marchio' ? '24px' : '0';
    $('#detail-note').textContent = related.note;
    $('#detail-subtitle').textContent = related.fullTitle;
    $('#detail-credit').textContent = related.credit;
    $('#detail-source').href = related.source;
    renderFormat(related);
    for (const b of $('#detail-gallery').children) b.setAttribute('aria-pressed', String(b.dataset.src === image.src));
  };
  $('#detail-gallery').replaceChildren();
  if (gallery.length > 1) for (const image of gallery) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.src = image.src;
    button.setAttribute('aria-label', `Mostra ${image.label}`);
    button.setAttribute('aria-pressed', String(image.src === item.src));
    const img = document.createElement('img');
    img.src = image.src;
    img.alt = image.label;
    button.append(img);
    button.addEventListener('click', () => showImage(image));
    $('#detail-gallery').append(button);
  }
  showImage(gallery.find(image => image.src === item.src) || gallery[0]);
  $('#detail-position').textContent = `${currentIndex + 1} / ${results.length}`;
  $('#previous').disabled = results.length < 2;
  $('#next').disabled = results.length < 2;
  detail.scrollTop = 0;
}

function renderFacets(container, field, values) {
  for (const value of values) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = value;
    checkbox.dataset.field = field;
    const name = document.createElement('span');
    name.textContent = value;
    const count = document.createElement('span');
    count.className = 'facet-count';
    count.textContent = items.filter(item => item[field === 'categories' ? 'category' : 'kind'] === value).length;
    count.setAttribute('aria-hidden', 'true');
    label.append(checkbox, name, count);
    container.append(label);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) state[field].add(value);
      else state[field].delete(value);
      applyFilters();
    });
  }
}
renderFacets($('#categories'), 'categories', [...new Set(items.map(item => item.category))].sort((a, b) => a.localeCompare(b, 'it')));
renderFacets($('#kinds'), 'kinds', ['Marchio', 'Manifesto', 'Grafica di edizione', 'Applicazione']);
for (const year of [...new Set(items.map(item => item.year).filter(Boolean))].sort((a, b) => b - a)) {
  const option = document.createElement('option');
  option.value = year;
  option.textContent = year;
  $('#year').append(option);
}
$('#year').addEventListener('change', () => { state.year = $('#year').value; applyFilters(); });

function applyFilters() {
  clearTimeout(searchTimer);
  searchTimer = null;
  results = filterItems(items, state);
  grid.setItems(results);
  $('#empty').hidden = results.length > 0;
  if (state.query || state.categories.size || state.kinds.size || state.year) map.classList.add('explored');
  const formatCount = new Set(results.map(item => item.formatId)).size;
  $('#result-count').textContent = `${formatCount} ${formatCount === 1 ? 'formato' : 'formati'} / ${results.length} ${results.length === 1 ? 'immagine' : 'immagini'}`;
  $('#filters-status').textContent = results.length
    ? `${results.length} ${results.length === 1 ? 'immagine disponibile' : 'immagini disponibili'} con questa selezione.`
    : 'Nessun risultato. Prova a rimuovere un filtro.';
  $('#show-results').textContent = results.length ? `Mostra ${results.length} ${results.length === 1 ? 'immagine' : 'immagini'}` : 'Torna alla mappa';
  const count = state.categories.size + state.kinds.size + Number(Boolean(state.year));
  $('#filter-badge').hidden = count === 0;
  $('#filter-badge').textContent = count;
  $('#clear-search').hidden = !state.query;
  $('#year').value = state.year;
  for (const checkbox of filters.querySelectorAll('input[type="checkbox"]')) checkbox.checked = state[checkbox.dataset.field].has(checkbox.value);
  const chips = $('#active-filters');
  chips.replaceChildren();
  function addChip(text, remove) {
    const button = document.createElement('button');
    button.textContent = `${text} ×`;
    button.setAttribute('aria-label', `Rimuovi filtro ${text}`);
    button.addEventListener('click', () => { remove(); applyFilters(); $('#open-filters').focus(); });
    chips.append(button);
  }
  for (const category of state.categories) addChip(category, () => state.categories.delete(category));
  for (const kind of state.kinds) addChip(kind, () => state.kinds.delete(kind));
  if (state.year) addChip(state.year === 'undated' ? 'Senza anno' : state.year, () => { state.year = ''; });
  chips.hidden = !count;
  document.body.classList.toggle('has-filters', Boolean(count));
}
function clearFilters(includeQuery = false) {
  state.categories.clear();
  state.kinds.clear();
  state.year = '';
  if (includeQuery) { state.query = ''; $('#search').value = ''; }
  applyFilters();
}
$('#search').addEventListener('input', () => {
  state.query = $('#search').value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 100);
});
$('#clear-search').addEventListener('click', () => { state.query = ''; $('#search').value = ''; applyFilters(); $('#search').focus(); });
$('#empty-reset').addEventListener('click', () => { clearFilters(true); map.focus(); });
$('#clear-filters').addEventListener('click', () => clearFilters());
function updateZoom(value) {
  const zoom = grid.setZoom(value);
  $('#zoom-value').textContent = `${Math.round(zoom * 100)}%`;
  $('#zoom-out').disabled = zoom <= .65;
  $('#zoom-in').disabled = zoom >= 1.4;
}
$('#reset').addEventListener('click', () => { updateZoom(1); grid.reset(); map.classList.remove('explored'); map.focus(); });
for (const [id, delta] of [['zoom-out', -.15], ['zoom-in', .15]]) $( '#' + id).addEventListener('click', () => {
  updateZoom(grid.zoom + delta);
  map.classList.add('explored');
});
map.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) map.classList.add('explored'); }, { passive: true });
map.addEventListener('pointermove', () => { if (grid.pointer?.dragged) map.classList.add('explored'); });
map.addEventListener('keydown', e => { if (e.key.startsWith('Arrow')) map.classList.add('explored'); });
$('#open-filters').addEventListener('click', () => { grid.stop(); filters.showModal(); });
$('#close-filters').addEventListener('click', () => filters.close());
$('#show-results').addEventListener('click', () => filters.close());
$('#close').addEventListener('click', () => detail.close());
detail.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || (imageZoom && e.target === $('#detail-stage'))) return;
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key) || results.length < 2) return;
  e.preventDefault();
  currentIndex = (currentIndex + (e.key === 'ArrowRight' ? 1 : -1) + results.length) % results.length;
  renderDetail();
});
$('#previous').addEventListener('click', () => { currentIndex = (currentIndex - 1 + results.length) % results.length; renderDetail(); });
$('#next').addEventListener('click', () => { currentIndex = (currentIndex + 1) % results.length; renderDetail(); });
for (const modal of [detail, filters]) modal.addEventListener('click', e => {
  if (e.target !== modal) return;
  const r = modal.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) modal.close();
});
detail.addEventListener('close', () => {
  const target = detailTrigger?.isConnected && detailTrigger.tabIndex === 0 ? detailTrigger : map;
  target.focus({ preventScroll: true });
});
filters.addEventListener('close', () => $('#open-filters').focus());
const openWelcome = () => { grid.stop(); welcome.showModal(); };
$('#about').addEventListener('click', openWelcome);
$('#help').addEventListener('click', openWelcome);
$('#start').addEventListener('click', () => welcome.close());
welcome.addEventListener('close', () => {
  try { localStorage.setItem('dte-intro-v2', 'seen'); } catch { /* The archive also works without storage. */ }
  map.focus({ preventScroll: true });
});
applyFilters();
let seen = false;
try { seen = localStorage.getItem('dte-intro-v2') === 'seen'; } catch { /* Show the intro when storage is unavailable. */ }
if (!seen) openWelcome();

let imageZoom = false;
let imagePointer = null;
let imageX = 0, imageY = 0;
function resetImageZoom() {
  imageZoom = false;
  imageX = imageY = 0;
  const stage = $('#detail-stage');
  for (const pointerId of [imagePointer?.id].filter(id => id !== undefined)) if (stage.hasPointerCapture(pointerId)) stage.releasePointerCapture(pointerId);
  imagePointer = null;
  stage.classList.remove('zoomed');
  $('#detail-image').style.transform = '';
  $('#detail-zoom').textContent = 'Ingrandisci ↗';
  $('#detail-zoom').setAttribute('aria-pressed', 'false');
}
function toggleImageZoom() {
  if (imageZoom) { resetImageZoom(); return; }
  imageZoom = true;
  $('#detail-stage').classList.add('zoomed');
  $('#detail-image').style.transform = 'scale(2)';
  $('#detail-zoom').textContent = 'Immagine intera ↙';
  $('#detail-zoom').setAttribute('aria-pressed', 'true');
}
$('#detail-zoom').addEventListener('click', toggleImageZoom);
$('#detail-stage').addEventListener('dblclick', toggleImageZoom);
function panImage(dx, dy) {
  const stage = $('#detail-stage');
  const image = $('#detail-image');
  if (!image.naturalWidth || !image.naturalHeight) return;
  const aspect = image.naturalWidth / image.naturalHeight;
  const renderedW = Math.min(stage.clientWidth, stage.clientHeight * aspect);
  const renderedH = renderedW / aspect;
  const limitX = Math.max(0, (renderedW * 2 - stage.clientWidth) / 2);
  const limitY = Math.max(0, (renderedH * 2 - stage.clientHeight) / 2);
  imageX = Math.max(-limitX, Math.min(limitX, imageX + dx));
  imageY = Math.max(-limitY, Math.min(limitY, imageY + dy));
  image.style.transform = `translate(${imageX}px, ${imageY}px) scale(2)`;
}
$('#detail-stage').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); toggleImageZoom(); }
  const directions = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] };
  if (imageZoom && directions[e.key]) { e.preventDefault(); panImage(...directions[e.key]); }
});
$('#detail-stage').addEventListener('pointerdown', e => {
  if (!imageZoom || !e.isPrimary || e.button !== 0) return;
  imagePointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
  $('#detail-stage').setPointerCapture(e.pointerId);
});
$('#detail-stage').addEventListener('pointermove', e => {
  if (!imagePointer || imagePointer.id !== e.pointerId) return;
  panImage(e.clientX - imagePointer.x, e.clientY - imagePointer.y);
  imagePointer.x = e.clientX; imagePointer.y = e.clientY;
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) $('#detail-stage').addEventListener(event, e => {
  if (imagePointer?.id !== e.pointerId) return;
  imagePointer = null;
  if ($('#detail-stage').hasPointerCapture(e.pointerId)) $('#detail-stage').releasePointerCapture(e.pointerId);
});
detail.addEventListener('close', resetImageZoom);

function setDetailView(view) {
  detail.dataset.view = view;
  $('#detail .detail-layout').scrollTop = 0;
  $('#detail-image-pane').hidden = view !== 'image';
  $('#detail-reading-pane').hidden = view !== 'reading';
  $('#tab-image').setAttribute('aria-pressed', String(view === 'image'));
  $('#tab-reading').setAttribute('aria-pressed', String(view === 'reading'));
  detail.scrollTop = 0;
}
$('#tab-image').addEventListener('click', () => setDetailView('image'));
$('#tab-reading').addEventListener('click', () => setDetailView('reading'));
$('#read-more').addEventListener('click', () => { setDetailView('reading'); $('#tab-reading').focus(); });
function updateImageTone() {
  $('#detail-image').style.mixBlendMode = $('#detail-image').dataset.kind === 'Marchio' && !detail.classList.contains('is-dark') ? 'multiply' : 'normal';
}
$('#detail-tone').addEventListener('click', () => {
  const dark = detail.classList.toggle('is-dark');
  $('#detail-tone').setAttribute('aria-pressed', String(dark));
  updateImageTone();
});
