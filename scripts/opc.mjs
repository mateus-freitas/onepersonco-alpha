#!/usr/bin/env node
// opc — the One Person Company CLI (alpha): sync · check · scan · console · task
//
// sync   compose standards fragments (core + matching platforms) into standardized projects
// check  deterministic health checks for every registered project
// scan   write console/data.json (+ --snapshot for a self-contained page)
// console serve the local console; /data.json rescans on every load, and
//         /task/add + /task/move + /task/cancel edit the task store behind locks
// task   control-plane task store: add, list, show, move, done, cancel, migrate


import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(fs.readFileSync(path.join(HUB, "projects.json"), "utf8"));
const coreDir = path.join(HUB, "standards", "core");
const platformsDir = path.join(HUB, "standards", "platforms");
const consoleDir = path.join(HUB, "console");

const expand = (p) => (p.startsWith("~/") ? path.join(os.homedir(), p.slice(2)) : path.resolve(p));
const SECTIONS = ["Now", "Next", "Later", "Done"];
// Backlog line grammar, shared by parseBacklog (read) and the task store
// (write) — both must agree on where a task line and its `D:` lines end.
const TASK_LINE_RE = /^-\s+\[( |x|X)\]\s+(.+)$/;
const DESC_LINE_RE = /^\s+(?:d|desc):\s*(.+?)\s*$/i;
// Stable task IDs: `KEY-12 · Title`. The key lives in projects.json.
const TASK_ID_RE = /^([A-Z][A-Z0-9]{1,5}-\d+)\s+·\s+/;
const TASK_KEY_RE = /^[A-Z][A-Z0-9]{1,5}$/;

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

// ---------------------------------------------------------------- worktrees

// Linked worktrees — every `git worktree list` entry of a registered project's
// repo except its own main checkout. Answers "what is in flight, what can be
// cleaned up?" without ever throwing: a failed git/gh call yields []/null for
// its scope only.

const WORKTREE_ROOTS = [
  { root: "opc", base: () => expand(registry.worktreesRoot || "~/dev/.onepersonco/worktrees") },
  { root: "t3", base: () => path.join(os.homedir(), ".t3", "worktrees") },
  { root: "legacy", base: () => path.join(os.homedir(), "dev", "agents-worktrees") },
];

function worktreeRoot(dir) {
  const abs = real(dir);
  for (const { root, base } of WORKTREE_ROOTS) {
    const base2 = real(base());
    if (abs === base2 || abs.startsWith(base2 + path.sep)) return root;
  }
  return "other";
}

function parseWorktreeList(out) {
  const entries = [];
  let entry = null;
  const flush = () => {
    if (entry && entry.path) entries.push(entry);
    entry = null;
  };
  // `git worktree list --porcelain -z`: NUL-terminated fields (paths stay literal,
  // a path may contain a newline), entries separated by an extra NUL.
  for (const field of out.split("\0")) {
    if (!field) continue;
    const sp = field.indexOf(" ");
    const key = sp === -1 ? field : field.slice(0, sp);
    const value = sp === -1 ? "" : field.slice(sp + 1);
    if (key === "worktree") {
      flush();
      entry = { path: value, head: null, branch: null, detached: false, prunable: false };
      continue;
    }
    if (!entry) continue;
    if (key === "HEAD") entry.head = value;
    else if (key === "branch") entry.branch = value.replace(/^refs\/heads\//, "");
    else if (key === "detached") entry.detached = true;
    else if (key === "prunable") entry.prunable = true;
  }
  flush();
  for (const e of entries) if (!e.branch) e.detached = true; // no branch line = detached HEAD
  return entries;
}

// One call per repo: head / lastCommit (date + subject) / ahead-behind vs local
// main for every branch at once. `%(ahead-behind:main)` is fatal on a repo
// without `main`, so that call is retried without the field (nulls then).
function branchIndex(main) {
  const fields = "%(refname:short)%09%(objectname:short)%09%(committerdate:short)%09";
  const index = new Map();
  let out = git(main, ["for-each-ref", "refs/heads", `--format=${fields}%(ahead-behind:main)%09%(subject)`]);
  let track = out !== null;
  if (out === null) out = git(main, ["for-each-ref", "refs/heads", `--format=${fields}%(subject)`]);
  if (out === null) return index;
  for (const line of out.split("\n")) {
    if (!line) continue;
    const parts = line.split("\t");
    if (parts.length < 4) continue;
    const [name, sha, date] = parts;
    const subject = (track ? parts.slice(4) : parts.slice(3)).join("\t");
    let ahead = null;
    let behind = null;
    if (track) {
      const m = parts[3].match(/^(\d+)\s+(\d+)$/);
      if (m) { ahead = Number(m[1]); behind = Number(m[2]); }
    }
    index.set(name, { sha, lastCommit: date ? `${date} ${subject}`.trim() : null, ahead, behind });
  }
  return index;
}

function githubSlug(main) {
  const url = git(main, ["remote", "get-url", "origin"]);
  if (!url) return null;
  const m = url.trim().replace(/\/+$/, "").match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

// headRefName -> { number, state, isDraft, url, title }; highest number wins.
function prIndex(list) {
  const index = new Map();
  for (const pr of list) {
    if (!pr || typeof pr.headRefName !== "string") continue;
    const number = Number(pr.number);
    const prev = index.get(pr.headRefName);
    if (prev && !(number > prev.number)) continue;
    index.set(pr.headRefName, { number, state: pr.state, isDraft: !!pr.isDraft, url: pr.url, title: pr.title });
  }
  return index;
}

// One batched `gh pr list` per repo, run concurrently; null on any failure.
function ghPrList(slug) {
  return new Promise((resolve) => {
    let out = "";
    let settled = false;
    let timer = null;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };
    const child = spawn(
      "gh",
      ["pr", "list", "-R", slug, "--state", "all", "--limit", "100", "--json", "headRefName,number,state,isDraft,url,title"],
      { stdio: ["ignore", "pipe", "pipe"] });
    timer = setTimeout(() => { child.kill("SIGKILL"); finish(null); }, 10000);
    child.stdout.on("data", (chunk) => { out += chunk; });
    child.stderr.on("data", () => {});
    child.on("error", () => finish(null));
    child.on("close", (code) => {
      if (code !== 0) return finish(null);
      try {
        const parsed = JSON.parse(out);
        finish(Array.isArray(parsed) ? parsed : null);
      } catch { finish(null); }
    });
  });
}

async function collectWorktrees() {
  const repos = registry.projects.map((p) => {
    const main = expand(p.path);
    const entries = [];
    if (fs.existsSync(main)) {
      const mainReal = real(main);
      const index = branchIndex(main);
      const listed = parseWorktreeList(git(main, ["worktree", "list", "--porcelain", "-z"]) || "");
      for (const raw of listed) {
        if (real(raw.path) === mainReal) continue; // the project's own main checkout
        const exists = fs.existsSync(raw.path);
        const ref = raw.detached ? null : index.get(raw.branch);
        const head = (ref && ref.sha) || (raw.head || "").slice(0, 7) || null;
        let lastCommit = ref ? ref.lastCommit : null;
        if (lastCommit === null && raw.head) lastCommit = git(main, ["log", "-1", "--format=%cs %s", raw.head]);
        // ahead/behind vs local main: branch entries come from branchIndex; a detached
        // entry falls back to a rev-list against its head (prints main-side first).
        let ahead = ref ? ref.ahead : null;
        let behind = ref ? ref.behind : null;
        if (!ref && raw.detached && raw.head) {
          const ab = git(main, ["rev-list", "--left-right", "--count", `main...${raw.head}`]);
          const m = ab && ab.match(/^(\d+)\s+(\d+)$/);
          if (m) { behind = Number(m[1]); ahead = Number(m[2]); }
        }
        const status = exists ? git(raw.path, ["status", "--porcelain"]) : null;
        entries.push({
          branch: raw.branch,
          detached: raw.detached,
          entry: {
            path: raw.path,
            root: worktreeRoot(raw.path),
            branch: raw.detached ? `detached ${head || "?"}` : raw.branch || "?",
            head,
            dirty: status === null ? null : status.split("\n").filter(Boolean).length,
            ahead,
            behind,
            lastCommit,
            stale: raw.prunable,
            pr: null,
          },
        });
      }
    }
    return { id: p.id, main, entries };
  });

  // Eligibility: ≥ 1 non-detached linked worktree and a GitHub origin.
  const lookups = repos
    .filter((r) => r.entries.some((e) => !e.detached))
    .map((r) => ({ id: r.id, slug: githubSlug(r.main) }))
    .filter((l) => l.slug);
  const results = await Promise.all(lookups.map((l) => ghPrList(l.slug)));
  // gh = "every PR lookup that was needed succeeded" — a mixed outcome means some
  // PR states are hidden, so the console shows the note (vacuous when none needed).
  let gh = lookups.length > 0;
  lookups.forEach((l, i) => {
    const prs = results[i];
    if (!prs) { gh = false; return; }
    const index = prIndex(prs);
    const repo = repos.find((r) => r.id === l.id);
    for (const e of repo.entries) {
      if (e.detached || !e.branch) continue;
      e.entry.pr = index.get(e.branch) || null;
    }
  });

  return { byId: new Map(repos.map((r) => [r.id, r.entries.map((e) => e.entry)])), gh };
}

function parseBacklog(file) {
  if (!fs.existsSync(file)) return null;
  const sections = { Now: [], Next: [], Later: [], Done: [] };
  let current = null;
  let last = null; // the last item parsed — anchor for `D:` description lines
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      current = SECTIONS.find((s) => h[1].trim().toLowerCase().startsWith(s.toLowerCase())) || null;
      last = null;
      return;
    }
    if (!current) return;
    const item = line.match(TASK_LINE_RE);
    if (item) {
      let rest = item[2].trim();
      let id = null;
      let spec = null;
      let prompt = null;
      let priority = null;
      let date = null;
      const idM = rest.match(TASK_ID_RE);
      if (idM) { id = idM[1]; rest = rest.slice(idM[0].length); }
      const specM = rest.match(/\s+—\s+spec:\s+(\S+)/);
      if (specM) { spec = specM[1]; rest = rest.replace(specM[0], ""); }
      const promptM = rest.match(/\s+—\s+prompt:\s+(\S+)/);
      if (promptM) { prompt = promptM[1]; rest = rest.replace(promptM[0], ""); }
      const priM = rest.match(/\s+—\s+(p[0-3]|P[0-3])\s*$/);
      if (priM) { priority = priM[1].toLowerCase(); rest = rest.replace(priM[0], ""); }
      const dateM = rest.match(/\s+—\s+(\d{4}-\d{2}-\d{2})\s*$/);
      if (dateM) { date = dateM[1]; rest = rest.replace(dateM[0], ""); }
      last = {
        id,
        title: rest.trim(),
        desc: null,
        spec,
        prompt,
        priority,
        date,
        checked: item[1].toLowerCase() === "x",
        line: i + 1,
      };
      sections[current].push(last);
      return;
    }
    // an indented `D:`/`desc:` line right under an item is its description —
    // free text, so it may safely contain em dashes and anything else
    const desc = last && line.match(DESC_LINE_RE);
    if (desc) {
      last.desc = last.desc ? `${last.desc} ${desc[1]}` : desc[1];
      return;
    }
    last = null;
  });
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
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "archive")
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

// Resolve a backlog item's `prompt:` value to its scratch folder. The value is
// a folder name under `<scratch>/<project>/prompts/` or a path relative to the
// project's scratch root; a folder already archived still resolves. Returns
// the folder's file names plus its written records (TASK.md/KICKOFF.md,
// NOTES.md), or null. Only those files are read — session folders can hold
// large evidence artifacts.
const SCRATCH_FILE_LIMIT = 96 * 1024;

// Read at most SCRATCH_FILE_LIMIT bytes, and only when the canonical file sits
// inside the canonical session dir — a symlinked folder or file must not pull
// outside content into scan data or snapshots.
function readScratchFile(dir, name) {
  const file = path.join(dir, name);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  if (!real(file).startsWith(real(dir) + path.sep)) return null;
  let text;
  try {
    const fd = fs.openSync(file, "r");
    try {
      const buf = Buffer.alloc(SCRATCH_FILE_LIMIT);
      const bytes = fs.readSync(fd, buf, 0, SCRATCH_FILE_LIMIT, 0);
      text = buf.toString("utf8", 0, bytes);
      if (fs.fstatSync(fd).size > SCRATCH_FILE_LIMIT) text += "\n… [truncated by opc scan]";
    } finally {
      fs.closeSync(fd);
    }
  } catch { return null; }
  return { name, content: text };
}

function resolvePrompt(projectId, value) {
  if (!value || value.includes("..") || path.isAbsolute(value)) return null;
  const scratch = expand(registry.scratchRoot);
  const root = path.join(scratch, projectId);
  const candidates = value.includes("/")
    ? [path.join(root, value), path.join(root, "prompts", "archive", path.basename(value))]
    : [path.join(root, "prompts", value), path.join(root, "prompts", "archive", value)];
  const scratchReal = real(scratch);
  for (const dir of candidates) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
    if (!real(dir).startsWith(scratchReal + path.sep)) continue; // symlink must not escape the scratch root
    let files;
    try { files = fs.readdirSync(dir).filter((f) => !f.startsWith(".")).sort(); } catch { continue; }
    return {
      name: path.basename(dir),
      rel: path.relative(scratch, dir),
      path: dir,
      archived: dir.includes(`${path.sep}archive${path.sep}`),
      files,
      task: readScratchFile(dir, "TASK.md") || readScratchFile(dir, "KICKOFF.md"),
      notes: readScratchFile(dir, "NOTES.md"),
    };
  }
  return null;
}

// A task's prompt folder slug (date prefix stripped) is the anchor linking the
// item to the worktree(s) doing the work: branch or directory names carrying
// the same slug belong to the task. Deterministic — no fuzzy title matching.
function itemSlug(item) {
  if (!item.promptInfo) return null;
  const slug = item.promptInfo.name.toLowerCase().replace(/^\d{4}-\d{2}-\d{2}-/, "");
  return slug.length >= 4 ? slug : null;
}

function matchWorktrees(item, worktrees) {
  const slug = itemSlug(item);
  if (!slug) return [];
  const norm = (s) => String(s || "").toLowerCase().replace(/^[a-z]+\//, "");
  return worktrees.filter((w) => {
    const names = [norm(w.branch), path.basename(w.path || "").toLowerCase()];
    return names.some((n) => n && (n.includes(slug) || slug.includes(n)) && Math.min(n.length, slug.length) >= 4);
  });
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
    worktrees: [],
  };
  if (!exists) return entry;
  const source = backlogSource(p);
  entry.backlog = source ? parseBacklog(source.file) : null;
  entry.taskStore = Boolean(source && !source.legacy);
  entry.backlogLegacy = Boolean(source && source.legacy);
  entry.backlogFile = source ? displayFile(source.file) : null;
  entry.taskKey = p.key || null;
  if (entry.backlog) {
    const backlogRel = source.legacy ? path.relative(dir, source.file) : displayFile(source.file);
    for (const s of SECTIONS) {
      for (const item of entry.backlog[s]) {
        item.file = backlogRel;
        item.promptInfo = item.prompt ? resolvePrompt(p.id, item.prompt) : null;
      }
    }
  }
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
  const linked = new Set();
  if (entry.backlog) {
    for (const s of SECTIONS) for (const item of entry.backlog[s]) if (item.promptInfo) linked.add(real(item.promptInfo.path));
  }
  for (const s of entry.promptSessions) s.linked = linked.has(real(s.path));
  return entry;
}

async function scanAll() {
  const { health, perProject } = checkAll();
  const { byId, gh } = await collectWorktrees();
  const projects = registry.projects.map((p) => {
    const entry = scanProject(p);
    entry.health = perProject.get(p.id);
    entry.worktrees = byId.get(p.id) || [];
    if (entry.backlog) {
      for (const s of SECTIONS) {
        for (const item of entry.backlog[s]) item.worktrees = matchWorktrees(item, entry.worktrees);
      }
    }
    return entry;
  });
  return {
    generatedAt: new Date().toISOString(),
    org: registry.org,
    scratchRoot: registry.scratchRoot,
    home: os.homedir(),
    gh,
    health,
    projects,
  };
}

async function cmdScan(args) {
  const data = await scanAll();
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
    // replacer function: `$&`/`$'` inside serialized data must stay literal
    const injected = app.replace("<!--__DATA__-->", () => `<script>window.__DATA__ = ${safe};</` + `script>`);
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
  const source = backlogSource(p);
  if (!source) {
    if (!p.standardized) add("info", "backlog.missing", "no task store or docs/backlog.md");
    return;
  }
  const file = source.file;
  const rel = source.legacy ? path.relative(dir, file) : displayFile(file);
  if (source.legacy)
    add("info", "backlog.legacy", `backlog still lives in the repo — run \`opc task migrate ${p.id} --key ${p.key || "<KEY>"}\``, rel);
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
  if (!source.legacy) {
    if (!p.key || !TASK_KEY_RE.test(p.key)) add("error", "backlog.key", "missing or invalid task key in projects.json", "projects.json");
    const meta = readMeta(p);
    const max = maxIdNumber(backlog, p.key || "");
    if (p.key && (!Number.isInteger(meta.next) || meta.next <= max))
      add("error", "backlog.meta", `backlog.meta.json next (${meta.next}) must exceed the highest ID (${max})`, rel);
    const seenIds = new Set();
    for (const s of SECTIONS) {
      for (const item of backlog[s]) {
        if (!item.id) { add("error", "backlog.id", `line ${item.line}: task has no ID`, rel); continue; }
        if (p.key && !item.id.startsWith(`${p.key}-`))
          add("error", "backlog.id", `line ${item.line}: ${item.id} does not match key ${p.key}`, rel);
        if (seenIds.has(item.id)) add("error", "backlog.id", `duplicate task ID ${item.id}`, rel);
        seenIds.add(item.id);
      }
    }
  }
  const openTitles = new Map();
  for (const s of SECTIONS) {
    for (const item of backlog[s]) {
      if (s !== "Done" && item.checked)
        add("warning", "backlog.finished-in-lane", `checked item in ${s}: ${item.title}`, rel);
      if (s === "Done" && item.checked && !item.date)
        add("warning", "backlog.done-date", `done without a date: ${item.id || item.title}`, rel);
      if (s !== "Done") {
        const norm = normalizeTitle(item.title);
        if (openTitles.has(norm))
          add("warning", "backlog.duplicate", `duplicate open title: ${item.id || item.title}`, rel);
        else openTitles.set(norm, item);
      }
      if (item.spec) {
        const target = item.spec.startsWith("~/") ? expand(item.spec) : path.resolve(dir, item.spec);
        if (!fs.existsSync(target)) add("error", "backlog.spec", `spec does not resolve: ${item.spec}`, rel);
      }
      if (item.prompt && !resolvePrompt(p.id, item.prompt))
        add("error", "backlog.prompt", `prompt does not resolve: ${item.prompt}`, rel);
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
  const keys = new Map();
  const cross = [];
  for (const p of registry.projects) {
    if (!p.key) continue;
    if (keys.has(p.key)) cross.push({ project: p.id, level: "error", code: "backlog.key", message: `task key ${p.key} is already used by ${keys.get(p.key)}` });
    else keys.set(p.key, p.id);
  }
  const perProject = new Map();
  for (const p of registry.projects) {
    const list = checkProject(p, loadProjectFragments(p));
    list.push(...cross.filter((f) => f.project === p.id));
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

// ---------------------------------------------------------------- task store

// Task state is control-plane data, not code: one writer, stable IDs, no
// branches. `~/.onepersonco/<project>/backlog.md` is canonical; a repo
// `docs/backlog.md` is a read-only legacy fallback until `opc task migrate`
// moves it. Every mutation takes a lock, re-reads the file, edits raw lines
// and writes atomically, so the console server and the CLI never interleave.
// IDs are allocated here and nowhere else: KEY-N, increasing, never reused.

function storeDir(id) { return path.join(expand(registry.scratchRoot), id); }
function storeFile(p) { return path.join(storeDir(p.id), "backlog.md"); }
function metaFile(p) { return path.join(storeDir(p.id), "backlog.meta.json"); }
function repoBacklogFile(p) { return path.join(expand(p.path), p.docs || "docs", "backlog.md"); }

function backlogSource(p) {
  const store = storeFile(p);
  if (fs.existsSync(store)) return { file: store, legacy: false };
  const repo = repoBacklogFile(p);
  if (fs.existsSync(repo)) return { file: repo, legacy: true };
  return null;
}

// Tilde-shortened absolute path for display and the console's /open links.
function displayFile(file) {
  const home = os.homedir();
  return file.startsWith(home + path.sep) ? "~/" + path.relative(home, file) : file;
}

function readMeta(p) {
  try { return JSON.parse(fs.readFileSync(metaFile(p), "utf8")); } catch { return {}; }
}

function writeMeta(p, meta) {
  fs.mkdirSync(storeDir(p.id), { recursive: true });
  writeAtomic(metaFile(p), JSON.stringify(meta, null, 2) + "\n");
}

function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The console server and the CLI are separate processes; both mutate through
// this lock (stale after 10s) and an atomic rename, so they may run at once.
async function withTaskLock(p, fn) {
  fs.mkdirSync(storeDir(p.id), { recursive: true });
  const lock = path.join(storeDir(p.id), "backlog.lock");
  for (let tries = 0; tries < 120; tries++) {
    try {
      const fd = fs.openSync(lock, "wx");
      fs.writeSync(fd, `${process.pid} ${Date.now()}`);
      fs.closeSync(fd);
      try {
        return await fn();
      } finally {
        try { fs.unlinkSync(lock); } catch { /* already gone */ }
      }
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs > 10_000) { fs.unlinkSync(lock); continue; }
      } catch { /* lock raced away */ }
      await sleep(40);
    }
  }
  throw new Error("task store is locked by another writer");
}

function readLines(file) {
  const text = fs.readFileSync(file, "utf8");
  const endsNL = text.endsWith("\n");
  const lines = text.split("\n");
  if (endsNL) lines.pop();
  return { lines, endsNL };
}

function writeLines(file, lines, endsNL) {
  writeAtomic(file, lines.join("\n") + (endsNL ? "\n" : ""));
}

// Every task block in file order, with its section position.
function listTasks(lines) {
  const out = [];
  const counts = Object.fromEntries(SECTIONS.map((s) => [s, 0]));
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^##\s+(.+)$/);
    if (h) {
      current = SECTIONS.find((s) => h[1].trim().toLowerCase().startsWith(s.toLowerCase())) || null;
      continue;
    }
    if (!current || !TASK_LINE_RE.test(lines[i])) continue;
    let end = i;
    while (end + 1 < lines.length && DESC_LINE_RE.test(lines[end + 1])) end++;
    out.push({ section: current, index: counts[current]++, start: i, end, line: lines[i] });
    i = end;
  }
  return out;
}

function taskIdOf(line) {
  const m = line.match(TASK_LINE_RE);
  const idm = m && m[2].match(TASK_ID_RE);
  return idm ? idm[1] : null;
}

function maxIdNumber(backlog, key) {
  let max = 0;
  for (const s of SECTIONS) {
    for (const item of backlog[s]) {
      if (!item.id || !item.id.startsWith(`${key}-`)) continue;
      max = Math.max(max, Number(item.id.slice(key.length + 1)) || 0);
    }
  }
  return max;
}

const normalizeTitle = (title) => String(title).toLowerCase().replace(/\s+/g, " ").trim();
const taskLine = (id, title) => `- [ ] ${id} · ${title}`;

function findTask(backlog, id) {
  for (const s of SECTIONS) {
    const index = backlog[s].findIndex((item) => item.id === id);
    if (index >= 0) return { section: s, index, task: backlog[s][index] };
  }
  return null;
}

function findProjectById(id) {
  const key = String(id || "").split("-")[0];
  return registry.projects.find((p) => p.key === key) || null;
}

function requireStore(p) {
  const file = storeFile(p);
  if (fs.existsSync(file)) return file;
  if (fs.existsSync(repoBacklogFile(p)))
    throw new Error(`not migrated: run opc task migrate ${p.id} --key ${p.key || "<KEY>"}`);
  throw new Error(`no task store for ${p.id} — run opc task migrate ${p.id} --key ${p.key || "<KEY>"}`);
}

function validateAdd(p, fields) {
  const title = String(fields.title || "").trim();
  if (!title || title.includes("\n") || /\s+—\s+(spec|prompt):\s/.test(title))
    throw new Error("title must be a single line without `— spec:` / `— prompt:` markers");
  if (fields.priority && !/^[pP][0-3]$/.test(fields.priority)) throw new Error("priority must be p0..p3");
  if (fields.spec) {
    if (/\s/.test(fields.spec)) throw new Error("spec must be a path without spaces");
    const target = fields.spec.startsWith("~/") ? expand(fields.spec) : path.resolve(expand(p.path), fields.spec);
    if (!fs.existsSync(target)) throw new Error(`spec does not resolve: ${fields.spec}`);
  }
  if (fields.prompt) {
    if (/\s/.test(fields.prompt)) throw new Error("prompt must be a folder without spaces");
    if (!resolvePrompt(p.id, fields.prompt)) throw new Error(`prompt does not resolve: ${fields.prompt}`);
  }
  return title;
}

async function taskAdd(p, fields) {
  if (!p.key || !TASK_KEY_RE.test(p.key))
    throw new Error(`project ${p.id} has no task key — add "key": "ABC" to projects.json`);
  const title = validateAdd(p, fields);
  const section = fields.section || "Now";
  if (!SECTIONS.includes(section)) throw new Error(`unknown section: ${section}`);
  return withTaskLock(p, () => {
    const file = requireStore(p);
    const { lines, endsNL } = readLines(file);
    const backlog = parseBacklog(file);
    for (const s of ["Now", "Next", "Later"]) {
      for (const item of backlog[s]) {
        if (normalizeTitle(item.title) === normalizeTitle(title))
          throw new Error(`duplicate: ${item.id || item.title} already has that title`);
      }
    }
    const meta = readMeta(p);
    const id = `${p.key}-${Math.max(Number(meta.next) || 1, maxIdNumber(backlog, p.key) + 1)}`;
    let line = taskLine(id, title);
    if (fields.spec) line += ` — spec: ${fields.spec}`;
    if (fields.prompt) line += ` — prompt: ${fields.prompt}`;
    if (fields.priority) line += ` — ${String(fields.priority).toLowerCase()}`;
    if (section === "Done") line = toDone(line);
    const block = [line, ...String(fields.desc || "").split("\n")
      .map((d) => d.trim().replace(/^(?:d|desc):\s*/i, "")).filter(Boolean)
      .map((d) => `  D: ${d}`)];
    const at = insertItem(lines, section, 0, block);
    if (at === false) throw new Error(`backlog has no "## ${section}" section`);
    writeLines(file, lines, endsNL);
    writeMeta(p, { ...meta, key: p.key, next: Number(id.slice(p.key.length + 1)) + 1 });
    return { id, section, index: at };
  });
}

async function taskMove(p, id, to, before) {
  if (!SECTIONS.includes(to)) throw new Error(`unknown section: ${to}`);
  return withTaskLock(p, () => {
    const file = requireStore(p);
    const { lines, endsNL } = readLines(file);
    const tasks = listTasks(lines);
    const from = tasks.find((t) => taskIdOf(t.line) === id);
    if (!from) throw new Error(`task not found: ${id}`);
    let anchor = null;
    if (before !== undefined && before !== null) {
      if (before === id) throw new Error("cannot anchor a task on itself");
      anchor = tasks.find((t) => taskIdOf(t.line) === before);
      if (!anchor) throw new Error(`task not found: ${before}`);
      if (anchor.section !== to) throw new Error(`${before} is not in ${to}`);
    }
    const target = tasks.filter((t) => t.section === to);
    const current = from.section === to ? target.indexOf(from) : -1;
    let k;
    if (before === undefined) k = 0;
    else if (before === null) k = from.section === to ? target.length - 1 : target.length;
    else k = target.indexOf(anchor);
    if (from.section === to) {
      if (before === undefined && current === 0) return { noop: true };
      if (before === null && current === target.length - 1) return { noop: true };
      if (anchor) {
        const a = target.indexOf(anchor);
        k = a > current ? a - 1 : a;
        if (k === current) return { noop: true };
      }
    }
    let line = from.line;
    if (to === "Done" && from.section !== "Done") line = toDone(line);
    else if (to !== "Done" && from.section === "Done") line = fromDone(line);
    lines.splice(from.start, from.end - from.start + 1);
    if (lines[from.start - 1] !== undefined && lines[from.start - 1].trim() === "" &&
        lines[from.start] !== undefined && lines[from.start].trim() === "")
      lines.splice(from.start, 1);
    const at = insertItem(lines, to, k, [line]);
    if (at === false) throw new Error(`backlog has no "## ${to}" section`);
    writeLines(file, lines, endsNL);
    return { section: to, index: at };
  });
}

async function taskCancel(p, id) {
  return withTaskLock(p, () => {
    const file = requireStore(p);
    const { lines, endsNL } = readLines(file);
    const found = listTasks(lines).find((t) => taskIdOf(t.line) === id);
    if (!found) throw new Error(`task not found: ${id}`);
    lines.splice(found.start, found.end - found.start + 1);
    if (lines[found.start - 1] !== undefined && lines[found.start - 1].trim() === "" &&
        lines[found.start] !== undefined && lines[found.start].trim() === "")
      lines.splice(found.start, 1);
    writeLines(file, lines, endsNL);
  });
}

async function taskEdit(p, id, fields) {
  return withTaskLock(p, () => {
    const file = requireStore(p);
    const { lines, endsNL } = readLines(file);
    const found = listTasks(lines).find((t) => taskIdOf(t.line) === id);
    if (!found) throw new Error(`task not found: ${id}`);
    const backlog = parseBacklog(file);
    const current = findTask(backlog, id);
    if (!current) throw new Error(`task not found: ${id}`);
    const cur = current.task;
    const title = fields.title !== undefined ? String(fields.title).trim() : cur.title;
    if (!title || title.includes("\n") || /\s+—\s+(spec|prompt):\s/.test(title))
      throw new Error("title must be a single line without `— spec:` / `— prompt:` markers");
    if (fields.title !== undefined) {
      for (const s of ["Now", "Next", "Later"]) {
        for (const item of backlog[s]) {
          if (item.id !== id && normalizeTitle(item.title) === normalizeTitle(title))
            throw new Error(`duplicate: ${item.id || item.title} already has that title`);
        }
      }
    }
    const priority = fields.priority !== undefined ? (String(fields.priority).toLowerCase() || null) : cur.priority;
    if (priority && !/^p[0-3]$/.test(priority)) throw new Error("priority must be p0..p3");
    const spec = fields.spec !== undefined ? (String(fields.spec) || null) : cur.spec;
    if (spec) {
      if (/\s/.test(spec)) throw new Error("spec must be a path without spaces");
      const target = spec.startsWith("~/") ? expand(spec) : path.resolve(expand(p.path), spec);
      if (!fs.existsSync(target)) throw new Error(`spec does not resolve: ${spec}`);
    }
    const prompt = fields.prompt !== undefined ? (String(fields.prompt) || null) : cur.prompt;
    if (prompt) {
      if (/\s/.test(prompt)) throw new Error("prompt must be a folder without spaces");
      if (!resolvePrompt(p.id, prompt)) throw new Error(`prompt does not resolve: ${prompt}`);
    }
    const box = cur.checked ? "[x]" : "[ ]";
    let line = `- ${box} ${id} · ${title}`;
    if (spec) line += ` — spec: ${spec}`;
    if (prompt) line += ` — prompt: ${prompt}`;
    if (priority) line += ` — ${priority}`;
    if (cur.date) line += ` — ${cur.date}`;
    lines[found.start] = line;
    if (fields.desc !== undefined) {
      const block = String(fields.desc || "").split("\n")
        .map((d) => d.trim().replace(/^(?:d|desc):\s*/i, "")).filter(Boolean)
        .map((d) => `  D: ${d}`);
      lines.splice(found.start + 1, found.end - found.start, ...block);
    }
    writeLines(file, lines, endsNL);
    return { id };
  });
}

async function taskDone(p, id, pr) {
  const file = requireStore(p);
  const found = findTask(parseBacklog(file), id);
  if (!found) throw new Error(`task not found: ${id}`);
  let result = { section: found.section, index: found.index };
  if (found.section === "Done") {
    if (found.task.checked && found.task.date) {
      result = { noop: true };
    } else {
      result = await withTaskLock(p, () => {
        const { lines, endsNL } = readLines(file);
        const t = listTasks(lines).find((x) => taskIdOf(x.line) === id);
        if (!t) throw new Error(`task not found: ${id}`);
        lines[t.start] = toDone(t.line);
        writeLines(file, lines, endsNL);
        return { section: "Done", index: found.index };
      });
    }
  } else {
    result = await taskMove(p, id, "Done", undefined);
  }
  if (pr) {
    await withTaskLock(p, () => {
      const meta = readMeta(p);
      meta.key = p.key;
      meta.prs = { ...(meta.prs || {}), [id]: pr };
      writeMeta(p, meta);
    });
  }
  return result;
}

function taskList(p, section) {
  if (section && !SECTIONS.includes(section)) throw new Error(`unknown section: ${section}`);
  const source = backlogSource(p);
  if (!source) throw new Error(`no task store for ${p.id}`);
  const backlog = parseBacklog(source.file);
  const out = [];
  for (const s of SECTIONS) {
    if (section && s !== section) continue;
    for (const item of backlog[s]) out.push({ ...item, section: s, legacy: source.legacy });
  }
  return out;
}

function taskShow(id) {
  const p = findProjectById(id);
  if (!p) throw new Error(`task not found: ${id}`);
  const item = taskList(p).find((t) => t.id === id);
  if (!item) throw new Error(`task not found: ${id}`);
  return { project: p, item, source: backlogSource(p) };
}

async function taskMigrate(projectId, keyArg, dryRun) {
  if (!projectId) throw new Error("usage: opc task migrate <project> --key <KEY> [--dry-run]");
  const p = registry.projects.find((x) => x.id === projectId);
  if (!p) throw new Error(`unknown project: ${projectId}`);
  if (!fs.existsSync(repoBacklogFile(p))) throw new Error(`${p.id}: no docs/backlog.md to migrate`);
  if (fs.existsSync(storeFile(p))) throw new Error(`${p.id}: task store already exists — ${displayFile(storeFile(p))}`);
  const key = String(keyArg || p.key || "").toUpperCase();
  if (!TASK_KEY_RE.test(key)) throw new Error("choose a task key, e.g. --key GYM (2-6 letters/digits, starting with a letter)");
  const other = registry.projects.find((x) => x.key === key && x.id !== p.id);
  if (other) throw new Error(`key ${key} is already used by ${other.id}`);
  const { lines, endsNL } = readLines(repoBacklogFile(p));
  let n = 0;
  const migrated = lines.map((line) => {
    const m = line.match(/^(-\s+\[( |x|X)\]\s+)(.+)$/);
    if (!m) return line;
    if (TASK_ID_RE.test(m[3])) throw new Error(`line already has an ID: ${line}`);
    n++;
    return `${m[1]}${key}-${n} · ${m[3]}`;
  });
  if (dryRun) return { project: p.id, key, count: n, file: displayFile(storeFile(p)), dryRun: true };
  fs.mkdirSync(storeDir(p.id), { recursive: true });
  writeLines(storeFile(p), migrated, endsNL);
  writeMeta(p, { key, next: n + 1 });
  if (p.key !== key) {
    p.key = key;
    fs.writeFileSync(path.join(HUB, "projects.json"), JSON.stringify(registry, null, 2) + "\n");
  }
  return { project: p.id, key, count: n, file: displayFile(storeFile(p)) };
}

async function taskInit(p, keyArg) {
  const key = String(keyArg || p.key || "").toUpperCase();
  if (!TASK_KEY_RE.test(key)) throw new Error("choose a task key, e.g. --key BLO (2-6 letters/digits, starting with a letter)");
  const other = registry.projects.find((x) => x.key === key && x.id !== p.id);
  if (other) throw new Error(`key ${key} is already used by ${other.id}`);
  return withTaskLock(p, () => {
    if (fs.existsSync(storeFile(p)))
      throw new Error(`${p.id}: task store already exists — ${displayFile(storeFile(p))}`);
    const lines = [
      "# Backlog", "",
      `Task store for ${p.id}. Written by \`opc task\` and the console only.`,
      "Sections: Now · Next · Later · Done (recent).", "",
      "## Now", "", "## Next", "", "## Later", "", "## Done (recent)", "",
    ];
    writeLines(storeFile(p), lines, true);
    writeMeta(p, { key, next: 1 });
    if (p.key !== key) {
      p.key = key;
      fs.writeFileSync(path.join(HUB, "projects.json"), JSON.stringify(registry, null, 2) + "\n");
    }
    return { project: p.id, key, file: displayFile(storeFile(p)) };
  });
}

function parseTaskArgs(argv) {
  const pos = [];
  const flags = { desc: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json" || arg === "--dry-run" || arg === "--top" || arg === "--end") {
      flags[arg.slice(2)] = true;
    } else if (arg.startsWith("--")) {
      const name = arg.slice(2);
      const value = argv[++i];
      if (value === undefined) throw new Error(`missing value for --${name}`);
      if (name === "desc") flags.desc.push(value);
      else flags[name] = value;
    } else {
      pos.push(arg);
    }
  }
  return { pos, flags };
}

const projectOf = (id) => {
  const p = registry.projects.find((x) => x.id === id);
  if (!p) throw new Error(`unknown project: ${id}`);
  return p;
};

async function cmdTask(args) {
  const [sub, ...rest] = args;
  const { pos, flags } = parseTaskArgs(rest);
  if (sub === "add") {
    const [projectId, ...title] = pos;
    if (!projectId || !title.length)
      throw new Error('usage: opc task add <project> "<title>" [--section S] [--priority p0..p3] [--spec <path>] [--prompt <folder>] [--desc <text>]');
    const out = await taskAdd(projectOf(projectId), {
      section: flags.section || "Now",
      title: title.join(" "),
      priority: flags.priority,
      spec: flags.spec,
      prompt: flags.prompt,
      desc: flags.desc.length ? flags.desc.join("\n") : null,
    });
    console.log(`${out.id} added to ${out.section}`);
    return;
  }
  if (sub === "list") {
    const p = projectOf(pos[0] || "");
    const items = taskList(p, flags.section);
    if (flags.json) return console.log(JSON.stringify(items, null, 2));
    if (!items.length) return console.log("no tasks");
    for (const t of items) {
      console.log(`${(t.id || "(no id)").padEnd(9)} ${t.checked ? "[x]" : "[ ]"} ${t.priority ? t.priority + " " : ""}${t.title}  (${t.section})`);
    }
    return;
  }
  if (sub === "show") {
    const id = pos[0];
    const { project, item, source } = taskShow(id);
    if (flags.json) return console.log(JSON.stringify({ ...item, project: project.id, file: displayFile(source.file) }, null, 2));
    console.log(`${item.id} · ${item.title}`);
    console.log(`  ${item.section} · ${item.checked ? "done " + (item.date || "") : "open"}${item.priority ? " · " + item.priority : ""}`);
    if (item.desc) console.log(`  ${item.desc}`);
    if (item.spec) console.log(`  spec: ${item.spec}`);
    if (item.prompt) console.log(`  prompt: ${item.prompt}`);
    console.log(`  ${displayFile(source.file)} · line ${item.line}`);
    return;
  }
  if (sub === "move") {
    const [id, to] = pos;
    if (!id || !to) throw new Error("usage: opc task move <id> <section> [--before <id> | --top | --end]");
    const p = findProjectById(id);
    if (!p) throw new Error(`task not found: ${id}`);
    const before = flags.before !== undefined ? flags.before : flags.end ? null : undefined;
    const out = await taskMove(p, id, to, before);
    console.log(out.noop ? `${id} already there` : `${id} → ${to}`);
    return;
  }
  if (sub === "edit") {
    const id = pos[0];
    const p = findProjectById(id || "");
    if (!p) throw new Error(`task not found: ${id || "(missing)"}`);
    const fields = {};
    for (const key of ["title", "priority", "spec", "prompt"]) if (flags[key] !== undefined) fields[key] = flags[key];
    if (flags.desc.length) fields.desc = flags.desc.join("\n");
    if (!Object.keys(fields).length)
      throw new Error("usage: opc task edit <id> [--title …] [--priority …] [--spec …] [--prompt …] [--desc …]");
    await taskEdit(p, id, fields);
    console.log(`${id} updated`);
    return;
  }
  if (sub === "done") {
    const id = pos[0];
    const p = findProjectById(id || "");
    if (!p) throw new Error(`task not found: ${id || "(missing)"}`);
    const out = await taskDone(p, id, flags.pr);
    console.log(out.noop ? `${id} already done` : `${id} → Done`);
    return;
  }
  if (sub === "cancel") {
    const id = pos[0];
    const p = findProjectById(id || "");
    if (!p) throw new Error(`task not found: ${id || "(missing)"}`);
    await taskCancel(p, id);
    console.log(`${id} canceled`);
    return;
  }
  if (sub === "migrate") {
    const out = await taskMigrate(pos[0], flags.key, Boolean(flags["dry-run"]));
    if (out.dryRun) return console.log(`${out.count} task(s) would become ${out.key}-1..${out.key}-${out.count} → ${out.file}`);
    console.log(`migrated ${out.project}: ${out.count} task(s) as ${out.key}-1..${out.key}-${out.count} → ${out.file}`);
    console.log("the repo's docs/backlog.md is now a stale copy — delete it in the next commit");
    return;
  }
  if (sub === "init") {
    if (!pos[0]) throw new Error("usage: opc task init <project> [--key <KEY>]");
    const out = await taskInit(projectOf(pos[0]), flags.key);
    console.log(`initialized ${out.project} · ${out.key} → ${out.file}`);
    return;
  }
  throw new Error("usage: opc task add|list|show|move|edit|done|cancel|migrate|init");
}

// Insert a block right after the target `## <section>` heading, above any
// existing item; keeps the blank line after the heading and one before the
// next heading when the section was empty. Only used for empty sections —
// insertItem covers every other position.
function insertTop(lines, section, block) {
  let h = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+)$/);
    if (!m) continue;
    if (SECTIONS.find((s) => m[1].trim().toLowerCase().startsWith(s.toLowerCase())) === section) { h = i; break; }
  }
  if (h === -1) return false;
  let at = h + 1;
  while (at < lines.length && lines[at].trim() === "") at++;
  const gap = at < lines.length && /^##\s/.test(lines[at]) ? [""] : [];
  lines.splice(at, 0, ...block, ...gap);
  return true;
}

// Insert a block at item position `k` within `section`: 0 puts it above the
// first item, k ≥ item count appends after the last item. Items are contiguous
// in a section (no blank lines between them), so a middle insert lands right
// below item k-1's `D:` lines. Returns the new item's index, or false when
// the section heading is missing.
function insertItem(lines, section, k, block) {
  const starts = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^##\s+(.+)$/);
    if (h) {
      current = SECTIONS.find((s) => h[1].trim().toLowerCase().startsWith(s.toLowerCase())) || null;
      continue;
    }
    if (current === section && TASK_LINE_RE.test(lines[i])) starts.push(i);
  }
  if (!starts.length) return insertTop(lines, section, block) ? 0 : false;
  if (k <= 0) { lines.splice(starts[0], 0, ...block); return 0; }
  if (k >= starts.length) {
    let end = starts[starts.length - 1];
    while (end + 1 < lines.length && DESC_LINE_RE.test(lines[end + 1])) end++;
    lines.splice(end + 1, 0, ...block);
    return starts.length;
  }
  lines.splice(starts[k], 0, ...block);
  return k;
}

// Entering Done ticks the box and stamps today when the trailing date is
// absent; leaving Done unticks and strips only the trailing date field.
// Everything else on the line stays byte-identical.
function toDone(line) {
  const out = line.replace(/^-\s+\[( |x|X)\]/, "- [x]");
  return /\s+—\s+\d{4}-\d{2}-\d{2}\s*$/.test(out) ? out : out.replace(/\s+$/, "") + " — " + todayISO();
}

function fromDone(line) {
  return line
    .replace(/^-\s+\[( |x|X)\]/, "- [ ]")
    .replace(/\s+—\s+\d{4}-\d{2}-\d{2}\s*$/, "");
}

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Scan like /data.json does, and persist: every console write refreshes
// console/data.json so line numbers and sections stay correct everywhere.
async function freshScan() {
  const data = await scanAll();
  fs.writeFileSync(path.join(consoleDir, "data.json"), JSON.stringify(data, null, 2));
  return data;
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) { reject(new Error("request body too large")); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const isLoopback = (req) => {
  const ip = req.socket.remoteAddress || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
};

// --lan also accepts your private network: RFC1918 ranges and the CGNAT
// block Tailscale hands out. Public addresses never qualify.
const isPrivate = (req) => {
  const ip = (req.socket.remoteAddress || "").replace(/^::ffff:/, "");
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("100.")) {
    const second = Number(ip.split(".")[1]);
    return second >= 64 && second <= 127;
  }
  const m = ip.match(/^172\.(\d+)\./);
  return Boolean(m) && Number(m[1]) >= 16 && Number(m[1]) <= 31;
};

async function cmdConsole(args) {
  const portIdx = args.indexOf("--port");
  const port = portIdx >= 0 ? Number(args[portIdx + 1]) : 4770;
  const lan = args.includes("--lan"); // opt-in: also answer the private network

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const name = url.pathname === "/" ? "app.html" : url.pathname.replace(/^\/+/, "");
    const sendJson = (status, payload) => {
      res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(payload));
    };
    if (!isLoopback(req) && !(lan && isPrivate(req))) {
      res.writeHead(403);
      return res.end(lan ? "localhost or your private network only" : "localhost only — run with --lan for your home network");
    }

    // ---- task writes: add, move/reposition, cancel (stable IDs, not lines)
    if (req.method === "POST" && (url.pathname === "/task/add" || url.pathname === "/task/move" || url.pathname === "/task/cancel")) {
      const origin = req.headers.origin;
      const originHost = origin && origin.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const sameHost = originHost && originHost === String(req.headers.host || "");
      if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin) && !(lan && sameHost))
        return sendJson(403, { ok: false, error: "cross-origin write refused" });
      let body = null;
      try { body = JSON.parse(await readBody(req)); } catch { /* answered below */ }
      const kind = url.pathname.slice("/task/".length);
      const shapeError = () => sendJson(400, { ok: false, error: "bad request shape" });

      if (kind === "add") {
        if (!body || typeof body.project !== "string" || !SECTIONS.includes(body.section) ||
            typeof body.title !== "string" ||
            (body.priority != null && typeof body.priority !== "string") ||
            (body.spec != null && typeof body.spec !== "string") ||
            (body.prompt != null && typeof body.prompt !== "string") ||
            (body.desc != null && typeof body.desc !== "string")) return shapeError();
        const project = registry.projects.find((p) => p.id === body.project);
        if (!project) return sendJson(404, { ok: false, error: `unknown project: ${body.project}` });
        try {
          const out = await taskAdd(project, {
            section: body.section,
            title: body.title,
            priority: body.priority || null,
            spec: body.spec || null,
            prompt: body.prompt || null,
            desc: body.desc || null,
          });
          return sendJson(200, { ok: true, id: out.id, at: { section: out.section, index: out.index }, data: await freshScan() });
        } catch (err) {
          const status = /duplicate:|not migrated|no task store/.test(err.message) ? 409 : 400;
          return sendJson(status, { ok: false, error: err.message });
        }
      }

      if (!body || typeof body.id !== "string") return shapeError();
      const id = body.id;
      const project = findProjectById(id);
      if (!project) return sendJson(404, { ok: false, error: `task not found: ${id}` });
      try {
        if (kind === "move") {
          if (!SECTIONS.includes(body.to) ||
              !(body.before === undefined || body.before === null || typeof body.before === "string"))
            return shapeError();
          const out = await taskMove(project, id, body.to, body.before);
          if (out.noop) return sendJson(200, { ok: true, noop: true });
          return sendJson(200, { ok: true, at: { section: out.section, index: out.index }, data: await freshScan() });
        }
        await taskCancel(project, id);
        return sendJson(200, { ok: true, data: await freshScan() });
      } catch (err) {
        const status = /not found|is not in/.test(err.message) ? 404 : /not migrated|no task store/.test(err.message) ? 409 : 400;
        return sendJson(status, { ok: false, error: err.message });
      }
    }
    if (req.method !== "GET") { res.writeHead(405); return res.end("method not allowed"); }

    if (name === "app.html" || name === "index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(fs.readFileSync(path.join(consoleDir, "app.html"), "utf8"));
    }
    if (name === "data.json") {
      const data = await freshScan();
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify(data));
    }
    if (name === "open") {
      // Local convenience: hand an allowlisted path to the OS opener. Stays
      // loopback-only even with --lan — it acts on this Mac, not the browser.
      if (!isLoopback(req)) { res.writeHead(403); return res.end("open runs on the mac only"); }
      const raw = url.searchParams.get("path") || "";
      if (!raw) { res.writeHead(400); return res.end("missing path"); }
      const target = raw.startsWith("~/") ? path.join(os.homedir(), raw.slice(2)) : path.resolve(raw);
      if (!fs.existsSync(target)) { res.writeHead(404); return res.end("not found"); }
      const real = (p) => { try { return fs.realpathSync(p); } catch { return null; } };
      const roots = [
        HUB,
        expand(registry.scratchRoot),
        expand(registry.worktreesRoot || "~/dev/.onepersonco/worktrees"),
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

  const data = await scanAll();
  const h = data.health;
  const healthLine = h.errors + h.warnings + h.infos ? `health: ${healthCounts(h)}` : "health: clean";
  const pending = data.projects.filter((p) => p.exists && !p.backlog).map((p) => p.id);
  server.listen(port, lan ? "0.0.0.0" : "127.0.0.1", () => {
    console.log(`opc console → http://localhost:${port}`);
    if (lan) {
      const nets = Object.entries(os.networkInterfaces())
        .flatMap(([name, addrs]) => (addrs || []).map((a) => ({ name, ...a })));
      const ip = (nets.find((a) => a.family === "IPv4" && !a.internal && a.name.startsWith("en")) ||
        nets.find((a) => a.family === "IPv4" && !a.internal))?.address;
      console.log(`lan → http://${ip || "<this mac's wifi ip>"}:${port} — same wifi only; anyone on it can read and edit backlogs`);
    }
    console.log(healthLine);
    console.log(`pending retrofit: ${pending.length ? pending.join(", ") : "none"} — data rescans on every load`);
  });
}

// ---------------------------------------------------------------- main

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "sync") return cmdSync(args);
  if (cmd === "check") return cmdCheck(args);
  if (cmd === "scan") return cmdScan(args);
  if (cmd === "console") return cmdConsole(args);
  if (cmd === "task") {
    try { return await cmdTask(args); } catch (err) { console.error(err.message); process.exit(1); }
  }
  console.log("usage:\n  opc sync [project…] [--dir <checkout>]   compose standards into standardized projects (all, or named ones)\n  opc check [--json] [--dir <checkout>]    deterministic health checks (exit 1 on errors)\n  opc scan [--snapshot]   write console/data.json (and a self-contained snapshot.html)\n  opc console [--port N] [--lan]  serve the console; --lan also answers your home wifi\n  opc task add|list|show|move|edit|done|cancel|migrate|init   task store; IDs are assigned by add\n  sync/check follow the checkout you run them from; --dir overrides");
  process.exit(2);
}

main().catch((err) => {
  console.error(`opc ${process.argv[2] || ""} failed: ${err.message}`);
  process.exit(1);
});
