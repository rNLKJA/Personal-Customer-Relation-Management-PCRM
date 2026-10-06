"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Editable list of strings (phones, e-mails) - the original "+ add another" rows. */
export function ListEditor({
  id,
  label,
  values,
  onChange,
  type = "text",
  placeholder,
  addLabel,
  inputMode,
  autoComplete,
}: {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  type?: string;
  placeholder?: string;
  addLabel: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}) {
  const list = values.length ? values : [""];
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      {list.map((value, i) => (
        <div key={i} className="flex gap-2">
          <Input
            id={i === 0 ? id : `${id}-${i}`}
            aria-label={`${label} ${i + 1}`}
            type={type}
            inputMode={inputMode}
            autoComplete={i === 0 ? autoComplete : "off"}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(list.map((v, j) => (j === i ? e.target.value : v)))}
          />
          {list.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
              onClick={() => onChange(list.filter((_, j) => j !== i))}
            >
              <X />
            </Button>
          )}
        </div>
      ))}
      {list.length < 6 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 text-primary"
          onClick={() => onChange([...list, ""])}
        >
          <Plus /> {addLabel}
        </Button>
      )}
    </fieldset>
  );
}
