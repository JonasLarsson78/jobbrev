import { useState } from "react";
import { useApp } from "../store";
import {
  copyLetter,
  printLetter,
  saveLetterAsMarkdown,
  saveLetterAsWord,
} from "../lib/exporters";
import type { Length, LetterLanguage, Tone } from "../types";
import { Button, Empty, Panel, Segmented, Spinner } from "./ui";

const TONES: readonly Tone[] = ["formell", "personlig", "driven"];
const LENGTHS: readonly Length[] = ["kort", "medel", "lång"];
const LANGUAGES: readonly LetterLanguage[] = ["svenska", "engelska"];

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function LetterPanel() {
  const {
    variants,
    activeVariant,
    setActiveVariant,
    setVariantText,
    generateLetters,
    refineLetter,
    cancel,
    busy,
    tone,
    length,
    language,
    setTone,
    setLength,
    setLanguage,
    ad,
    cv,
    settings,
    notify,
  } = useApp();

  const [refinement, setRefinement] = useState("");
  const letter = variants[activeVariant];
  const canGenerate = Boolean(ad && cv);

  async function copy() {
    if (!letter?.text) return;
    await copyLetter(letter.text);
    notify({ kind: "info", text: "Brevet är kopierat." });
  }

  async function saveFile() {
    if (!letter?.text) return;
    const path = await saveLetterAsMarkdown(letter.text, ad);
    if (path) notify({ kind: "info", text: `Sparat till ${path}` });
  }

  async function saveWord() {
    if (!letter?.text) return;
    try {
      const path = await saveLetterAsWord(letter.text, ad, settings);
      if (path) notify({ kind: "info", text: `Sparat till ${path}` });
    } catch (error) {
      notify({
        kind: "error",
        text: `Kunde inte spara Word-filen: ${error instanceof Error ? error.message : error}`,
      });
    }
  }

  async function refine() {
    const instruction = refinement.trim();
    if (!instruction) return;
    setRefinement("");
    await refineLetter(instruction);
  }

  return (
    <Panel
      title="Brevet"
      actions={
        busy.letter ? (
          <Button variant="quiet" onClick={cancel}>
            Avbryt
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={generateLetters}
            disabled={!canGenerate}
            title={canGenerate ? undefined : "Kräver både analyserad annons och inläst CV"}
          >
            {variants.length ? "Skriv om" : "Skriv brev"}
          </Button>
        )
      }
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 pb-3.5">
        <Segmented value={tone} onChange={setTone} options={TONES} />
        <Segmented value={length} onChange={setLength} options={LENGTHS} />
        <Segmented value={language} onChange={setLanguage} options={LANGUAGES} />
      </div>

      {variants.length === 0 ? (
        <div className="flex flex-1 items-center">
          <Empty>
            {canGenerate
              ? "Allt är på plats. Tryck Skriv brev för att få två förslag."
              : "Analysera annonsen och läs in ditt CV, sedan skriver vi brevet."}
          </Empty>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-1 border-b border-line">
            {variants.map((variant, i) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setActiveVariant(i)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-2.5 py-1.5 text-[12.5px] font-medium transition ${
                  i === activeVariant
                    ? "border-accent text-ink"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {variant.label}
                {variant.streaming && <Spinner />}
              </button>
            ))}
          </div>

          {letter?.error && (
            <p className="mt-2 shrink-0 rounded-lg bg-bad-bg px-2.5 py-1.5 text-[12px] text-bad">
              {letter.error}
            </p>
          )}

          <textarea
            value={letter?.text ?? ""}
            onChange={(e) => setVariantText(activeVariant, e.target.value)}
            spellCheck
            lang={language === "svenska" ? "sv" : "en"}
            placeholder="Brevet skrivs ut här…"
            className="mt-2.5 min-h-0 flex-1 resize-none rounded-lg border border-line bg-panel2 p-3.5 font-serif text-[14.5px] leading-[1.7] text-ink outline-none focus:border-accent"
          />

          <div className="mt-2.5 flex shrink-0 items-center justify-between gap-2">
            <span className="text-[11px] text-muted tabular-nums">
              {wordCount(letter?.text ?? "")} ord
            </span>
            <div className="flex items-center gap-1.5">
              <Button onClick={copy} disabled={!letter?.text}>
                Kopiera
              </Button>
              <Button onClick={saveFile} disabled={!letter?.text}>
                Spara .md
              </Button>
              <Button onClick={saveWord} disabled={!letter?.text}>
                Word
              </Button>
              <Button onClick={printLetter} disabled={!letter?.text}>
                PDF
              </Button>
            </div>
          </div>

          <div className="mt-2.5 flex shrink-0 items-center gap-1.5">
            <input
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) void refine();
              }}
              placeholder="Förfina: t.ex. korta ned andra stycket"
              className="w-full rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[13px] outline-none placeholder:text-muted focus:border-accent"
            />
            <Button
              onClick={refine}
              busy={busy.letter}
              disabled={!refinement.trim() || !letter?.text}
            >
              Förfina
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
