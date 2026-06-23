import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import TagInput from '@/components/technologies/TagInput';
import {
  fetchRequirement,
  createRequirement,
  updateRequirement,
  fetchTagsSuggest,
  fetchTechSuggest,
  RequirementFormData,
  ReqStatus,
  ReqType,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  TagRef,
  TechRef,
} from '@/api/requirements';

const EMPTY: RequirementFormData = {
  shortDesc: '',
  description: '',
  reqType: 'functional',
  owner: '',
  status: 'active',
  normativeDoc: '',
  controlMetrics: '',
  fulfillmentMethod: '',
  isProcurement: false,
  scorePoint: 1,
  scoreWeight: 1,
  tags: [],
  technologyIds: [],
  changeNote: '',
};

export default function RequirementForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<RequirementFormData>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mdPreview, setMdPreview] = useState(false);

  // Technologies picker state
  const [selectedTechs, setSelectedTechs] = useState<TechRef[]>([]);
  const [techQuery, setTechQuery] = useState('');
  const [techSuggestions, setTechSuggestions] = useState<TechRef[]>([]);
  const [techOpen, setTechOpen] = useState(false);
  const techDebounce = useRef<ReturnType<typeof setTimeout>>();
  const techRef = useRef<HTMLDivElement>(null);

  // Load existing
  useEffect(() => {
    if (!isEdit || !id) return;
    fetchRequirement(id)
      .then((r) => {
        setForm({
          shortDesc: r.shortDesc,
          description: r.description,
          reqType: r.reqType,
          owner: r.owner,
          status: r.status,
          normativeDoc: r.normativeDoc,
          controlMetrics: r.controlMetrics,
          fulfillmentMethod: r.fulfillmentMethod,
          isProcurement: r.isProcurement,
          scorePoint: r.scorePoint,
          scoreWeight: r.scoreWeight,
          tags: r.tags.map((t) => t.name),
          technologyIds: r.technologies.map((t) => t.id),
          changeNote: '',
        });
        setSelectedTechs(r.technologies);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Tech suggestions
  useEffect(() => {
    clearTimeout(techDebounce.current);
    techDebounce.current = setTimeout(async () => {
      const res = await fetchTechSuggest(techQuery);
      setTechSuggestions(res);
    }, 200);
  }, [techQuery]);

  // Close tech dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (techRef.current && !techRef.current.contains(e.target as Node)) setTechOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const set = <K extends keyof RequirementFormData>(k: K, v: RequirementFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addTech = (tech: TechRef) => {
    if (selectedTechs.find((t) => t.id === tech.id)) return;
    const updated = [tech, ...selectedTechs];
    setSelectedTechs(updated);
    set('technologyIds', updated.map((t) => t.id));
    setTechQuery('');
    setTechOpen(false);
  };

  const removeTech = (techId: string) => {
    const updated = selectedTechs.filter((t) => t.id !== techId);
    setSelectedTechs(updated);
    set('technologyIds', updated.map((t) => t.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shortDesc.trim()) { setError('Заполните поле «Краткое описание»'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit && id) {
        await updateRequirement(id, form);
        navigate(`/requirements/${id}`);
      } else {
        const created = await createRequirement(form);
        navigate(`/requirements/${created.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
      <Icon name="Loader2" size={22} className="animate-spin" />
      Загрузка…
    </div>
  );

  const availableSuggestions = techSuggestions.filter((t) => !selectedTechs.find((s) => s.id === t.id));

  return (
    <form onSubmit={handleSubmit} className="pb-10">
      {/* Topbar */}
      <div className="sticky top-16 z-10 border-b border-border bg-card/90 backdrop-blur-sm px-6 py-3 flex items-center gap-4">
        <Link to={isEdit ? `/requirements/${id}` : '/requirements'} className="text-muted-foreground hover:text-foreground transition-colors">
          <Icon name="ArrowLeft" size={18} />
        </Link>
        <h2 className="text-sm font-semibold flex-1">
          {isEdit ? `Редактирование ${id}` : 'Новое требование'}
        </h2>
        {error && (
          <span className="text-xs text-destructive max-w-xs truncate">{error}</span>
        )}
        <button
          type="submit"
          disabled={saving}
          className="h-9 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Save" size={15} />}
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>

      <div className="p-6 max-w-[1100px] mx-auto space-y-6">

        {/* ID (read-only for edit) */}
        {isEdit && (
          <div className="flex items-center gap-3 py-2 px-4 rounded-lg border border-border bg-muted/30">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">ID</span>
            <span className="font-mono text-sm text-accent">{id}</span>
            <span className="text-[11px] text-muted-foreground ml-auto">Не редактируется</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — main fields */}
          <div className="lg:col-span-2 space-y-5">

            {/* Short desc */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Краткое описание <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.shortDesc}
                onChange={(e) => set('shortDesc', e.target.value)}
                placeholder="Кратко опишите требование"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Описание (Markdown)
                </label>
                <button
                  type="button"
                  onClick={() => setMdPreview((v) => !v)}
                  className="text-[11px] text-muted-foreground hover:text-accent transition-colors flex items-center gap-1"
                >
                  <Icon name={mdPreview ? 'Code' : 'Eye'} size={12} />
                  {mdPreview ? 'Редактор' : 'Превью'}
                </button>
              </div>
              {mdPreview ? (
                <div className="min-h-[180px] rounded-md border border-border bg-background p-4">
                  <MarkdownViewer content={form.description || '_Пусто_'} />
                </div>
              ) : (
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Подробное описание требования в формате Markdown…"
                  rows={7}
                  className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-y font-mono"
                />
              )}
            </div>

            {/* Normative doc */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Нормативная документация
              </label>
              <input
                type="text"
                value={form.normativeDoc}
                onChange={(e) => set('normativeDoc', e.target.value)}
                placeholder="ГОСТ, ФЗ, стандарт…"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
            </div>

            {/* Control metrics */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Метрики контроля
              </label>
              <textarea
                value={form.controlMetrics}
                onChange={(e) => set('controlMetrics', e.target.value)}
                placeholder="Как будет контролироваться исполнение…"
                rows={3}
                className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-y"
              />
            </div>

            {/* Fulfillment method */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Способ исполнения требования
              </label>
              <textarea
                value={form.fulfillmentMethod}
                onChange={(e) => set('fulfillmentMethod', e.target.value)}
                placeholder="Описание способа исполнения…"
                rows={3}
                className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-y"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Теги</label>
              <TagInput
                value={form.tags}
                onChange={(tags) => set('tags', tags)}
                fetchSuggestions={fetchTagsSuggest}
              />
            </div>

            {/* Technologies picker */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Технологии
              </label>
              <div ref={techRef} className="relative">
                <div className="flex flex-wrap gap-2 p-2 min-h-10 rounded-md border border-border bg-background focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-colors">
                  {selectedTechs.map((t) => (
                    <span
                      key={t.id}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-accent/15 text-accent"
                    >
                      <Icon name="Cpu" size={11} />
                      {t.name}
                      <button
                        type="button"
                        onClick={() => removeTech(t.id)}
                        className="ml-0.5 hover:text-destructive transition-colors"
                      >
                        <Icon name="X" size={11} />
                      </button>
                    </span>
                  ))}
                  <input
                    value={techQuery}
                    onChange={(e) => { setTechQuery(e.target.value); setTechOpen(true); }}
                    onFocus={() => setTechOpen(true)}
                    placeholder={selectedTechs.length ? '' : 'Найти технологию…'}
                    className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {techOpen && availableSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-52 overflow-y-auto">
                    {availableSuggestions.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); addTech(t); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                      >
                        <Icon name="Cpu" size={14} className="text-muted-foreground shrink-0" />
                        <span className="flex-1">{t.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{t.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Change note */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Примечание к изменению {isEdit && <span className="text-muted-foreground/60">(для версии)</span>}
              </label>
              <input
                type="text"
                value={form.changeNote}
                onChange={(e) => set('changeNote', e.target.value)}
                placeholder={isEdit ? 'Что изменилось?' : 'Необязательно'}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Right — meta fields */}
          <div className="space-y-4">

            {/* Type */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Тип требования
              </label>
              <select
                value={form.reqType}
                onChange={(e) => set('reqType', e.target.value as ReqType)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Статус
              </label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as ReqStatus)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Owner */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Владелец
              </label>
              <input
                type="text"
                value={form.owner}
                onChange={(e) => set('owner', e.target.value)}
                placeholder="Имя или команда"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
            </div>

            {/* Procurement */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                Закупки
              </label>
              <button
                type="button"
                onClick={() => set('isProcurement', !form.isProcurement)}
                className={`w-full h-10 rounded-md border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  form.isProcurement
                    ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
                    : 'border-border bg-background text-muted-foreground hover:border-accent/50'
                }`}
              >
                <Icon name="ShoppingCart" size={15} />
                {form.isProcurement ? 'Применяется в закупках' : 'Не применяется в закупках'}
              </button>
            </div>

            {/* Score */}
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Скор</div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">Балл (1–4)</label>
                  <span className="font-mono text-sm font-bold text-accent">{form.scorePoint}</span>
                </div>
                <input
                  type="range"
                  min={1} max={4} step={1}
                  value={form.scorePoint}
                  onChange={(e) => set('scorePoint', Number(e.target.value))}
                  className="w-full accent-accent"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>1</span><span>2</span><span>3</span><span>4</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">Вес (1–10)</label>
                  <span className="font-mono text-sm font-bold">{form.scoreWeight}</span>
                </div>
                <input
                  type="range"
                  min={1} max={10} step={1}
                  value={form.scoreWeight}
                  onChange={(e) => set('scoreWeight', Number(e.target.value))}
                  className="w-full accent-accent"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>1</span><span>5</span><span>10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
