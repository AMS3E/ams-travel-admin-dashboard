"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Short free texts, one box per line, kept in the editor's order — a
 * corridor's "What you expect" labels. Rows move with the arrows; blank
 * rows are dropped when the form is sent.
 */
export function LinesField({
  id,
  value,
  onChange,
  describedBy,
  labelledBy,
  invalid,
  maxLength,
  maxItems,
}: {
  readonly id?: string;
  readonly value: readonly string[];
  readonly onChange: (next: readonly string[]) => void;
  readonly describedBy?: string;
  readonly labelledBy?: string;
  readonly invalid?: boolean | "true" | "false";
  readonly maxLength?: number;
  readonly maxItems?: number;
}) {
  const t = useTranslations("forms.controls.lines");
  const set = (index: number, text: string) => onChange(value.map((item, at) => (at === index ? text : item)));
  const remove = (index: number) => onChange(value.filter((_, at) => at !== index));
  const move = (index: number, to: number) => {
    const next = [...value];
    next.splice(to, 0, ...next.splice(index, 1));
    onChange(next);
  };
  const full = maxItems != null && value.length >= maxItems;

  return (
    <div
      aria-describedby={describedBy}
      aria-invalid={invalid === true || invalid === "true" || undefined}
      aria-labelledby={labelledBy}
      className="flex flex-col gap-2"
      id={id}
      role="group"
    >
      {value.map((item, index) => (
        /* The order is the identity here: a row has no id of its own. */
        <div className="flex items-center gap-1.5" key={index}>
          <Input
            aria-label={t("line", { number: index + 1 })}
            autoFocus={item === "" && index === value.length - 1}
            className="h-8 max-w-sm text-sm"
            maxLength={maxLength}
            onChange={(event) => set(index, event.target.value)}
            value={item}
          />
          <Button className="text-muted hover:text-ink" disabled={index === 0} onClick={() => move(index, index - 1)} size="icon-sm" title={t("up")} type="button" variant="ghost">
            <ArrowUp aria-hidden className="size-3.5" />
            <span className="sr-only">{t("up")}</span>
          </Button>
          <Button className="text-muted hover:text-ink" disabled={index === value.length - 1} onClick={() => move(index, index + 1)} size="icon-sm" title={t("down")} type="button" variant="ghost">
            <ArrowDown aria-hidden className="size-3.5" />
            <span className="sr-only">{t("down")}</span>
          </Button>
          <Button className="text-muted hover:bg-heritage-soft hover:text-heritage" onClick={() => remove(index)} size="icon-sm" title={t("remove")} type="button" variant="ghost">
            <X aria-hidden className="size-3.5" />
            <span className="sr-only">{t("remove")}</span>
          </Button>
        </div>
      ))}
      {!full ? (
        <span>
          <Button onClick={() => onChange([...value, ""])} size="sm" type="button" variant="secondary">
            <Plus aria-hidden className="size-3.5" />
            {t("add")}
          </Button>
        </span>
      ) : null}
    </div>
  );
}
