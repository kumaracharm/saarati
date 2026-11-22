// Throwaway reproduction harness. Loads the REAL frontend/components/*.tsx
// (transpiled with the project's own typescript) and drives their handlers.
// Stubs: React hooks (minimal), react/jsx-runtime (plain objects), and
// project libs that ProfileForm imports (storage/api/labels/etc.).
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const ts = require(path.join(root, "frontend", "node_modules", "typescript"));

// ---------- minimal hook runtime ----------
let cur = null;
function render(inst) {
  cur = inst;
  inst.idx = 0;
  const pending = [];
  inst.pendingRef = pending;
  const tree = inst.Component(inst.props);
  cur = null;
  inst.last = tree;
  for (const run of pending) run();
  return inst.last;
}
const hooks = {
  useState(init) {
    const inst = cur;
    const i = inst.idx++;
    if (!(i in inst.hooks)) {
      inst.hooks[i] = { v: typeof init === "function" ? init() : init };
    }
    const h = inst.hooks[i];
    const set = (nv) => {
      const val = typeof nv === "function" ? nv(h.v) : nv;
      if (Object.is(val, h.v)) return;
      h.v = val;
      render(inst);
    };
    return [h.v, set];
  },
  useEffect(fn, deps) {
    const inst = cur;
    const i = inst.idx++;
    const h = inst.hooks[i];
    const changed =
      !h || !deps || deps.some((d, k) => !Object.is(d, h.deps[k]));
    inst.hooks[i] = { deps };
    if (changed) inst.pendingRef.push(() => fn());
  },
  useRef(init) {
    const inst = cur;
    const i = inst.idx++;
    if (!(i in inst.hooks)) inst.hooks[i] = { current: init };
    return inst.hooks[i];
  },
};

// ---------- tree helpers ----------
function findAll(node, pred, out = []) {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    node.forEach((n) => findAll(n, pred, out));
    return out;
  }
  if (pred(node)) out.push(node);
  if (node.props) findAll(node.props.children, pred, out);
  return out;
}
function text(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  if (node.props) return text(node.props.children);
  return "";
}

// ---------- module loader ----------
function loadTsx(relPath, stubs) {
  const src = fs.readFileSync(path.join(root, relPath), "utf8");
  const out = ts.transpileModule(src, {
    fileName: relPath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = { exports: {} };
  const req = (name) => {
    if (name in stubs) return stubs[name];
    throw new Error("unstubbed import: " + name);
  };
  new Function("require", "module", "exports", out)(req, mod, mod.exports);
  return mod.exports;
}

const jsxRuntime = {
  jsx: (type, props) => ({ type, props }),
  jsxs: (type, props) => ({ type, props }),
  Fragment: "Fragment",
};
const reactStub = { useState: hooks.useState, useEffect: hooks.useEffect, useRef: hooks.useRef };

// Per-language state read by the useLanguage stub.
let LANG = "en";
const languageStub = { useLanguage: () => ({ lang: LANG }) };

// ---------- fake Web Speech API ----------
const instances = [];
let startThrows = false;
class FakeSR {
  constructor() {
    this.started = 0;
    this.stopped = 0;
    instances.push(this);
  }
  start() {
    if (startThrows) throw new Error("start failed");
    this.started++;
  }
  stop() {
    this.stopped++;
  }
  abort() {}
}

function mountVoice(Comp, props) {
  const inst = { Component: Comp, props, hooks: {}, idx: 0 };
  render(inst);
  return inst;
}
const tree = (inst) => inst.last;
function micButton(inst) {
  return findAll(tree(inst), (n) => n.type === "button")[0];
}
function errorText(inst) {
  const d = findAll(tree(inst), (n) => n.type === "div" && n.props["aria-live"] === "polite")[0];
  return d ? text(d.props.children) : "";
}

// ---------- VoiceInput checks ----------
const voiceStubs = { react: reactStub, "react/jsx-runtime": jsxRuntime, "./LanguageProvider": languageStub };
const VoiceModule = loadTsx("frontend/components/VoiceInput.tsx", voiceStubs);
const VoiceInput = VoiceModule.default;

function voiceState(inst, label) {
  const b = micButton(inst);
  return `${label}: listening(aria-pressed)=${b.props["aria-pressed"]} label="${text(b.props.children)}" error="${errorText(inst)}"`;
}

function runVoice(lang) {
  LANG = lang;
  console.log(`\n=== VoiceInput lang=${lang} (recognition.lang expected ${lang === "kn" ? "kn-IN" : "en-IN"}) ===`);

  // A: start -> error -> stop (onend)
  {
    instances.length = 0; startThrows = false;
    globalThis.window.SpeechRecognition = FakeSR;
    const inst = mountVoice(VoiceInput, { onTranscript: () => {} });
    micButton(inst).props.onClick();
    const rec = instances[0];
    console.log(`A start: recognition.lang="${rec.lang}" started=${rec.started}`);
    console.log("A " + voiceState(inst, "after start"));
    rec.onerror({ error: "network" });
    console.log("A " + voiceState(inst, "after error"));
    rec.onend();
    console.log("A " + voiceState(inst, "after stop(onend)"));
  }

  // B: start -> click again (stop path) -> onend
  {
    instances.length = 0; startThrows = false;
    const inst = mountVoice(VoiceInput, { onTranscript: () => {} });
    micButton(inst).props.onClick();
    const rec = instances[0];
    micButton(inst).props.onClick();
    console.log(`B after stop click: recognition.stopped=${rec.stopped}`);
    console.log("B " + voiceState(inst, "before onend"));
    rec.onend();
    console.log("B " + voiceState(inst, "after onend"));
  }

  // C: start -> start() throws synchronously
  {
    instances.length = 0; startThrows = true;
    const inst = mountVoice(VoiceInput, { onTranscript: () => {} });
    micButton(inst).props.onClick();
    console.log("C " + voiceState(inst, "after start() throws"));
    startThrows = false;
  }
}

function runVoiceUnsupported(lang) {
  LANG = lang;
  delete globalThis.window.SpeechRecognition;
  delete globalThis.window.webkitSpeechRecognition;
  const inst = mountVoice(VoiceInput, { onTranscript: () => {} });
  const note = findAll(tree(inst), (n) => n.props && n.props.role === "note")[0];
  console.log(`\n=== VoiceInput lang=${lang} NO SpeechRecognition API ===`);
  console.log("note shown: " + (note ? `"${text(note.props.children)}"` : "NONE (no fallback text)"));
}

// ---------- ProfileForm checks ----------
const writes = [];
let matchImpl = null;
let pushed = [];
const profileStubs = {
  react: reactStub,
  "react/jsx-runtime": jsxRuntime,
  "next/navigation": { useRouter: () => ({ push: (p) => pushed.push(p) }) },
  "../lib/api": {
    extractProfile: async () => ({ profile: {}, is_mock: true, notes: [] }),
    matchProfile: (p) => matchImpl(p),
  },
  "../lib/intake": { containsSensitive: () => false, parseSituation: () => ({}) },
  "../lib/labels": new Proxy({ STATE_OPTIONS: [] }, { get: (t, k) => (k in t ? t[k] : {}) }),
  "../lib/localMatcher": { matchLocally: () => [{ local: true }] },
  "../lib/storage": {
    MATCHES_KEY: "matches",
    PROFILE_KEY: "profile",
    readJson: (k, d) => d,
    writeJson: (k, v, store) => writes.push({ k, v, store: store || "local" }),
  },
  "./LanguageProvider": languageStub,
  "./VoiceInput": { default: () => null },
};
const ProfileModule = loadTsx("frontend/components/ProfileForm.tsx", profileStubs);
const ProfileForm = ProfileModule.default;

function clickNamed(inst, label) {
  const b = findAll(tree(inst), (n) => n.type === "button" && n.props.children === label)[0];
  b.props.onClick();
}
function submitButtonText(inst) {
  const b = findAll(tree(inst), (n) => n.type === "button" && n.props.type === "submit")[0];
  return text(b.props.children);
}
async function submitAt(label, impl) {
  writes.length = 0; pushed = []; matchImpl = impl;
  LANG = "en";
  const inst = mountVoice(ProfileForm, {});
  clickNamed(inst, "Next");
  clickNamed(inst, "Next"); // now on step 3 (submit step)
  const form = findAll(tree(inst), (n) => n.type === "form")[0];
  const t0 = Date.now();
  await form.props.onSubmit({ preventDefault() {} });
  const ms = Date.now() - t0;
  const matches = writes.find((w) => w.k === "matches");
  const srcWrite = writes.filter((w) => w.store === "session").map((w) => `${w.k}=${JSON.stringify(w.v)}`);
  console.log(`\n--- ProfileForm: ${label} ---`);
  console.log(`elapsed=${ms}ms router.push=${JSON.stringify(pushed)}`);
  console.log(`session writes: ${srcWrite.join(", ")}`);
  console.log(`matches written: ${matches ? JSON.stringify(matches.v) : "NONE"}`);
  const sb = submitButtonText(inst);
  console.log(`submit button after finally: "${sb}" (submitting reset ${sb === "See my matches" ? "YES" : "NO"})`);
}

async function main() {
  globalThis.window = globalThis;
  for (const lang of ["en", "kn"]) runVoice(lang);
  for (const lang of ["en", "kn"]) runVoiceUnsupported(lang);

  await submitAt("API resolves", async () => ({ matches: [] }));
  await submitAt("API rejects (server error)", async () => {
    throw new Error("500");
  });
  await submitAt("API never settles (5s timeout)", () => new Promise(() => {}));
}

main().catch((e) => {
  console.error("HARNESS ERROR:", e);
  process.exitCode = 1;
});
