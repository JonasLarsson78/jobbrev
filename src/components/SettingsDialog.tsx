import { useEffect, useState } from "react";
import { useApp } from "../store";
import { friendlyError, pingModel } from "../lib/gemini";
import { UI_LANGUAGES, useT } from "../lib/i18n";
import { MODELS, type ModelId, type UiLanguage } from "../types";
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

  const t = useT();
  const [keyDraft, setKeyDraft] = useState("");

  // En nedladdad app har ingen .env att hänvisa till, så texterna om nyckeln
  // skiljer sig mellan dev och ett paketerat bygge.
  const packaged = !import.meta.env.DEV;
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
      setStatus({ kind: "ok", text: t("settings.keySaved") });
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
                  ? t("settings.pingOk", { model, answer: answer.slice(0, 30) })
                  : t("settings.pingFallback", { model: settings.model, used: model }),
            }
          : { kind: "bad", text: t("settings.pingEmpty") },
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
            <h2 className="text-[16px] font-semibold">{t("settings.title")}</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              {t(packaged ? "settings.introPackaged" : "settings.intro")}
            </p>
          </div>
          {apiKey && (
            <Button variant="quiet" onClick={() => openSettings(false)}>
              {t("settings.close")}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {keySource === "env" ? (
            <div className="flex flex-col gap-2.5">
              <p className="rounded-lg bg-ok-bg px-2.5 py-2 text-[12px] text-ok">
                {t("settings.keyFromEnv")}
              </p>
              <div>
                <Button onClick={test} busy={testing}>
                  {t("settings.testKey")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Field
                label={t("settings.apiKeyLabel")}
                hint={
                  apiKey
                    ? t("settings.keyHintExists")
                    : t(packaged ? "settings.keyHintPackaged" : "settings.keyHintNew")
                }
              >
                <TextInput
                  type="password"
                  value={keyDraft}
                  onChange={setKeyDraft}
                  placeholder={apiKey ? "••••••••••••••••" : t("settings.keyPlaceholder")}
                />
              </Field>

              <div className="flex items-center gap-1.5">
                <Button variant="primary" onClick={saveKey} disabled={!keyDraft.trim()}>
                  {t("settings.saveKey")}
                </Button>
                <Button onClick={test} busy={testing} disabled={!keyDraft.trim() && !apiKey}>
                  {t("settings.testKey")}
                </Button>
                {apiKey && (
                  <Button variant="quiet" onClick={clearApiKey}>
                    {t("settings.removeKey")}
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

          <Field label={t("settings.model")}>
            <Select<ModelId>
              value={settings.model}
              onChange={(model) => updateSettings({ model })}
              options={MODELS.map((id) => ({ id, label: t(`model.${id}`) }))}
            />
          </Field>

          <Field label={t("settings.uiLanguage")} hint={t("settings.uiLanguageHint")}>
            <Select<UiLanguage>
              value={settings.uiLanguage}
              onChange={(uiLanguage) => updateSettings({ uiLanguage })}
              options={UI_LANGUAGES}
            />
          </Field>

          <hr className="border-line" />

          <p className="text-[12px] text-muted">{t("settings.senderIntro")}</p>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("settings.senderName")}>
              <TextInput
                value={settings.senderName}
                onChange={(senderName) => updateSettings({ senderName })}
              />
            </Field>
            <Field label={t("settings.senderCity")}>
              <TextInput
                value={settings.senderCity}
                onChange={(senderCity) => updateSettings({ senderCity })}
              />
            </Field>
            <Field label={t("settings.senderEmail")}>
              <TextInput
                value={settings.senderEmail}
                onChange={(senderEmail) => updateSettings({ senderEmail })}
              />
            </Field>
            <Field label={t("settings.senderPhone")}>
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
