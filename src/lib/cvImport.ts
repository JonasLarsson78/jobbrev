import { readFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { t } from "./i18n";

export const CV_EXTENSIONS = ["pdf", "docx", "txt", "md", "markdown"];

export interface CvSource {
  fileName: string;
  /** Satt för .docx/.txt/.md — PDF:er skickas vidare som fil till Gemini. */
  rawText?: string;
  pdf?: { data: string; mimeType: string };
}

export async function pickCvFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    title: t("cv.pickTitle"),
    filters: [{ name: "CV", extensions: CV_EXTENSIONS }],
  });
  return typeof selected === "string" ? selected : null;
}

function extensionOf(path: string): string {
  return path.split(".").pop()?.toLowerCase() ?? "";
}

function baseName(path: string): string {
  return path.split("/").pop() ?? path;
}

/** btoa klarar inte stora strängar i ett svep, så vi matar den i bitar. */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function readCvFile(path: string): Promise<CvSource> {
  const ext = extensionOf(path);
  const fileName = baseName(path);

  if (!CV_EXTENSIONS.includes(ext)) {
    throw new Error(t("cv.unsupported", { ext }));
  }

  const bytes = await readFile(path);

  if (ext === "pdf") {
    return { fileName, pdf: { data: toBase64(bytes), mimeType: "application/pdf" } };
  }

  if (ext === "docx") {
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    // mammoth är tungt och behövs bara för Word-filer, så det laddas först här.
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = result.value.trim();
    if (!text) throw new Error(t("cv.wordEmpty"));
    return { fileName, rawText: text };
  }

  const text = new TextDecoder("utf-8").decode(bytes).trim();
  if (!text) throw new Error(t("cv.fileEmpty"));
  return { fileName, rawText: text };
}
