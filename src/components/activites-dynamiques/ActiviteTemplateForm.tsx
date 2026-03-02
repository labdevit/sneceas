import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  getActiviteTemplate,
  createActiviteTemplate,
  updateActiviteTemplate,
  apiRequest,
  type ChampActiviteTemplateDto,
  type ActiviteTemplateDto,
} from '@/lib/api';
import { ChampActiviteTemplateForm } from './ChampActiviteTemplateForm';

type ApiPole = { id: number; nom: string };

interface ActiviteTemplateFormProps {
  templateId?: number | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function ActiviteTemplateForm({
  templateId,
  onSuccess,
  onCancel,
}: ActiviteTemplateFormProps) {
  const [poles, setPoles] = useState<ApiPole[]>([]);
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [ordre, setOrdre] = useState(0);
  const [poleIds, setPoleIds] = useState<number[]>([]);
  const [champs, setChamps] = useState<Partial<ChampActiviteTemplateDto>[]>([]);
  const [loading, setLoading] = useState(!!templateId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<ApiPole[] | { results: ApiPole[] }>('/poles/')
      .then((data) => setPoles(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setPoles([]));
  }, []);

  useEffect(() => {
    if (!templateId) return;
    setLoading(true);
    getActiviteTemplate(templateId)
      .then((t: ActiviteTemplateDto) => {
        setNom(t.nom);
        setCode(t.code);
        setDescription(t.description ?? '');
        setIsActive(t.is_active);
        setOrdre(t.ordre);
        setPoleIds(t.pole_ids ?? []);
        setChamps(
          (t.champs ?? []).map((c) => ({
            id: c.id,
            nom: c.nom,
            label: c.label,
            type_champ: c.type_champ,
            required: c.required,
            ordre: c.ordre,
            options: c.options ?? [],
            is_active: c.is_active ?? true,
          }))
        );
      })
      .catch(() => setError('Impossible de charger le modèle'))
      .finally(() => setLoading(false));
  }, [templateId]);

  const updateChamp = (index: number, data: Partial<ChampActiviteTemplateDto>) => {
    setChamps((prev) => prev.map((c, i) => (i === index ? { ...c, ...data } : c)));
  };
  const removeChamp = (index: number) => {
    setChamps((prev) => prev.filter((_, i) => i !== index));
  };
  const addChamp = () => {
    setChamps((prev) => [
      ...prev,
      {
        nom: '',
        label: '',
        type_champ: 'text',
        required: false,
        ordre: prev.length,
        options: [],
        is_active: true,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const slug =
      code.trim() ||
      nom
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    const payload = {
      nom: nom.trim(),
      code: slug,
      description: description.trim(),
      is_active: isActive,
      ordre,
      pole_ids: poleIds,
      champs: champs.map((c, i) => ({
        ...(c.id != null ? { id: c.id } : {}),
        nom: c.nom,
        label: c.label,
        type_champ: c.type_champ ?? 'text',
        required: c.required ?? false,
        ordre: c.ordre ?? i,
        options: (c.options ?? []) as { value: string; label: string }[],
        is_active: c.is_active ?? true,
      })),
    };
    setSubmitting(true);
    try {
      if (templateId) {
        await updateActiviteTemplate(templateId, payload);
      } else {
        await createActiviteTemplate(payload);
      }
      onSuccess();
    } catch (err) {
      setError(
        (err as { data?: { detail?: string } })?.data?.detail ??
          (err instanceof Error ? err.message : 'Erreur')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Chargement…</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">
        {templateId ? 'Modifier le modèle d\'activité' : 'Nouveau modèle d\'activité'}
      </h3>
      {error && (
        <div className="mb-4 text-sm text-destructive">{error}</div>
      )}
      <div className="space-y-4">
        <div>
          <Label htmlFor="tpl-nom">Nom *</Label>
          <Input
            id="tpl-nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="tpl-code">Code (slug, unique) *</Label>
          <Input
            id="tpl-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ex: evaluation_grille"
            required
            readOnly={!!templateId}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="tpl-desc">Description</Label>
          <Textarea
            id="tpl-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="tpl-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="tpl-active">Actif</Label>
          </div>
          <div className="flex items-center gap-2">
            <Label>Ordre</Label>
            <Input
              type="number"
              value={ordre}
              onChange={(e) => setOrdre(parseInt(e.target.value, 10) || 0)}
              min={0}
              className="w-20 h-9"
            />
          </div>
        </div>
        <div>
          <Label>Pôles assignés</Label>
          <select
            multiple
            value={poleIds.map(String)}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => Number(o.value));
              setPoleIds(selected);
            }}
            className="mt-1 flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {poles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Maintenir Ctrl/Cmd pour sélectionner plusieurs pôles.
          </p>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>Champs personnalisés</Label>
            <Button type="button" variant="outline" size="sm" onClick={addChamp}>
              + Champ
            </Button>
          </div>
          {champs.map((champ, i) => (
            <ChampActiviteTemplateForm
              key={i}
              champ={champ}
              index={i}
              onChange={updateChamp}
              onRemove={removeChamp}
            />
          ))}
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enregistrement…' : templateId ? 'Enregistrer' : 'Créer'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}
