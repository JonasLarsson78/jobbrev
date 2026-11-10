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
  label: string;
  text: string;
  streaming: boolean;
  error?: string;
}

export const MODELS = [
  {
    id: "gemini-flash-latest",
    label: "Flash (latest) — balanserad, standardval",
  },
  {
    id: "gemini-flash-lite-latest",
    label: "Flash Lite (latest) — snabbast",
  },
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash — nyaste, ofta överbelastad",
  },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

/**
 * Ordningen appen faller tillbaka i när en modell svarar 503 eller 429.
 * Den valda modellen provas alltid först.
 */
export const MODEL_FALLBACK: readonly ModelId[] = [
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
];

export interface Settings {
  model: ModelId;
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
