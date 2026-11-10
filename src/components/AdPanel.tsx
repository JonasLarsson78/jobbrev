import { useApp } from "../store";
import { Button, Chip, Empty, Panel } from "./ui";

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-[12px] font-semibold text-muted">{title}</h3>
      <ul className="flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={i} className="selectable text-[13px] leading-snug text-ink">
            <span className="mr-1.5 text-muted">·</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdPanel() {
  const { adText, setAdText, ad, analyzeAd, busy, patchAd } = useApp();

  return (
    <Panel
      title="Annonsen"
      actions={
        <>
          {ad && (
            <Button variant="quiet" onClick={() => useApp.setState({ ad: null, match: null })}>
              Rensa
            </Button>
          )}
          <Button variant="primary" onClick={analyzeAd} busy={busy.ad} disabled={!adText.trim()}>
            Analysera
          </Button>
        </>
      }
    >
      <textarea
        value={adText}
        onChange={(e) => setAdText(e.target.value)}
        placeholder="Klistra in hela jobbannonsen här…"
        spellCheck={false}
        className="min-h-40 w-full shrink-0 resize-y rounded-lg border border-line bg-panel2 p-2.5 text-[13px] leading-relaxed text-ink outline-none placeholder:text-muted focus:border-accent"
      />

      {!ad ? (
        <div className="flex flex-1 items-center">
          <Empty>Klistra in annonsen och tryck Analysera för att plocka ut kraven.</Empty>
        </div>
      ) : (
        <div className="mt-3.5 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <input
              value={ad.role}
              onChange={(e) => patchAd({ role: e.target.value })}
              className="w-full rounded-md bg-transparent text-[15px] font-semibold text-ink outline-none focus:bg-panel2"
            />
            <input
              value={ad.company}
              onChange={(e) => patchAd({ company: e.target.value })}
              className="w-full rounded-md bg-transparent text-[13px] text-muted outline-none focus:bg-panel2"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ad.location && <Chip>{ad.location}</Chip>}
            {ad.deadline && <Chip tone="warn">Sista dag: {ad.deadline}</Chip>}
            {ad.contactPerson && <Chip>{ad.contactPerson}</Chip>}
            {ad.detectedLanguage && <Chip>{ad.detectedLanguage}</Chip>}
          </div>

          {ad.tone && (
            <p className="selectable text-[12px] text-muted">Annonsens ton: {ad.tone}</p>
          )}

          {ad.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ad.keywords.map((k) => (
                <Chip key={k}>{k}</Chip>
              ))}
            </div>
          )}

          <Section title="Krav" items={ad.requirements} />
          <Section title="Meriterande" items={ad.niceToHave} />
          <Section title="Rollen innebär" items={ad.responsibilities} />
        </div>
      )}
    </Panel>
  );
}
