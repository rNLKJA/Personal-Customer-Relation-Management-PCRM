"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomField } from "@/lib/legacy/validation";

/** The original "customField" rows: free-form { field, value } pairs. */
export function CustomFieldsEditor({
  fields,
  onChange,
}: {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 text-sm font-medium">
        Custom fields <span className="font-normal text-muted-foreground">(optional)</span>
      </legend>
      {fields.map((f, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2">
          <Input
            aria-label={`Custom field ${i + 1} name`}
            placeholder="Field (e.g. Birthday)"
            value={f.field}
            onChange={(e) =>
              onChange(fields.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)))
            }
          />
          <Input
            aria-label={`Custom field ${i + 1} value`}
            placeholder="Value"
            value={f.value}
            onChange={(e) =>
              onChange(fields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            aria-label={`Remove custom field ${i + 1}`}
            onClick={() => onChange(fields.filter((_, j) => j !== i))}
          >
            <X />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 text-primary"
        onClick={() => onChange([...fields, { field: "", value: "" }])}
      >
        <Plus /> Add a field
      </Button>
    </fieldset>
  );
}
