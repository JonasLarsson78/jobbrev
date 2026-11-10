import { useState } from "react";
import { useApp } from "../store";
import {
  copyLetter,
  printLetter,
  saveLetterAsMarkdown,
  saveLetterAsWord,
} from "../lib/exporters";
import { useT } from "../lib/i18n";
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

  const t = useT();
  const [refinement, setRefinement] = useState("");
  const letter = variants[activeVariant];
  const canGenerate = Boolean(ad && cv);

  async function copy() {
    if (!letter?.text) return;
    await copyLetter(letter.text);
    notify({ kind: "info", text: t("letter.copied") });
  }

  async function saveFile() {
    if (!letter?.text) return;
    const path = await saveLetterAsMarkdown(letter.text, ad);
    if (path) notify({ kind: "info", text: t("letter.saved", { path }) });
  }

  async function saveWord() {
    if (!letter?.text) return;
    try {
      const path = await saveLetterAsWord(letter.text, ad, settings);
      if (path) notify({ kind: "info", text: t("letter.saved", { path }) });
    } catch (error) {
      notify({
        kind: "error",
        text: t("letter.wordFailed", {
          error: error instanceof Error ? error.message : String(error),
        }),
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
      title={t("letter.title")}
      actions={
        busy.letter ? (
          <Button variant="quiet" onClick={cancel}>
            {t("letter.cancel")}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={generateLetters}
            disabled={!canGenerate}
            title={canGenerate ? undefined : t("letter.needsBoth")}
          >
            {variants.length ? t("letter.rewrite") : t("letter.write")}
          </Button>
        )
      }
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 pb-3.5">
        <Segmented
          value={tone}
          onChange={setTone}
          options={TONES.map((id) => ({ id, label: t(`tone.${id}`) }))}
        />
        <Segmented
          value={length}
          onChange={setLength}
          options={LENGTHS.map((id) => ({ id, label: t(`length.${id}`) }))}
        />
        <Segmented
          value={language}
          onChange={setLanguage}
          options={LANGUAGES.map((id) => ({ id, label: t(`letterLang.${id}`) }))}
        />
      </div>

      {variants.length === 0 ? (
        <div className="flex flex-1 items-center">
          <Empty>
            {canGenerate ? t("letter.ready") : t("letter.notReady")}
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
                {t(variant.labelKey)}
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
            placeholder={t("letter.placeholder")}
            className="mt-2.5 min-h-0 flex-1 resize-none rounded-lg border border-line bg-panel2 p-3.5 font-serif text-[14.5px] leading-[1.7] text-ink outline-none focus:border-accent"
          />

          <div className="mt-2.5 flex shrink-0 items-center justify-between gap-2">
            <span className="text-[11px] text-muted tabular-nums">
              {t("letter.words", { count: wordCount(letter?.text ?? "") })}
            </span>
            <div className="flex items-center gap-1.5">
              <Button onClick={copy} disabled={!letter?.text}>
                {t("letter.copy")}
              </Button>
              <Button onClick={saveFile} disabled={!letter?.text}>
                {t("letter.saveMd")}
              </Button>
              <Button onClick={saveWord} disabled={!letter?.text}>
                {t("letter.saveWord")}
              </Button>
              <Button onClick={printLetter} disabled={!letter?.text}>
                {t("letter.savePdf")}
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
              placeholder={t("letter.refinePlaceholder")}
              className="w-full rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[13px] outline-none placeholder:text-muted focus:border-accent"
            />
            <Button
              onClick={refine}
              busy={busy.letter}
              disabled={!refinement.trim() || !letter?.text}
            >
              {t("letter.refine")}
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
