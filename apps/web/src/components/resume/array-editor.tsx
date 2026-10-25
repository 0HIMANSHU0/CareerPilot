'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface FieldDef {
  key: string;
  label: string;
  kind?: 'text' | 'lines' | 'checkbox';
  wide?: boolean;
}

type Row = Record<string, unknown>;

// Generic editor for repeatable resume sections (experience, education, projects, certifications).
export function ArrayEditor({ items, fields, onChange, blank, addLabel, testId }: { items: Row[]; fields: FieldDef[]; onChange: (items: Row[]) => void; blank: Row; addLabel: string; testId: string }) {
  const update = (i: number, key: string, value: unknown) => onChange(items.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  return (
    <div className="space-y-4" data-testid={testId}>
      {items.map((row, i) => (
        <div key={i} className="relative grid gap-3 rounded-lg border bg-secondary/30 p-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.wide || f.kind === 'lines' ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
              {f.kind === 'checkbox' ? (
                <label className="flex items-center gap-2 pt-6 text-sm">
                  <input type="checkbox" checked={Boolean(row[f.key])} onChange={(e) => update(i, f.key, e.target.checked)} data-testid={`${testId}-${i}-${f.key}`} /> {f.label}
                </label>
              ) : (
                <>
                  <Label className="text-xs">{f.label}</Label>
                  {f.kind === 'lines' ? (
                    <Textarea rows={3} value={((row[f.key] as string[]) || []).join('\n')} placeholder="One per line"
                      onChange={(e) => update(i, f.key, e.target.value.split('\n'))} data-testid={`${testId}-${i}-${f.key}`} />
                  ) : (
                    <Input value={(row[f.key] as string) || ''} onChange={(e) => update(i, f.key, e.target.value)} data-testid={`${testId}-${i}-${f.key}`} />
                  )}
                </>
              )}
            </div>
          ))}
          <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1 h-8 w-8" onClick={() => onChange(items.filter((_, idx) => idx !== i))} aria-label="Remove" data-testid={`${testId}-${i}-remove`}>
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, blank])} data-testid={`${testId}-add`}>
        <Plus /> {addLabel}
      </Button>
    </div>
  );
}
