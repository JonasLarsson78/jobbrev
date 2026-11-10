import type { MsgKey } from "./lib/i18n";

/** Strukturerade fakta ur jobbannonsen (steg 1 i AI-pipelinen). */
export interface JobAd {
  company: string;
  role: string;
  location: string;
  requirements: string[];
  niceToHave: string[];
  responsibilities: string[];
  tone: string;
  contactPerson: string;
  deadline: string;
  detectedLanguage: string;
  keywords: string[];
}

export interface CvRole {
  title: string;
  company: string;
  period: string;
  highlights: string[];
}

export interface CvEducation {
  program: string;
  school: string;
  period: string;
}

/** Strukturerad CV-profil (steg 2). Cachas i appens datamapp. */
export interface CvProfile {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  roles: CvRole[];
  skills: string[];
  education: CvEducation[];
  achievements: string[];
}

export type MatchStatus = "matchad" | "delvis" | "saknas";

export interface MatchItem {
  requirement: string;
  status: MatchStatus;
  evidence: string;
  comment: string;
}

/** Gap-analysen (steg 3). */
export interface MatchResult {
  score: number;
  items: MatchItem[];
  strengths: string[];
  missing: string[];
}

export type Tone = "formell" | "personlig" | "driven";
export type Length = "kort" | "medel" | "lång";
export type LetterLanguage = "svenska" | "engelska";

export interface LetterVariant {
  id: string;
  /** Rubriken översätts vid visning, så varianten håller bara nyckeln. */
  labelKey: MsgKey;
  text: string;
  streaming: boolean;
  error?: string;
}

/** Modellernas etiketter bor i i18n, under nyckeln `model.<id>`. */
export const MODELS = [
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
] as const;

export type ModelId = (typeof MODELS)[number];

/**
 * Ordningen appen faller tillbaka i när en modell svarar 503 eller 429.
 * Den valda modellen provas alltid först.
 */
export const MODEL_FALLBACK: readonly ModelId[] = [
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
];

/** Språket i gränssnittet — skilt från brevets språk (`LetterLanguage`). */
export type UiLanguage = "sv" | "en";

export interface Settings {
  model: ModelId;
  uiLanguage: UiLanguage;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  senderCity: string;
  defaultTone: Tone;
  defaultLength: Length;
  defaultLanguage: LetterLanguage;
}

export const DEFAULT_SETTINGS: Settings = {
  model: "gemini-flash-latest",
  uiLanguage: "sv",
  senderName: "",
  senderEmail: "",
  senderPhone: "",
  senderCity: "",
  defaultTone: "personlig",
  defaultLength: "medel",
  defaultLanguage: "svenska",
};

/** Det som sparas i cv/profile.json. */
export interface StoredCv {
  profile: CvProfile;
  rawText: string;
  sourceFile: string;
  importedAt: string;
}
