import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { JobAd, Settings } from "../types";
import { t } from "./i18n";

export const copyLetter = (text: string) => writeText(text);

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || t("export.fileNameFallback")
  );
}

export function suggestFileName(ad: JobAd | null, extension = "md"): string {
  const date = new Date().toISOString().slice(0, 10);
  const parts = [ad?.company, ad?.role].filter((v): v is string => Boolean(v)).map(slug);
  return `${[t("export.fileNamePrefix"), ...parts].join("-")}-${date}.${extension}`;
}

/** Returnerar sökvägen som sparades, eller null om dialogen avbröts. */
export async function saveLetterAsMarkdown(
  text: string,
  ad: JobAd | null,
): Promise<string | null> {
  const path = await save({
    title: t("export.saveTitle"),
    defaultPath: suggestFileName(ad),
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (!path) return null;

  const header = [
    ad?.company && `**${t("export.company")}:** ${ad.company}`,
    ad?.role && `**${t("export.role")}:** ${ad.role}`,
    ad?.deadline && `**${t("export.deadline")}:** ${ad.deadline}`,
  ]
    .filter(Boolean)
    .join("  \n");

  await writeTextFile(path, header ? `${header}\n\n---\n\n${text}\n` : `${text}\n`);
  return path;
}

export function senderLines(settings: Settings): string[] {
  return [settings.senderName, settings.senderEmail, settings.senderPhone, settings.senderCity]
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Bygger .docx-filen med samma typografi som PDF-utskriften i index.css: serif,
 * 11,5 pt, radavstånd 1,6 och A4 med 22/20 mm marginaler. docx-biblioteket
 * laddas först när man faktiskt exporterar, så appen startar lika snabbt.
 */
async function letterDocxBlob(text: string, settings: Settings): Promise<Blob> {
  const { AlignmentType, Document, Packer, Paragraph, TextRun, convertMillimetersToTwip } =
    await import("docx");

  // Enkla radbrytningar inom ett stycke (t.ex. hälsningsfras + namn) bevaras.
  const paragraph = (content: string, spacingAfter: number) =>
    new Paragraph({
      children: content
        .split("\n")
        .map((line, i) => new TextRun(i === 0 ? line : { text: line, break: 1 })),
      alignment: AlignmentType.LEFT,
      spacing: { line: 384, lineRule: "auto", after: spacingAfter },
    });

  // Avsändarblocket högst upp, med luft ned till brevet (som i utskriften).
  const lines = senderLines(settings);
  const sender = lines.map((line, i) => paragraph(line, i === lines.length - 1 ? 480 : 0));

  // Brevet kommer som löptext med tomrad mellan styckena.
  const body = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => paragraph(block, 240));

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Georgia", size: 23 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(22),
              bottom: convertMillimetersToTwip(22),
              left: convertMillimetersToTwip(20),
              right: convertMillimetersToTwip(20),
            },
          },
        },
        children: [...sender, ...body],
      },
    ],
  });

  return Packer.toBlob(doc);
}

/** Returnerar sökvägen som sparades, eller null om dialogen avbröts. */
export async function saveLetterAsWord(
  text: string,
  ad: JobAd | null,
  settings: Settings,
): Promise<string | null> {
  const path = await save({
    title: t("export.saveWordTitle"),
    defaultPath: suggestFileName(ad, "docx"),
    filters: [{ name: t("export.wordFilter"), extensions: ["docx"] }],
  });
  if (!path) return null;

  const blob = await letterDocxBlob(text, settings);
  await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
  return path;
}

/**
 * PDF går via systemets utskriftsdialog (Spara som PDF). Brevet ligger redan i
 * #print-area, och print-stylesheetet i index.css gömmer resten av appen.
 */
export function printLetter(): void {
  window.print();
}
