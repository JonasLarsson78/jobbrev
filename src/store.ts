import { create } from "zustand";
import type { GoogleGenAI } from "@google/genai";
import {
  DEFAULT_SETTINGS,
  type JobAd,
  type Length,
  type LetterLanguage,
  type LetterVariant,
  type MatchResult,
  type Settings,
  type StoredCv,
  type Tone,
} from "./types";
import {
  analyzeAd as callAnalyzeAd,
  createClient,
  friendlyError,
  matchCv as callMatchCv,
  parseCv as callParseCv,
  streamText,
  type OnFallback,
} from "./lib/gemini";
import { LETTER_ANGLES, LETTER_SYSTEM, letterPrompt, refinePrompt } from "./lib/prompts";
import { keychain } from "./lib/keychain";
import { loadCv, loadSettings, saveCv, saveSettings } from "./lib/storage";
import { readCvFile } from "./lib/cvImport";

type Notice = { kind: "error" | "info"; text: string } | null;

interface BusyFlags {
  ad: boolean;
  cv: boolean;
  match: boolean;
  letter: boolean;
}

export type KeySource = "env" | "keychain" | null;

interface AppState {
  ready: boolean;
  apiKey: string | null;
  keySource: KeySource;
  settings: Settings;
  settingsOpen: boolean;

  adText: string;
  ad: JobAd | null;
  cv: StoredCv | null;
  match: MatchResult | null;

  variants: LetterVariant[];
  activeVariant: number;

  tone: Tone;
  length: Length;
  language: LetterLanguage;

  busy: BusyFlags;
  notice: Notice;

  init: () => Promise<void>;
  notify: (notice: Notice) => void;
  openSettings: (open: boolean) => void;

  storeApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;

  setAdText: (text: string) => void;
  analyzeAd: () => Promise<void>;
  patchAd: (patch: Partial<JobAd>) => void;

  importCv: (path: string) => Promise<void>;
  setCvRawText: (text: string) => void;
  reparseCv: () => Promise<void>;

  runMatch: () => Promise<void>;

  setTone: (tone: Tone) => void;
  setLength: (length: Length) => void;
  setLanguage: (language: LetterLanguage) => void;

  generateLetters: () => Promise<void>;
  refineLetter: (instruction: string) => Promise<void>;
  setVariantText: (index: number, text: string) => void;
  setActiveVariant: (index: number) => void;
  cancel: () => void;
}

/** En klient per nyckel räcker — SDK:n är statslös mellan anropen. */
let cachedClient: { key: string; client: GoogleGenAI } | null = null;
let controller: AbortController | null = null;

async function clientFor(apiKey: string): Promise<GoogleGenAI> {
  if (cachedClient?.key !== apiKey) {
    cachedClient = { key: apiKey, client: await createClient(apiKey) };
  }
  return cachedClient.client;
}

/** Nyckeln i .env (VITE_GEMINI_API_KEY) vinner över den i Nyckelhanteraren. */
function envApiKey(): string | null {
  const key = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  return key ? key : null;
}

/** Visas som en notis när en överbelastad modell tvingar fram ett byte. */
function fallbackNotice(set: SetState): OnFallback {
  return (model) => set({ notice: { kind: "info", text: `Byter till ${model}…` } });
}

function freshController(): AbortController {
  controller?.abort();
  controller = new AbortController();
  return controller;
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  apiKey: null,
  keySource: null,
  settings: DEFAULT_SETTINGS,
  settingsOpen: false,

  adText: "",
  ad: null,
  cv: null,
  match: null,

  variants: [],
  activeVariant: 0,

  tone: DEFAULT_SETTINGS.defaultTone,
  length: DEFAULT_SETTINGS.defaultLength,
  language: DEFAULT_SETTINGS.defaultLanguage,

  busy: { ad: false, cv: false, match: false, letter: false },
  notice: null,

  async init() {
    const fromEnv = envApiKey();
    const [settings, cv, fromKeychain] = await Promise.all([
      loadSettings(),
      loadCv(),
      fromEnv ? Promise.resolve(null) : keychain.get().catch(() => null),
    ]);
    const apiKey = fromEnv ?? fromKeychain;
    set({
      ready: true,
      settings,
      cv,
      apiKey,
      keySource: fromEnv ? "env" : apiKey ? "keychain" : null,
      tone: settings.defaultTone,
      length: settings.defaultLength,
      language: settings.defaultLanguage,
      settingsOpen: !apiKey,
    });
  },

  notify: (notice) => set({ notice }),
  openSettings: (settingsOpen) => set({ settingsOpen }),

  async storeApiKey(key) {
    await keychain.save(key);
    set({ apiKey: key.trim(), keySource: "keychain" });
  },

  async clearApiKey() {
    await keychain.remove();
    cachedClient = null;
    const fromEnv = envApiKey();
    set({ apiKey: fromEnv, keySource: fromEnv ? "env" : null });
  },

  async updateSettings(patch) {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    await saveSettings(settings);
  },

  setAdText: (adText) => set({ adText }),

  patchAd: (patch) => {
    const ad = get().ad;
    if (ad) set({ ad: { ...ad, ...patch } });
  },

  async analyzeAd() {
    const { adText, apiKey, settings, cv } = get();
    if (!apiKey) return set({ notice: { kind: "error", text: "Lägg in din API-nyckel först." } });
    if (adText.trim().length < 40)
      return set({ notice: { kind: "error", text: "Klistra in hela annonsen först." } });

    set({ busy: { ...get().busy, ad: true }, notice: null });
    try {
      const ad = await callAnalyzeAd(
        await clientFor(apiKey),
        settings.model,
        adText.trim(),
        freshController().signal,
        fallbackNotice(set),
      );
      set({ ad, match: null, variants: [] });
      if (cv) await get().runMatch();
    } catch (err) {
      set({ notice: { kind: "error", text: friendlyError(err) } });
    } finally {
      set({ busy: { ...get().busy, ad: false } });
    }
  },

  async importCv(path) {
    const { apiKey, settings } = get();
    if (!apiKey) return set({ notice: { kind: "error", text: "Lägg in din API-nyckel först." } });

    set({ busy: { ...get().busy, cv: true }, notice: null });
    try {
      const source = await readCvFile(path);
      const profile = await callParseCv(
        await clientFor(apiKey),
        settings.model,
        { rawText: source.rawText, pdf: source.pdf },
        freshController().signal,
        fallbackNotice(set),
      );
      // För PDF:er finns ingen lokal råtext, så vi bygger en läsbar sanningskälla
      // av den strukturerade profilen i stället.
      const rawText = source.rawText ?? profileToText(profile);
      const stored: StoredCv = {
        profile,
        rawText,
        sourceFile: source.fileName,
        importedAt: new Date().toISOString(),
      };
      await saveCv(stored);
      set({ cv: stored, match: null });
      set({ notice: { kind: "info", text: `CV inläst från ${source.fileName}.` } });
      if (get().ad) await get().runMatch();
    } catch (err) {
      set({ notice: { kind: "error", text: friendlyError(err) } });
    } finally {
      set({ busy: { ...get().busy, cv: false } });
    }
  },

  setCvRawText(text) {
    const cv = get().cv;
    if (!cv) return;
    const next = { ...cv, rawText: text };
    set({ cv: next });
    void saveCv(next);
  },

  async reparseCv() {
    const { apiKey, settings, cv } = get();
    if (!apiKey || !cv) return;
    set({ busy: { ...get().busy, cv: true }, notice: null });
    try {
      const profile = await callParseCv(
        await clientFor(apiKey),
        settings.model,
        { rawText: cv.rawText },
        freshController().signal,
        fallbackNotice(set),
      );
      const next = { ...cv, profile };
      await saveCv(next);
      set({ cv: next, match: null });
      if (get().ad) await get().runMatch();
    } catch (err) {
      set({ notice: { kind: "error", text: friendlyError(err) } });
    } finally {
      set({ busy: { ...get().busy, cv: false } });
    }
  },

  async runMatch() {
    const { apiKey, settings, ad, cv } = get();
    if (!apiKey || !ad || !cv) return;
    set({ busy: { ...get().busy, match: true } });
    try {
      const match: MatchResult = await callMatchCv(
        await clientFor(apiKey),
        settings.model,
        ad,
        cv.profile,
        cv.rawText,
        freshController().signal,
        fallbackNotice(set),
      );
      set({ match });
    } catch (err) {
      set({ notice: { kind: "error", text: friendlyError(err) } });
    } finally {
      set({ busy: { ...get().busy, match: false } });
    }
  },

  setTone: (tone) => set({ tone }),
  setLength: (length) => set({ length }),
  setLanguage: (language) => set({ language }),

  async generateLetters() {
    const { apiKey, settings, ad, cv, match, tone, length, language } = get();
    if (!apiKey) return set({ notice: { kind: "error", text: "Lägg in din API-nyckel först." } });
    if (!ad) return set({ notice: { kind: "error", text: "Analysera annonsen först." } });
    if (!cv) return set({ notice: { kind: "error", text: "Läs in ditt CV först." } });

    const signal = freshController().signal;
    set({
      notice: null,
      activeVariant: 0,
      busy: { ...get().busy, letter: true },
      variants: LETTER_ANGLES.map((angle, i) => ({
        id: `v${i}`,
        label: angle.label,
        text: "",
        streaming: true,
      })),
    });

    const client = await clientFor(apiKey);
    await Promise.all(
      LETTER_ANGLES.map(async (angle, index) => {
        try {
          const prompt = letterPrompt({
            ad,
            cv: cv.profile,
            cvRawText: cv.rawText,
            match,
            tone,
            length,
            language,
            settings,
            angle,
          });
          const text = await streamText(
            client,
            settings.model,
            LETTER_SYSTEM,
            prompt,
            (soFar) => patchVariant(set, get, index, { text: soFar }),
            signal,
            fallbackNotice(set),
          );
          patchVariant(set, get, index, { text, streaming: false });
        } catch (err) {
          patchVariant(set, get, index, { streaming: false, error: friendlyError(err) });
        }
      }),
    );

    set({ busy: { ...get().busy, letter: false } });
  },

  async refineLetter(instruction) {
    const { apiKey, settings, variants, activeVariant } = get();
    const variant = variants[activeVariant];
    if (!apiKey || !variant || !variant.text.trim()) return;

    const signal = freshController().signal;
    set({ busy: { ...get().busy, letter: true }, notice: null });
    patchVariant(set, get, activeVariant, { streaming: true, error: undefined });
    const before = variant.text;
    try {
      const text = await streamText(
        await clientFor(apiKey),
        settings.model,
        LETTER_SYSTEM,
        refinePrompt(before, instruction),
        (soFar) => patchVariant(set, get, activeVariant, { text: soFar }),
        signal,
        fallbackNotice(set),
      );
      patchVariant(set, get, activeVariant, { text, streaming: false });
    } catch (err) {
      patchVariant(set, get, activeVariant, {
        text: before,
        streaming: false,
        error: friendlyError(err),
      });
    } finally {
      set({ busy: { ...get().busy, letter: false } });
    }
  },

  setVariantText: (index, text) => patchVariant(set, get, index, { text }),
  setActiveVariant: (activeVariant) => set({ activeVariant }),

  cancel() {
    controller?.abort();
    controller = null;
    set({
      busy: { ad: false, cv: false, match: false, letter: false },
      variants: get().variants.map((v) => ({ ...v, streaming: false })),
    });
  },
}));

type SetState = (partial: Partial<AppState>) => void;
type GetState = () => AppState;

function patchVariant(
  set: SetState,
  get: GetState,
  index: number,
  patch: Partial<LetterVariant>,
): void {
  set({
    variants: get().variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
  });
}

/** Läsbar sanningskälla när originalet var en PDF vi inte textextraherat lokalt. */
function profileToText(p: {
  name: string;
  headline: string;
  summary: string;
  roles: { title: string; company: string; period: string; highlights: string[] }[];
  skills: string[];
  education: { program: string; school: string; period: string }[];
  achievements: string[];
}): string {
  const lines = [p.name, p.headline, "", p.summary, "", "ERFARENHET"];
  for (const role of p.roles) {
    lines.push(`${role.title} — ${role.company} (${role.period})`);
    lines.push(...role.highlights.map((h) => `  - ${h}`));
  }
  lines.push("", "KOMPETENSER", p.skills.join(", "), "", "UTBILDNING");
  lines.push(...p.education.map((e) => `${e.program} — ${e.school} (${e.period})`));
  if (p.achievements.length) lines.push("", "RESULTAT", ...p.achievements.map((a) => `- ${a}`));
  return lines.join("\n");
}
