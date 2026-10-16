#!/usr/bin/env node
// opc — the One Person Company CLI (alpha): sync · check · scan · console
//
// sync   compose standards fragments (core + matching platforms) into standardized projects
// check  deterministic health checks for every registered project
// scan   write console/data.json (+ --snapshot for a self-contained page)
// console serve the local console; /data.json rescans on every load

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(fs.readFileSync(path.join(HUB, "projects.json"), "utf8"));
const coreDir = path.join(HUB, "standards", "core");
const platformsDir = path.join(HUB, "standards", "platforms");
const consoleDir = path.join(HUB, "console");

const expand = (p) => (p.startsWith("~/") ? path.join(os.homedir(), p.slice(2)) : path.resolve(p));
const SECTIONS = ["Now", "Next", "Later", "Done"];

// ---------------------------------------------------------------- target

// A checkout of a registered project = any git worktree that shares its repo's
// --git-common-dir with the registered path (symlinks resolved). Sync/check
// target the checkout you run them from; only the hub's own main checkout keeps
// the control-room behavior (all registered mains). --dir and project names
// override the CWD.

const real = (p) => {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
};

function branchOf(dir) {
  const head = git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!head) return "?";
  return head === "HEAD" ? `detached ${git(dir, ["rev-parse", "--short", "HEAD"]) || "?"}` : head;
}

// the hub repo's main checkout, whoever is running and wherever from
function hubMainRoot() {
  const common = git(HUB, ["rev-parse", "--git-common-dir"]);
  return common === null ? real(HUB) : path.dirname(real(path.resolve(HUB, common)));
}

function detectCheckout(dir) {
  const top = git(dir, ["rev-parse", "--show-toplevel"]);
  if (top === null) return null; // not a work tree (e.g. inside a git admin dir)
  const common = git(dir, ["rev-parse", "--git-common-dir"]);
  for (const project of registry.projects) {
    const main = expand(project.path);
    const mainCommon = git(main, ["rev-parse", "--git-common-dir"]);
    const hit = common !== null && mainCommon !== null
      ? real(path.resolve(dir, common)) === real(path.resolve(main, mainCommon))
      : real(top) === real(main);
    if (hit) return { project, dir: top, branch: branchOf(top) };
  }
  return null;
}

function parseDirArg(args) {
  const eq = args.find((a) => a.startsWith("--dir="));
  if (eq !== undefined) throw new Error(`unsupported "${eq}" — use --dir <checkout>`);
  const i = args.indexOf("--dir");
  if (i === -1) return { dir: null, rest: args };
  const value = args[i + 1];
  if (value === undefined || value.startsWith("-") || args.indexOf("--dir", i + 1) !== -1)
    throw new Error("--dir requires a checkout path");
  return { dir: value, rest: args.filter((_, j) => j !== i && j !== i + 1) };
}

function resolveDirTarget(raw) {
  const dir = expand(raw);
  if (!fs.existsSync(dir)) throw new Error(`--dir ${dir}: path does not exist`);
  const checkout = detectCheckout(dir);
  if (!checkout) throw new Error(`--dir ${dir}: not a git checkout of a registered project`);
  return checkout;
}

// the checkout containing the CWD; null = control-room mode (hub main or outside)
function cwdCheckout() {
  const checkout = detectCheckout(process.cwd());
  return checkout && real(checkout.dir) !== hubMainRoot() ? checkout : null;
}

// ---------------------------------------------------------------- sync

function readFragments(dir, label) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const m = raw.match(/^<!-- opc-(block|file): ([^\s]+) -->\n/);
      if (!m) throw new Error(`standards/${label}/${file}: missing first-line opc marker`);
      let rest = raw.slice(m[0].length);
      const stackM = rest.match(/^<!-- opc-stack: ([^>]+) -->\n/);
      if (stackM) rest = rest.slice(stackM[0].length);
      return {
        file,
        kind: m[1],
        target: m[2],
        stack: stackM ? stackM[1].trim().split(/\s+/).filter(Boolean) : [],
        body: rest.replace(/^\n+/, "").replace(/\n*$/, "\n"),
      };
    });
}

function loadFragments() {
  return readFragments(coreDir, "core");
}

// core fragments always apply; a platform fragment applies when every token of
// its second-line `opc-stack` marker is present in the project's stack
function loadProjectFragments(project) {
  const stack = new Set(project.stack || []);
  const platform = readFragments(platformsDir, "platforms").map((f) => {
    if (!f.stack.length) throw new Error(`standards/platforms/${f.file}: missing second-line opc-stack marker`);
    return f;
  });
  return [...loadFragments(), ...platform.filter((f) => f.stack.every((token) => stack.has(token)))];
}

function composeBlock(projectDir, name, body) {
  const rel = "AGENTS.md";
  const file = path.join(projectDir, rel);
  const src = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  const m = src && src.match(new RegExp(`(<!-- opc:begin ${name} -->\\n)[\\s\\S]*?(<!-- opc:end ${name} -->)`));
  return {
    kind: "block",
    file: rel,
    current: m ? m[0] : null,
    expected: m ? m[1] + "\n" + body + m[2] : null,
  };
}

function composeFile(projectDir, rel, body, fragmentFile) {
  const banner =
    `<!-- generated by opc sync from onepersonco-alpha/standards/core/${fragmentFile} ` +
    `— do not edit; edit the fragment and re-run ` + "`opc sync` -->";
  const file = path.join(projectDir, rel);
  return {
    kind: "file",
    file: rel,
    current: fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null,
    expected: `${banner}\n\n${body}`,
  };
}

// the expected state of every managed target, without writing anything
function composeProject(dir, fragments) {
  return fragments.map((f) =>
    f.kind === "block" ? composeBlock(dir, f.target, f.body) : composeFile(dir, f.target, f.body, f.file));
}

function syncBlock(projectDir, name, body) {
  const src = fs.readFileSync(path.join(projectDir, "AGENTS.md"), "utf8");
  const { current, expected } = composeBlock(projectDir, name, body);
  if (current === null) return "missing";
  if (current === expected) return false;
  fs.writeFileSync(path.join(projectDir, "AGENTS.md"), src.replace(current, () => expected));
  return true;
}

function syncFile(projectDir, rel, body, fragmentFile) {
  const { current, expected } = composeFile(projectDir, rel, body, fragmentFile);
  if (current === expected) return false;
  const dest = path.join(projectDir, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, expected);
  return true;
}

function syncCheckout(project, dir, branch) {
  if (!project.standardized) {
    console.log(`${project.id} @ ${dir} (${branch}): pending retrofit (skipped)`);
    return 0;
  }
  if (!fs.existsSync(dir)) throw new Error(`${project.id}: path does not exist: ${dir}`);
  const fragments = loadProjectFragments(project);
  const updated = [];
  const missing = [];
  for (const f of fragments) {
    const result = f.kind === "block" ? syncBlock(dir, f.target, f.body) : syncFile(dir, f.target, f.body, f.file);
    if (result === true) updated.push(`${f.kind} ${f.target}`);
    if (result === "missing") missing.push(f.target);
  }
  const note = missing.length ? ` — MISSING markers: ${missing.join(", ")}` : "";
  console.log(`${project.id} @ ${dir} (${branch}): ${updated.length ? "updated " + updated.join("; ") : "up to date"}${note}`);
  return updated.length;
}

function cmdSync(args = []) {
  const { dir: dirArg, rest } = parseDirArg(args);
  const only = rest.filter((a) => !a.startsWith("-"));
  const known = registry.projects.map((p) => p.id);
  const unknown = only.find((id) => !known.includes(id));
  if (unknown) throw new Error(`unknown project: ${unknown} (known: ${known.join(", ")})`);

  let changes = 0;
  if (dirArg) {
    const checkout = resolveDirTarget(dirArg);
    if (only.length && !only.includes(checkout.project.id))
      throw new Error(`--dir targets ${checkout.project.id}; named project(s): ${only.join(", ")}`);
    changes += syncCheckout(checkout.project, checkout.dir, checkout.branch);
  } else if (only.length) {
    for (const project of registry.projects) {
      if (!only.includes(project.id)) continue;
      const dir = expand(project.path);
      changes += syncCheckout(project, dir, branchOf(dir));
    }
  } else {
    const checkout = cwdCheckout();
    if (checkout) {
      changes += syncCheckout(checkout.project, checkout.dir, checkout.branch);
    } else {
      for (const project of registry.projects) {
        const dir = expand(project.path);
        changes += syncCheckout(project, dir, branchOf(dir));
      }
    }
  }
  console.log(changes ? `sync done — ${changes} update(s)` : "sync done — everything up to date");
}

// ---------------------------------------------------------------- scan

function git(dir, args) {
  const r = spawnSync("git", ["-C", dir, ...args], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.replace(/\n$/, "") : null;
}

function parseBacklog(file) {
  if (!fs.existsSync(file)) return null;
  const sections = { Now: [], Next: [], Later: [], Done: [] };
  let current = null;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      current = SECTIONS.find((s) => h[1].trim().toLowerCase().startsWith(s.toLowerCase())) || null;
      continue;
    }
    if (!current) continue;
    const item = line.match(/^-\s+\[( |x|X)\]\s+(.+)$/);
    if (!item) continue;
    let rest = item[2].trim();
    let spec = null;
    let priority = null;
    let date = null;
    const specM = rest.match(/\s+—\s+spec:\s+(\S+)/);
    if (specM) { spec = specM[1]; rest = rest.replace(specM[0], ""); }
    const priM = rest.match(/\s+—\s+(p[0-3]|P[0-3])\s*$/);
    if (priM) { priority = priM[1].toLowerCase(); rest = rest.replace(priM[0], ""); }
    const dateM = rest.match(/\s+—\s+(\d{4}-\d{2}-\d{2})\s*$/);
    if (dateM) { date = dateM[1]; rest = rest.replace(dateM[0], ""); }
    sections[current].push({
      title: rest.trim(),
      spec,
      priority,
      date,
      checked: item[1].toLowerCase() === "x",
    });
  }
  return sections;
}

function parseDocHeader(file) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---", 4);
  if (end === -1) return null;
  const header = {};
  for (const line of text.slice(4, end).split("\n")) {
    const m = line.match(/^([A-Za-z_]+):\s*(.+?)\s*$/);
    if (m) header[m[1].toLowerCase()] = m[2];
  }
  const titleM = text.match(/^#\s+(.+)$/m);
  return { ...header, title: titleM ? titleM[1].trim() : path.basename(file, ".md") };
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function listPromptSessions(scratchRoot, id) {
  const dir = path.join(expand(scratchRoot), id, "prompts");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => {
      const full = path.join(dir, e.name);
      const files = fs.readdirSync(full).filter((f) => !f.startsWith(".")).length;
      const dateM = e.name.match(/^(\d{4}-\d{2}-\d{2})/);
      return {
        name: e.name,
        path: full,
        date: dateM ? dateM[1] : null,
        files,
        mtime: fs.statSync(full).mtime.toISOString().slice(0, 10),
      };
    })
    .sort((a, b) => (b.mtime || "").localeCompare(a.mtime || ""));
}

function scanProject(p) {
  const dir = expand(p.path);
  const exists = fs.existsSync(dir);
  const docsDir = path.join(dir, p.docs || "docs");
  const entry = {
    id: p.id,
    name: p.name,
    path: dir,
    standardized: !!p.standardized,
    exists,
    branch: exists ? git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]) : null,
    lastCommit: exists ? git(dir, ["log", "-1", "--format=%cs %s"]) : null,
    dirty: exists ? (git(dir, ["status", "--porcelain"]) || "").split("\n").filter(Boolean).length : 0,
    backlog: null,
    docs: [],
    promptSessions: [],
    legacyPromptFiles: 0,
  };
  if (!exists) return entry;
  entry.backlog = parseBacklog(path.join(docsDir, "backlog.md"));
  if (fs.existsSync(docsDir)) {
    for (const f of walk(docsDir)) {
      if (f.includes(`${path.sep}prompts${path.sep}`)) {
        entry.legacyPromptFiles++;
        continue;
      }
      const header = parseDocHeader(f);
      if (header) entry.docs.push({ file: path.relative(dir, f), ...header });
    }
  }
  entry.promptSessions = listPromptSessions(registry.scratchRoot, p.id);
  return entry;
}

function scanAll() {
  const { health, perProject } = checkAll();
  const projects = registry.projects.map((p) => {
    const entry = scanProject(p);
    entry.health = perProject.get(p.id);
    return entry;
  });
  return {
    generatedAt: new Date().toISOString(),
    org: registry.org,
    scratchRoot: registry.scratchRoot,
    home: os.homedir(),
    health,
    projects,
  };
}

function cmdScan(args) {
  const data = scanAll();
  fs.mkdirSync(consoleDir, { recursive: true });
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(path.join(consoleDir, "data.json"), json);
  const lines = data.projects.reduce((n, p) => {
    if (!p.backlog) return n;
    return n + SECTIONS.reduce((m, s) => m + p.backlog[s].length, 0);
  }, 0);
  console.log(`console/data.json written — ${data.projects.length} project(s), ${lines} backlog line(s)`);
  if (args.includes("--snapshot")) {
    const css = fs.readFileSync(path.join(consoleDir, "global.css"), "utf8");
    const app = fs
      .readFileSync(path.join(consoleDir, "app.html"), "utf8")
      .replace('<link rel="stylesheet" href="global.css">', `<style>\n${css}\n</style>`);
    const safe = json.replace(/</g, "\\u003c");
    const injected = app.replace("<!--__DATA__-->", `<script>window.__DATA__ = ${safe};</` + `script>`);
    fs.writeFileSync(path.join(consoleDir, "snapshot.html"), injected);
    console.log("console/snapshot.html written — self-contained page");
  }
}

// ---------------------------------------------------------------- check

// Deterministic findings for every registered project — no network, no AI.
// The same health object powers `opc check`, scan's data.health and the console.

const DOC_TYPES = ["rfc", "adr", "plan", "internals", "evidence", "guide"];
const DOC_STATUSES = ["draft", "review", "accepted", "done"];

function countText(n, noun) {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function healthOf(findings, checkedAt) {
  const count = (level) => findings.filter((f) => f.level === level).length;
  return {
    checkedAt,
    ok: count("error") === 0,
    errors: count("error"),
    warnings: count("warning"),
    infos: count("info"),
    findings,
  };
}

function healthCounts(h) {
  return `${countText(h.errors, "error")}, ${countText(h.warnings, "warning")}, ${h.infos} info`;
}

function countFiles(dir) {
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    n += entry.isDirectory() ? countFiles(path.join(dir, entry.name)) : 1;
  }
  return n;
}

function checkBacklog(p, dir, add) {
  const docsDir = path.join(dir, p.docs || "docs");
  const file = path.join(docsDir, "backlog.md");
  if (!fs.existsSync(file)) {
    if (!p.standardized) add("info", "backlog.missing", "no docs/backlog.md");
    return;
  }
  const rel = path.relative(dir, file);
  const counts = Object.fromEntries(SECTIONS.map((s) => [s, 0]));
  const malformed = [];
  let current = null;
  fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      current = SECTIONS.find((s) => h[1].trim().toLowerCase().startsWith(s.toLowerCase())) || null;
      if (current) counts[current]++;
      return;
    }
    if (current && line.startsWith("- [") && !/^- \[( |x|X)\] .+$/.test(line)) malformed.push(i + 1);
  });
  for (const s of SECTIONS) {
    if (!counts[s]) add("error", "backlog.sections", `missing heading "## ${s}"`, rel);
    else if (counts[s] > 1) add("error", "backlog.sections", `duplicate heading "## ${s}" (${counts[s]})`, rel);
  }
  for (const line of malformed) add("error", "backlog.line", `line ${line}: malformed task line (expected \`- [ ] Title\`)`, rel);
  const backlog = parseBacklog(file);
  for (const s of ["Now", "Next", "Later"]) {
    for (const item of backlog[s]) {
      if (item.checked) add("warning", "backlog.finished-in-lane", `checked item in ${s}: ${item.title}`, rel);
    }
  }
  for (const s of SECTIONS) {
    for (const item of backlog[s]) {
      if (!item.spec) continue;
      const target = item.spec.startsWith("~/") ? expand(item.spec) : path.resolve(dir, item.spec);
      if (!fs.existsSync(target)) add("error", "backlog.spec", `spec does not resolve: ${item.spec}`, rel);
    }
  }
}

function checkProject(p, fragments, dir = expand(p.path)) {
  const findings = [];
  const add = (level, code, message, file) => {
    const finding = { project: p.id, level, code, message };
    if (file) finding.file = file;
    findings.push(finding);
  };
  if (!fs.existsSync(dir)) {
    add("error", "path.missing", `registered path does not exist: ${dir}`);
    return findings;
  }

  if (p.standardized) {
    const agents = path.join(dir, "AGENTS.md");
    const hasAgents = fs.existsSync(agents);
    if (!hasAgents) add("error", "agents.missing", "AGENTS.md missing", "AGENTS.md");

    const drift = new Set();
    const composed = composeProject(dir, fragments);
    fragments.forEach((f, i) => {
      const c = composed[i];
      if (f.kind === "block") {
        if (!hasAgents) return;
        if (c.current === null) add("error", "markers.missing", `missing AGENTS.md marker pair for "${f.target}"`, c.file);
        else if (c.current !== c.expected) drift.add(c.file);
      } else if (c.current !== c.expected) {
        drift.add(c.file);
      }
    });
    for (const file of drift) add("error", "sync.drift", "drift — run `opc sync`", file);

    const claude = path.join(dir, "CLAUDE.md");
    if (!fs.existsSync(claude) || !fs.readFileSync(claude, "utf8").trim())
      add("warning", "claude.pointer", "CLAUDE.md missing or empty", "CLAUDE.md");

    const scratch = path.join(expand(registry.scratchRoot), p.id);
    if (!fs.existsSync(scratch))
      add("warning", "scratch.missing", `scratch folder missing: ${path.join(registry.scratchRoot, p.id)}`);
  }

  checkBacklog(p, dir, add);

  const docsDir = path.join(dir, p.docs || "docs");
  if (fs.existsSync(docsDir)) {
    for (const f of walk(docsDir)) {
      if (f.includes(`${path.sep}prompts${path.sep}`)) continue;
      const header = parseDocHeader(f);
      if (!header) continue;
      const rel = path.relative(dir, f);
      if (header.type && !DOC_TYPES.includes(header.type))
        add("warning", "doc.header", `unknown type "${header.type}"`, rel);
      if (header.status && !DOC_STATUSES.includes(header.status))
        add("warning", "doc.header", `unknown status "${header.status}"`, rel);
      if (header.date && !/^\d{4}-\d{2}-\d{2}$/.test(header.date))
        add("warning", "doc.header", `bad date "${header.date}" — expected YYYY-MM-DD`, rel);
    }
    const prompts = path.join(docsDir, "prompts");
    if (fs.existsSync(prompts)) {
      const files = countFiles(prompts);
      if (files) add("info", "legacy.prompts", `docs/prompts/ holds ${files} file(s) — move to scratch`, path.relative(dir, prompts));
    }
  }

  if (!p.standardized) add("info", "retrofit.pending", "not standardized — retrofit pending");
  return findings;
}

function checkAll() {
  const checkedAt = new Date().toISOString();
  const findings = [];
  const perProject = new Map();
  for (const p of registry.projects) {
    const list = checkProject(p, loadProjectFragments(p));
    findings.push(...list);
    perProject.set(p.id, healthOf(list, checkedAt));
  }
  return { health: healthOf(findings, checkedAt), perProject };
}

function cmdCheck(args) {
  const { dir: dirArg, rest } = parseDirArg(args);
  const json = rest.includes("--json");
  const target = dirArg ? resolveDirTarget(dirArg) : cwdCheckout();
  const checkedAt = new Date().toISOString();

  let health;
  const rows = [];
  if (target) {
    const findings = checkProject(target.project, loadProjectFragments(target.project), target.dir);
    health = healthOf(findings, checkedAt);
    rows.push({ project: target.project, dir: target.dir, branch: target.branch, findings });
  } else {
    const all = checkAll();
    health = all.health;
    for (const p of registry.projects) {
      const dir = expand(p.path);
      rows.push({ project: p, dir, branch: branchOf(dir), findings: all.perProject.get(p.id).findings });
    }
  }

  if (json) {
    console.log(JSON.stringify({ target: target ? { id: target.project.id, dir: target.dir, branch: target.branch } : null, ...health }));
    process.exitCode = health.errors > 0 ? 1 : 0;
    return;
  }
  for (const row of rows) {
    const n = (level) => row.findings.filter((f) => f.level === level).length;
    const counts = [];
    if (n("error")) counts.push(countText(n("error"), "error"));
    if (n("warning")) counts.push(countText(n("warning"), "warning"));
    if (n("info")) counts.push(`${n("info")} info`);
    console.log(`${row.project.id} @ ${row.dir} (${row.branch}) ${n("error") ? "✖" : "✔"} ${counts.length ? counts.join(", ") : "clean"}`);
    for (const f of row.findings) {
      const glyph = f.level === "error" ? "✖" : f.level === "warning" ? "!" : "·";
      console.log(`  ${glyph} [${f.code}] ${f.message}${f.file ? ` (${f.file})` : ""}`);
    }
  }
  console.log(`opc check — ${healthCounts(health)}`);
  process.exitCode = health.errors > 0 ? 1 : 0;
}

// ---------------------------------------------------------------- console

function cmdConsole(args) {
  const portIdx = args.indexOf("--port");
  const port = portIdx >= 0 ? Number(args[portIdx + 1]) : 4770;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const name = url.pathname === "/" ? "app.html" : url.pathname.replace(/^\/+/, "");
    if (name === "app.html" || name === "index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(fs.readFileSync(path.join(consoleDir, "app.html"), "utf8"));
    }
    if (name === "data.json") {
      const data = scanAll();
      fs.writeFileSync(path.join(consoleDir, "data.json"), JSON.stringify(data, null, 2));
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify(data));
    }
    if (name === "open") {
      // Local convenience: hand an allowlisted path to the OS opener.
      const raw = url.searchParams.get("path") || "";
      if (!raw) { res.writeHead(400); return res.end("missing path"); }
      const target = raw.startsWith("~/") ? path.join(os.homedir(), raw.slice(2)) : path.resolve(raw);
      if (!fs.existsSync(target)) { res.writeHead(404); return res.end("not found"); }
      const real = (p) => { try { return fs.realpathSync(p); } catch { return null; } };
      const roots = [
        HUB,
        expand(registry.scratchRoot),
        path.join(os.homedir(), ".t3", "worktrees"),
        path.join(os.homedir(), "dev", "agents-worktrees"),
        ...registry.projects.map((p) => expand(p.path)),
      ];
      const realTarget = real(target);
      const allowed = realTarget && roots.some((r) => {
        const rr = real(r);
        return rr && (realTarget === rr || realTarget.startsWith(rr + path.sep));
      });
      if (!allowed) { res.writeHead(403); return res.end("path outside the allowed roots"); }
      spawnSync(process.platform === "darwin" ? "open" : "xdg-open", [realTarget]);
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      return res.end(`opened ${realTarget}`);
    }
    const file = path.join(consoleDir, name);
    if (!name.includes("..") && fs.existsSync(file) && fs.statSync(file).isFile()) {
      const type = name.endsWith(".css") ? "text/css" : name.endsWith(".html") ? "text/html" : "text/plain";
      res.writeHead(200, { "content-type": `${type}; charset=utf-8` });
      return res.end(fs.readFileSync(file));
    }
    res.writeHead(404);
    res.end("not found");
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`opc console: port ${port} is already in use — another console is probably running (kill it, or use --port <N>)`);
    } else {
      console.error(`opc console: ${err.message}`);
    }
    process.exit(1);
  });

  const data = scanAll();
  const h = data.health;
  const healthLine = h.errors + h.warnings + h.infos ? `health: ${healthCounts(h)}` : "health: clean";
  const pending = data.projects.filter((p) => p.exists && !p.backlog).map((p) => p.id);
  server.listen(port, () => {
    console.log(`opc console → http://localhost:${port}`);
    console.log(healthLine);
    console.log(`pending retrofit: ${pending.length ? pending.join(", ") : "none"} — data rescans on every load`);
  });
}

// ---------------------------------------------------------------- main

function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "sync") return cmdSync(args);
  if (cmd === "check") return cmdCheck(args);
  if (cmd === "scan") return cmdScan(args);
  if (cmd === "console") return cmdConsole(args);
  console.log("usage:\n  opc sync [project…] [--dir <checkout>]   compose standards into standardized projects (all, or named ones)\n  opc check [--json] [--dir <checkout>]    deterministic health checks (exit 1 on errors)\n  opc scan [--snapshot]   write console/data.json (and a self-contained snapshot.html)\n  opc console [--port N]  serve the console at http://localhost:N\n  sync/check follow the checkout you run them from; --dir overrides");
  process.exit(2);
}

try {
  main();
} catch (err) {
  console.error(`opc ${process.argv[2] || ""} failed: ${err.message}`);
  process.exit(1);
}
