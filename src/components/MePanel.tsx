import { useState } from "react";
import { useApp } from "../store";
import { pickCvFile } from "../lib/cvImport";
import { locale, useT } from "../lib/i18n";
import type { MatchStatus } from "../types";
import { Button, Chip, Empty, Panel, Spinner } from "./ui";

const STATUS_TONE: Record<MatchStatus, "ok" | "warn" | "bad"> = {
  matchad: "ok",
  delvis: "warn",
  saknas: "bad",
};

/** Statusen kommer på svenska från modellen; etiketten följer appspråket. */
const STATUS_KEY = {
  matchad: "status.matchad",
  delvis: "status.delvis",
  saknas: "status.saknas",
} as const satisfies Record<MatchStatus, string>;

function ScoreMeter({ score }: { score: number }) {
  const tone = score >= 75 ? "var(--ok)" : score >= 50 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel2">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: tone }}
        />
      </div>
      <span className="text-[13px] font-semibold tabular-nums" style={{ color: tone }}>
        {score}%
      </span>
    </div>
  );
}

export function MePanel() {
  const { cv, match, ad, busy, importCv, runMatch, setCvRawText, reparseCv } = useApp();
  const [showRaw, setShowRaw] = useState(false);
  const t = useT();

  async function choose() {
    const path = await pickCvFile();
    if (path) await importCv(path);
  }

  return (
    <Panel
      title={t("me.title")}
      actions={
        <>
          {cv && (
            <Button variant="quiet" onClick={() => setShowRaw(!showRaw)}>
              {showRaw ? t("me.profile") : t("me.rawText")}
            </Button>
          )}
          <Button onClick={choose} busy={busy.cv}>
            {cv ? t("me.changeCv") : t("me.chooseCv")}
          </Button>
        </>
      }
    >
      {!cv ? (
        <div className="flex flex-1 items-center">
          <Empty>{t("me.empty")}</Empty>
        </div>
      ) : showRaw ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <p className="text-[11px] text-muted">{t("me.rawHint")}</p>
          <textarea
            value={cv.rawText}
            onChange={(e) => setCvRawText(e.target.value)}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none rounded-lg border border-line bg-panel2 p-2.5 font-mono text-[12px] leading-relaxed text-ink outline-none focus:border-accent"
          />
          <Button onClick={reparseCv} busy={busy.cv}>
            {t("me.reparse")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <div>
            <p className="selectable text-[15px] font-semibold">{cv.profile.name || t("me.noName")}</p>
            <p className="selectable text-[13px] text-muted">{cv.profile.headline}</p>
            <p className="mt-1 text-[11px] text-muted">
              {cv.sourceFile} · {new Date(cv.importedAt).toLocaleDateString(locale())}
            </p>
          </div>

          {cv.profile.summary && (
            <p className="selectable text-[13px] leading-relaxed">{cv.profile.summary}</p>
          )}

          {cv.profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {cv.profile.skills.slice(0, 24).map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          )}

          {cv.profile.roles.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[12px] font-semibold text-muted">{t("me.experience")}</h3>
              {cv.profile.roles.map((role, i) => (
                <div key={i} className="selectable">
                  <p className="text-[13px] font-medium">
                    {role.title}
                    {role.company && <span className="text-muted"> · {role.company}</span>}
                  </p>
                  <p className="text-[11px] text-muted">{role.period}</p>
                </div>
              ))}
            </div>
          )}

          <hr className="border-line" />

          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[12px] font-semibold text-muted">{t("me.matchHeading")}</h3>
            {busy.match ? (
              <Spinner />
            ) : (
              ad && (
                <Button variant="quiet" onClick={runMatch}>
                  {match ? t("me.recalculate") : t("me.runMatch")}
                </Button>
              )
            )}
          </div>

          {!ad ? (
            <p className="text-[12px] text-muted">{t("me.analyzeAdFirst")}</p>
          ) : !match ? (
            <p className="text-[12px] text-muted">
              {busy.match ? t("me.matching") : t("me.noMatchYet")}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <ScoreMeter score={match.score} />

              {match.missing.length > 0 && (
                <div className="rounded-lg border border-line bg-panel2 p-2.5">
                  <p className="mb-1 text-[12px] font-semibold text-bad">{t("me.missing")}</p>
                  <ul className="flex flex-col gap-0.5">
                    {match.missing.map((m, i) => (
                      <li key={i} className="selectable text-[12px] leading-snug">
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {match.strengths.length > 0 && (
                <div className="rounded-lg border border-line bg-panel2 p-2.5">
                  <p className="mb-1 text-[12px] font-semibold text-ok">{t("me.strengths")}</p>
                  <ul className="flex flex-col gap-0.5">
                    {match.strengths.map((s, i) => (
                      <li key={i} className="selectable text-[12px] leading-snug">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {match.items.map((item, i) => (
                  <div key={i} className="flex flex-col gap-1 border-b border-line pb-2 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="selectable text-[12.5px] leading-snug">{item.requirement}</p>
                      <Chip tone={STATUS_TONE[item.status]}>{t(STATUS_KEY[item.status])}</Chip>
                    </div>
                    {item.evidence && (
                      <p className="selectable border-l-2 border-line pl-2 text-[11.5px] italic text-muted">
                        {item.evidence}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
