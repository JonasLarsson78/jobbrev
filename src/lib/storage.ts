import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { load, type Store } from "@tauri-apps/plugin-store";
import { DEFAULT_SETTINGS, type Settings, type StoredCv } from "../types";

const CV_DIR = "cv";
const CV_FILE = "cv/profile.json";

let storePromise: Promise<Store> | null = null;

function settingsStore(): Promise<Store> {
  storePromise ??= load("settings.json", { autoSave: true });
  return storePromise;
}

export async function loadSettings(): Promise<Settings> {
  const store = await settingsStore();
  const saved = await store.get<Partial<Settings>>("settings");
  return { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const store = await settingsStore();
  await store.set("settings", settings);
  await store.save();
}

export async function loadCv(): Promise<StoredCv | null> {
  if (!(await exists(CV_FILE, { baseDir: BaseDirectory.AppData }))) return null;
  try {
    const raw = await readTextFile(CV_FILE, { baseDir: BaseDirectory.AppData });
    return JSON.parse(raw) as StoredCv;
  } catch {
    // Trasig cache ska inte hindra appen från att starta.
    return null;
  }
}

export async function saveCv(cv: StoredCv): Promise<void> {
  if (!(await exists(CV_DIR, { baseDir: BaseDirectory.AppData }))) {
    await mkdir(CV_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  }
  await writeTextFile(CV_FILE, JSON.stringify(cv, null, 2), {
    baseDir: BaseDirectory.AppData,
  });
}
