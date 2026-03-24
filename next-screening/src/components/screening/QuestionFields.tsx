"use client";

import { useMemo } from "react";

export type QuestionOption = { text: string; is_correct?: boolean };

export type ScreeningQuestionRow = {
  id: string;
  question: string;
  type: string;
  options: QuestionOption[] | null;
  scale_min: number | null;
  scale_max: number | null;
  order_index?: number;
};

type Props = {
  q: ScreeningQuestionRow;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
};

export function QuestionFields({ q, value, onChange, disabled }: Props) {
  const options = useMemo(() => {
    if (!Array.isArray(q.options)) return [] as QuestionOption[];
    return q.options.filter((o) => o?.text?.trim());
  }, [q.options]);

  if (q.type === "text") {
    return (
      <textarea
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        rows={4}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    );
  }

  if (q.type === "scale") {
    const min = q.scale_min ?? 1;
    const max = q.scale_max ?? 5;
    const n = typeof value === "number" ? value : min;
    return (
      <div className="mt-2 space-y-2">
        <input
          type="range"
          min={min}
          max={max}
          value={n}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {min} — {max} (selected: {n})
        </div>
      </div>
    );
  }

  if (q.type === "single") {
    const idx = typeof value === "number" ? value : -1;
    return (
      <ul className="mt-2 space-y-2">
        {options.map((o, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                name={q.id}
                checked={idx === i}
                onChange={() => onChange(i)}
                disabled={disabled}
                className="mt-1"
              />
              <span>{o.text}</span>
            </label>
          </li>
        ))}
      </ul>
    );
  }

  if (q.type === "multi") {
    const arr = Array.isArray(value) ? (value as number[]) : [];
    const toggle = (i: number) => {
      const set = new Set(arr);
      if (set.has(i)) set.delete(i);
      else set.add(i);
      onChange([...set].sort((a, b) => a - b));
    };
    return (
      <ul className="mt-2 space-y-2">
        {options.map((o, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={arr.includes(i)}
                onChange={() => toggle(i)}
                disabled={disabled}
                className="mt-1"
              />
              <span>{o.text}</span>
            </label>
          </li>
        ))}
      </ul>
    );
  }

  return <p className="text-sm text-red-600">Unsupported type: {q.type}</p>;
}

export function initialValueForQuestion(q: ScreeningQuestionRow): unknown {
  if (q.type === "text") return "";
  if (q.type === "scale") return q.scale_min ?? 1;
  if (q.type === "single") return -1;
  if (q.type === "multi") return [] as number[];
  return null;
}

export function validateQuestionAnswer(q: ScreeningQuestionRow, value: unknown): string | null {
  if (q.type === "text") {
    if (typeof value !== "string" || !value.trim()) return "Answer is required";
    return null;
  }
  if (q.type === "scale") {
    const min = q.scale_min ?? 1;
    const max = q.scale_max ?? 5;
    if (typeof value !== "number" || value < min || value > max) return "Pick a value on the scale";
    return null;
  }
  if (q.type === "single") {
    if (typeof value !== "number" || value < 0) return "Select an option";
    return null;
  }
  if (q.type === "multi") {
    if (!Array.isArray(value) || value.length === 0) return "Select at least one option";
    return null;
  }
  return null;
}
