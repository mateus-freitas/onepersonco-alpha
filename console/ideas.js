/* Ideas owns its routes, records and forms independently of the Projects scan. */
(() => {
  'use strict';
  const root = document.getElementById('ideas-view');
  const nav = document.getElementById('area-nav');
  const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cap = value => value ? value[0].toUpperCase() + value.slice(1) : '';
  const btn = (action, text, extra = '') => `<button type="button" class="btn" data-idea-action="${action}" ${extra}>${html(text)}</button>`;
  const link = (id, title) => `<a href="#/ideas/${encodeURIComponent(id)}">${html(title)}</a>`;
  const read = value => html(value || 'Not recorded');
  const model = {data:null, error:'', loading:false, selected:[], query:'', filter:'active', sort:'updated', dimension:0, diffOnly:false, expanded:new Set(), edit:null, pending:false, route:'', listScroll:0, returnFocus:null};
  let capture = null, routeVersion = 0;
  const origins = new Map();
  const mvpLabels=[['scope','Scope'],['exclusions','Exclusions'],['platform','Platform'],['rationale','Platform rationale'],['validation','Validation']];
  const active = () => location.hash.startsWith('#/ideas');
  window.OPCIdeas = {active};
  const dimensions = () => model.data?.dimensions || [];
  const find = id => model.data?.ideas.find(i => i.id === id);
  const back = () => '<a href="#/ideas">Back to Ideas</a>';
  const project = id => model.data?.projects?.find(p => p.id === id);
  function projectLink(id) {
    if (!id) return '';
    const p = project(id);
    return p ? `<a href="#/projects" data-idea-project="${html(id)}">${html(p.name || p.id)}</a>` : html(`Project unavailable: ${id}`);
  }
  function external(url, label) {
    try { const parsed = new URL(url); if (['https:', 'http:'].includes(parsed.protocol)) return `<a href="${html(parsed.href)}" target="_blank" rel="noopener noreferrer">${html(label)}</a>`; } catch {}
    return html(label);
  }
  function options(values, selected) {
    return values.map(v => {const [value,label] = Array.isArray(v) ? v : [v,cap(v)]; return `<option value="${html(value)}"${value === selected ? ' selected' : ''}>${html(label)}</option>`;}).join('');
  }
  function field(label, name, value, {rows = 0, max = 0, required = false, type = 'text'} = {}) {
    const attrs = `aria-labelledby="idea-field-${html(name)}" name="${html(name)}"${max ? ` maxlength="${max}"` : ''}${required ? ' required' : ''}`;
    return `<label class="nf"><span id="idea-field-${html(name)}">${html(label)}</span>${rows ? `<textarea ${attrs} rows="${rows}">${html(value)}</textarea>` : `<input ${attrs} type="${type}" value="${html(value)}">`}</label>`;
  }
  function select(label, name, values, value) { return `<label class="nf"><span id="idea-field-${html(name)}">${html(label)}</span><select aria-labelledby="idea-field-${html(name)}" name="${html(name)}">${options(values,value)}</select></label>`; }
  function assessment(i, key) { return i.assessments?.[key] || {judgment:'unknown',confidence:null}; }
  const judgmentKeys = ['favorable','mixed','unfavorable','unknown'];
  function mark(value) { return `<span class="idea-mark idea-j-${html(value)}" aria-hidden="true"></span>`; }
  function confidence(level, label = '') {
    if (!level) return '<span class="idea-muted">Not rated</span>';
    const ticks = ['low','medium','high'].indexOf(level)+1;
    return `<span class="idea-confidence idea-c-${html(level)}"><span class="idea-ticks" aria-hidden="true">${[1,2,3].map(n=>`<i class="${n<=ticks ? 'filled' : ''}"></i>`).join('')}</span>${html(label || cap(level))} confidence</span>`;
  }
  function judgment(a) {
    return `<span class="idea-judgment idea-j-${html(a.judgment)}">${mark(a.judgment)}${html(cap(a.judgment))}</span> ${confidence(a.confidence)}${a.judgment !== 'unknown' && !a.evidence?.length ? '<span class="idea-muted idea-assumption">Assumption</span>' : ''}`;
  }
  function strip(i) {
    return `<span class="idea-strip" aria-hidden="true">${dimensions().map(d=>mark(assessment(i,d.key).judgment)).join('')}</span><span class="idea-sr">${judgmentKeys.map(k=>`${i.fit?.counts[k] || 0} ${k}`).join(', ')}</span>`;
  }
  function fit(i, method=false) {
    const f=i.fit;
    if (!f) return '<span class="idea-muted">Fit unavailable</span>';
    return `<div class="idea-fit"><span class="idea-fit-value mono">${f.value === null ? (f.assessed ? 'Partial' : 'Not scored') : `${f.value}<small>/100</small>`}</span><div class="idea-coverage">${f.assessed} of ${f.total} assessed</div>${strip(i)}${method ? `<details data-idea-disclosure="method" class="idea-method"><summary>How fit is calculated</summary><p>Favorable 2, Mixed 1, Unfavorable 0 points, equal weight; Unknown excluded. ${f.points} of ${2*f.assessed} points${f.value===null ? '' : ` → ${f.value}`}. Fit is shown once at least ${Math.ceil(f.total/2)} dimensions are assessed. A comparison aid, not a probability. Confidence is reported separately.</p></details>` : ''}</div>`;
  }
  function confidenceSummary(i) {
    const f=i.fit;
    const levels=['high','medium','low'].filter(k=>f?.confidence[k]);
    const low=dimensions().filter(d=>assessment(i,d.key).confidence==='low');
    return `<div class="idea-confidence-summary">${levels.length ? levels.map(k=>confidence(k,`${f.confidence[k]} ${k}`)).join(' · ') : '<span class="idea-muted">Not rated</span>'}${low.length ? `<div>Low: ${low.map(d=>html(d.label)).join(', ')}</div>` : ''}</div>`;
  }
  function breakdown(i) {
    return judgmentKeys.map(k=>{const group=dimensions().filter(d=>assessment(i,d.key).judgment===k);return group.length || ['favorable','unfavorable'].includes(k) ? `<div class="idea-breakdown-row"><span class="idea-judgment idea-j-${k}">${mark(k)}${cap(k)}</span><span class="idea-dimension-links">${group.map(d=>btn('assessment',d.label,`data-idea-dimension="${html(d.key)}"`)).join('') || '<span class="idea-muted">None</span>'}</span></div>` : '';}).join('');
  }
  function source(s, i) {
    return `<div class="idea-source"><b>${html(s.id)} · ${s.url ? external(s.url,s.title) : html(s.title)}</b><div class="idea-muted">${html([s.publisher, s.publishedAt && `Published ${s.publishedAt}`, s.checkedAt && `Checked ${s.checkedAt}`].filter(Boolean).join(' · '))}</div><p>${html(s.note)}</p></div>`;
  }
  function evidence(i,a,includeReason=false) {
    const citations = (ids,label) => ids?.length ? `<h4>${label}</h4>${ids.map(id => {const item=i.sources?.find(s=>s.id===id);return item ? source(item,i) : `<p>${html(id)} · Source unavailable</p>`;}).join('')}` : '';
    return `<div class="idea-evidence">${includeReason && a.reason ? `<p>${html(a.reason)}</p>` : ''}${a.rationale ? `<p>${html(a.rationale)}</p>` : ''}${citations(a.evidence,'Supporting evidence')}${citations(a.counterevidence,'Counterevidence')}${a.reviewedAt ? `<p class="idea-muted">Reviewed ${html(a.reviewedAt)}</p>` : ''}${a.nextQuestion && (includeReason || a.reason) ? `<p>${html(a.nextQuestion)}</p>` : ''}</div>`;
  }
  function listRows() {
    const q = model.query.toLocaleLowerCase();
    return model.data.ideas.filter(i => (model.filter === 'all' || (model.filter === 'active' ? i.state !== 'archived' : i.state === model.filter)) && [i.title,i.summary,i.original].some(v => String(v || '').toLocaleLowerCase().includes(q))).sort((a,b) => model.sort === 'title' ? a.title.localeCompare(b.title) : model.sort === 'fit' ? ((b.fit?.value ?? -1)-(a.fit?.value ?? -1) || (b.fit?.assessed || 0)-(a.fit?.assessed || 0) || b.updatedAt.localeCompare(a.updatedAt)) : model.sort === 'research' ? (a.researchDate || '').localeCompare(b.researchDate || '') : b.updatedAt.localeCompare(a.updatedAt));
  }
  function selection() {
    return model.selected.length ? `<div class="idea-toolbar"><span>${model.selected.length} selected</span>${btn('compare',`Compare (${model.selected.length})`,model.selected.length < 2 ? 'disabled' : '')}${btn('clear','Clear')}</div>` : '';
  }
  function renderListResults() {
    const target = root.querySelector('#idea-results');
    if (!target) return;
    const rows = listRows();
    target.innerHTML = `${rows.length ? `<table class="idea-list"><thead><tr><th scope="col"><span class="idea-sr">Compare</span></th><th scope="col">Idea</th><th scope="col">Next decision</th><th scope="col">Fit</th><th scope="col">State / project</th></tr></thead><tbody>${rows.map(i => `<tr><td><label class="idea-select-hit"><input type="checkbox" data-idea-select="${html(i.id)}" aria-label="Select ${html(i.title)} for comparison"${model.selected.includes(i.id) ? ' checked' : ''}></label></td><td>${link(i.id,i.title)}<div class="idea-summary idea-muted">${html(i.summary)}</div><div class="idea-inline-meta">${html(cap(i.state))}${i.projectId ? ' · '+projectLink(i.projectId) : ''}</div></td><td class="idea-decision">${html(i.nextDecision || 'Not assessed')}<div class="idea-phone-meta">${html(cap(i.state))}${i.projectId ? ' · '+projectLink(i.projectId) : ''}</div></td><td class="idea-list-fit"><span class="idea-sr">Fit </span>${fit(i)}</td><td class="idea-row-meta">${html(cap(i.state))}${i.projectId ? '<br>'+projectLink(i.projectId) : ''}</td></tr>`).join('')}</tbody></table>` : `<p>${model.data.ideas.length ? 'No ideas match these filters.' : 'No ideas yet.'}</p>${model.data.ideas.length ? btn('reset','Clear filters') : LIVE ? btn('capture','Create idea') : ''}`}<div id="idea-selection">${selection()}</div><p class="idea-error" id="idea-selection-error" role="status"></p>`;
  }
  function renderList() {
    root.innerHTML = `<div class="idea-head"><h2 tabindex="-1">Ideas</h2>${LIVE ? btn('capture','+ new idea') : ''}</div><div class="idea-toolbar"><label class="nf idea-search"><span>Search ideas</span><input type="search" id="idea-search" value="${html(model.query)}"></label>${select('State','filter',[['active','All except Archived'],['all','All states'],...model.data.states],model.filter)}${select('Sort','sort',[['updated','Updated newest'],['fit','Fit highest'],['title','Title A–Z'],['research','Research date oldest']],model.sort)}</div><div id="idea-load-error">${loadError()}</div><div id="idea-results"></div>`;
    renderListResults();
  }
  function detail(i) {
    const mvp=mvpLabels.filter(([key])=>i.mvp?.[key]);
    root.innerHTML=`${back()}<div class="idea-head"><div><h2 tabindex="-1">${html(i.title)}</h2><span>${html(cap(i.state))}${i.projectId ? ' · '+projectLink(i.projectId) : ''}</span><p class="idea-muted">${html(i.summary)}</p></div><div class="idea-toolbar">${btn('research','Copy research request')}${LIVE ? btn('edit','Edit') : ''}</div></div><div id="idea-copy-result" role="status"></div>
      <div class="idea-overview"><div class="idea-overview-fit"><h3>Fit</h3>${fit(i,true)}</div><div class="idea-overview-breakdown"><div class="idea-breakdown">${breakdown(i)}</div><div class="idea-overview-confidence"><h3>Confidence</h3>${confidenceSummary(i)}</div>${dimensions().some(d=>assessment(i,d.key).judgment!=='unknown' && !assessment(i,d.key).evidence?.length) ? `<p>Assumptions: ${dimensions().filter(d=>assessment(i,d.key).judgment!=='unknown' && !assessment(i,d.key).evidence?.length).length}</p>` : ''}${i.fit?.assessed > 0 && !dimensions().some(d=>assessment(i,d.key).counterevidence?.length) ? '<p class="idea-muted">Counterevidence: none recorded</p>' : ''}</div><div class="idea-overview-decision"><h3>Next decision</h3><p>${read(i.nextDecision)}</p><p class="idea-muted">${i.researchDate ? 'Researched '+html(i.researchDate) : 'Not researched'}</p>${LIVE && i.projectId && !project(i.projectId) ? btn('edit','Change project') : ''}</div></div>
      <div class="idea-reading">
      <section id="idea-assessments"><div class="idea-head"><h3>Assessment</h3>${LIVE ? btn('edit-assessment','Edit assessment') : ''}</div>${dimensions().map(d=>{const a=assessment(i,d.key);return `<details class="idea-assessment" id="idea-dim-${html(d.key)}" data-idea-disclosure="${html(d.key)}"><summary><b>${html(d.label)}</b>${judgment(a)}<span>${html(a.reason || a.nextQuestion || 'Not assessed')}</span></summary><p class="idea-muted">Favorable: ${html(d.favorable)}</p>${evidence(i,a)}</details>`;}).join('')}</section>
      ${i.questions?.length ? `<section><h3>Open questions</h3>${i.questions.map(q=>`<h4>${html(q.question)}</h4><p>${html(q.nextStep)}</p>`).join('')}</section>` : ''}
      <section><h3>MVP</h3>${mvp.length ? `<dl class="idea-definition">${mvp.map(([key,label])=>`<dt>${label}</dt><dd>${html(i.mvp[key])}</dd>`).join('')}</dl>` : '<p>Not recorded</p>'}</section>
      <section><details data-idea-disclosure="original" ${i.original.length < 600 ? 'open' : ''}><summary><h3>Original idea</h3></summary><div class="idea-original">${read(i.original)}</div></details></section>
      <section><details data-idea-disclosure="sources"><summary><h3>Sources</h3></summary>${i.sources?.length ? i.sources.map(item=>source(item,i)).join('') : '<p>No sources recorded.</p>'}</details></section>
      ${i.keywords?.length ? `<section><h3>Keyword evidence</h3><div class="idea-scroll" role="region" aria-label="Keyword evidence" tabindex="0"><table><thead><tr>${['Term','Market / language','Wow volume (proxy, not searches)','Difficulty (0–100)','Checked','Source'].map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${i.keywords.map(k=>`<tr><th scope="row">${html(k.term)}</th><td>${html(k.market)} ${html(k.language)}</td><td>${k.volume == null ? 'Not measured' : html(k.volume)}</td><td>${k.difficulty == null ? 'Not measured' : html(k.difficulty)}</td><td>${html(k.checkedAt)}</td><td>${html(k.sourceId)}</td></tr>`).join('')}</tbody></table></div></section>` : ''}</div>`;
  }
  function compareCell(i,key,expanded=false) {
    if(!i)return '<p>Idea unavailable.</p>';
    if(key==='fit')return fit(i);
    if(key==='confidence')return confidenceSummary(i);
    if(key==='decision')return read(i.nextDecision);
    if(key==='mvp')return `<p>${read(i.mvp?.scope)}</p><p>${read(i.mvp?.platform)}</p>`;
    const a=assessment(i,key);
    return `${judgment(a)}${expanded ? evidence(i,a,true) : `<p>${html(a.reason || a.nextQuestion || 'Not assessed')}</p>`}`;
  }
  function compare() {
    const chosen=model.selected.map(find);
    const matching=d=>chosen.length>1 && chosen.every(Boolean) && chosen.every(i=>{const a=assessment(i,d.key), b=assessment(chosen[0],d.key);return a.judgment===b.judgment && a.confidence===b.confidence;});
    const visible=dimensions().filter(d=>!model.diffOnly || !matching(d));
    const rows=[{key:'fit',label:'Fit'},{key:'confidence',label:'Confidence'},{key:'decision',label:'Next decision'},...visible,{key:'mvp',label:'MVP / platform'}];
    // The focus selector keeps canonical dimension indices even while rows are filtered.
    if (!visible.includes(dimensions()[model.dimension]) && visible.length) model.dimension=dimensions().indexOf(visible[0]);
    const row=dimensions()[model.dimension];
    const toggle=d=>chosen.some(i=>{const a=i && assessment(i,d.key);return a && (a.reason || a.rationale || a.evidence?.length || a.counterevidence?.length);}) && dimensions().some(v=>v.key===d.key) ? btn('evidence','Evidence',`data-idea-dimension="${html(d.key)}" aria-expanded="${model.expanded.has(d.key)}"`) : '';
    const remove=(i,n)=>btn('remove','Remove',`aria-label="Remove ${html(i?.title || model.selected[n])}" data-idea-id="${html(model.selected[n])}"`);
    const name=(i,n)=>i ? link(i.id,i.title) : html(model.selected[n])+' · Idea unavailable';
    const hidden=dimensions().length-visible.length;
    root.innerHTML=`${back()}<div class="idea-head"><h2 tabindex="-1">Compare ideas</h2></div>${chosen.length<2 ? '<a href="#/ideas">Select another idea to compare</a>' : ''}${chosen.length > 1 ? `<label class="idea-diff"><input type="checkbox" name="differences" ${model.diffOnly ? 'checked' : ''}> Differences only</label>` : ''}${hidden ? `<p class="idea-muted">${hidden===dimensions().length ? 'No differing assessments. ' : ''}${hidden} matching dimensions hidden.</p>` : ''}${!chosen.length ? '' : `<div class="idea-compare-desktop idea-scroll" role="region" aria-label="Idea comparison" tabindex="0"><table style="--idea-columns:${chosen.length}"><thead><tr><th scope="col">Dimension</th>${chosen.map((i,n)=>`<th scope="col">${name(i,n)}${remove(i,n)}</th>`).join('')}</tr></thead><tbody>${rows.map(d=>`<tr><th scope="row">${html(d.label)}${toggle(d)}${model.expanded.has(d.key) && d.favorable ? `<p class="idea-rubric">Favorable: ${html(d.favorable)}</p>` : ''}</th>${chosen.map(i=>`<td>${compareCell(i,d.key,model.expanded.has(d.key))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="idea-compare-phone"><div class="idea-phone-overviews">${chosen.map((i,n)=>`<section><h3>${name(i,n)}</h3>${i ? `<h4>Fit</h4>${fit(i)}<h4>Confidence</h4>${confidenceSummary(i)}<h4>Next decision</h4><p>${read(i.nextDecision)}</p>` : '<p>Idea unavailable.</p>'}${remove(i,n)}</section>`).join('')}</div>
      <div class="idea-scroll" role="region" aria-label="Assessment breakdown" tabindex="0"><table class="idea-matrix" style="--idea-columns:${chosen.length}"><thead><tr><th scope="col">Dimension</th>${chosen.map((i,n)=>`<th scope="col">${name(i,n)}</th>`).join('')}</tr></thead><tbody>${visible.map(d=>`<tr><th scope="row">${btn('dimension',d.label,`data-idea-dimension="${html(d.key)}"`)}</th>${chosen.map(i=>`<td>${i ? judgment(assessment(i,d.key)) : 'Idea unavailable'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      ${visible.length ? `<div id="idea-focused-dimension" tabindex="-1">${select('Dimension','dimension',visible.map(d=>[String(dimensions().indexOf(d)),d.label]),String(model.dimension))}<div class="idea-toolbar">${btn('previous','Previous dimension',visible.indexOf(row)<=0 ? 'disabled' : '')}${btn('next','Next dimension',visible.indexOf(row)===visible.length-1 ? 'disabled' : '')}</div>${toggle(row)}${model.expanded.has(row.key) ? `<p>Favorable: ${html(row.favorable)}</p>` : ''}${chosen.map((i,n)=>`<section><h3>${name(i,n)}</h3>${compareCell(i,row.key,model.expanded.has(row.key))}</section>`).join('')}</div>` : ''}<section><h3>MVP / platform</h3>${chosen.map((i,n)=>`<h4>${name(i,n)}</h4>${compareCell(i,'mvp')}`).join('')}</section></div>`}`;
  }
  function loadError() {return model.error ? `<p class="idea-error" role="alert">Ideas could not be loaded. ${html(model.error)} ${btn('refresh','Retry')}</p>` : '';}
  async function refresh() {
    if (model.loading || model.pending || model.edit || capture || root.querySelector('#idea-copy-result textarea')) return;
    model.loading = true;
    const priorData=JSON.stringify(model.data), priorError=model.error;
    const focused=document.activeElement, focusId=focused?.id, focusName=focused?.name, selectionStart=focused?.selectionStart, selectionEnd=focused?.selectionEnd, scroll=window.scrollY;
    const disclosure=focused?.closest('[data-idea-disclosure]')?.dataset.ideaDisclosure;
    const selectedIdea=focused?.dataset.ideaSelect, focusedHref=focused?.getAttribute('href');
    const action=focused?.dataset.ideaAction, dimension=focused?.dataset.ideaDimension;
    const presentation=focused?.closest('.idea-compare-phone') ? '.idea-compare-phone' : focused?.closest('.idea-compare-desktop') ? '.idea-compare-desktop' : '';
    const opened=Array.from(root.querySelectorAll('[data-idea-disclosure][open]')).map(el=>el.dataset.ideaDisclosure);
    try {
      const response = await fetch('./ideas.json',{cache:'no-store'});
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Please retry.');
      if (!Array.isArray(data.ideas) || !Array.isArray(data.dimensions) || !Array.isArray(data.states)) throw new Error('Invalid Ideas response.');
      model.data = data; model.error = '';
    } catch(e) {model.error = e.message;}
    model.loading = false;
    if (active() && !model.edit && !capture && (priorData!==JSON.stringify(model.data) || priorError!==model.error)) {
      paint(false);
      for(const key of opened){const item=root.querySelector(`[data-idea-disclosure="${CSS.escape(key)}"]`);if(item)item.open=true;}
      const target=focusId ? document.getElementById(focusId) : focusName ? root.querySelector(`[name="${CSS.escape(focusName)}"]`) : disclosure ? root.querySelector(`[data-idea-disclosure="${CSS.escape(disclosure)}"] > summary`) : dimension ? root.querySelector(`${presentation} [data-idea-action="${CSS.escape(action)}"][data-idea-dimension="${CSS.escape(dimension)}"]`) : action ? root.querySelector(`[data-idea-action="${CSS.escape(action)}"]`) : null;
      const restored=target || (selectedIdea ? root.querySelector(`[data-idea-select="${CSS.escape(selectedIdea)}"]`) : focusedHref ? root.querySelector(`a[href="${CSS.escape(focusedHref)}"]`) : null);
      restored?.focus({preventScroll:true});
      if(target?.setSelectionRange && selectionStart!=null)target.setSelectionRange(selectionStart,selectionEnd);
      window.scrollTo(0,scroll);
    }
  }
  function paint(focus = true) {
    if (!active()) return;
    if (!LIVE && !model.data) {root.innerHTML = '<h2 tabindex="-1">Ideas</h2><p>Ideas are not included in this snapshot.</p>'; return;}
    if (!model.data) {root.innerHTML = `<h2 tabindex="-1">Ideas</h2>${model.loading ? '<p role="status">Loading ideas…</p>' : loadError()}`; return;}
    const route = location.hash.slice(1).split('?')[0];
    if (route === '/ideas' || route === '/ideas/') renderList();
    else if (route === '/ideas/compare') compare();
    else {
      let id; try { id = decodeURIComponent(route.slice('/ideas/'.length)); } catch {}
      const idea = find(id);
      if (idea) detail(idea); else root.innerHTML = `${back()}<h2 tabindex="-1">Idea not found</h2>`;
    }
    if (model.error && !root.querySelector('#idea-load-error')) root.insertAdjacentHTML('afterbegin',loadError());
    if (focus) root.querySelector('h2')?.focus({preventScroll:true});
  }
  function currentIdea() {try {return find(decodeURIComponent(location.hash.slice(1).split('?')[0].slice('/ideas/'.length)));} catch {return null;}}
  function formDirty() {const draft = capture || model.edit; return !!draft && draft.initial !== JSON.stringify([...new FormData(draft.form)]);}
  function trapDialog(dialog) {
    dialog.addEventListener('keydown',e=>{
      if(e.key !== 'Tab')return;
      const controls=Array.from(dialog.querySelectorAll('button,input,textarea,select,a[href],[tabindex="0"]')).filter(el=>!el.disabled && el.getClientRects().length);
      const first=controls[0], last=controls.at(-1);
      if(e.shiftKey && document.activeElement === first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey && document.activeElement === last){e.preventDefault();first?.focus();}
    });
  }
  function discardAllowed() {
    if (model.pending) return Promise.resolve(false);
    if (!formDirty()) return Promise.resolve(true);
    return new Promise(resolve => {
      const dialog = document.createElement('dialog'); dialog.className = 'idea-dialog';
      dialog.setAttribute('aria-labelledby','idea-discard-title');
      dialog.innerHTML = '<h2 id="idea-discard-title">Discard changes?</h2><p>Your unsaved changes will be lost.</p><div class="idea-toolbar"><button class="btn" value="keep">Keep editing</button><button class="btn" value="discard">Discard changes</button></div>';
      document.body.append(dialog);
      const prior = document.activeElement;
      const done = result => {dialog.close();dialog.remove();prior?.focus();resolve(result);};
      dialog.addEventListener('cancel',e=>{e.preventDefault();done(false);});
      dialog.addEventListener('click',e=>{if(e.target.value) done(e.target.value === 'discard');});
      trapDialog(dialog);dialog.showModal(); dialog.querySelector('button').focus();
    });
  }
  function closeCapture() {if (!capture) return; const {dialog,opener}=capture; dialog.close();dialog.remove();capture=null;opener?.focus();}
  async function cancelDraft() {
    if (!await discardAllowed()) return;
    if (capture) closeCapture();
    else {model.edit=null;paint(false);root.querySelector('[data-idea-action="edit"]')?.focus();}
  }
  function busy(form,value) {
    model.pending=value;form.setAttribute('aria-busy',String(value));
    for (const control of form.elements) control.disabled=value || (control.name?.endsWith('.confidence') && form.elements[control.name.replace('.confidence','.judgment')]?.value==='unknown');
  }
  async function post(url,body) {
    const response = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data = await response.json();
    if (!response.ok || !data.ok) throw Object.assign(new Error(data.error || 'Please retry.'),{code:data.code,current:data.current});
    if (!data.idea) throw new Error('No idea returned. Retry the request.');
    return data.idea;
  }
  function updateRecord(idea) {
    const index = model.data.ideas.findIndex(i=>i.id === idea.id);
    if(index < 0) model.data.ideas.push(idea); else model.data.ideas[index]=idea;
  }
  function openCapture() {
    if(!LIVE || capture || model.edit) return;
    const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
    const dialog = document.createElement('dialog');dialog.className='idea-dialog';
    dialog.setAttribute('aria-labelledby','idea-capture-title');
    dialog.innerHTML=`<form id="idea-capture"><h2 id="idea-capture-title">New idea</h2>${field('Title','title','',{max:200,required:true})}${field('Original idea','original','',{rows:6,max:100000})}${field('Source URL','sourceUrl','',{type:'url'})}<div class="idea-form-error" role="alert"></div><div class="idea-toolbar">${btn('cancel','Cancel')}<button class="btn primary" type="submit">Create idea</button></div></form>`;
    document.body.append(dialog);
    const form=dialog.querySelector('form');
    capture={dialog,form,opener:document.activeElement,requestId:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),retryBody:null};
    capture.initial=JSON.stringify([...new FormData(form)]);
    dialog.addEventListener('cancel',e=>{e.preventDefault();cancelDraft();});
    dialog.addEventListener('click',e=>{if(e.target.closest('[data-idea-action="cancel"]'))cancelDraft();if(e.target.closest('[data-idea-action="retry"]'))form.requestSubmit();});
    form.addEventListener('submit',create);
    trapDialog(dialog);dialog.showModal(); form.elements.title.focus();
  }
  async function create(e) {
    e.preventDefault();if(model.pending)return;
    const draft=capture, form=draft.form;
    if (!form.reportValidity()) return;
    const values=Object.fromEntries(new FormData(form));
    if(values.sourceUrl && !/^https?:\/\//i.test(values.sourceUrl)){form.elements.sourceUrl.setCustomValidity('Use an http or https URL.');form.elements.sourceUrl.reportValidity();return;}
    // Freeze the payload after the first attempt. A lost acknowledgement retries the same request.
    const body=draft.retryBody || {...values,sourceUrl:values.sourceUrl || null,requestId:draft.requestId};
    draft.retryBody=body;busy(form,true);
    try {
      const idea=await post('/idea/add',body);updateRecord(idea);busy(form,false);closeCapture();
      location.hash=`/ideas/${idea.id}`;
    } catch(err) {
      busy(form,false);
      // An uncertain outcome must be reconciled with the same bytes before changing this capture.
      if (err.code === 'invalid') draft.retryBody=null;
      for(const name of ['title','original','sourceUrl'])form.elements[name].readOnly=!!draft.retryBody;
      form.querySelector('.idea-form-error').innerHTML=`Idea could not be created: ${html(err.message)}. ${draft.retryBody ? 'Retry or cancel to start again.' : 'Correct the fields and retry.'} ${btn('retry','Retry')}`;
      form.querySelector('.idea-form-error button')?.focus();
    }
  }
  function openEdit(i,target='general') {
    if (!LIVE || model.edit || !i) return;
    const draft={base:structuredClone(i),form:null,initial:'',conflict:null,target};
    model.edit=draft;
    renderEdit(draft);
  }
  function renderEdit(draft) {
    const i=draft.base;
    root.innerHTML=`${back()}<div class="idea-head"><h2 tabindex="-1">Edit ${html(i.title)}</h2></div><form id="idea-edit"><div class="idea-edit-actions idea-toolbar">${btn('cancel','Cancel')}<button class="btn primary" type="submit">Save changes</button></div><div class="idea-form-error" role="alert"></div>${field('Title','title',i.title,{max:200,required:true})}<details class="idea-edit-group"><summary>Original idea</summary>${field('Original idea','original',i.original,{rows:6,max:100000})}</details>${field('Summary','summary',i.summary,{rows:3,max:4000})}<div class="idea-form-grid">${select('State','state',model.data.states,i.state)}${select('Project','projectId',[['','Not linked'],...(i.projectId && !project(i.projectId) ? [[i.projectId,`Project unavailable: ${i.projectId}`]] : []),...(model.data.projects || []).map(p=>[p.id,p.name])],i.projectId || '')}</div>${field('Next decision','nextDecision',i.nextDecision,{rows:2,max:1000})}<details class="idea-edit-group"><summary>MVP</summary>${mvpLabels.map(([key,label])=>field(label,`mvp.${key}`,i.mvp?.[key],{rows:2,max:2000})).join('')}</details><details class="idea-edit-group" id="idea-edit-assessments" ${draft.target==='assessment' ? 'open' : ''}><summary>Assessment</summary>${dimensions().map(d=>{const a=assessment(i,d.key);return `<details class="idea-edit-dimension" data-idea-assessment="${html(d.key)}" ${draft.target==='assessment' && d===dimensions()[0] ? 'open' : ''}><summary>${html(d.label)}</summary><p class="idea-muted">Favorable: ${html(d.favorable)}</p><div class="idea-form-grid">${select('Judgment',`${d.key}.judgment`,['unknown','favorable','mixed','unfavorable'],a.judgment)}${select('Confidence',`${d.key}.confidence`,[['','Not rated'],'low','medium','high'],a.confidence || '')}</div>${field('Short reason',`${d.key}.reason`,a.reason,{rows:2,max:300})}${field('Rationale',`${d.key}.rationale`,a.rationale,{rows:3,max:6000})}${field('Next question',`${d.key}.nextQuestion`,a.nextQuestion,{rows:2,max:500})}</details>`;}).join('')}</details><details class="idea-edit-group"><summary>Open questions</summary>${Array.from({length:3},(_,n)=>field(`Question ${n+1}`,`question.${n}`,i.questions?.[n]?.question,{rows:2})+field('Next step',`nextStep.${n}`,i.questions?.[n]?.nextStep,{rows:2})).join('')}</details></form>`;
    const form=root.querySelector('form');draft.form=form;draft.initial=JSON.stringify([...new FormData(form)]);draft.originalTouched=false;
    form.elements.original.addEventListener('input',()=>{draft.originalTouched=true;});
    form.addEventListener('submit',save);
    for(const d of dimensions())form.elements[`${d.key}.confidence`].disabled=assessment(i,d.key).judgment==='unknown';
    draft.initial=JSON.stringify([...new FormData(form)]);
    if(draft.target==='assessment'){form.elements[`${dimensions()[0].key}.judgment`].focus();}
    else {window.scrollTo(0,0);root.querySelector('h2').focus();}
    form.addEventListener('input',()=>{for(const control of form.querySelectorAll('[aria-invalid]')){control.setCustomValidity('');control.removeAttribute('aria-invalid');}});
  }
  async function save(e) {
    e.preventDefault();if(model.pending)return;
    const draft=model.edit, form=draft.form, values=Object.fromEntries(new FormData(form)), base=draft.base;
    form.querySelector('.idea-form-error').classList.remove('idea-review');
    form.querySelector('.idea-form-error').setAttribute('role','alert');
    const patch={title:values.title,summary:values.summary,state:values.state,projectId:values.projectId || null,nextDecision:values.nextDecision,mvp:{},assessments:{},questions:[]};
    if(draft.originalTouched)patch.original=values.original;
    for(const [key] of mvpLabels)patch.mvp[key]=values[`mvp.${key}`];
    if(mvpLabels.every(([key])=>patch.mvp[key]===(base.mvp?.[key] || '')))delete patch.mvp;
    const fail=(message,name)=>{
      form.querySelector('.idea-form-error').textContent=message;const control=form.elements[name];
      for(let parent=control?.parentElement;parent && parent!==form;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
      control?.setAttribute('aria-invalid','true');control?.setCustomValidity(message);control?.reportValidity();control?.focus();
    };
    if(patch.state === 'building' && !project(patch.projectId) && (base.state !== 'building' || base.projectId !== patch.projectId))return fail('Choose a registered project before marking this idea Building.','projectId');
    for(const d of dimensions()) {
      const previous=assessment(base,d.key);
      const a={...previous};delete a.reviewedAt;delete a.assumption;
      for(const key of ['judgment','reason','rationale','nextQuestion'])a[key]=values[`${d.key}.${key}`];
      a.confidence=a.judgment === 'unknown' ? null : values[`${d.key}.confidence`] || null;
      if(a.judgment !== 'unknown' && (!a.confidence || !a.reason.trim()))return fail('Known judgments require a short reason and confidence.',`${d.key}.${!a.reason.trim() ? 'reason' : 'confidence'}`);
      if(a.judgment !== 'unknown' && !a.evidence?.length && a.confidence !== 'low')return fail('Assessments without external evidence require Low confidence.',`${d.key}.confidence`);
      // Do not mark untouched dimensions as newly reviewed.
      const before={...previous};delete before.reviewedAt;delete before.assumption;
      if(JSON.stringify(a) !== JSON.stringify(before))patch.assessments[d.key]=a;
    }
    for(let n=0;n<3;n++)if(values[`question.${n}`] || values[`nextStep.${n}`])patch.questions.push({question:values[`question.${n}`],nextStep:values[`nextStep.${n}`]});
    for(const key of Object.keys(patch))if(key!=='assessments' && JSON.stringify(patch[key])===JSON.stringify(base[key]))delete patch[key];
    busy(form,true);
    try {
      const idea=await post('/idea/update',{id:base.id,revision:base.revision,patch});updateRecord(idea);busy(form,false);model.edit=null;
      paint(false);const anchor=draft.target==='assessment' ? root.querySelector('[data-idea-action="edit-assessment"]') : root.querySelector('[data-idea-action="edit"]');anchor?.focus();
    }catch(err){
      busy(form,false);draft.conflict=err.current || null;
      form.querySelector('.idea-form-error').innerHTML=`Changes could not be saved: ${html(err.code === 'conflict' ? 'this idea changed elsewhere' : err.message)}. ${err.code === 'conflict' ? btn('rebase','Review latest with my edits')+btn('reload','Discard draft and reload') : btn('retry','Retry')}`;
      form.querySelector('.idea-form-error button')?.focus();
    }
  }
  async function route() {
    const version=++routeVersion, target=location.hash;
    if((model.edit || capture)) {
      const previous=model.route;
      history.replaceState(null,'',location.pathname+location.search+previous);
      if(!await discardAllowed() || version !== routeVersion)return;
      if(capture)closeCapture();model.edit=null;
      history.pushState(null,'',location.pathname+location.search+target);
    }
    model.route=target;
    const isIdeas=active();
    for(const id of ['chips','tabs','view','foot','gen'])document.getElementById(id).hidden=isIdeas;
    root.hidden=!isIdeas;
    document.body.classList.toggle('ideas-active',isIdeas);
    for(const id of ['task-new','rescan'])document.getElementById(id).style.display=isIdeas || !LIVE ? 'none' : '';
    for(const a of nav.querySelectorAll('a')){if((a===nav.lastElementChild)===isIdeas)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
    if(isIdeas){
      model.lastIdeaRoute=target;nav.lastElementChild.href='#/ideas';
      closeTask(true);closeNew();
      if(target.startsWith('#/ideas/compare')){
        const ids=new URLSearchParams(target.split('?')[1] || '').get('ids');
        if(ids !== null)model.selected=[...new Set(ids.split(',').filter(Boolean))].slice(0,3);
      }
      paint();
      if(target === '#/ideas'){
        window.scrollTo(0,model.listScroll);
        if(model.returnFocus)Array.from(root.querySelectorAll('a')).find(a=>a.hash === model.returnFocus)?.focus({preventScroll:true});
      }else {
        const origin=origins.get(target);
        window.scrollTo(0,origin?.scroll || 0);
        if(origin)Array.from(root.querySelectorAll('a')).find(a=>a.hash === origin.hash)?.focus({preventScroll:true});
      }
      if(LIVE && !model.data && !model.loading)refresh();
    }else {nav.lastElementChild.href=model.lastIdeaRoute || '#/ideas';render();}
  }
  function comparisonRoute() {model.listScroll=window.scrollY;location.hash='/ideas/compare?ids='+model.selected.map(encodeURIComponent).join(',');}
  root.addEventListener('input',e=>{
    if(e.target.id === 'idea-search'){model.query=e.target.value;renderListResults();}
  });
  root.addEventListener('change',e=>{
    if(e.target.dataset.ideaSelect){
      const id=e.target.dataset.ideaSelect;
      if(e.target.checked && model.selected.length >= 3){e.target.checked=false;root.querySelector('#idea-selection-error').textContent='Compare up to 3 ideas. Remove one first.';return;}
      model.selected=e.target.checked ? [...model.selected,id] : model.selected.filter(v=>v!==id);
      root.querySelector('#idea-selection').innerHTML=selection();root.querySelector('#idea-selection-error').textContent='';
    }
    if(['filter','sort'].includes(e.target.name) && !model.edit){model[e.target.name]=e.target.value;renderListResults();}
    if(e.target.name === 'differences'){model.diffOnly=e.target.checked;compare();root.querySelector('[name="differences"]').focus();}
    if(e.target.name === 'dimension'){model.dimension=Number(e.target.value);compare();root.querySelector('[name="dimension"]').focus();}
    if(e.target.name?.endsWith('.judgment')){
      const key=e.target.name.split('.')[0], confidence=model.edit?.form.elements[`${key}.confidence`];
      if(confidence){confidence.disabled=e.target.value==='unknown';if(confidence.disabled)confidence.value='';}
    }
  });
  root.addEventListener('click',async e=>{
    const anchor=e.target.closest('a');
    if(anchor?.hash?.startsWith('#/ideas/') && !model.edit)origins.set(location.hash,{hash:anchor.hash,scroll:window.scrollY});
    if(anchor?.hash?.startsWith('#/ideas/') && location.hash === '#/ideas'){model.listScroll=window.scrollY;model.returnFocus=anchor.hash;}
    const projectAnchor=e.target.closest('[data-idea-project]');
    if(projectAnchor){state.project=projectAnchor.dataset.ideaProject;state.tab='board';}
    const button=e.target.closest('[data-idea-action]');if(!button)return;
    const action=button.dataset.ideaAction;
    if(action === 'capture')openCapture();
    if(action === 'cancel')cancelDraft();
    if(action === 'edit' || action === 'edit-assessment')openEdit(currentIdea(),action==='edit-assessment' ? 'assessment' : 'general');
    if(action === 'retry')model.edit?.form.requestSubmit();
    if(action === 'refresh')refresh();
    if(action === 'compare')comparisonRoute();
    if(action === 'clear'){model.selected=[];renderListResults();}
    if(action === 'reset'){model.query='';model.filter='active';model.sort='updated';renderList();}
    if(action === 'remove'){model.selected=model.selected.filter(id=>id!==button.dataset.ideaId);history.replaceState(null,'','#/ideas/compare?ids='+model.selected.map(encodeURIComponent).join(','));route();}
    if(action === 'evidence'){
      const key=button.dataset.ideaDimension;
      if(model.expanded.has(key))model.expanded.delete(key);else model.expanded.add(key);
      const presentation=button.closest('.idea-compare-phone') ? '.idea-compare-phone' : '.idea-compare-desktop';
      const y=window.scrollY;compare();window.scrollTo(0,y);
      root.querySelector(`${presentation} [data-idea-action="evidence"][data-idea-dimension="${key}"]`)?.focus({preventScroll:true});
    }
    if(action === 'assessment'){
      const target=root.querySelector(`[data-idea-disclosure="${CSS.escape(button.dataset.ideaDimension)}"]`);
      if(target){target.open=true;target.querySelector('summary').focus();target.scrollIntoView({block:'start'});}
    }
    if(action === 'dimension'){model.dimension=dimensions().findIndex(d=>d.key===button.dataset.ideaDimension);compare();root.querySelector('[name="dimension"]').focus();root.querySelector('#idea-focused-dimension').scrollIntoView({block:'start'});}
    if(action === 'previous' || action === 'next'){
      const choices=Array.from(root.querySelector('[name="dimension"]').options).map(o=>Number(o.value));
      model.dimension=choices[choices.indexOf(model.dimension)+(action==='next' ? 1 : -1)];compare();root.querySelector(`[data-idea-action="${action}"]`)?.focus();
    }
    if(action==='rebase' && model.edit){
      const old=model.edit, values=Object.fromEntries(new FormData(old.form)), initial=Object.fromEntries(JSON.parse(old.initial));
      busy(old.form,true);
      try{
        const response=await fetch('./ideas.json',{cache:'no-store'}),data=await response.json();
        if(!response.ok || !data.ok)throw Error(data.error || 'Please retry.');
        const latest=data.ideas.find(i=>i.id===old.base.id);if(!latest)throw Error('Idea no longer available.');
        model.data=data;busy(old.form,false);model.edit=null;openEdit(latest,old.target);
        const fresh=model.edit, overlaps=[];
        for(const [name,value] of Object.entries(values))if(value!==(initial[name] ?? '')){
          const control=fresh.form.elements[name];if(!control)continue;
          const upstream=control.value;
          if(upstream!==(initial[name] ?? '') && upstream!==value){
            overlaps.push(name);
            control.closest('.nf').insertAdjacentHTML('beforeend',`<details class="idea-conflict" open><summary>Also changed elsewhere</summary><p>${html(upstream || '(empty)')}</p></details>`);
            for(let parent=control.parentElement;parent && parent!==fresh.form;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
          }
          control.value=value;if(name==='original')fresh.originalTouched=true;
        }
        for(const d of dimensions())fresh.form.elements[`${d.key}.confidence`].disabled=fresh.form.elements[`${d.key}.judgment`].value==='unknown';
        fresh.form.querySelector('.idea-form-error').classList.add('idea-review');
        fresh.form.querySelector('.idea-form-error').setAttribute('role','status');
        fresh.form.querySelector('.idea-form-error').textContent=overlaps.length ? 'Your edits are kept. Review the fields also changed elsewhere before saving.' : '';
        if(overlaps.length)fresh.form.elements[overlaps[0]].focus();
      }catch(err){busy(old.form,false);old.form.querySelector('.idea-form-error').textContent=`Latest idea could not be loaded: ${err.message}. Your draft is retained.`;}
    }
    if(action === 'reload' && model.edit && await discardAllowed()){
      const id=model.edit.base.id;
      const draft=model.edit;
      busy(draft.form,true);
      try {
        const response=await fetch('./ideas.json',{cache:'no-store'});
        const data=await response.json();
        if(!response.ok || !data.ok || !Array.isArray(data.ideas))throw new Error(data.error || 'Please retry.');
        if(!data.ideas.some(i=>i.id === id))throw new Error('This idea is no longer available. Your draft is retained.');
        model.data=data;busy(draft.form,false);model.edit=null;openEdit(find(id));
      } catch(err) {
        busy(draft.form,false);
        draft.form.querySelector('.idea-form-error').innerHTML=`Latest idea could not be loaded. ${html(err.message)} ${btn('reload','Reload latest')}`;
      }
    }
    if(action === 'research'){
      const text=`Research ${currentIdea().id} with the opc-idea skill.`;
      const target=root.querySelector('#idea-copy-result');
      try{await navigator.clipboard.writeText(text);target.textContent='';toast('Research request copied.');}
      catch{target.innerHTML=`<label class="nf">Copy this research request<textarea readonly rows="2">${html(text)}</textarea></label>`;target.querySelector('textarea').select();}
    }
  });
  document.addEventListener('keydown',e=>{
    if(!active() || (!capture && !model.edit))return;
    if(e.key === 'Escape'){
      if(document.querySelector('dialog.idea-dialog:not(:has(form))'))return;
      e.preventDefault();e.stopImmediatePropagation();cancelDraft();
    }
    if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)){e.preventDefault();(capture || model.edit).form.requestSubmit();}
  },true);
  document.addEventListener('input',e=>{if(e.target.name === 'sourceUrl')e.target.setCustomValidity('');});
  window.addEventListener('beforeunload',e=>{if(formDirty() || model.pending){e.preventDefault();e.returnValue='';}});
  window.addEventListener('hashchange',route);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState === 'visible' && LIVE && active() && !model.edit && !capture && !model.pending)refresh();});
  if(!LIVE && window.__DATA__.ideas){
    model.data=window.__DATA__.ideas;
    if(!model.data.projects)model.data={...model.data,projects:(window.__DATA__.projects || []).map(p=>({id:p.id,name:p.name || p.id}))};
  }
  route();
})();
