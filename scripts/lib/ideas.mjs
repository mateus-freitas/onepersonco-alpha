import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

export const dimensions = [
  ['acquisition', 'Acquisition (ASO / SEO)', 'Reach searching customers through sustainable ASO or SEO'],
  ['technical', 'Technical feasibility', 'Build and maintain the product with manageable technical risk'],
  ['capacity', 'Capacity and maintenance', 'Operate within a solo builder’s time and resources'],
  ['marketing', 'Marketing burden', 'Keep distribution and content effort sustainable for a solo owner'],
  ['market', 'Market size', 'Serve demonstrated demand and willingness to pay'],
  ['differentiation', 'Differentiation', 'Offer a meaningful reason to choose this product'],
  ['defensibility', 'Defensibility', 'Build advantages that endure competition'],
].map(([key, label, favorable]) => ({ key, label, favorable }));
export const states = ['captured', 'researching', 'shortlisted', 'building', 'parked', 'archived'];
const dimensionKeys = dimensions.map(d => d.key);
const editable = ['title', 'original', 'summary', 'nextDecision', 'state', 'projectId', 'mvp', 'assessments', 'questions', 'sources', 'keywords'];
const assessmentKeys = ['judgment', 'confidence', 'reason', 'rationale', 'evidence', 'counterevidence', 'nextQuestion'];
export class IdeaError extends Error {
  constructor(code, message, current) { super(message); this.code = code; if (current) this.current = current; }
}
const fail = message => { throw new IdeaError('invalid', message); };
export function strictKeys(value, keys, label = 'object') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  for (const key of Object.keys(value)) if (!keys.includes(key)) fail(`unknown ${label} field: ${key}`);
}
function text(value, max, label, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(`invalid ${label} (string, ${required ? '1–' : 'up to '}${max} characters)`);
}
function day(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
const localDay = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const today = () => localDay(new Date());
function checked(value) {
  if (!day(value)) fail('checkedAt must be a real calendar date');
}
function webUrl(value) {
  if (typeof value !== 'string' || value.length > 4000) fail('invalid source URL');
  try { if (!['http:', 'https:'].includes(new URL(value).protocol)) fail('source URL must use http(s)'); } catch { fail('source URL must use http(s)'); }
}
function array(value, max, label) { if (!Array.isArray(value) || value.length > max) fail(`invalid ${label} (maximum ${max})`); }
function assessment() { return { judgment: 'unknown', confidence: null, reason: '', rationale: '', evidence: [], counterevidence: [], nextQuestion: '', reviewedAt: null }; }
export function template(idea) {
  const out = idea ? Object.fromEntries(editable.filter(k => k !== 'original').map(k => [k, structuredClone(idea[k])])) : {
    title: '', summary: '', nextDecision: '', state: 'captured', projectId: null, mvp: {},
    assessments: Object.fromEntries(dimensionKeys.map(k => [k, assessment()])), questions: [], sources: [], keywords: [],
  };
  for (const a of Object.values(out.assessments)) { delete a.reviewedAt; delete a.assumption; }
  return out;
}
function validateIdea(i) {
  strictKeys(i, [...editable, 'id', 'revision', 'createdAt', 'updatedAt', 'createRequest'], 'idea');
  if (!/^idea-[1-9]\d*$/.test(i.id) || !Number.isSafeInteger(Number(i.id.slice(5)))) fail('invalid idea id');
  if (!Number.isSafeInteger(i.revision) || i.revision < 1) fail('invalid revision');
  for (const key of ['createdAt', 'updatedAt']) {
    if (typeof i[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(i[key]) || !Number.isFinite(Date.parse(i[key])) || new Date(i[key]).toISOString() !== i[key]) fail(`invalid ${key}`);
  }
  if (i.updatedAt < i.createdAt) fail('updatedAt precedes createdAt');
  if (i.createRequest !== null) {
    strictKeys(i.createRequest, ['id', 'fingerprint'], 'createRequest');
    text(i.createRequest.id, 200, 'requestId', true);
    if (!/^[a-f0-9]{64}$/.test(i.createRequest.fingerprint)) fail('invalid fingerprint');
  }
  text(i.title, 200, 'title', true); if (i.title !== i.title.trim()) fail('title must be trimmed');
  text(i.original, 100000, 'original'); text(i.summary, 4000, 'summary'); text(i.nextDecision, 1000, 'nextDecision');
  if (!states.includes(i.state)) fail('invalid state');
  if (i.projectId !== null) text(i.projectId, 200, 'projectId', true);
  if (i.state === 'building' && i.projectId === null) fail('building requires a project');
  strictKeys(i.mvp, ['scope', 'exclusions', 'platform', 'rationale', 'validation'], 'mvp');
  for (const [k, v] of Object.entries(i.mvp)) text(v, 2000, `mvp.${k}`);
  array(i.sources, 40, 'sources'); const sourceIds = new Set();
  for (const s of i.sources) {
    strictKeys(s, ['id', 'title', 'url', 'publisher', 'publishedAt', 'checkedAt', 'note'], 'source');
    if (!/^S[1-9]\d*$/.test(s.id) || sourceIds.has(s.id)) fail('invalid or duplicate source id'); sourceIds.add(s.id);
    text(s.title, 500, 'source title', true); text(s.publisher, 500, 'publisher'); text(s.note, 6000, 'source note');
    if (s.url !== null) webUrl(s.url);
    if (s.publishedAt !== null) {
      const p = s.publishedAt;
      if (typeof p !== 'string' || !/^\d{4}(-\d{2})?(-\d{2})?$/.test(p) || !day(p.length === 4 ? `${p}-01-01` : p.length === 7 ? `${p}-01` : p)) fail('invalid publishedAt');
    }
    checked(s.checkedAt);
  }
  strictKeys(i.assessments, dimensionKeys, 'assessments');
  for (const key of dimensionKeys) {
    const a = i.assessments[key]; strictKeys(a, [...assessmentKeys, 'reviewedAt'], key);
    if (!['unknown', 'favorable', 'mixed', 'unfavorable'].includes(a.judgment)) fail('invalid judgment');
    if (a.judgment === 'unknown' ? a.confidence !== null : !['low', 'medium', 'high'].includes(a.confidence)) fail('invalid confidence');
    text(a.reason, 300, 'reason', a.judgment !== 'unknown'); text(a.rationale, 6000, 'rationale'); text(a.nextQuestion, 500, 'nextQuestion');
    for (const field of ['evidence', 'counterevidence']) {
      array(a[field], 40, field);
      if (a[field].some(id => !sourceIds.has(id)) || new Set(a[field]).size !== a[field].length) fail('invalid or dangling citation');
    }
    if (a.judgment !== 'unknown' && !a.evidence.length && a.confidence !== 'low') fail('assumptions require low confidence');
    if (a.reviewedAt !== null && !day(a.reviewedAt)) fail('invalid reviewedAt');
  }
  array(i.questions, 3, 'questions');
  for (const q of i.questions) { strictKeys(q, ['question', 'nextStep'], 'question'); text(q.question, 1000, 'question', true); text(q.nextStep, 1000, 'nextStep'); }
  array(i.keywords, 30, 'keywords');
  for (const k of i.keywords) {
    strictKeys(k, ['term', 'market', 'language', 'volume', 'difficulty', 'checkedAt', 'sourceId'], 'keyword');
    text(k.term, 300, 'term', true); text(k.market, 200, 'market', true); if (k.language !== undefined) text(k.language, 100, 'language');
    for (const f of ['volume', 'difficulty']) if (k[f] !== null && !(typeof k[f] === 'number' && Number.isFinite(k[f]) && k[f] >= 0 && k[f] <= 100)) fail(`invalid ${f}`);
    checked(k.checkedAt); if (!sourceIds.has(k.sourceId)) fail('dangling keyword source');
  }
}
// Read projection only: confidence describes evidence, never adjusts judgment points.
export function deriveFit(assessments = {}) {
  const counts = { favorable: 0, mixed: 0, unfavorable: 0, unknown: 0 };
  const confidence = { high: 0, medium: 0, low: 0 };
  for (const key of dimensionKeys) {
    const a = assessments[key];
    const judgment = a?.judgment || 'unknown';
    counts[judgment]++;
    if (judgment !== 'unknown' && Object.hasOwn(confidence, a?.confidence)) confidence[a.confidence]++;
  }
  const total = dimensionKeys.length, assessed = total - counts.unknown;
  const points = counts.favorable * 2 + counts.mixed;
  return { points, assessed, total, value: assessed < Math.ceil(total / 2) ? null : Math.round(100 * points / (2 * assessed)), counts, confidence };
}
export function derive(i) {
  const out = structuredClone(i);
  out.fit = deriveFit(i.assessments);
  out.researchDate = Object.values(i.assessments).map(a => a.reviewedAt).filter(Boolean).sort().at(-1) || null;
  for (const a of Object.values(out.assessments)) a.assumption = a.judgment !== 'unknown' && !a.evidence.length;
  return out;
}
function validateStore(s) {
  strictKeys(s, ['schemaVersion', 'nextId', 'ideas'], 'store');
  if (s.schemaVersion !== 1 || !Number.isSafeInteger(s.nextId) || s.nextId < 1 || !Array.isArray(s.ideas)) fail('invalid schemaVersion, nextId or ideas');
  const ids = new Set(), requests = new Set();
  for (const i of s.ideas) {
    validateIdea(i);
    if (ids.has(i.id) || Number(i.id.slice(5)) >= s.nextId) fail('duplicate id or invalid counter'); ids.add(i.id);
    if (i.createRequest) { if (requests.has(i.createRequest.id)) fail('duplicate request id'); requests.add(i.createRequest.id); }
  }
}
function durableReplace(file, contents, fence = () => {}) {
  const temp = `${file}.tmp-${randomUUID()}`;
  try {
    const fd = fs.openSync(temp, 'wx', 0o600);
    try { fs.writeFileSync(fd, contents); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fence(); fs.renameSync(temp, file);
    try { const dir = fs.openSync(path.dirname(file), 'r'); try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); } } catch { /* directory fsync unsupported on some systems */ }
  } finally { try { fs.unlinkSync(temp); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
}
export function createIdeasStore({ root, projects = () => [], lockTimeout = 5000 }) {
  if (!path.isAbsolute(root)) fail(`OPC_IDEAS_ROOT must be an absolute path: ${root}`);
  const file = path.join(root, 'ideas.json'), lock = path.join(root, 'ideas.lock');
  function read() {
    try {
      const raw = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(file));
      const s = JSON.parse(raw); validateStore(s); return s;
    } catch (e) {
      if (e.code === 'ENOENT' && !fs.existsSync(`${file}.bak`)) return { schemaVersion: 1, nextId: 1, ideas: [] };
      throw new IdeaError('corrupt', `Cannot read ${file}: ${e.message}. Refusing writes; inspect ${file}.bak for recovery.`);
    }
  }
  async function mutate(fn) {
    fs.mkdirSync(root, { recursive: true });
    const token = randomUUID(), content = JSON.stringify({ pid: process.pid, token });
    const start = Date.now();
    for (;;) {
      try { const fd = fs.openSync(lock, 'wx', 0o600); try { fs.writeFileSync(fd, content); } catch (e) { fs.unlinkSync(lock); throw e; } finally { fs.closeSync(fd); } break; }
      catch (e) {
        if (e.code !== 'EEXIST') throw e;
        if (Date.now() - start >= lockTimeout) {
          let pid = 'unknown (malformed lock)'; try { pid = JSON.parse(fs.readFileSync(lock, 'utf8')).pid ?? pid; } catch { /* explain manual recovery */ }
          throw new IdeaError('locked', `${lock} is locked by PID ${pid}. Verify no writer is alive before manually removing this lock; locks are never stolen.`);
        }
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    }
    const owns = () => {
      let recorded;
      try { recorded = fs.readFileSync(lock, 'utf8'); } catch { /* missing or unreadable means ownership lost */ }
      if (recorded !== content) throw new IdeaError('locked', `Lost ownership of ${lock}`);
    };
    try {
      // No await within the critical read/validate/write section.
      const s = read(), before = JSON.stringify(s, null, 2) + '\n';
      const result = fn(s); validateStore(s);
      if (JSON.stringify(s, null, 2) + '\n' !== before) {
        if (fs.existsSync(file)) durableReplace(`${file}.bak`, before, owns);
        durableReplace(file, JSON.stringify(s, null, 2) + '\n', owns);
      }
      return result;
    } finally { owns(); fs.unlinkSync(lock); }
  }
  function projectCheck(id) { if (id !== null && !projects().some(p => p.id === id)) fail(`unknown project: ${id}`); }
  const get = (id, s = read()) => { const i = s.ideas.find(i => i.id === id); if (!i) throw new IdeaError('not_found', `idea not found: ${id}`); return i; };
  return {
    root,
    list: ({ state, all = false, search } = {}) => {
      if (state !== undefined && !states.includes(state)) fail('invalid state');
      return read().ideas.filter(i => (state ? i.state === state : all || i.state !== 'archived') && (!search || [i.title,i.original,i.summary,i.nextDecision,...Object.values(i.mvp),...Object.values(i.assessments).flatMap(a=>[a.reason,a.rationale]),...i.questions.map(q=>q.question),...i.sources.flatMap(s=>[s.title,s.publisher,s.note]),...i.keywords.map(k=>k.term)].join('\n').toLocaleLowerCase().includes(search.toLocaleLowerCase()))).map(derive);
    },
    show: id => derive(get(id)),
    payload: () => ({ ok: true, ideas: read().ideas.map(derive), dimensions, states, projects: projects().map(({ id, name }) => ({ id, name })) }),
    add: input => mutate(s => {
      strictKeys(input, ['title', 'original', 'sourceUrl', 'projectId', 'requestId'], 'add');
      text(typeof input.title === 'string' ? input.title.trim() : input.title, 200, 'title', true);
      if (Object.hasOwn(input, 'original')) text(input.original, 100000, 'original');
      if (Object.hasOwn(input, 'sourceUrl') && input.sourceUrl !== null) webUrl(input.sourceUrl);
      const payload = { title: input.title.trim(), original: input.original ?? '', sourceUrl: input.sourceUrl ?? null, projectId: input.projectId ?? null };
      text(payload.original, 100000, 'original'); if (payload.sourceUrl !== null) webUrl(payload.sourceUrl);
      if (input.requestId !== undefined) text(input.requestId, 200, 'requestId', true);
      const fingerprint = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      const existing = input.requestId && s.ideas.find(i => i.createRequest?.id === input.requestId);
      if (existing) {
        if (existing.createRequest.fingerprint !== fingerprint) throw new IdeaError('conflict', 'request id reused with different payload', derive(existing));
        return { ok: true, idea: derive(existing), deduplicated: true };
      }
      projectCheck(payload.projectId);
      const now = new Date().toISOString();
      const i = { ...template(), original: payload.original, title: payload.title, projectId: payload.projectId, id: `idea-${s.nextId++}`, revision: 1, createdAt: now, updatedAt: now, createRequest: input.requestId ? { id: input.requestId, fingerprint } : null };
      i.assessments = Object.fromEntries(dimensionKeys.map(k => [k, assessment()]));
      if (payload.sourceUrl) i.sources.push({ id: 'S1', title: 'Capture source', url: payload.sourceUrl, publisher: '', publishedAt: null, checkedAt: today(), note: '' });
      validateIdea(i); s.ideas.push(i); return { ok: true, idea: derive(i) };
    }),
    update: (id, revision, patch, { allowOriginal = false } = {}) => mutate(s => {
      if (!Number.isSafeInteger(revision) || revision < 1) fail('revision must be a positive integer');
      strictKeys(patch, editable.filter(k => allowOriginal || k !== 'original'), 'patch');
      const old = get(id, s);
      if (old.revision !== revision) throw new IdeaError('conflict', 'revision conflict', derive(old));
      const i = { ...old, ...patch, revision: old.revision + 1, updatedAt: new Date().toISOString() };
      if (Object.hasOwn(patch, 'assessments')) {
        strictKeys(patch.assessments, dimensionKeys, 'assessments'); i.assessments = { ...old.assessments };
        for (const [k, value] of Object.entries(patch.assessments)) {
          strictKeys(value, assessmentKeys, k);
          const changed = ['judgment', 'confidence', 'evidence', 'counterevidence'].some(f => JSON.stringify(value[f]) !== JSON.stringify(old.assessments[k][f]));
          i.assessments[k] = { ...value, reviewedAt: changed ? (value.judgment === 'unknown' && !value.evidence?.length && !value.counterevidence?.length ? null : today()) : old.assessments[k].reviewedAt };
        }
      }
      if (typeof i.title === 'string') i.title = i.title.trim();
      validateIdea(i);
      // Future bounds apply only to newly supplied dates, not previously valid storage.
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
      for (const field of ['sources','keywords']) if (Object.hasOwn(patch,field)) {
        for (const row of i[field]) {
          const prior = old[field].find(v => field === 'sources' ? v.id === row.id : v.term === row.term && v.market === row.market);
          if (row.checkedAt !== prior?.checkedAt && row.checkedAt > localDay(tomorrow)) fail('checkedAt must be no later than tomorrow');
        }
      }
      if ((Object.hasOwn(patch, 'projectId') && i.projectId !== old.projectId) || (i.state === 'building' && old.state !== 'building')) {
        if (i.state === 'building' && i.projectId === null) fail('building requires a registered project'); projectCheck(i.projectId);
      }
      s.ideas[s.ideas.indexOf(old)] = i; return { ok: true, idea: derive(i) };
    }),
  };
}

export function exportMarkdown(i) {
  const fit = deriveFit(i.assessments);
  const lines = [`# ${i.title}`, '', `${i.id} · ${i.state} · revision ${i.revision}`, '', `Fit: ${fit.value === null ? (fit.assessed ? 'Partial' : 'Not scored') : fit.value + '/100'} · ${fit.assessed} of ${fit.total} assessed`, '', '## Original', '', i.original, '', '## Summary', '', i.summary, '', '## Next decision', '', i.nextDecision, '', '## MVP'];
  for (const [k, v] of Object.entries(i.mvp)) lines.push('', `### ${k}`, '', v);
  for (const d of dimensions) { const a = i.assessments[d.key]; lines.push('', `## ${d.label}`, '', `${a.judgment} · ${a.confidence ?? 'unknown'}${a.assumption ? ' · assumption' : ''}`, '', a.reason, '', a.rationale, '', `Evidence: ${a.evidence.join(', ') || 'none'}`, `Counterevidence: ${a.counterevidence.join(', ') || 'none'}`, `Next question: ${a.nextQuestion}`, `Reviewed: ${a.reviewedAt ?? 'unknown'}`); }
  lines.push('', '## Questions', ...i.questions.map(q => `\n- ${q.question} — ${q.nextStep}`), '', '## Sources', ...i.sources.map(s => `\n- ${s.id}: ${s.title} (${s.publisher}) ${s.url ?? ''} · published ${s.publishedAt ?? 'unknown'} · checked ${s.checkedAt}\n  ${s.note}`), '', '## Keywords', ...i.keywords.map(k => `\n- ${k.term} · ${k.market} ${k.language ?? ''} · volume ${k.volume ?? 'unknown'} · difficulty ${k.difficulty ?? 'unknown'} · ${k.sourceId} · checked ${k.checkedAt}`), '', `Research date: ${i.researchDate ?? 'unknown'}`, `Project: ${i.projectId ?? 'none'}`);
  return lines.join('\n') + '\n';
}

const commandFlags = {
  add: ['text-file', 'source-url', 'project', 'request-id'], list: ['state', 'all'], show: [], search: [],
  template: [], export: ['format'], update: ['revision', 'file', 'original-file'], archive: ['revision'],
};
export async function runIdeaCLI(args, store) {
  const json = args.includes('--json');
  try {
    const [cmd, ...rest] = args;
    if (!cmd || (cmd === '--json' && !rest.length) || cmd === '--help' || cmd === 'help') {
      const help = `opc idea — root: ${store.root}\nadd <title> [--text-file p|-] [--source-url u] [--project id] [--request-id x]\nlist [--state s] [--all] | show <id> | search <text> | template [id]\nexport <id> [--format md|json]\nupdate <id> --revision N --file p|- [--original-file p|-]\narchive <id> --revision N\nAll commands accept --json. Unknown means unassessed, never zero or unfavorable.\nRubric (favorable):\n${dimensions.map(d => `${d.label}: ${d.favorable}`).join('\n')}\nKnown judgments require a reason and confidence; without evidence confidence must be low.\n`;
      console.log(json ? JSON.stringify({ ok: true, root: store.root, help, dimensions, states }) : help); return;
    }
    if (!Object.hasOwn(commandFlags, cmd)) fail(`unknown idea command: ${cmd}`);
    const flags = {}, pos = [];
    for (let n = 0; n < rest.length; n++) {
      const arg = rest[n];
      if (!arg.startsWith('--')) { pos.push(arg); continue; }
      const key = arg.slice(2);
      if (![...commandFlags[cmd], 'json', 'help'].includes(key) || Object.hasOwn(flags, key)) fail(`unknown or duplicate flag: ${arg}`);
      if (['json', 'all', 'help'].includes(key)) flags[key] = true;
      else { const value = rest[++n]; if (value === undefined || value.startsWith('--')) fail(`missing value for ${arg}`); flags[key] = value; }
    }
    if (flags.help) return runIdeaCLI(json ? ['--help', '--json'] : ['--help'], store);
    const counts = cmd === 'template' ? [0, 1] : cmd === 'list' ? [0] : [1];
    if (!counts.includes(pos.length)) fail(`invalid arguments for ${cmd}`);
    const readText = p => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(fs.readFileSync(p === '-' ? 0 : p));
    const revision = () => { if (!/^[1-9]\d*$/.test(flags.revision || '') || !Number.isSafeInteger(Number(flags.revision))) fail('--revision must be a positive integer'); return Number(flags.revision); };
    let out;
    if (cmd === 'add') out = await store.add({ title: pos[0], ...(flags['text-file'] !== undefined ? { original: readText(flags['text-file']) } : {}), ...(flags['source-url'] !== undefined ? { sourceUrl: flags['source-url'] } : {}), ...(flags.project !== undefined ? { projectId: flags.project } : {}), ...(flags['request-id'] !== undefined ? { requestId: flags['request-id'] } : {}) });
    if (cmd === 'list' || cmd === 'search') out = store.list({ state: flags.state, all: flags.all || cmd === 'search', search: cmd === 'search' ? pos[0] : undefined });
    if (cmd === 'show') out = store.show(pos[0]);
    if (cmd === 'template') out = template(pos[0] ? store.show(pos[0]) : undefined);
    if (cmd === 'update') {
      if (!flags.file) fail('--file required');
      if (flags.file === '-' && flags['original-file'] === '-') fail('stdin cannot supply both --file and --original-file');
      let patch; try { patch = JSON.parse(readText(flags.file)); } catch (e) { fail(`invalid patch JSON: ${e.message}`); }
      strictKeys(patch, editable.filter(k => k !== 'original'), 'patch');
      if (flags['original-file'] !== undefined) patch.original = readText(flags['original-file']);
      out = await store.update(pos[0], revision(), patch, { allowOriginal: flags['original-file'] !== undefined });
    }
    if (cmd === 'archive') out = await store.update(pos[0], revision(), { state: 'archived' });
    if (cmd === 'export') {
      if (flags.format && !['md', 'json'].includes(flags.format)) fail('format must be md or json');
      const i = store.show(pos[0]); out = flags.format === 'json' || json ? i : exportMarkdown(i);
    }
    console.log(json || typeof out !== 'string' ? JSON.stringify(out, null, 2) : out);
  } catch (e) {
    const error = { ok: false, code: ['invalid', 'not_found', 'conflict', 'locked', 'corrupt'].includes(e.code) ? e.code : 'internal', error: `${e.message} (root: ${store.root})`, ...(e.current ? { current: e.current } : {}) };
    if (json) console.log(JSON.stringify(error)); else console.error(error.error);
    process.exitCode = 1;
  }
}

// Snapshot data is a derivative: never pass the enriched object to the scan mirror.
export function renderSnapshot(app, css, ideasScript, data, ideasPayload) {
  const snapshot = ideasPayload === undefined ? data : { ...data, ideas: ideasPayload };
  const safe = JSON.stringify(snapshot, null, 2).replace(/</g, '\\u003c');
  return app.replace('<link rel="stylesheet" href="global.css">', () => `<style>\n${css}\n</style>`)
    .replace('<script src="ideas.js"></script>', () => `<script>\n${ideasScript.replace(/<\/script/gi, '<\\/script')}\n</script>`)
    .replace('<!--__DATA__-->', () => `<script>window.__DATA__ = ${safe};</script>`);
}
