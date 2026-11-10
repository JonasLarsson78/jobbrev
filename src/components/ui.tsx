import type { ReactNode } from "react";

export function Panel({
  title,
  actions,
  children,
  className = "",
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col rounded-xl border border-line bg-panel ${className}`}
    >
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-line px-3.5">
        <h2 className="text-[13px] font-semibold tracking-wide uppercase text-muted">{title}</h2>
        <div className="flex items-center gap-1.5">{actions}</div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3.5">{children}</div>
    </section>
  );
}

type ButtonVariant = "primary" | "ghost" | "quiet";

export function Button({
  children,
  onClick,
  disabled,
  busy,
  variant = "ghost",
  title,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: ButtonVariant;
  title?: string;
  className?: string;
}) {
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-accent text-accent-ink hover:brightness-110 border-transparent",
    ghost: "bg-panel2 text-ink border-line hover:border-muted",
    quiet: "bg-transparent text-muted border-transparent hover:text-ink",
  };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner() {
  return (
    <span className="inline-block size-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
  );
}

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "accent";
}) {
  const tones = {
    neutral: "bg-panel2 text-muted border-line",
    ok: "bg-ok-bg text-ok border-transparent",
    warn: "bg-warn-bg text-warn border-transparent",
    bad: "bg-bad-bg text-bad border-transparent",
    accent: "bg-accent text-accent-ink border-transparent",
  };
  return (
    <span
      className={`inline-block max-w-full truncate rounded-md border px-2 py-0.5 text-[12px] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[13px] text-ink outline-none placeholder:text-muted focus:border-accent";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password";
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type={type}
      className={inputBase}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      spellCheck={false}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { id: T; label: string }[];
}) {
  return (
    <select
      className={inputBase}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-panel2 p-0.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-md px-2.5 py-1 text-[12px] font-medium capitalize transition ${
            value === option ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="m-auto max-w-[26ch] text-center text-[13px] leading-relaxed text-muted">
      {children}
    </p>
  );
}
