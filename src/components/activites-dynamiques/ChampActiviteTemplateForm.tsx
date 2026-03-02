import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChampActiviteTemplateDto } from '@/lib/api';
import { TYPE_CHAMP_ACTIVITE, type TypeChampActivite } from './constants';

interface ChampActiviteTemplateFormProps {
  champ: Partial<ChampActiviteTemplateDto>;
  index: number;
  onChange: (index: number, data: Partial<ChampActiviteTemplateDto>) => void;
  onRemove: (index: number) => void;
}

export function ChampActiviteTemplateForm({
  champ,
  index,
  onChange,
  onRemove,
}: ChampActiviteTemplateFormProps) {
  const options = (champ.options ?? []) as { value: string; label: string }[];
  const addOption = () => {
    onChange(index, { ...champ, options: [...options, { value: '', label: '' }] });
  };
  const updateOption = (i: number, key: 'value' | 'label', val: string) => {
    const next = options.map((o, j) => (j === i ? { ...o, [key]: val } : o));
    onChange(index, { ...champ, options: next });
  };
  const removeOption = (i: number) => {
    onChange(index, { ...champ, options: options.filter((_, j) => j !== i) });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 mb-3">
      <div className="grid grid-cols-[1fr_1fr_120px_80px_1fr_auto] gap-2 items-start">
        <Input
          placeholder="Nom (slug)"
          value={champ.nom ?? ''}
          onChange={(e) => onChange(index, { ...champ, nom: e.target.value })}
          className="h-9"
        />
        <Input
          placeholder="Label"
          value={champ.label ?? ''}
          onChange={(e) => onChange(index, { ...champ, label: e.target.value })}
          className="h-9"
        />
        <select
          value={champ.type_champ ?? 'text'}
          onChange={(e) =>
            onChange(index, { ...champ, type_champ: e.target.value as TypeChampActivite })
          }
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          {TYPE_CHAMP_ACTIVITE.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id={`req-${index}`}
            checked={champ.required ?? false}
            onChange={(e) => onChange(index, { ...champ, required: e.target.checked })}
            className="h-4 w-4"
          />
          <Label htmlFor={`req-${index}`} className="text-xs">
            Requis
          </Label>
        </div>
        <Input
          type="number"
          placeholder="Ordre"
          value={champ.ordre ?? index}
          onChange={(e) =>
            onChange(index, { ...champ, ordre: parseInt(e.target.value, 10) || 0 })
          }
          min={0}
          className="h-9"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => onRemove(index)}>
          Suppr.
        </Button>
      </div>
      {champ.type_champ === 'choice' && (
        <div className="mt-3 pt-3 border-t border-border">
          <Label className="text-sm font-medium">Options (value / label)</Label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2 mt-2">
              <Input
                placeholder="value"
                value={opt.value}
                onChange={(e) => updateOption(i, 'value', e.target.value)}
                className="flex-1 h-9"
              />
              <Input
                placeholder="label"
                value={opt.label}
                onChange={(e) => updateOption(i, 'label', e.target.value)}
                className="flex-1 h-9"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(i)}>
                −
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addOption}>
            + Option
          </Button>
        </div>
      )}
    </div>
  );
}
