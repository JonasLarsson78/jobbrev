import { useEffect, useState } from "react";
import { useApp } from "../store";
import { friendlyError, pingModel } from "../lib/gemini";
import { MODELS, type ModelId } from "../types";
import { Button, Field, Select, TextInput } from "./ui";

export function SettingsDialog() {
  const {
    settingsOpen,
    openSettings,
    apiKey,
    keySource,
    storeApiKey,
    clearApiKey,
    settings,
    updateSettings,
  } = useApp();

  const [keyDraft, setKeyDraft] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (settingsOpen) {
      setKeyDraft("");
      setStatus(null);
    }
  }, [settingsOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && apiKey) openSettings(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [apiKey, openSettings]);

  if (!settingsOpen) return null;

  async function saveKey() {
    try {
      await storeApiKey(keyDraft);
      setKeyDraft("");
      setStatus({ kind: "ok", text: "Nyckeln är sparad i Nyckelhanteraren." });
    } catch (err) {
      setStatus({ kind: "bad", text: friendlyError(err) });
    }
  }

  async function test() {
    const key = keyDraft.trim() || apiKey;
    if (!key) return;
    setTesting(true);
    setStatus(null);
    try {
      const { answer, model } = await pingModel(key, settings.model);
      setStatus(
        answer
          ? {
              kind: "ok",
              text:
                model === settings.model
                  ? `${model} svarar: ${answer.slice(0, 30)}`
                  : `${settings.model} var inte tillgänglig — ${model} svarade i stället.`,
            }
          : { kind: "bad", text: "Modellen svarade tomt." },
      );
    } catch (err) {
      setStatus({ kind: "bad", text: friendlyError(err) });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6">
      <div className="flex max-h-full w-[520px] flex-col overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold">Inställningar</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              Nyckeln läses från <code>.env</code> i projektroten. Saknas den där kan du
              lägga in den i macOS Nyckelhanterare i stället.
            </p>
          </div>
          {apiKey && (
            <Button variant="quiet" onClick={() => openSettings(false)}>
              Stäng
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {keySource === "env" ? (
            <div className="flex flex-col gap-2.5">
              <p className="rounded-lg bg-ok-bg px-2.5 py-2 text-[12px] text-ok">
                Nyckeln läses från <code>VITE_GEMINI_API_KEY</code> i <code>.env</code>.
                Ändrar du filen behöver dev-servern startas om.
              </p>
              <div>
                <Button onClick={test} busy={testing}>
                  Testa nyckeln
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Field
                label="Gemini API-nyckel"
                hint={
                  apiKey
                    ? "En nyckel finns i Nyckelhanteraren. Skriv in en ny för att byta."
                    : "Lägg hellre nyckeln i .env — eller spara den här i Nyckelhanteraren."
                }
              >
                <TextInput
                  type="password"
                  value={keyDraft}
                  onChange={setKeyDraft}
                  placeholder={apiKey ? "••••••••••••••••" : "Klistra in nyckeln"}
                />
              </Field>

              <div className="flex items-center gap-1.5">
                <Button variant="primary" onClick={saveKey} disabled={!keyDraft.trim()}>
                  Spara nyckel
                </Button>
                <Button onClick={test} busy={testing} disabled={!keyDraft.trim() && !apiKey}>
                  Testa nyckeln
                </Button>
                {apiKey && (
                  <Button variant="quiet" onClick={clearApiKey}>
                    Ta bort
                  </Button>
                )}
              </div>
            </>
          )}

          {status && (
            <p
              className={`rounded-lg px-2.5 py-1.5 text-[12px] ${
                status.kind === "ok" ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"
              }`}
            >
              {status.text}
            </p>
          )}

          <hr className="border-line" />

          <Field label="Modell">
            <Select<ModelId>
              value={settings.model}
              onChange={(model) => updateSettings({ model })}
              options={MODELS.map((m) => ({ id: m.id, label: m.label }))}
            />
          </Field>

          <hr className="border-line" />

          <p className="text-[12px] text-muted">
            Avsändaruppgifterna används i brevets avslutning och i PDF-exporten.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Namn">
              <TextInput
                value={settings.senderName}
                onChange={(senderName) => updateSettings({ senderName })}
              />
            </Field>
            <Field label="Ort">
              <TextInput
                value={settings.senderCity}
                onChange={(senderCity) => updateSettings({ senderCity })}
              />
            </Field>
            <Field label="E-post">
              <TextInput
                value={settings.senderEmail}
                onChange={(senderEmail) => updateSettings({ senderEmail })}
              />
            </Field>
            <Field label="Telefon">
              <TextInput
                value={settings.senderPhone}
                onChange={(senderPhone) => updateSettings({ senderPhone })}
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}
