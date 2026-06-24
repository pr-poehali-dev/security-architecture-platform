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
  fetchTechDomainSuggest,
  RequirementFormData,
  ReqStatus,
  ReqType,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  TechRef,
  TechDomainRef,
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
  techDomainId: null,
  changeNote: '',
};

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-visible">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
        <Icon name={icon as 'FileText'} size={15} className="text-accent" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</span>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT = "w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors";
const TEXTAREA = "w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-y";

export default function RequirementForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<RequirementFormData>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mdPreview, setMdPreview] = useState(false);

  const [selectedTechs, setSelectedTechs] = useState<TechRef[]>([]);
  const [techQuery, setTechQuery] = useState('');
  const [techSuggestions, setTechSuggestions] = useState<TechRef[]>([]);
  const [techOpen, setTechOpen] = useState(false);
  const techDebounce = useRef<ReturnType<typeof setTimeout>>();
  const techRef = useRef<HTMLDivElement>(null);

  const [selectedTechDomain, setSelectedTechDomain] = useState<TechDomainRef | null>(null);
  const [tdQuery, setTdQuery] = useState('');
  const [tdSuggestions, setTdSuggestions] = useState<TechDomainRef[]>([]);
  const [tdOpen, setTdOpen] = useState(false);
  const tdDebounce = useRef<ReturnType<typeof setTimeout>>();
  const tdRef = useRef<HTMLDivElement>(null);

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
        if (r.techDomain) {
          setSelectedTechDomain(r.techDomain);
          set('techDomainId', r.techDomain.id);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  useEffect(() => {
    clearTimeout(techDebounce.current);
    techDebounce.current = setTimeout(async () => {
      const res = await fetchTechSuggest(techQuery);
      setTechSuggestions(res);
    }, 200);
  }, [techQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (techRef.current && !techRef.current.contains(e.target as Node)) setTechOpen(false);
      if (tdRef.current && !tdRef.current.contains(e.target as Node)) setTdOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    clearTimeout(tdDebounce.current);
    tdDebounce.current = setTimeout(async () => {
      const res = await fetchTechDomainSuggest(tdQuery);
      setTdSuggestions(res);
    }, 200);
  }, [tdQuery]);

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
    <form onSubmit={handleSubmit} className="pb-16">

      {/* Sticky topbar */}
      <div className="sticky top-16 z-10 border-b border-border bg-card/95 backdrop-blur-sm px-6 h-14 flex items-center gap-3">
        <Link
          to={isEdit ? `/requirements/${id}` : '/requirements'}
          className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Icon name="ArrowLeft" size={17} />
        </Link>
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-semibold truncate">
            {isEdit ? `Редактирование ${id}` : 'Новое требование'}
          </h2>
          {isEdit && (
            <span className="font-mono text-xs text-accent bg-accent/10 px-2 py-0.5 rounded hidden sm:inline">{id}</span>
          )}
        </div>
        {error && (
          <span className="text-xs text-destructive max-w-[200px] truncate hidden md:block">{error}</span>
        )}
        <button
          type="submit"
          disabled={saving}
          className="h-9 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
        >
          {saving
            ? <><Icon name="Loader2" size={15} className="animate-spin" />Сохранение…</>
            : <><Icon name="Save" size={15} />Сохранить</>
          }
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="p-6 max-w-[900px] mx-auto space-y-5">

        {/* Основные поля */}
        <SectionCard title="Основное" icon="FileText">
          <Field label="ID" >
            <div className="h-10 px-3 rounded-md border border-border bg-muted/40 flex items-center gap-2">
              <span className="font-mono text-sm text-accent">
                {isEdit ? id : 'req-…'}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">Присваивается автоматически</span>
            </div>
          </Field>

          <Field label="Краткое описание" required>
            <input
              type="text"
              value={form.shortDesc}
              onChange={(e) => set('shortDesc', e.target.value)}
              placeholder="Кратко опишите требование"
              autoFocus={!isEdit}
              className={INPUT}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Тип требования">
              <select
                value={form.reqType}
                onChange={(e) => set('reqType', e.target.value as ReqType)}
                className={INPUT}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Статус">
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as ReqStatus)}
                className={INPUT}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Владелец">
              <input
                type="text"
                value={form.owner}
                onChange={(e) => set('owner', e.target.value)}
                placeholder="Имя или команда"
                className={INPUT}
              />
            </Field>

            <Field label="Закупки">
              <button
                type="button"
                onClick={() => set('isProcurement', !form.isProcurement)}
                className={`w-full h-10 rounded-md border text-sm font-medium flex items-center gap-2 px-3 transition-colors ${
                  form.isProcurement
                    ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
                    : 'border-border bg-background text-muted-foreground hover:border-accent/50 hover:text-foreground'
                }`}
              >
                <Icon name="ShoppingCart" size={15} />
                {form.isProcurement ? 'Применяется в закупках' : 'Не применяется'}
              </button>
            </Field>
          </div>
        </SectionCard>

        {/* Описание */}
        <SectionCard title="Описание" icon="AlignLeft">
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
              <div className="min-h-[160px] rounded-md border border-border bg-background/50 p-4">
                {form.description
                  ? <MarkdownViewer>{form.description}</MarkdownViewer>
                  : <p className="text-sm text-muted-foreground italic">Пусто — введите текст в режиме редактора</p>
                }
              </div>
            ) : (
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Подробное описание требования в формате Markdown…"
                rows={6}
                className={`${TEXTAREA} font-mono`}
              />
            )}
          </div>
        </SectionCard>

        {/* Скор */}
        <SectionCard title="Оценка" icon="BarChart2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Балл (1–4)</label>
                <span className="font-mono text-lg font-bold text-accent">{form.scorePoint}</span>
              </div>
              <input
                type="range" min={1} max={4} step={1}
                value={form.scorePoint}
                onChange={(e) => set('scorePoint', Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                {[1,2,3,4].map((n) => <span key={n}>{n}</span>)}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Вес (1–10)</label>
                <span className="font-mono text-lg font-bold">{form.scoreWeight}</span>
              </div>
              <input
                type="range" min={1} max={10} step={1}
                value={form.scoreWeight}
                onChange={(e) => set('scoreWeight', Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                {[1,'','','','5','','','','','10'].map((n, i) => <span key={i}>{n}</span>)}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Доп. поля */}
        <SectionCard title="Документация и исполнение" icon="BookOpen">
          <Field label="Нормативная документация">
            <input
              type="text"
              value={form.normativeDoc}
              onChange={(e) => set('normativeDoc', e.target.value)}
              placeholder="ГОСТ, ФЗ, стандарт…"
              className={INPUT}
            />
          </Field>

          <Field label="Метрики контроля">
            <textarea
              value={form.controlMetrics}
              onChange={(e) => set('controlMetrics', e.target.value)}
              placeholder="Как будет контролироваться исполнение…"
              rows={3}
              className={TEXTAREA}
            />
          </Field>

          <Field label="Способ исполнения требования">
            <textarea
              value={form.fulfillmentMethod}
              onChange={(e) => set('fulfillmentMethod', e.target.value)}
              placeholder="Описание способа исполнения…"
              rows={3}
              className={TEXTAREA}
            />
          </Field>
        </SectionCard>

        {/* Связи */}
        <SectionCard title="Связи и теги" icon="Link">
          <Field label="Теги">
            <TagInput
              value={form.tags}
              onChange={(tags) => set('tags', tags)}
              fetchSuggestions={fetchTagsSuggest}
            />
          </Field>

          <Field label="Технологии">
            <div ref={techRef} className="relative">
              <div className="flex flex-wrap gap-2 p-2 min-h-10 rounded-md border border-border bg-background focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-colors">
                {selectedTechs.map((t) => (
                  <span key={t.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-accent/15 text-accent">
                    <Icon name="Cpu" size={11} />
                    {t.name}
                    <button type="button" onClick={() => removeTech(t.id)} className="ml-0.5 hover:text-destructive transition-colors">
                      <Icon name="X" size={11} />
                    </button>
                  </span>
                ))}
                <input
                  value={techQuery}
                  onChange={(e) => { setTechQuery(e.target.value); setTechOpen(true); }}
                  onFocus={() => setTechOpen(true)}
                  placeholder={selectedTechs.length ? '' : 'Найти технологию…'}
                  className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground py-0.5 px-1"
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
          </Field>

          <Field label="Технический домен">
            <div ref={tdRef} className="relative">
              {selectedTechDomain ? (
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-background">
                  <Icon name="Layers" size={14} className="text-accent shrink-0" />
                  <span className="flex-1 text-sm">{selectedTechDomain.name}</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedTechDomain(null); set('techDomainId', null); setTdQuery(''); }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </div>
              ) : (
                <input
                  value={tdQuery}
                  onChange={(e) => { setTdQuery(e.target.value); setTdOpen(true); }}
                  onFocus={() => setTdOpen(true)}
                  placeholder="Найти технический домен…"
                  className={INPUT}
                />
              )}
              {tdOpen && !selectedTechDomain && tdSuggestions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-52 overflow-y-auto">
                  {tdSuggestions.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setSelectedTechDomain(d); set('techDomainId', d.id); setTdQuery(''); setTdOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                    >
                      <Icon name="Layers" size={14} className="text-muted-foreground shrink-0" />
                      <span className="flex-1">{d.name}</span>
                      <span className="text-[10px] text-muted-foreground">{d.statusLabel}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>
        </SectionCard>

        {/* Версия */}
        {isEdit && (
          <SectionCard title="Версионирование" icon="GitCommit">
            <Field label={`Примечание к изменению (создаст новую версию)`}>
              <input
                type="text"
                value={form.changeNote}
                onChange={(e) => set('changeNote', e.target.value)}
                placeholder="Что изменилось?"
                className={INPUT}
              />
            </Field>
          </SectionCard>
        )}

      </div>
    </form>
  );
}