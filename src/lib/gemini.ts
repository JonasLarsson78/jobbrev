import type { GoogleGenAI, Part } from "@google/genai";
import { MODEL_FALLBACK, type CvProfile, type JobAd, type MatchResult, type ModelId } from "../types";
import { cvProfileSchema, jobAdSchema, matchSchema } from "./schemas";
import {
  AD_SYSTEM,
  CV_SYSTEM,
  MATCH_SYSTEM,
  adPrompt,
  cvPrompt,
  matchPrompt,
} from "./prompts";

/**
 * SDK 3 använder API-version v1 som standard, men `-latest`-aliasen finns bara
 * på v1beta — så vi ber uttryckligen om v1beta.
 *
 * SDK:n laddas dynamiskt: den behövs inte för att rita upp fönstret, bara när
 * det första anropet görs.
 */
export async function createClient(apiKey: string): Promise<GoogleGenAI> {
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1beta" } });
}

/** Gemini svarar ibland med ```json-staket runt JSON-objektet. */
function parseJson<T>(raw: string | undefined, what: string): T {
  if (!raw) throw new Error(`Tomt svar från Gemini vid ${what}.`);
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Kunde inte tolka svaret från Gemini vid ${what}.`);
  }
}

/** Gör felen läsbara i gränssnittet i stället för att visa råa HTTP-fel. */
export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/API key not valid|API_KEY_INVALID|401/.test(msg))
    return "API-nyckeln godtas inte. Kontrollera VITE_GEMINI_API_KEY i .env.";
  if (/UNAVAILABLE|503|high demand|overloaded/i.test(msg))
    return "Alla modeller är överbelastade hos Google just nu. Försök igen om en stund.";
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg))
    return "Kvoten är slut för nyckeln. Vänta en stund eller kontrollera din plan hos Google.";
  if (/404|NOT_FOUND/.test(msg))
    return "Modellen finns inte för den här nyckeln. Välj en annan modell i inställningarna.";
  if (/Failed to fetch|NetworkError|ENOTFOUND/i.test(msg))
    return "Ingen kontakt med Google. Kontrollera nätverket.";
  if (/abort/i.test(msg)) return "Avbrutet.";
  return msg;
}

/** 503, 429 och 500 är övergående — och värda att prova en annan modell på. */
function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /UNAVAILABLE|503|500|INTERNAL|high demand|overloaded|RESOURCE_EXHAUSTED|429/i.test(msg);
}

/** Den valda modellen först, sedan de övriga i fallback-ordning. */
function modelChain(preferred: ModelId): ModelId[] {
  return [preferred, ...MODEL_FALLBACK.filter((m) => m !== preferred)];
}

/** Rapporteras till gränssnittet när vi behövde byta modell. */
export type OnFallback = (model: ModelId, reason: string) => void;

const RETRY_DELAYS_MS = [900, 2500];

/**
 * Kör `attempt` mot varje modell i kedjan. Varje modell får några omförsök
 * innan vi går vidare till nästa — en överbelastad modell ska inte stoppa
 * ansökan när en annan är ledig.
 */
async function withFallback<T>(
  preferred: ModelId,
  attempt: (model: ModelId) => Promise<T>,
  signal?: AbortSignal,
  onFallback?: OnFallback,
): Promise<T> {
  const chain = modelChain(preferred);
  let lastError: unknown;

  for (const [modelIndex, model] of chain.entries()) {
    if (modelIndex > 0) {
      onFallback?.(model, friendlyError(lastError));
    }
    for (let tryIndex = 0; tryIndex <= RETRY_DELAYS_MS.length; tryIndex++) {
      if (signal?.aborted) throw lastError ?? new Error("Avbrutet.");
      if (tryIndex > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[tryIndex - 1]));
      }
      try {
        return await attempt(model);
      } catch (err) {
        if (signal?.aborted || !isTransient(err)) throw err;
        lastError = err;
      }
    }
  }
  throw lastError;
}

interface JsonCallArgs<T> {
  client: GoogleGenAI;
  model: ModelId;
  system: string;
  prompt: string;
  schema: unknown;
  parts?: Part[];
  what: string;
  signal?: AbortSignal;
  onFallback?: OnFallback;
  _type?: T;
}

async function jsonCall<T>(args: JsonCallArgs<T>): Promise<T> {
  const { client, model, system, prompt, schema, parts = [], what, signal, onFallback } = args;
  const res = await withFallback(
    model,
    (activeModel) =>
      client.models.generateContent({
        model: activeModel,
        contents: [{ role: "user", parts: [...parts, { text: prompt }] }],
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
          temperature: 0.1,
          abortSignal: signal,
        },
      }),
    signal,
    onFallback,
  );
  return parseJson<T>(res.text, what);
}

export function analyzeAd(
  client: GoogleGenAI,
  model: ModelId,
  adText: string,
  signal?: AbortSignal,
  onFallback?: OnFallback,
): Promise<JobAd> {
  return jsonCall<JobAd>({
    client,
    model,
    system: AD_SYSTEM,
    prompt: adPrompt(adText),
    schema: jobAdSchema,
    what: "analys av annonsen",
    signal,
    onFallback,
  });
}

/**
 * PDF:er skickas som inlineData — Gemini läser kolumnlayout bättre än en lokal
 * textextraktion gör. Word och ren text har redan plockats ut i `cvImport`.
 */
export function parseCv(
  client: GoogleGenAI,
  model: ModelId,
  source: { rawText?: string; pdf?: { data: string; mimeType: string } },
  signal?: AbortSignal,
  onFallback?: OnFallback,
): Promise<CvProfile> {
  return jsonCall<CvProfile>({
    client,
    model,
    system: CV_SYSTEM,
    prompt: cvPrompt(source.rawText),
    schema: cvProfileSchema,
    parts: source.pdf
      ? [{ inlineData: { mimeType: source.pdf.mimeType, data: source.pdf.data } }]
      : [],
    what: "läsning av CV:t",
    signal,
    onFallback,
  });
}

export function matchCv(
  client: GoogleGenAI,
  model: ModelId,
  ad: JobAd,
  cv: CvProfile,
  cvRawText: string,
  signal?: AbortSignal,
  onFallback?: OnFallback,
): Promise<MatchResult> {
  return jsonCall<MatchResult>({
    client,
    model,
    system: MATCH_SYSTEM,
    prompt: matchPrompt(ad, cv, cvRawText),
    schema: matchSchema,
    what: "matchningen mot CV:t",
    signal,
    onFallback,
  });
}

/** Strömmar fram brevet. `onChunk` får hela texten så här långt. */
export function streamText(
  client: GoogleGenAI,
  model: ModelId,
  system: string,
  prompt: string,
  onChunk: (soFar: string) => void,
  signal?: AbortSignal,
  onFallback?: OnFallback,
): Promise<string> {
  return withFallback(
    model,
    async (activeModel) => {
      const stream = await client.models.generateContentStream({
        model: activeModel,
        contents: prompt,
        config: {
          systemInstruction: system,
          temperature: 0.85,
          topP: 0.95,
          abortSignal: signal,
        },
      });

      let text = "";
      try {
        for await (const chunk of stream) {
          if (signal?.aborted) break;
          const part = chunk.text;
          if (part) {
            text += part;
            onChunk(text);
          }
        }
      } catch (err) {
        // Har vi redan fått text är ett avkapat brev bättre än inget alls, och
        // ett omförsök skulle bara skriva över det som redan visas.
        if (text.trim()) return text.trim();
        throw err;
      }
      if (!text.trim()) throw new Error("Tomt svar från Gemini.");
      return text.trim();
    },
    signal,
    onFallback,
  );
}

/** Minimalt anrop för knappen "Testa nyckeln" i inställningarna. */
export async function pingModel(
  apiKey: string,
  model: ModelId,
): Promise<{ answer: string; model: ModelId }> {
  const client = await createClient(apiKey);
  let used: ModelId = model;
  const res = await withFallback(
    model,
    (activeModel) => {
      used = activeModel;
      return client.models.generateContent({
        model: activeModel,
        contents: "Svara med exakt ordet: OK",
        config: { maxOutputTokens: 2048 },
      });
    },
    undefined,
    (next) => {
      used = next;
    },
  );
  return { answer: (res.text ?? "").trim(), model: used };
}
