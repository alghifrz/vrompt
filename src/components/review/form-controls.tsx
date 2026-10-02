import type { ReactNode } from "react";
import { moveItem, removeItem } from "../../lib/review/view-model";

export const controlClass =
  "w-full rounded-xl border border-white/10 bg-[#101010] px-3.5 py-2.5 text-sm leading-6 text-[#f3f3ee] placeholder:text-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a] disabled:opacity-50";

export const itemCardClass =
  "space-y-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4";

export const ghostButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition-colors hover:border-white/20 hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a] disabled:cursor-not-allowed disabled:opacity-40";

export const iconButtonClass =
  "inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/65 transition-colors hover:border-white/20 hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a] disabled:cursor-not-allowed disabled:opacity-40";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#d4f26a] px-5 py-2.5 text-sm font-medium text-[#14160c] transition hover:bg-[#e2f88a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4f26a] disabled:cursor-not-allowed disabled:opacity-40";

export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-white/75">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  id,
  label,
  value,
  error,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field id={id} label={label} error={error}>
      <input
        id={id}
        type="text"
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={controlClass}
      />
    </Field>
  );
}

export function TextArea({
  id,
  label,
  value,
  error,
  disabled,
  rows = 3,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  disabled?: boolean;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <Field id={id} label={label} error={error}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`${controlClass} min-h-24 resize-y`}
      />
    </Field>
  );
}

export function SelectField({
  id,
  label,
  value,
  options,
  error,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field id={id} label={label} error={error}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={controlClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function StringList({
  id,
  label,
  items,
  disabled,
  addLabel,
  onChange,
}: {
  id: string;
  label: string;
  items: readonly string[];
  disabled?: boolean;
  addLabel: string;
  onChange: (items: string[]) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-white/75">{label}</legend>
      {items.map((item, index) => (
        <div
          key={`${id}-${String(index)}`}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <label className="sr-only" htmlFor={`${id}-${String(index)}`}>
            {`${label} ${String(index + 1)}`}
          </label>
          <input
            id={`${id}-${String(index)}`}
            type="text"
            value={item}
            disabled={disabled}
            onChange={(event) =>
              onChange(
                items.map((current, currentIndex) =>
                  currentIndex === index ? event.target.value : current,
                ),
              )
            }
            className={controlClass}
          />
          <div className="flex shrink-0 gap-1.5">
            <IconButton
              label={`Move ${label} ${String(index + 1)} up`}
              disabled={disabled || index === 0}
              onClick={() => onChange(moveItem(items, index, -1))}
            >
              <ArrowUpIcon />
            </IconButton>
            <IconButton
              label={`Move ${label} ${String(index + 1)} down`}
              disabled={disabled || index === items.length - 1}
              onClick={() => onChange(moveItem(items, index, 1))}
            >
              <ArrowDownIcon />
            </IconButton>
            <IconButton
              label={`Delete ${label} ${String(index + 1)}`}
              disabled={disabled}
              onClick={() => onChange(removeItem(items, index))}
            >
              <TrashIcon />
            </IconButton>
          </div>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange([...items, ""])}
        className={ghostButtonClass}
      >
        {addLabel}
      </button>
    </fieldset>
  );
}

export function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
      className={iconButtonClass}
    >
      {children}
    </button>
  );
}

export function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
      <path
        d="M8 12.5V3.5M8 3.5 4.5 7M8 3.5 11.5 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
      <path
        d="M8 3.5v9M8 12.5 4.5 9M8 12.5 11.5 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
      <path
        d="M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.4 8.1a1 1 0 0 0 1 .9h3.2a1 1 0 0 0 1-.9L11 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
