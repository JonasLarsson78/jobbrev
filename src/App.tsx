import { useEffect, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useApp } from "./store";
import { AdPanel } from "./components/AdPanel";
import { LetterPanel } from "./components/LetterPanel";
import { MePanel } from "./components/MePanel";
import { SettingsDialog } from "./components/SettingsDialog";
import { CV_EXTENSIONS } from "./lib/cvImport";
import { senderLines } from "./lib/exporters";
import { Button } from "./components/ui";

export default function App() {
  const {
    ready,
    init,
    notice,
    notify,
    openSettings,
    settings,
    variants,
    activeVariant,
    importCv,
  } = useApp();
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  // Tauri fångar filsläpp nativt, så HTML5-drop ger oss inga filer — vi lyssnar
  // på webviewens eget drag-drop-event och får sökvägarna därifrån.
  useEffect(() => {
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "over" || event.payload.type === "enter") {
        setDragging(true);
      } else if (event.payload.type === "leave") {
        setDragging(false);
      } else if (event.payload.type === "drop") {
        setDragging(false);
        const path = event.payload.paths.find((p) =>
          CV_EXTENSIONS.includes(p.split(".").pop()?.toLowerCase() ?? ""),
        );
        if (path) void importCv(path);
        else notify({ kind: "error", text: "Släpp en PDF, .docx eller textfil." });
      }
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [importCv, notify]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(null), 4500);
    return () => clearTimeout(timer);
  }, [notice, notify]);

  const letterText = variants[activeVariant]?.text ?? "";
  const sender = senderLines(settings);

  return (
    <>
      <div id="app-shell" className="flex h-full flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
          <div className="flex items-baseline gap-2">
            <h1 className="text-[14px] font-semibold tracking-tight">Jobbrev</h1>
            <span className="text-[11px] text-muted">{settings.model}</span>
          </div>
          <Button variant="quiet" onClick={() => openSettings(true)}>
            Inställningar
          </Button>
        </header>

        {ready ? (
          <main className="grid min-h-0 flex-1 grid-cols-[minmax(280px,1fr)_minmax(400px,1.35fr)_minmax(300px,1.05fr)] gap-3 p-3">
            <AdPanel />
            <LetterPanel />
            <MePanel />
          </main>
        ) : (
          <div className="flex flex-1 items-center justify-center text-[13px] text-muted">
            Startar…
          </div>
        )}

        {notice && (
          <div
            className={`pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg px-3.5 py-2 text-[13px] shadow-lg ${
              notice.kind === "error" ? "bg-bad-bg text-bad" : "bg-panel text-ink border border-line"
            }`}
          >
            {notice.text}
          </div>
        )}

        {dragging && (
          <div className="pointer-events-none fixed inset-3 z-40 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-black/20 text-[14px] font-medium">
            Släpp CV:t här
          </div>
        )}
      </div>

      {/* Underlaget för PDF-export. Göms på skärmen, syns bara i utskrift. */}
      <div id="print-area">
        {sender.length > 0 && <div className="sender">{sender.join("\n")}</div>}
        {letterText}
      </div>

      <SettingsDialog />
    </>
  );
}
