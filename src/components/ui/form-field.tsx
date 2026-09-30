"use client";

import { useId, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly className?: string;
  /**
   * Receives the wiring the control needs. Every control in the dashboard is a
   * different element — input, textarea, native select, a checkbox grid — so
   * the field hands down ids rather than rendering the control itself.
   */
  readonly children: (props: {
    readonly id: string;
    readonly "aria-describedby": string | undefined;
    readonly "aria-invalid": boolean | undefined;
    /**
     * For controls that are a group rather than a single element — a checkbox
     * list has no id for `htmlFor` to point at, so it names itself this way.
     */
    readonly "aria-labelledby": string;
  }) => ReactNode;
}

export function FormField({
  label,
  hint,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id} id={`${id}-label`}>
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-heritage">
            *
          </span>
        ) : null}
      </Label>

      {children({
        id,
        /* Error first: a screen reader should hear what is wrong before the hint. */
        "aria-describedby": [errorId, hintId].filter(Boolean).join(" ") || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-labelledby": `${id}-label`,
      })}

      {error ? (
        <p className="flex items-center gap-1 text-xs font-medium text-heritage" id={errorId}>
          <CircleAlert aria-hidden className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
