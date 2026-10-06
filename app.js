import { InfiniteGrid } from './infinite-grid.js?v=20261006';
import { filterFormats } from './catalogue.js?v=20261006';
const $ = s => document.querySelector(s);
const backIcon = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>';
const forwardIcon = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const data = await fetch(new URL('./archive-data.json?v=20261006', import.meta.url)).then(r => { if (!r.ok) throw new Error('Catalogo non disponibile'); return r.json(); }).catch(() => null);
if (!data) { $('#empty').hidden = false; $('#empty h1').textContent = 'Archivio non disponibile'; $('#empty p:not(.eyebrow)').textContent = 'Ricarica la pagina per riprovare.'; $('#empty-reset').textContent = 'Ricarica'; $('#empty-reset').onclick = () => location.reload(); }
else start(data);
function start({ formats, cases, research }) {
  const map = $('#map'), reader = $('#reader'), viewer = $('#image-viewer'), filters = $('#filters'), welcome = $('#onboarding');
  const formatById = new Map(formats.map(f => [f.id, f])), caseById = new Map(cases.map(c => [c.id,c]));
  const state = { query: '', categories: new Set(), recurrence: '', dimension: '', variability: '', caseOnly: false };
  const recurrence = f => f.recurrence.toLocaleLowerCase('it').match(/annuale|biennale|triennale|quadriennale|quinquennale/)?.[0] || 'Altra ricorrenza';
  formats.forEach(f => { f.recurrenceGroup = recurrence(f); f.variabilityGroup = f.variability.toLowerCase().match(/basso|medio|alto|nullo/)?.[0] || 'Da verificare'; });
  let researchOrigin = '';
  let results = formats, view = 'map', searchTimer, trigger, lastRoute = '', parentRoute = '', imageGroup = [], imageIndex = 0;
  const routeScroll = new Map(), gridItems = fs => fs.map(f => ({ ...f, src: f.primary.src, thumb: f.primary.thumb, width:f.primary.width, height:f.primary.height, kind:f.primary.permanent?'Marchio':'Applicazione', background:'transparent' }));
  const grid = new InfiniteGrid(map, $('#tiles'), gridItems(formats), (f, el) => { trigger=el; navigate('format/'+f.id); });
  const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const p = texts => texts.map(t => '<p>'+escape(t)+'</p>').join('');
  const sourceLink = (url,title) => /^https?:\/\//.test(url || '') ? '<a target="_blank" rel="noopener noreferrer" href="'+escape(url)+'">'+escape(title)+' ↗</a>' : '<span>'+escape(title)+'</span>';
  const fields = entries => '<dl class="format-facts">'+entries.map(([k,v])=>'<div><dt>'+escape(k)+'</dt><dd>'+escape(v||'Non documentato')+'</dd></div>').join('')+'</dl>';
  const figure = (f,d) => '<figure class="document-figure"><button class="document-image" data-image="'+escape(d.id)+'" data-format="'+f.id+'" aria-label="Ingrandisci '+escape(d.label)+' di '+escape(f.name)+'"><img src="'+d.thumb+'" alt="'+escape(d.caption)+'" width="'+d.width+'" height="'+d.height+'" loading="lazy" decoding="async"></button><figcaption><span>'+escape(d.label)+' / '+(d.permanent?'Segno permanente':d.year||'s.d.')+'</span><p>'+escape(d.caption)+'</p>'+sourceLink(d.source,'Fonte')+'</figcaption></figure>';
  function navigate(route) { if (route === location.hash.slice(1)) return; location.hash = route; }
  function closeWelcome() { welcome.close(); try { localStorage.setItem('dte-intro','seen'); } catch {} map.focus({preventScroll:true}); }
  $('#start').onclick=closeWelcome;
  $('#about').onclick=$('#help').onclick=()=>{grid.stop();welcome.showModal();};
  $('#welcome-research').onclick=()=>{closeWelcome();navigate('research');};
  $('#research').onclick=$('#reader-research').onclick=()=>navigate('research');
  const isArchiveRoute = r => !r || r==='index';
  function setView(next, keepRoute=false) {
    grid.stop(); view=next; map.hidden=next!=='map'; $('#illustrated-index').hidden=next!=='index';
    $('#view-map').setAttribute('aria-pressed',String(next==='map'));$('#view-index').setAttribute('aria-pressed',String(next==='index'));
    $('.footer-right').hidden=next!=='map';$('#instructions').textContent=next==='map'?'Trascina / Scorri in ogni direzione':'Seleziona un formato per consultarlo';
    document.body.classList.toggle('index-view',next==='index');
    if(next==='map') grid.resize();
    if(!keepRoute && isArchiveRoute(location.hash.slice(1))) navigate(next==='index'?'index':'');
    try { localStorage.setItem('dte-view',next); } catch {}
  }
  $('#view-map').onclick=()=>setView('map');$('#view-index').onclick=()=>setView('index');
  function indexRows() {
    const rows = $('#index-rows'); rows.replaceChildren();
    for (const f of [...results].sort((a,b)=>a.name.localeCompare(b.name,'it'))) {
      const row = document.createElement('button');row.className='index-row';
      row.innerHTML='<span class="row-number">'+String(f.archiveNumber).padStart(3,'0')+'</span><img src="'+f.primary.thumb+'" alt="" width="'+f.primary.width+'" height="'+f.primary.height+'" loading="lazy"><span class="row-title"><strong>'+escape(f.name)+'</strong><span>'+escape(f.category)+(f.cases.length?' / Caso studio':'')+'</span></span><span class="row-facts">'+escape(f.recurrence)+'<br>'+escape(f.dimension)+' / '+escape(f.variabilityGroup)+'</span><span class="row-arrow" aria-hidden="true">'+forwardIcon+'</span>';
      row.onclick=()=>{trigger=row;navigate('format/'+f.id);}; rows.append(row);
    }
  }
  function applyFilters() {
    clearTimeout(searchTimer); results=filterFormats(formats,state); grid.setItems(gridItems(results)); indexRows();
    $('#empty').hidden=results.length>0;
    $('#result-count').textContent=results.length+' '+(results.length===1?'formato':'formati')+' / '+results.reduce((n,f)=>n+f.images.length,0)+' documenti';
    $('#filters-status').textContent=results.length?results.length+' formati in entrambe le viste.':'Nessun formato. Prova a rimuovere un filtro.';
    $('#show-results').textContent=results.length?'Mostra '+results.length+' formati':'Torna al catalogo';
    $('#clear-search').hidden=!state.query;
    const chips=$('#active-filters');chips.replaceChildren();
    const add=(label,remove)=>{const b=document.createElement('button');b.textContent=label+' ×';b.setAttribute('aria-label','Rimuovi filtro '+label);b.onclick=()=>{remove();applyFilters();$('#open-filters').focus();};chips.append(b);};
    for(const c of state.categories)add(c,()=>state.categories.delete(c));
    for(const k of ['recurrence','dimension','variability'])if(state[k])add(state[k],()=>state[k]='');
    if(state.caseOnly)add('Con caso studio',()=>state.caseOnly=false);
    for(const k of ['recurrence','dimension','variability'])$('#'+k).value=state[k];
    $('#case-only').checked=state.caseOnly;
    for(const input of $('#categories').querySelectorAll('input'))input.checked=state.categories.has(input.value);
    const n=chips.children.length;chips.hidden=!n;$('#filter-badge').hidden=!n;$('#filter-badge').textContent=n;
    document.body.classList.toggle('has-filters',!!n);if(n||state.query)map.classList.add('explored');
  }
  for(const c of [...new Set(formats.map(f=>f.category))].sort((a,b)=>a.localeCompare(b,'it'))) {
    const label=document.createElement('label'),input=document.createElement('input'),name=document.createElement('span'),count=document.createElement('span');
    input.type='checkbox';input.value=c;name.textContent=c;count.className='facet-count';count.textContent=formats.filter(f=>f.category===c).length;label.append(input,name,count);$('#categories').append(label);
    input.onchange=()=>{input.checked?state.categories.add(c):state.categories.delete(c);applyFilters();};
  }
  for(const [key,field] of [['recurrence','recurrenceGroup'],['dimension','dimension'],['variability','variabilityGroup']]) {
    const select=$('#'+key);select.add(new Option('Tutti i valori',''));
    for(const val of [...new Set(formats.map(f=>f[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it')))select.add(new Option(val,val));
    select.onchange=()=>{state[key]=select.value;applyFilters();};
  }
  $('#case-only').onchange=()=>{state.caseOnly=$('#case-only').checked;applyFilters();};
  function resetFilters(query=false) {state.categories.clear();for(const k of ['recurrence','dimension','variability'])state[k]='';state.caseOnly=false;if(query){state.query='';$('#search').value='';}applyFilters();}
  $('#clear-filters').onclick=()=>resetFilters();$('#empty-reset').onclick=()=>resetFilters(true);
  $('#search').oninput=()=>{state.query=$('#search').value;clearTimeout(searchTimer);searchTimer=setTimeout(applyFilters,100);};
  $('#clear-search').onclick=()=>{state.query='';$('#search').value='';applyFilters();$('#search').focus();};
  $('#open-filters').onclick=()=>{grid.stop();filters.showModal();};$('#close-filters').onclick=$('#show-results').onclick=()=>filters.close();
  function zoom(v) {const z=grid.setZoom(v);$('#zoom-value').textContent=Math.round(z*100)+'%';$('#zoom-out').disabled=z<=.65;$('#zoom-in').disabled=z>=1.4;}
  $('#zoom-in').onclick=()=>{zoom(grid.zoom+.15);map.classList.add('explored');};$('#zoom-out').onclick=()=>{zoom(grid.zoom-.15);map.classList.add('explored');};
  $('#reset').onclick=()=>{zoom(1);grid.reset();map.classList.remove('explored');};
  map.addEventListener('wheel',()=>map.classList.add('explored'),{passive:true});map.addEventListener('pointermove',()=>{if(grid.pointer?.dragged)map.classList.add('explored');});map.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow'))map.classList.add('explored');});
  function formatHTML(f) {
    const primary=f.primary, related=f.cases.map(id=>caseById.get(id));
    let html='<div class="reader-heading"><h1 id="reader-title">'+escape(f.name)+'</h1><p class="eyebrow">'+escape(f.category)+'</p><p class="reader-deck">'+escape(f.recurrence)+' · '+escape(f.dimension)+' · Variabilità '+escape(f.variabilityGroup)+'</p></div><div class="format-introduction"><button class="format-cover document-image" data-image="'+primary.id+'" data-format="'+f.id+'" aria-label="Ingrandisci immagine principale"><img src="'+primary.src+'" alt="'+escape(primary.caption)+'" width="'+primary.width+'" height="'+primary.height+'"></button><div><p class="lead">'+escape(f.summary)+'</p><p class="eyebrow">'+(primary.permanent?'Marchio del formato':escape(primary.label)+' / '+(primary.year||'s.d.'))+'</p><nav class="section-links" aria-label="In questa scheda"><a href="#format/'+f.id+'/informazioni">Informazioni ↓</a><a href="#format/'+f.id+'/identita">Identità visive ↓</a>'+(related.length?'<a href="#format/'+f.id+'/edizioni">Edizioni e casi studio ↓</a>':'')+'</nav></div></div>';
    html+='<section id="informazioni"><div class="section-heading"><h2>Continuità e variabilità</h2></div>'+fields([['Titolare',f.owner],['Produttore dell’edizione',f.producer],['Prima edizione / fondazione',f.firstEdition],['Ricorrenza',f.recurrence],['Arco storico osservato',f.period],['Edizioni censite',f.editionCount],[f.informationSource==='tesi'?'Durata dell’edizione':'Durata media (giorni)',f.duration],['Sede',f.location],['Dimensione',f.dimension],['Variabilità esercitata',f.variability],['Periodo e fase della variabilità',f.variabilityPeriod],['Segni permanenti',f.permanentSigns]])+'</section>';
    html+='<section id="identita"><div class="section-heading"><h2>Le identità, nel tempo</h2><p>Marchi e applicazioni raccolti, ordinati per anno. Seleziona un’immagine per leggere didascalia e fonte.</p></div>';
    const groups=new Map();for(const d of f.images){const k=d.permanent?'permanente':d.year?String(d.year):'senza-data';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(d);}
    const keys=[...groups.keys()].sort((a,b)=>a==='permanente'?-1:b==='permanente'?1:a==='senza-data'?1:b==='senza-data'?-1:Number(a)-Number(b));
    for(const k of keys)html+='<div class="year-group"><h3>'+({permanente:'Segni permanenti','senza-data':'Anno non documentato'}[k]||k)+'</h3><div class="document-grid">'+groups.get(k).map(d=>figure(f,d)).join('')+'</div></div>';
    html+='</section>';
    if(related.length) {
      html+='<section id="edizioni"><div class="section-heading"><h2>Le edizioni del formato</h2><p>Serie censita nel capitolo '+escape(f.thesisChapter)+' della tesi. I marchi disponibili accompagnano le edizioni; le assenze sono dichiarate. Solo le edizioni selezionate aprono un approfondimento.</p></div><div class="case-links">'+related.map(c=>'<a class="case-link" href="#edition/'+c.id+'"><span class="eyebrow">Caso studio / '+c.year+'</span><strong>'+escape(c.title)+'</strong><span aria-hidden="true">'+forwardIcon+'</span></a>').join('')+'</div><div class="edition-series">';
      for(const e of f.editions){const logo=f.images.find(d=>d.id===e.logo);html+='<div class="series-entry">'+(logo?'<button class="series-image document-image" data-format="'+f.id+'" data-image="'+logo.id+'" aria-label="Ingrandisci marchio '+e.year+'"><img src="'+logo.thumb+'" alt="'+escape(logo.label)+' '+e.year+'" loading="lazy"></button>':'<span class="missing-mark">Marchio<br>non raccolto</span>')+'<div><h3>'+e.year+'</h3><p>'+escape(e.place)+'</p><span class="eyebrow">'+escape(e.duration)+'</span></div>'+(e.caseId?'<a class="series-case" href="#edition/'+e.caseId+'">Caso studio ↗</a>':'')+'</div>';}
      html+='</div></section>';
    }
    return html+'<section class="sources-section"><div class="section-heading"><h2>Verificare, continuare</h2></div><p>Stato nel foglio di ricerca: '+escape(f.status)+'. '+escape(f.reason)+'</p><p>'+escape(f.limitations||'Nessuna lacuna specifica annotata nel foglio.')+'</p><ul>'+f.sources.map(s=>'<li>'+sourceLink(s.url,s.title)+'</li>').join('')+(f.thesisChapter?'<li>'+sourceLink(research.thesis,'Tesi / capitolo '+f.thesisChapter)+'</li>':'')+'</ul><p class="source-note">Le immagini conservano la provenienza registrata nella raccolta. Quando l’autore non è identificato, consulta la fonte originale.</p></section>';
  }
  function caseHTML(c) {
    const f=formatById.get(c.formatId),imgs=c.images.map(id=>f.images.find(d=>d.id===id)),parts=c.lifecycle.filter(Boolean),n=parts.length;
    return '<div class="reader-heading"><h1 id="reader-title">'+escape(c.title)+'</h1><p class="eyebrow">'+escape(f.name)+'</p><p class="reader-deck">'+escape(c.fields['Sede e date'])+'</p><p class="eyebrow">Analisi al momento della stesura della tesi</p></div>'+(imgs.length?'<div class="case-hero">'+figure(f,imgs[0])+'</div>':'')+'<details class="case-information"><summary>Informazioni dell’edizione e autori del progetto</summary>'+fields(Object.entries(c.fields).filter(([k])=>k!=='Formato'))+'</details><section><div class="section-heading"><h2>Un’identità per questa edizione</h2></div><div class="reading-column">'+p(c.description)+'</div></section><section><div class="section-heading"><h2>Marchi e applicazioni</h2></div>'+(imgs.length?'<div class="document-grid">'+imgs.map(d=>figure(f,d)).join('')+'</div>':'<p class="document-gap">I materiali visivi di questa edizione non sono ancora presenti nelle cartelle fornite. Il caso resta consultabile attraverso l’analisi e le fonti.</p>')+'</section><section><div class="section-heading"><h2>Ciò che attraversa la serie</h2></div><div class="reading-column"><p>'+escape(f.permanentSigns)+'.</p><p>Variabilità del formato: '+escape(f.variability)+'. Periodo osservato: '+escape(f.variabilityPeriod||f.period)+'.</p><a href="#format/'+f.id+'">Confronta le altre edizioni di '+escape(f.name)+' ↗</a></div></section><section><div class="section-heading"><h2>Prima, durante, dopo</h2><p>Le fasi descrivono il ciclo del progetto. Le date sotto sono quelle documentate nella tesi.</p></div><div class="lifecycle"><section><span class="phase-number">01</span><h3>Presentazione</h3>'+p(parts.slice(0,Math.max(1,n-2)))+'</section><section><span class="phase-number">02</span><h3>Evento</h3>'+p(n>=3?[parts[n-2]]:[])+'</section><section><span class="phase-number">03</span><h3>Post-evento</h3>'+p(n>=2?[parts[n-1]]:[])+'</section></div><details class="dates" open><summary>Date e passaggi del progetto</summary><ol>'+c.dates.map(t=>'<li>'+escape(t)+'</li>').join('')+'</ol></details></section><section class="sources-section"><h2>Fonti dell’approfondimento</h2><p>'+escape(c.sourceNote)+'</p>'+sourceLink(c.source,'Tesi / capitolo '+c.chapter)+'<ul>'+f.sources.map(s=>'<li>'+sourceLink(s.url,s.title)+'</li>').join('')+'</ul><a class="return-format" href="#format/'+f.id+'">← Torna alla scheda del formato</a></section>';
  }
  function researchHTML() {
    const glossary=research.glossary.map(g=>'<div><dt>'+escape(g.term)+'</dt><dd>'+escape(g.definition)+'</dd></div>').join('');
    return '<div class="reader-heading"><h1 id="reader-title">'+escape(research.title)+'</h1><p class="reader-deck">Una ricerca di '+escape(research.author)+'</p></div><div class="reading-column"><p class="research-question">'+escape(research.question)+'</p>'+p(research.introduction)+'<section><h2>Metodo</h2>'+p(research.method)+'</section><section><h2>Criteri di selezione</h2>'+p(research.selection)+'</section><section><h2>Glossario</h2><dl class="glossary">'+glossary+'</dl></section><section><h2>Gradi di variabilità</h2><dl class="glossary">'+research.variability.map(g=>'<div><dt>'+escape(g.term)+'</dt><dd>'+escape(g.definition)+'</dd></div>').join('')+'</dl><p>Il grado va letto insieme al periodo e alla fase dichiarati nella scheda. Le categorie non sostituiscono il confronto tra le immagini.</p></section><section><h2>Bibliografia e fonti</h2><details><summary>Riferimenti bibliografici della tesi</summary><ul class="bibliography">'+research.bibliography.map(t=>'<li>'+escape(t)+'</li>').join('')+'</ul></details><details><summary>Repertori e fonti documentarie</summary><ul class="bibliography">'+research.repertories.map(t=>'<li>'+escape(t)+'</li>').join('')+'</ul></details>'+sourceLink(research.thesis,'Consulta la tesi completa')+'</section><section><h2>Crediti e documentazione</h2><p>Ricerca e testi: Nicolò Armelin. Marchi, immagini e progetti appartengono ai rispettivi autori e titolari; la provenienza è indicata su ogni documento. L’archivio rende esplicite le lacune della raccolta.</p><p>Carattere graziato: '+sourceLink('https://github.com/google/fonts/tree/main/ofl/instrumentserif','Instrument Serif / SIL Open Font License')+'.</p><button class="primary" data-archive>Esplora il catalogo ↗</button></section></div>';
  }
  $('#reader-content').addEventListener('click',e=>{
    const b=e.target.closest('[data-image]');if(b){parentRoute=location.hash.slice(1).split('/').slice(0,2).join('/');imageGroup=[...b.closest('.document-grid, .edition-series, .format-introduction, .case-hero').querySelectorAll('[data-image]')].map(el=>el.dataset.image);navigate('image/'+b.dataset.format+'/'+b.dataset.image);}
    if(e.target.closest('[data-archive]'))navigate(view==='index'?'index':'');
  });
  const closeReader=()=>navigate(view==='index'?'index':'');
  $('#reader-close').onclick=closeReader;
  $('#reader-back').onclick=()=>{const route=location.hash.slice(1);if(route==='research'&&researchOrigin){navigate(researchOrigin);return;}const c=route.startsWith('edition/')?caseById.get(route.split('/')[1]):null;navigate(c?'format/'+c.formatId:view==='index'?'index':'');};
  reader.addEventListener('cancel',e=>{e.preventDefault();closeReader();});
  function renderImage(f,d) {
    if(!imageGroup.includes(d.id))imageGroup=f.images.map(i=>i.id);imageIndex=imageGroup.indexOf(d.id);
    $('#viewer-image').src=d.src;$('#viewer-image').alt=d.caption;$('#viewer-image').hidden=false;$('#image-error').hidden=true;
    $('#image-title').textContent=d.label;$('#image-context').textContent=f.name+' / '+(d.permanent?'Segno permanente':d.year||'Anno non documentato');
    $('#image-caption').textContent=d.caption;$('#image-credit').textContent=d.credit+(d.quality?' '+d.quality+'.':'');
    $('#image-source').href=d.source||f.sources[0]?.url||research.thesis;$('#image-position').textContent=(imageIndex+1)+' / '+imageGroup.length;
    $('#image-prev').disabled=$('#image-next').disabled=imageGroup.length<2;
    if(!viewer.open)viewer.showModal();
  }
  $('#viewer-image').onerror=()=>{$('#viewer-image').hidden=true;$('#image-error').hidden=false;};
  const closeImage=()=>navigate(parentRoute||'format/'+location.hash.split('/')[1]);
  $('#image-close').onclick=closeImage;viewer.addEventListener('cancel',e=>{e.preventDefault();closeImage();});
  $('#image-tone').onclick=()=>{const dark=viewer.classList.toggle('is-dark');$('#image-tone').setAttribute('aria-pressed',String(dark));};
  function stepImage(delta) {if(imageGroup.length<2)return;const f=location.hash.split('/')[1];imageIndex=(imageIndex+delta+imageGroup.length)%imageGroup.length;location.replace('#image/'+f+'/'+imageGroup[imageIndex]);}
  $('#image-prev').onclick=()=>stepImage(-1);$('#image-next').onclick=()=>stepImage(1);
  viewer.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();stepImage(e.key==='ArrowRight'?1:-1);}});
  function renderRoute() {
    const route=decodeURIComponent(location.hash.slice(1)),[kind,id,extra]=route.split('/');
    if(reader.open && !lastRoute.startsWith('image/'))routeScroll.set(lastRoute.split('/').slice(0,2).join('/'),$('#reader-scroll').scrollTop);
    if(kind!=='image'&&viewer.open)viewer.close();
    if(isArchiveRoute(route)) {
      if(reader.open)reader.close();if(route==='index')setView('index',true);else if(lastRoute==='index')setView('map',true);
      if(trigger?.isConnected)trigger.focus({preventScroll:true});else (view==='map'?map:$('#view-index')).focus({preventScroll:true});
      lastRoute=route;return;
    }
    grid.stop();map.classList.add('explored');
    if(kind==='image') {
      const f=formatById.get(id),d=f?.images.find(d=>d.id===extra);if(!d){navigate('format/'+id);return;}
      if(!reader.open){parentRoute='format/'+id;$('#reader-content').innerHTML=formatHTML(f);$('#reader-back').innerHTML=backIcon+'Archivio';reader.showModal();}
      renderImage(f,d);lastRoute=route;return;
    }
    let html,back='← Archivio',position='La ricerca';
    if(kind==='format'&&formatById.has(id)){const f=formatById.get(id);html=formatHTML(f);position=String(f.archiveNumber).padStart(3,'0')+' / Formato';}
    else if(kind==='edition'&&caseById.has(id)){const c=caseById.get(id);html=caseHTML(c);back='← Al formato';position='Edizione / '+c.year;}
    else if(kind==='research'){if(lastRoute.startsWith('format/')||lastRoute.startsWith('edition/'))researchOrigin=lastRoute.split('/').slice(0,2).join('/');html=researchHTML();if(researchOrigin)back='← Alla scheda';}
    else {html='<div class="reader-heading"><p class="eyebrow">Archivio</p><h1 id="reader-title">Scheda non trovata</h1><p>Il collegamento non corrisponde a un formato o a un’edizione del catalogo.</p><button data-archive class="primary">Torna all’archivio</button></div>';}
    $('#reader-content').innerHTML=html;$('#reader-back').innerHTML=backIcon+escape(back.replace(/^← /,''));$('#reader-position').textContent=position;$('#reader-research').hidden=kind==='research';
    if(!reader.open)reader.showModal();
    const scroll=$('#reader-scroll'),section=extra&&$('#reader-content').querySelector('#'+CSS.escape(extra));
    scroll.scrollTop=section?section.offsetTop-12:(routeScroll.get(kind+'/'+id)||0);
    if(!lastRoute.startsWith('image/'))$('#reader-back').focus({preventScroll:true});
    lastRoute=route;
  }
  for(const dialog of [filters,welcome,reader,viewer])dialog.addEventListener('click',e=>{if(e.target!==dialog||dialog===welcome)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){if(dialog===reader)closeReader();else if(dialog===viewer)closeImage();else dialog.close();}});
  applyFilters();
  try {if(localStorage.getItem('dte-view')==='index' && !location.hash)setView('index',true);}catch{}
  window.addEventListener('hashchange',renderRoute);renderRoute();
  let seen=false;try{seen=localStorage.getItem('dte-intro')==='seen';}catch{}
  if(!seen&&!location.hash)welcome.showModal();
}
