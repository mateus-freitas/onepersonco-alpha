import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createIdeasStore, template, renderSnapshot, exportMarkdown } from './ideas.mjs';
import { allowedHost, allowedOrigin, ideaRequest, ideaErrorStatus } from './ideas-server.mjs';
const exec = promisify(execFile);
const hub = fileURLToPath(new URL('../../', import.meta.url));
function setup(t, opts = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opc-ideas-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, store: createIdeasStore({ root, ...opts }) };
}
const expectCode = (fn, code) => assert.rejects(fn, e => e.code === code);
const source = { id: 'S1', title: 'Synthetic source', url: null, publisher: 'Fixture', publishedAt: '2025-02', checkedAt: new Date().toISOString().slice(0, 10), note: 'Test only' };

test('defaults, exact original, revisions, retry fingerprint survives edits, archive', async t => {
  const { store } = setup(t);
  const input = { title: ' Synthetic idea ', original: '\uFEFFOlá\r\n  test\n', requestId: 'retry-1' };
  const { idea } = await store.add(input);
  assert.equal(idea.original, input.original); assert.equal(idea.title, 'Synthetic idea');
  assert.equal(idea.researchDate, null); assert.equal(idea.assessments.market.confidence, null);
  await store.update(idea.id, 1, { summary: 'Edited' });
  assert.equal((await store.add(input)).idea.summary, 'Edited');
  assert.equal((await store.add(input)).deduplicated, true);
  await assert.rejects(() => store.add({ ...input, title: 'Other' }), e => e.code === 'conflict' && e.current.revision === 2);
  await assert.rejects(() => store.update(idea.id, 1, {}), e => e.code === 'conflict' && e.current.summary === 'Edited');
  await store.update(idea.id, 2, { state: 'archived' });
  assert.equal(store.list().length, 0); assert.equal(store.list({ all: true }).length, 1);
  assert.equal((await store.add({ title: 'Second' })).idea.id, 'idea-2');
});

test('assessments stamp research dates, validate citations and preserve unknown/null', async t => {
  const { store, root } = setup(t); const { idea } = await store.add({ title: 'Synthetic research' });
  const a = { ...template().assessments.market, judgment: 'favorable', confidence: 'medium', reason: 'Synthetic reason', evidence: ['S1'] };
  await expectCode(() => store.update(idea.id, 1, { assessments: { market: a } }), 'invalid');
  const out = await store.update(idea.id, 1, { sources: [source], assessments: { market: a }, keywords: [{ term: 'synthetic', market: 'US', volume: null, difficulty: 0, checkedAt: source.checkedAt, sourceId: 'S1' }] });
  assert.equal(out.idea.researchDate, source.checkedAt); assert.equal(out.idea.keywords[0].volume, null);
  assert.equal(out.idea.assessments.market.assumption, false);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'ideas.json'))).ideas[0].researchDate, undefined);
  await expectCode(() => store.update(idea.id, 2, { sources: [] }), 'invalid');
  await expectCode(() => store.update(idea.id, 2, { assessments: { market: { ...a, evidence: [], confidence: 'high' } } }), 'invalid');
  await expectCode(() => store.update(idea.id, 2, { assessments: { market: { ...a, reviewedAt: source.checkedAt } } }), 'invalid');
  const assumption = await store.update(idea.id, 2, { assessments: { market: { ...a, evidence: [], confidence: 'low' } } });
  assert.equal(assumption.idea.assessments.market.assumption, true);
  assert.match(exportMarkdown(assumption.idea), /assumption/);
  const reset = await store.update(idea.id, 3, { assessments: { market: template().assessments.market } });
  assert.equal(reset.idea.researchDate, null);
});

test('strict validation, calendar dates, limits, server-owned fields', async t => {
  const { store } = setup(t); const { idea } = await store.add({ title: 'Validation fixture' });
  const invalid = [
    { title: '' }, { random: 1 }, { revision: 9 }, { original: 'overwritten' },
    { questions: Array(4).fill({ question: 'a', nextStep: '' }) },
    { sources: [{ ...source, publishedAt: '2025-02-29' }] },
    { sources: [{ ...source, checkedAt: '2026-02-30' }] },
    { sources: [{ ...source, checkedAt: '2999-01-01' }] },
    { sources: [{ ...source, url: 'javascript:alert(1)' }] },
    { sources: [source, source] }, { state: 'building' },
    { assessments: { market: { ...template().assessments.market, confidence: 'low' } } },
    { keywords: [{ term: 'a', market: 'US', volume: 101, difficulty: null, checkedAt: source.checkedAt, sourceId: 'S1' }] },
    { mvp: { unknown: 'x' } },
  ];
  for (const patch of invalid) await expectCode(() => store.update(idea.id, 1, patch), 'invalid');
  for (const revision of [0, -1, '1', 1.1, null]) await expectCode(() => store.update(idea.id, revision, {}), 'invalid');
  await expectCode(() => store.add({ title: 'bad', unknown: 1 }), 'invalid');
  const explicit = await store.update(idea.id, 1, { original: '\uFEFFnew\r\n' }, { allowOriginal: true });
  assert.equal(explicit.idea.original, '\uFEFFnew\r\n');
});

test('registry reread on changed links and entering building; historical dangling links persist', async t => {
  const { root } = setup(t); const registry = path.join(root, 'projects.json');
  const write = projects => fs.writeFileSync(registry, JSON.stringify(projects)); write([]);
  const store = createIdeasStore({ root, projects: () => JSON.parse(fs.readFileSync(registry)) });
  await expectCode(() => store.add({ title: 'Fixture', projectId: 'new' }), 'invalid');
  write([{ id: 'new', name: 'New' }]);
  const { idea } = await store.add({ title: 'Fixture', projectId: 'new' }); write([]);
  assert.equal(store.show(idea.id).projectId, 'new');
  await store.update(idea.id, 1, { summary: 'Unrelated' });
  await expectCode(() => store.update(idea.id, 2, { state: 'building' }), 'invalid');
  write([{ id: 'new', name: 'New' }]);
  await store.update(idea.id, 2, { state: 'building' }); write([]);
  await store.update(idea.id, 3, { summary: 'Historical building' });
});

test('corrupt primary fails closed, valid backup survives, invalid stored schema rejected', async t => {
  const { root, store } = setup(t);
  await store.add({ title: 'First' }); await store.add({ title: 'Second' });
  const file = path.join(root, 'ideas.json'), backup = fs.readFileSync(`${file}.bak`, 'utf8'), good = JSON.parse(fs.readFileSync(file));
  assert.equal(JSON.parse(backup).ideas.length, 1);
  for (const change of [s => { s.schemaVersion = 2; }, s => { s.nextId = 1; }, s => { s.ideas[0].createdAt = 'bad'; }, s => { s.ideas.push(s.ideas[0]); }, s => { s.ideas[0].assessments.market.evidence = ['S99']; }]) {
    const s = structuredClone(good); change(s); fs.writeFileSync(file, JSON.stringify(s));
    assert.throws(() => store.show('idea-1'), e => e.code === 'corrupt');
    await expectCode(() => store.add({ title: 'No write' }), 'corrupt');
    assert.equal(fs.readFileSync(`${file}.bak`, 'utf8'), backup);
  }
  fs.writeFileSync(file, '{'); await expectCode(() => store.add({ title: 'No write' }), 'corrupt');
  assert.equal(fs.readFileSync(file, 'utf8'), '{');
});

test('locks never stolen, regardless of age, PID or malformed contents', async t => {
  const { root, store } = setup(t, { lockTimeout: 60 });
  const lock = path.join(root, 'ideas.lock');
  for (const value of [JSON.stringify({ pid: process.pid, token: 'old' }), JSON.stringify({ pid: 99999999, token: 'dead' }), 'malformed']) {
    fs.writeFileSync(lock, value); fs.utimesSync(lock, new Date(0), new Date(0));
    await assert.rejects(() => store.add({ title: 'Blocked' }), e => e.code === 'locked' && e.message.includes(lock) && /Verify no writer/.test(e.message));
    assert.equal(fs.readFileSync(lock, 'utf8'), value);
  }
});

function cli(root, args, input) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, [path.join(hub, 'scripts/opc.mjs'), 'idea', ...args], { env: { ...process.env, OPC_IDEAS_ROOT: root } });
    let stdout = '', stderr = ''; p.stdout.on('data', d => stdout += d); p.stderr.on('data', d => stderr += d);
    p.on('close', code => resolve({ code, stdout, stderr })); p.stdin.end(input);
  });
}
test('CLI stdin byte exactness, template is editable, strict flags and JSON errors', async t => {
  const { root } = setup(t); const original = '\uFEFF  Synthetic português\r\n\n';
  const add = await cli(root, ['add', 'CLI fixture', '--text-file', '-', '--json'], original);
  assert.equal(add.code, 0); assert.equal(JSON.parse(add.stdout).idea.original, original);
  const templated = await cli(root, ['template', 'idea-1', '--json']); const patch = JSON.parse(templated.stdout);
  assert.equal('original' in patch, false); assert.equal('reviewedAt' in patch.assessments.market, false);
  patch.summary = 'CLI edit';
  const update = await cli(root, ['update', 'idea-1', '--revision', '1', '--file', '-', '--json'], JSON.stringify(patch));
  assert.equal(update.code, 0); assert.equal(JSON.parse(update.stdout).idea.summary, 'CLI edit');
  for (const args of [ ['show', 'idea-1', '--typo'], ['show', 'idea-1', 'extra'], ['list', '--state'], ['archive', 'idea-1', '--revision', '1x'], ['update', 'idea-1', '--revision', '2', '--file', '-', '--original-file', '-'] ]) {
    const out = await cli(root, [...args, '--json'], '{}'); assert.equal(out.code, 1); assert.equal(JSON.parse(out.stdout).ok, false); assert.equal(out.stderr, '');
  }
  const protectedOut = await cli(root, ['update', 'idea-1', '--revision', '2', '--file', '-', '--json'], '{"original":"lost"}');
  assert.equal(JSON.parse(protectedOut.stdout).code, 'invalid');
  const badUtf = await cli(root, ['add', 'Bad UTF8', '--text-file', '-', '--json'], Buffer.from([0xff])); assert.equal(badUtf.code, 1);
  const help = await cli(root, ['--help', '--json']); assert.match(JSON.parse(help.stdout).help, /Rubric/); assert.match(help.stdout, new RegExp(root));
  const relative = await cli('relative-root', ['list', '--json']); assert.equal(relative.code, 1); assert.equal(JSON.parse(relative.stdout).code, 'invalid');
});

test('independent CLI processes serialize writers and revision contenders', async t => {
  const { root, store } = setup(t);
  const results = await Promise.all(Array.from({ length: 8 }, (_, n) => cli(root, ['add', `Concurrent ${n}`, '--json'])));
  assert.ok(results.every(r => r.code === 0)); assert.equal(new Set(store.list().map(i => i.id)).size, 8);
  const contenders = await Promise.all([cli(root, ['update', 'idea-1', '--revision', '1', '--file', '-', '--json'], '{"summary":"A"}'), cli(root, ['update', 'idea-1', '--revision', '1', '--file', '-', '--json'], '{"summary":"B"}')]);
  assert.deepEqual(contenders.map(r => r.code).sort(), [0, 1]); assert.equal(JSON.parse(contenders.find(r => r.code).stdout).code, 'conflict');
});

test('Host/Origin guard refuses hostile names, ports, origins including LAN', () => {
  for (const lan of [false, true]) {
    for (const host of ['evil.example:4770', 'localhost.evil:4770', 'computer.local:4770', 'machine.ts.net:4770', '127.1:4770', '2130706433:4770', 'localhost:9999', 'localhost:04770', 'user@localhost:4770', 'localhost:4770/path', '[::ffff:127.0.0.1]:4770', '8.8.8.8:4770', '192.168.999.1:4770']) assert.equal(allowedHost(host, 4770, lan), false, host);
    for (const host of ['localhost:4770', '127.0.0.1:4770', '[::1]:4770']) {
      assert.equal(allowedHost(host, 4770, lan), true); assert.equal(allowedOrigin(`http://${host}`, host, 4770, lan), true);
      for (const origin of ['null', 'https://' + host, 'http://evil.example:4770', 'http://localhost:9999', 'http://' + host + '/']) assert.equal(allowedOrigin(origin, host, 4770, lan), false);
      assert.equal(allowedOrigin(undefined, host, 4770, lan), true);
    }
  }
  for (const host of ['192.168.1.4:4770', '10.0.0.2:4770', '172.16.2.1:4770', '100.64.0.1:4770']) {
    assert.equal(allowedHost(host, 4770, false), false); assert.equal(allowedHost(host, 4770, true), true); assert.equal(allowedOrigin(`http://${host}`, host, 4770, true), true);
  }
});

test('HTTP contract strict body, canonical records, typed status, explicit original allowed', async t => {
  const { store } = setup(t);
  await expectCode(() => ideaRequest(store, '/idea/add', { title: 'Fixture' }), 'invalid');
  const result = await ideaRequest(store, '/idea/add', { title: 'Fixture', requestId: 'http-1' });
  assert.equal(result.idea.id, 'idea-1'); assert.equal(result.data, undefined);
  const update = await ideaRequest(store, '/idea/update', { id: 'idea-1', revision: 1, patch: { original: 'explicit UI edit' } });
  assert.equal(update.idea.original, 'explicit UI edit');
  await expectCode(() => ideaRequest(store, '/idea/update', { id: 'idea-1', revision: 2, patch: {}, path: '/bad' }), 'invalid');
  assert.equal(store.payload().dimensions.length, 7); assert.equal(store.payload().projects.length, 0);
  for (const [code, status] of Object.entries({ invalid: 400, not_found: 404, conflict: 409, locked: 503, corrupt: 500 })) assert.equal(ideaErrorStatus({ code }), status);
});

test('snapshot opt-in privacy, immutable mirror, literal replacement metacharacters and script escaping', () => {
  const app = '<link rel="stylesheet" href="global.css"><!--__DATA__--><script src="ideas.js"></script>';
  const data = { projects: [] }, payload = { ideas: [{ original: "</script><script>alert(1)</script>$&$`$'" }] };
  const js = 'const literal = "$&$`$\'";';
  const plain = renderSnapshot(app, '/* $& */', js, data);
  assert.ok(!plain.includes('original')); assert.ok(!plain.includes('src="ideas.js"')); assert.ok(plain.includes(js)); assert.ok(plain.includes('/* $& */'));
  const included = renderSnapshot(app, '', js, data, payload);
  assert.ok(included.includes('\\u003c/script>')); assert.ok(included.includes("$&$`$'")); assert.equal(data.ideas, undefined);
});

test('fixture console integration: guarded routes, JSON MIME, independent ideas, scan privacy', async t => {
  const { root } = setup(t);
  const fixture = path.join(root, 'hub'); fs.mkdirSync(path.join(fixture, 'console'), { recursive: true });
  fs.cpSync(path.join(hub, 'scripts'), path.join(fixture, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(fixture, 'projects.json'), JSON.stringify({ org: 'Fixture', scratchRoot: root, projects: [] }));
  fs.writeFileSync(path.join(fixture, 'console', 'app.html'), '<link rel="stylesheet" href="global.css"><!--__DATA__--><script src="ideas.js"></script>');
  fs.writeFileSync(path.join(fixture, 'console', 'global.css'), '/* $& */');
  fs.writeFileSync(path.join(fixture, 'console', 'ideas.js'), 'window.fixture = "$&";');
  const env = { ...process.env, OPC_IDEAS_ROOT: path.join(root, 'store') };
  const opc = path.join(fixture, 'scripts', 'opc.mjs');
  const http = await import('node:http');
  const reservation = http.createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, [opc, 'console', '--port', String(port), '--lan'], { env, cwd: fixture });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('fixture server startup timed out')), 5000);
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`fixture server exit ${code}`)); });
    child.stdout.on('data', d => { if (d.toString().includes('opc console →')) { clearTimeout(timer); resolve(); } });
    child.stderr.on('data', d => { clearTimeout(timer); reject(new Error(d.toString())); });
  });
  const request = (route, { method = 'GET', host = `localhost:${port}`, origin, body, contentType } = {}) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: route, method, headers: { host, ...(origin === undefined ? {} : { origin }), ...(contentType ? { 'content-type': contentType } : {}) } }, res => {
      let text = ''; res.on('data', d => text += d); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
    }); req.on('error', reject); req.end(body);
  });
  for (const route of ['/', '/data.json', '/ideas.json', '/ideas.js', '/open?path=/tmp']) assert.equal((await request(route, { host: `evil.example:${port}` })).status, 403);
  assert.equal((await request('/ideas.json', { origin: `http://evil.example:${port}` })).status, 403);
  assert.equal((await request('/ideas.json', { host: `192.168.1.5:${port}`, origin: `http://192.168.1.5:${port}` })).status, 200);
  assert.match((await request('/ideas.js')).headers['content-type'], /^text\/javascript/);
  assert.equal((await request('/idea/add', { method: 'POST', body: '{}' })).status, 400);
  const badUTF8 = Buffer.concat([Buffer.from('{"title":"'),Buffer.from([255]),Buffer.from('","requestId":"bad-utf8"}')]);
  assert.equal((await request('/idea/add',{method:'POST',contentType:'application/json',body:badUTF8})).status,400);
  const added = await request('/idea/add', { method: 'POST', contentType: 'application/json', body: JSON.stringify({ title: 'Synthetic HTTP', original: "</script>$&$'", requestId: 'integration-1' }) });
  assert.equal(added.status, 200); assert.equal(JSON.parse(added.text).idea.id, 'idea-1');
  const mirror = path.join(fixture, 'console', 'data.json'); assert.equal(fs.existsSync(mirror), false, 'idea writes must not scan');
  const read = await request('/ideas.json'); assert.equal(JSON.parse(read.text).ideas.length, 1); assert.equal(fs.existsSync(mirror), false);
  await request('/data.json'); assert.equal('ideas' in JSON.parse(fs.readFileSync(mirror)), false);
  const conflict = await request('/idea/update', { method: 'POST', contentType: 'application/json', body: JSON.stringify({ id: 'idea-1', revision: 5, patch: { summary: 'test' } }) });
  assert.equal(conflict.status, 409); assert.equal(JSON.parse(conflict.text).current.revision, 1);
  const taskOrigin = await request('/task/add', { method: 'POST', origin: `http://evil.example:${port}`, body: '{}' }); assert.equal(taskOrigin.status, 403);
  await exec(process.execPath, [opc, 'scan', '--snapshot'], { env, cwd: fixture });
  assert.equal(fs.readFileSync(path.join(fixture, 'console', 'snapshot.html'), 'utf8').includes('Synthetic HTTP'), false);
  await exec(process.execPath, [opc, 'scan', '--snapshot', '--ideas'], { env, cwd: fixture });
  const snapshot = fs.readFileSync(path.join(fixture, 'console', 'snapshot.html'), 'utf8');
  assert.ok(snapshot.includes('Synthetic HTTP')); assert.ok(snapshot.includes('\\u003c/script>')); assert.ok(snapshot.includes('window.fixture = "$&";'));
  assert.equal('ideas' in JSON.parse(fs.readFileSync(mirror)), false);
  await assert.rejects(() => exec(process.execPath, [opc, 'scan', '--ideas'], { env, cwd: fixture }));
  fs.writeFileSync(path.join(env.OPC_IDEAS_ROOT, 'ideas.json'), '{');
  const corrupt = await request('/ideas.json'); assert.equal(corrupt.status, 500); assert.equal(JSON.parse(corrupt.text).code, 'corrupt');
  await new Promise(resolve => { child.once('exit', resolve); child.kill(); });
});

test('ownership fence refuses commit and never removes a replacement lock', async t => {
  const { root } = setup(t); const lock = path.join(root, 'ideas.lock');
  const replacement = JSON.stringify({ pid: process.pid, token: 'different-owner' });
  const store = createIdeasStore({ root, projects: () => { fs.writeFileSync(lock, replacement); return [{ id: 'fixture', name: 'Fixture' }]; } });
  await expectCode(() => store.add({ title: 'Fenced', projectId: 'fixture' }), 'locked');
  assert.equal(fs.existsSync(path.join(root, 'ideas.json')), false);
  assert.equal(fs.readFileSync(lock, 'utf8'), replacement);
});

test('missing primary with backup and invalid UTF8 fail closed', async t => {
  const { root, store } = setup(t);
  await store.add({ title: 'First' }); await store.add({ title: 'Second' });
  const file = path.join(root, 'ideas.json'); fs.unlinkSync(file);
  await expectCode(() => store.add({ title: 'Must not reuse IDs' }), 'corrupt');
  assert.equal(fs.existsSync(file), false);
  fs.writeFileSync(file, Buffer.from([0xff])); assert.throws(() => store.list(), e => e.code === 'corrupt');
});

test('prose-only edits keep reviewedAt; CLI explicit original-file supports stdin', async t => {
  const { root, store } = setup(t);
  await store.add({ title: 'Prose date fixture' });
  const a = { ...template().assessments.market, judgment: 'mixed', confidence: 'low', reason: 'Synthetic assumption' };
  await store.update('idea-1', 1, { assessments: { market: a } });
  const file = path.join(root, 'ideas.json'), s = JSON.parse(fs.readFileSync(file));
  s.ideas[0].assessments.market.reviewedAt = '2020-02-29'; fs.writeFileSync(file, JSON.stringify(s));
  const updated = await store.update('idea-1', 2, { assessments: { market: { ...a, rationale: 'Prose only' } } });
  assert.equal(updated.idea.researchDate, '2020-02-29');
  const patchFile = path.join(root, 'patch.json'); fs.writeFileSync(patchFile, '{}');
  const original = '\uFEFF\r\nExplicit original\n';
  const out = await cli(root, ['update', 'idea-1', '--revision', '3', '--file', patchFile, '--original-file', '-', '--json'], original);
  assert.equal(out.code, 0); assert.equal(JSON.parse(out.stdout).idea.original, original);
});

test('content search excludes schema keys; trimmed titles and bare JSON help', async t => {
  const {root,store}=setup(t);
  await store.add({title:'  '+ 'a'.repeat(198)+'  ',original:'Unique narrative'});
  assert.equal(store.list({search:'market'}).length,0);
  assert.equal(store.list({search:'narrative'}).length,1);
  const out=await cli(root,['--json']);assert.equal(out.code,0);assert.equal(JSON.parse(out.stdout).ok,true);
});

test('stored calendar dates survive a backwards clock; new future evidence is refused',async t=>{
  const {root,store}=setup(t);await store.add({title:'Date fixture'});
  const file=path.join(root,'ideas.json'),data=JSON.parse(fs.readFileSync(file));
  data.ideas[0].sources=[{...source,checkedAt:'2099-01-01'}];
  data.ideas[0].assessments.market.reviewedAt='2099-01-01';
  fs.writeFileSync(file,JSON.stringify(data));
  assert.equal(store.show('idea-1').researchDate,'2099-01-01');
  await store.update('idea-1',1,{summary:'Unrelated edit'});
  await expectCode(()=>store.update('idea-1',2,{sources:[{...source,checkedAt:'2099-01-02'}]}),'invalid');
});

test('failed lock initialization cleans up only the newly acquired lock',async t=>{
  const {root,store}=setup(t);const write=fs.writeFileSync;
  const mocked=t.mock.method(fs,'writeFileSync',function(...args){
    if(typeof args[0]==='number'){mocked.mock.restore();throw Object.assign(new Error('Synthetic disk full'),{code:'ENOSPC'});}
    return write.apply(this,args);
  });
  await assert.rejects(()=>store.add({title:'Not persisted'}),e=>e.code==='ENOSPC');
  assert.equal(fs.existsSync(path.join(root,'ideas.lock')),false);
  assert.equal((await store.add({title:'Retry'})).idea.id,'idea-1');
});
