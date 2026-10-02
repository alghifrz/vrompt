import type { ReactNode } from "react";
import { moveItem, removeItem } from "../../lib/review/view-model";

const controlClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:outline-zinc-100";

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
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-700 dark:text-red-400" role="alert">
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
        className={controlClass}
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
      <legend className="text-sm font-medium">{label}</legend>
      {items.map((item, index) => (
        <div key={`${id}-${String(index)}`} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <label className="sr-only" htmlFor={`${id}-${String(index)}`}>
            {`${label} ${String(index + 1)}`}
          </label>
          <input
            id={`${id}-${String(index)}`}
            type="text"
            value={item}
            disabled={disabled}
            onChange={(event) =>
              onChange(items.map((current, currentIndex) =>
                currentIndex === index ? event.target.value : current,
              ))
            }
            className={controlClass}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled || index === 0}
              aria-label={`Move ${label} ${String(index + 1)} up`}
              onClick={() => onChange(moveItem(items, index, -1))}
              className={ghostButtonClass}
            >
              Up
            </button>
            <button
              type="button"
              disabled={disabled || index === items.length - 1}
              aria-label={`Move ${label} ${String(index + 1)} down`}
              onClick={() => onChange(moveItem(items, index, 1))}
              className={ghostButtonClass}
            >
              Down
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Delete ${label} ${String(index + 1)}`}
              onClick={() => onChange(removeItem(items, index))}
              className={ghostButtonClass}
            >
              Delete
            </button>
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

export const ghostButtonClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:focus-visible:outline-zinc-100";

export const primaryButtonClass =
  "rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:focus-visible:outline-zinc-100";
