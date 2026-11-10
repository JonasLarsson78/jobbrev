import { useSyncExternalStore } from "react";
import type { UiLanguage } from "../types";

/**
 * Appens texter på svenska och engelska. Svenska är sanningskällan: `en` måste
 * ha exakt samma nycklar, annars klagar typkontrollen.
 *
 * Språket ligger i modulen (inte bara i React-trädet) så att felmeddelanden i
 * store, gemini och exporterna kan översättas utan att dra in en hook.
 */
const sv = {
  "app.settings": "Inställningar",
  "app.starting": "Startar…",
  "app.dropCv": "Släpp CV:t här",
  "app.dropWrongType": "Släpp en PDF, .docx eller textfil.",

  "ad.title": "Annonsen",
  "ad.clear": "Rensa",
  "ad.analyze": "Analysera",
  "ad.placeholder": "Klistra in hela jobbannonsen här…",
  "ad.empty": "Klistra in annonsen och tryck Analysera för att plocka ut kraven.",
  "ad.deadline": "Sista dag: {date}",
  "ad.adTone": "Annonsens ton: {tone}",
  "ad.requirements": "Krav",
  "ad.niceToHave": "Meriterande",
  "ad.responsibilities": "Rollen innebär",

  "me.title": "Jag",
  "me.profile": "Profil",
  "me.rawText": "Råtext",
  "me.changeCv": "Byt CV",
  "me.chooseCv": "Välj CV…",
  "me.empty": "Dra in ditt CV i fönstret, eller välj en fil. PDF, Word (.docx) och text fungerar.",
  "me.rawHint": "Det här är underlaget breven grundas på. Rätta gärna felläsningar här.",
  "me.reparse": "Tolka om profilen",
  "me.noName": "Namn saknas",
  "me.experience": "Erfarenhet",
  "me.matchHeading": "Matchning mot annonsen",
  "me.recalculate": "Räkna om",
  "me.runMatch": "Matcha",
  "me.analyzeAdFirst": "Analysera en annons först.",
  "me.matching": "Jämför kraven mot ditt CV…",
  "me.noMatchYet": "Ingen matchning gjord än.",
  "me.missing": "Det här saknas",
  "me.strengths": "Starkaste argumenten",

  "status.matchad": "matchad",
  "status.delvis": "delvis",
  "status.saknas": "saknas",

  "letter.title": "Brevet",
  "letter.cancel": "Avbryt",
  "letter.rewrite": "Skriv om",
  "letter.write": "Skriv brev",
  "letter.needsBoth": "Kräver både analyserad annons och inläst CV",
  "letter.ready": "Allt är på plats. Tryck Skriv brev för att få två förslag.",
  "letter.notReady": "Analysera annonsen och läs in ditt CV, sedan skriver vi brevet.",
  "letter.placeholder": "Brevet skrivs ut här…",
  "letter.words": "{count} ord",
  "letter.copy": "Kopiera",
  "letter.saveMd": "Spara .md",
  "letter.saveWord": "Word",
  "letter.savePdf": "PDF",
  "letter.refinePlaceholder": "Förfina: t.ex. korta ned andra stycket",
  "letter.refine": "Förfina",
  "letter.copied": "Brevet är kopierat.",
  "letter.saved": "Sparat till {path}",
  "letter.wordFailed": "Kunde inte spara Word-filen: {error}",
  "letter.angleMerits": "Meriterna först",
  "letter.angleMotivation": "Motivationen först",

  "tone.formell": "Formell",
  "tone.personlig": "Personlig",
  "tone.driven": "Driven",
  "length.kort": "Kort",
  "length.medel": "Medel",
  "length.lång": "Lång",
  "letterLang.svenska": "Svenska",
  "letterLang.engelska": "Engelska",

  "settings.title": "Inställningar",
  "settings.intro":
    "Nyckeln läses från .env i projektroten. Saknas den där kan du lägga in den i macOS Nyckelhanterare i stället.",
  "settings.close": "Stäng",
  "settings.keyFromEnv":
    "Nyckeln läses från VITE_GEMINI_API_KEY i .env. Ändrar du filen behöver dev-servern startas om.",
  "settings.testKey": "Testa nyckeln",
  "settings.apiKeyLabel": "Gemini API-nyckel",
  "settings.keyHintExists": "En nyckel finns i Nyckelhanteraren. Skriv in en ny för att byta.",
  "settings.keyHintNew": "Lägg hellre nyckeln i .env — eller spara den här i Nyckelhanteraren.",
  "settings.keyPlaceholder": "Klistra in nyckeln",
  "settings.saveKey": "Spara nyckel",
  "settings.removeKey": "Ta bort",
  "settings.keySaved": "Nyckeln är sparad i Nyckelhanteraren.",
  "settings.pingOk": "{model} svarar: {answer}",
  "settings.pingFallback": "{model} var inte tillgänglig — {used} svarade i stället.",
  "settings.pingEmpty": "Modellen svarade tomt.",
  "settings.model": "Modell",
  "settings.uiLanguage": "Språk i appen",
  "settings.uiLanguageHint":
    "Gäller gränssnittet och matchningens kommentarer. Brevets språk väljer du i brevpanelen.",
  "settings.senderIntro": "Avsändaruppgifterna används i brevets avslutning och i PDF-exporten.",
  "settings.senderName": "Namn",
  "settings.senderCity": "Ort",
  "settings.senderEmail": "E-post",
  "settings.senderPhone": "Telefon",

  "model.gemini-flash-latest": "Flash (latest) — balanserad, standardval",
  "model.gemini-flash-lite-latest": "Flash Lite (latest) — snabbast",
  "model.gemini-3.8-flash": "Gemini 3.8 Flash — nyaste, ofta överbelastad",

  "err.needKey": "Lägg in din API-nyckel först.",
  "err.pasteAd": "Klistra in hela annonsen först.",
  "err.analyzeAdFirst": "Analysera annonsen först.",
  "err.loadCvFirst": "Läs in ditt CV först.",
  "err.invalidKey": "API-nyckeln godtas inte. Kontrollera VITE_GEMINI_API_KEY i .env.",
  "err.overloaded": "Alla modeller är överbelastade hos Google just nu. Försök igen om en stund.",
  "err.quota": "Kvoten är slut för nyckeln. Vänta en stund eller kontrollera din plan hos Google.",
  "err.modelMissing":
    "Modellen finns inte för den här nyckeln. Välj en annan modell i inställningarna.",
  "err.network": "Ingen kontakt med Google. Kontrollera nätverket.",
  "err.aborted": "Avbrutet.",

  "notice.cvLoaded": "CV inläst från {file}.",
  "notice.switchingModel": "Byter till {model}…",

  "gemini.emptyAt": "Tomt svar från Gemini vid {what}.",
  "gemini.parseFailedAt": "Kunde inte tolka svaret från Gemini vid {what}.",
  "gemini.empty": "Tomt svar från Gemini.",
  "what.ad": "analys av annonsen",
  "what.cv": "läsning av CV:t",
  "what.match": "matchningen mot CV:t",

  "cv.pickTitle": "Välj ditt CV",
  "cv.unsupported": "Filtypen .{ext} stöds inte. Använd PDF, Word (.docx) eller text.",
  "cv.wordEmpty": "Word-filen verkar tom.",
  "cv.fileEmpty": "Filen verkar tom.",

  "export.saveTitle": "Spara brevet",
  "export.saveWordTitle": "Spara brevet som Word",
  "export.wordFilter": "Word-dokument",
  "export.fileNamePrefix": "personligt-brev",
  "export.fileNameFallback": "brev",
  "export.company": "Företag",
  "export.role": "Tjänst",
  "export.deadline": "Sista ansökningsdag",
};

export type MsgKey = keyof typeof sv;

const en: Record<MsgKey, string> = {
  "app.settings": "Settings",
  "app.starting": "Starting…",
  "app.dropCv": "Drop your CV here",
  "app.dropWrongType": "Drop a PDF, .docx or text file.",

  "ad.title": "The ad",
  "ad.clear": "Clear",
  "ad.analyze": "Analyze",
  "ad.placeholder": "Paste the whole job ad here…",
  "ad.empty": "Paste the ad and press Analyze to pull out the requirements.",
  "ad.deadline": "Deadline: {date}",
  "ad.adTone": "Tone of the ad: {tone}",
  "ad.requirements": "Requirements",
  "ad.niceToHave": "Nice to have",
  "ad.responsibilities": "The role involves",

  "me.title": "Me",
  "me.profile": "Profile",
  "me.rawText": "Raw text",
  "me.changeCv": "Change CV",
  "me.chooseCv": "Choose CV…",
  "me.empty": "Drag your CV into the window, or pick a file. PDF, Word (.docx) and text all work.",
  "me.rawHint": "This is the source the letters are built on. Feel free to fix misreadings here.",
  "me.reparse": "Re-read the profile",
  "me.noName": "Name missing",
  "me.experience": "Experience",
  "me.matchHeading": "Match against the ad",
  "me.recalculate": "Recalculate",
  "me.runMatch": "Match",
  "me.analyzeAdFirst": "Analyze an ad first.",
  "me.matching": "Comparing the requirements with your CV…",
  "me.noMatchYet": "No match run yet.",
  "me.missing": "What's missing",
  "me.strengths": "Strongest arguments",

  "status.matchad": "matched",
  "status.delvis": "partial",
  "status.saknas": "missing",

  "letter.title": "The letter",
  "letter.cancel": "Cancel",
  "letter.rewrite": "Rewrite",
  "letter.write": "Write letter",
  "letter.needsBoth": "Requires both an analyzed ad and a loaded CV",
  "letter.ready": "Everything is in place. Press Write letter for two drafts.",
  "letter.notReady": "Analyze the ad and load your CV, then we'll write the letter.",
  "letter.placeholder": "The letter appears here…",
  "letter.words": "{count} words",
  "letter.copy": "Copy",
  "letter.saveMd": "Save .md",
  "letter.saveWord": "Word",
  "letter.savePdf": "PDF",
  "letter.refinePlaceholder": "Refine: e.g. shorten the second paragraph",
  "letter.refine": "Refine",
  "letter.copied": "The letter has been copied.",
  "letter.saved": "Saved to {path}",
  "letter.wordFailed": "Could not save the Word file: {error}",
  "letter.angleMerits": "Merits first",
  "letter.angleMotivation": "Motivation first",

  "tone.formell": "Formal",
  "tone.personlig": "Personal",
  "tone.driven": "Driven",
  "length.kort": "Short",
  "length.medel": "Medium",
  "length.lång": "Long",
  "letterLang.svenska": "Swedish",
  "letterLang.engelska": "English",

  "settings.title": "Settings",
  "settings.intro":
    "The key is read from .env in the project root. If it isn't there you can store it in the macOS Keychain instead.",
  "settings.close": "Close",
  "settings.keyFromEnv":
    "The key is read from VITE_GEMINI_API_KEY in .env. If you change the file, restart the dev server.",
  "settings.testKey": "Test the key",
  "settings.apiKeyLabel": "Gemini API key",
  "settings.keyHintExists": "A key is stored in the Keychain. Enter a new one to replace it.",
  "settings.keyHintNew": "Prefer putting the key in .env — or save it here in the Keychain.",
  "settings.keyPlaceholder": "Paste the key",
  "settings.saveKey": "Save key",
  "settings.removeKey": "Remove",
  "settings.keySaved": "The key is stored in the Keychain.",
  "settings.pingOk": "{model} answers: {answer}",
  "settings.pingFallback": "{model} wasn't available — {used} answered instead.",
  "settings.pingEmpty": "The model answered with nothing.",
  "settings.model": "Model",
  "settings.uiLanguage": "App language",
  "settings.uiLanguageHint":
    "Applies to the interface and the match commentary. You choose the letter's language in the letter panel.",
  "settings.senderIntro": "The sender details are used in the letter's sign-off and in the PDF export.",
  "settings.senderName": "Name",
  "settings.senderCity": "City",
  "settings.senderEmail": "Email",
  "settings.senderPhone": "Phone",

  "model.gemini-flash-latest": "Flash (latest) — balanced, the default",
  "model.gemini-flash-lite-latest": "Flash Lite (latest) — fastest",
  "model.gemini-3.8-flash": "Gemini 3.8 Flash — newest, often overloaded",

  "err.needKey": "Add your API key first.",
  "err.pasteAd": "Paste the whole ad first.",
  "err.analyzeAdFirst": "Analyze the ad first.",
  "err.loadCvFirst": "Load your CV first.",
  "err.invalidKey": "The API key was rejected. Check VITE_GEMINI_API_KEY in .env.",
  "err.overloaded": "All models are overloaded at Google right now. Try again in a moment.",
  "err.quota": "The key is out of quota. Wait a while or check your plan with Google.",
  "err.modelMissing": "That model doesn't exist for this key. Pick another model in settings.",
  "err.network": "No connection to Google. Check your network.",
  "err.aborted": "Cancelled.",

  "notice.cvLoaded": "CV loaded from {file}.",
  "notice.switchingModel": "Switching to {model}…",

  "gemini.emptyAt": "Empty response from Gemini while {what}.",
  "gemini.parseFailedAt": "Could not parse the response from Gemini while {what}.",
  "gemini.empty": "Empty response from Gemini.",
  "what.ad": "analyzing the ad",
  "what.cv": "reading the CV",
  "what.match": "matching against the CV",

  "cv.pickTitle": "Choose your CV",
  "cv.unsupported": "The file type .{ext} isn't supported. Use PDF, Word (.docx) or text.",
  "cv.wordEmpty": "The Word file appears to be empty.",
  "cv.fileEmpty": "The file appears to be empty.",

  "export.saveTitle": "Save the letter",
  "export.saveWordTitle": "Save the letter as Word",
  "export.wordFilter": "Word document",
  "export.fileNamePrefix": "cover-letter",
  "export.fileNameFallback": "letter",
  "export.company": "Company",
  "export.role": "Position",
  "export.deadline": "Application deadline",
};

const DICTS: Record<UiLanguage, Record<MsgKey, string>> = { sv, en };

/** Språken som går att välja, med namnen skrivna i sitt eget språk. */
export const UI_LANGUAGES: readonly { id: UiLanguage; label: string }[] = [
  { id: "sv", label: "Svenska" },
  { id: "en", label: "English" },
];

/** Datum i gränssnittet följer appspråket. */
const LOCALES: Record<UiLanguage, string> = { sv: "sv-SE", en: "en-GB" };

let current: UiLanguage = "sv";
const listeners = new Set<() => void>();

export function setUiLanguage(language: UiLanguage): void {
  if (language === current) return;
  current = language;
  document.documentElement.lang = language;
  for (const listener of listeners) listener();
}

export function uiLanguage(): UiLanguage {
  return current;
}

export function locale(): string {
  return LOCALES[current];
}

type Vars = Record<string, string | number>;

function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** Översätter med det språk som är valt just nu. */
export function t(key: MsgKey, vars?: Vars): string {
  return format(DICTS[current][key] ?? key, vars);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Som `t`, men komponenten ritas om när språket byts. Returnerar en ny funktion
 * vid språkbyte, vilket är precis vad som behövs för att React ska reagera.
 */
export function useT(): typeof t {
  const language = useSyncExternalStore(subscribe, uiLanguage, uiLanguage);
  return (key, vars) => format(DICTS[language][key] ?? key, vars);
}
