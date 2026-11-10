import type {
  CvProfile,
  JobAd,
  Length,
  LetterLanguage,
  MatchResult,
  Settings,
  Tone,
  UiLanguage,
} from "../types";
import type { MsgKey } from "./i18n";

export const AD_SYSTEM = `Du är en noggrann analytiker som läser jobbannonser.
Extrahera bara det som faktiskt står i annonsen. Hitta inte på krav, deadline eller
kontaktperson som inte finns i texten — använd tom sträng när uppgiften saknas.
Dela upp långa kravmeningar i ett kort kravpåstående per post.`;

export const CV_SYSTEM = `Du läser ett CV och strukturerar innehållet.
Återge bara vad som står i dokumentet. Lägg inte till kompetenser, årtal eller
resultat som inte finns där. Behåll originalets formuleringar i highlights så att de
senare kan användas som citat. Om CV:t är på svenska, behåll svenska formuleringar.`;

export const MATCH_SYSTEM = `Du jämför ett CV mot kraven i en jobbannons och är ärlig,
inte snäll. Ett krav är "matchad" bara om CV:t innehåller konkret stöd för det,
"delvis" om det finns närliggande erfarenhet, och "saknas" om stödet inte finns.
Fältet evidence måste vara ett ordagrant citat ur CV-underlaget — hittar du inget
citat ska statusen inte vara "matchad". Var sparsam med "matchad".`;

export const LETTER_SYSTEM = `Du skriver personliga brev till jobbansökningar
tillsammans med den sökande. Du skriver i jag-form som den sökande.

Absoluta regler:
- Påstå ingenting som inte går att härleda ur CV-underlaget. Inga uppdiktade
  arbetsgivare, år, siffror, certifikat eller tekniker.
- Krav som saknas i CV:t ska inte påstås vara uppfyllda. Antingen utelämnar du dem,
  eller formulerar dem som nyfikenhet och vilja att lära — kort, och högst en gång.
- Inga floskler: undvik "jag är exalterad över möjligheten", "passion för",
  "driven och engagerad lagspelare", "jag tror att jag skulle passa perfekt".
- Konkret före adjektiv: hellre vad personen gjort och vad det ledde till än hur
  personen är.
- Inga platshållare som [Företag] eller [ditt namn]. Saknas en uppgift, skriv runt den.

Form:
- Ren löptext i stycken, inga rubriker, ingen markdown, inga punktlistor,
  inga kodstaplar. Tomrad mellan stycken.
- Inled med en hälsning och avsluta med en vänlig avslutning och avsändarens namn,
  men ingen adressrad eller datumrad — det läggs på vid export.
- Svara med brevet och ingenting annat. Ingen förklaring, inga kommentarer.`;

export function adPrompt(adText: string): string {
  return `Analysera den här jobbannonsen.\n\n--- ANNONS ---\n${adText}\n--- SLUT ---`;
}

export function cvPrompt(rawText?: string): string {
  return rawText
    ? `Strukturera det här CV:t.\n\n--- CV ---\n${rawText}\n--- SLUT ---`
    : `Strukturera CV:t i den bifogade filen.`;
}

/**
 * Fritexten i matchningen (strengths, missing, comment) visas i gränssnittet och
 * följer därför appspråket. Citaten i evidence måste alltid vara ordagranna ur
 * CV:t och översätts aldrig.
 */
const MATCH_OUTPUT_LANGUAGE: Record<UiLanguage, string> = {
  sv: "Skriv strengths, missing och comment på svenska.",
  en: "Write strengths, missing and comment in English, even when the CV and the ad are in Swedish. Leave every evidence quote verbatim in its original language.",
};

export function matchPrompt(
  ad: JobAd,
  cv: CvProfile,
  cvRawText: string,
  uiLanguage: UiLanguage,
): string {
  return `Jämför CV:t mot annonsens krav.

Gå igenom varje post i requirements, och lägg till de poster i niceToHave som är
tydligt viktiga för rollen. Basera citaten på CV-råtexten.

Språk: ${MATCH_OUTPUT_LANGUAGE[uiLanguage]}

--- ANNONS (strukturerad) ---
${JSON.stringify({ role: ad.role, company: ad.company, requirements: ad.requirements, niceToHave: ad.niceToHave, responsibilities: ad.responsibilities, keywords: ad.keywords }, null, 2)}

--- CV (strukturerad) ---
${JSON.stringify(cv, null, 2)}

--- CV (råtext) ---
${cvRawText}
--- SLUT ---`;
}

const LENGTH_GUIDE: Record<Length, string> = {
  kort: "Omkring 170-220 ord, tre stycken.",
  medel: "Omkring 280-350 ord, tre till fyra stycken.",
  lång: "Omkring 400-480 ord, fyra till fem stycken.",
};

const TONE_GUIDE: Record<Tone, string> = {
  formell:
    "Sakligt och korrekt språk, artigt avstånd, inga utropstecken. Du-tilltal till läsaren men ingen jargong.",
  personlig:
    "Varm och mänsklig ton, talspråksnära men vårdad. Får gärna visa nyfikenhet och egen röst.",
  driven:
    "Rakt och energiskt, korta meningar, fokus på resultat och vad jag vill åstadkomma i rollen. Aldrig skrytsamt utan täckning.",
};

const LANGUAGE_GUIDE: Record<LetterLanguage, string> = {
  svenska: "Skriv brevet på svenska.",
  engelska: "Write the letter in English, even if the job ad or CV is in Swedish.",
};

export interface LetterAngle {
  labelKey: MsgKey;
  instruction: string;
}

/** De två varianterna skiljer sig i upplägg, inte i fakta. */
export const LETTER_ANGLES: LetterAngle[] = [
  {
    labelKey: "letter.angleMerits",
    instruction:
      "Gå rakt på sak: öppna med vilken tjänst det gäller och den starkaste konkreta meriten för just den här rollen. Bygg brevet kring två-tre bevis ur CV:t som matchar kraven.",
  },
  {
    labelKey: "letter.angleMotivation",
    instruction:
      "Öppna med en konkret och trovärdig krok om varför just den här rollen eller verksamheten är intressant, grundad i något jag faktiskt gjort. Väv därefter in meriterna som stöd. Ingen allmän artighet om 'ert spännande företag'.",
  },
];

export function letterPrompt(args: {
  ad: JobAd;
  cv: CvProfile;
  cvRawText: string;
  match: MatchResult | null;
  tone: Tone;
  length: Length;
  language: LetterLanguage;
  settings: Settings;
  angle: LetterAngle;
}): string {
  const { ad, cv, cvRawText, match, tone, length, language, settings, angle } = args;

  const sender = [
    settings.senderName && `Namn: ${settings.senderName}`,
    settings.senderEmail && `E-post: ${settings.senderEmail}`,
    settings.senderPhone && `Telefon: ${settings.senderPhone}`,
    settings.senderCity && `Ort: ${settings.senderCity}`,
  ]
    .filter(Boolean)
    .join("\n");

  const matchBlock = match
    ? `--- MATCHNING MOT KRAVEN ---
Starkaste argumenten: ${match.strengths.join("; ") || "–"}
Detta saknas i CV:t och får inte påstås: ${match.missing.join("; ") || "–"}
Kravstatus:
${match.items
  .map(
    (i) =>
      `- [${i.status}] ${i.requirement}${i.evidence ? ` | citat: "${i.evidence}"` : ""}`,
  )
  .join("\n")}
`
    : "";

  return `Skriv ett personligt brev till den här ansökan.

Upplägg: ${angle.instruction}
Ton: ${TONE_GUIDE[tone]}
Längd: ${LENGTH_GUIDE[length]}
Språk: ${LANGUAGE_GUIDE[language]}
${ad.contactPerson ? `Brevet kan adresseras till ${ad.contactPerson}.` : "Ingen kontaktperson är känd — använd en neutral hälsning."}

--- TJÄNSTEN ---
${JSON.stringify(ad, null, 2)}

--- MIN PROFIL ---
${JSON.stringify(cv, null, 2)}

--- MITT CV (råtext, sanningskällan) ---
${cvRawText}

${matchBlock}
${sender ? `--- AVSÄNDARE ---\n${sender}\n` : ""}
Svara med brevet och ingenting annat.`;
}

export function refinePrompt(current: string, instruction: string): string {
  return `Här är brevet som det ser ut nu:

--- BREV ---
${current}
--- SLUT ---

Ändra det enligt följande önskemål: ${instruction}

Behåll allt annat som det är, och lägg inte till några nya faktapåståenden utöver
dem som redan finns i brevet och i CV-underlaget. Svara med hela det omarbetade
brevet och ingenting annat.`;
}
