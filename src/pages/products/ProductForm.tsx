import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import TagInput from '@/components/technologies/TagInput';
import {
  fetchProduct,
  createProduct,
  updateProduct,
  fetchTechSuggest,
  fetchDecisionsSuggest,
  ProductStatus,
  ProductFormData,
  STATUS_OPTIONS,
  TechRef,
  DecisionRef,
} from '@/api/products';

const INPUT = 'w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

const EMPTY: ProductFormData = {
  name: '', owner: '', status: 'in_development' as ProductStatus,
  description: '', tags: [], technologyIds: [], decisionIds: [],
};

export default function ProductForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<ProductFormData>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [selectedTechs, setSelectedTechs] = useState<TechRef[]>([]);
  const [techQuery, setTechQuery] = useState('');
  const [techSuggestions, setTechSuggestions] = useState<TechRef[]>([]);
  const [techOpen, setTechOpen] = useState(false);
  const techDebounce = useRef<ReturnType<typeof setTimeout>>();
  const techRef = useRef<HTMLDivElement>(null);

  const [selectedDecisions, setSelectedDecisions] = useState<DecisionRef[]>([]);
  const [decQuery, setDecQuery] = useState('');
  const [decSuggestions, setDecSuggestions] = useState<DecisionRef[]>([]);
  const [decOpen, setDecOpen] = useState(false);
  const decDebounce = useRef<ReturnType<typeof setTimeout>>();
  const decRef = useRef<HTMLDivElement>(null);

  function set<K extends keyof ProductFormData>(k: K, v: ProductFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchProduct(id)
      .then((d) => {
        setForm({
          name: d.name, owner: d.owner, status: d.status,
          description: d.description, tags: d.tags.map((t) => t.name),
          technologyIds: d.technologies.map((t) => t.id),
          decisionIds: d.decisions.map((x) => x.id),
        });
        setSelectedTechs(d.technologies);
        setSelectedDecisions(d.decisions);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  useEffect(() => {
    clearTimeout(techDebounce.current);
    techDebounce.current = setTimeout(async () => {
      const res = await fetchTechSuggest(techQuery);
      setTechSuggestions(res.filter((r) => !selectedTechs.find((s) => s.id === r.id)));
    }, 200);
  }, [techQuery, selectedTechs]);

  useEffect(() => {
    clearTimeout(decDebounce.current);
    decDebounce.current = setTimeout(async () => {
      const res = await fetchDecisionsSuggest(decQuery);
      setDecSuggestions(res.filter((r) => !selectedDecisions.find((s) => s.id === r.id)));
    }, 200);
  }, [decQuery, selectedDecisions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (techRef.current && !techRef.current.contains(e.target as Node)) setTechOpen(false);
      if (decRef.current && !decRef.current.contains(e.target as Node)) setDecOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addTech = (t: TechRef) => {
    const updated = [...selectedTechs, t];
    setSelectedTechs(updated);
    set('technologyIds', updated.map((x) => x.id));
    setTechQuery(''); setTechOpen(false);
  };
  const removeTech = (tid: string) => {
    const updated = selectedTechs.filter((t) => t.id !== tid);
    setSelectedTechs(updated);
    set('technologyIds', updated.map((t) => t.id));
  };

  const addDecision = (d: DecisionRef) => {
    const updated = [...selectedDecisions, d];
    setSelectedDecisions(updated);
    set('decisionIds', updated.map((x) => x.id));
    setDecQuery(''); setDecOpen(false);
  };
  const removeDecision = (did: string) => {
    const updated = selectedDecisions.filter((d) => d.id !== did);
    setSelectedDecisions(updated);
    set('decisionIds', updated.map((d) => d.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Заполните поле «Название»'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit && id) {
        await updateProduct(id, form);
        navigate(`/product-analysis/${id}`);
      } else {
        const created = await createProduct(form);
        navigate(`/product-analysis/${created.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
      <Icon name="Loader2" size={22} className="animate-spin" /> Загрузка…
    </div>
  );

  return (
    <>
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-6 max-w-[1400px] mx-auto">
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-4 flex-wrap">
            <Link to="/product-analysis" className="hover:text-primary-foreground transition-colors">Продукты</Link>
            <Icon name="ChevronRight" size={14} />
            <span className="text-primary-foreground font-medium">{isEdit ? 'Редактирование' : 'Создание'}</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {isEdit ? 'Редактировать продукт' : 'Новый продукт'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-6 py-8 max-w-[1000px] mx-auto space-y-6">

          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Название <span className="text-destructive">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Название продукта…"
                autoFocus={!isEdit}
                className={INPUT}
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Владелец</label>
              <input
                value={form.owner}
                onChange={(e) => set('owner', e.target.value)}
                placeholder="Имя или команда"
                className={INPUT}
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Статус</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as ProductStatus)}
                className={INPUT}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Описание</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Краткое описание продукта…"
                rows={6}
                className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-y"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Теги</label>
              <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} />
            </div>
          </div>

          {/* Technologies */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Icon name="Cpu" size={18} className="text-accent" /> Технологии продукта
            </h2>
            <p className="text-xs text-muted-foreground">
              Технологии, из которых состоит продукт. Используются для расчёта применимых требований и соответствия шаблонам архитектур.
            </p>
            <div ref={techRef} className="relative">
              <div className="flex flex-wrap gap-2 p-2 min-h-10 rounded-md border border-border bg-background focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-colors">
                {selectedTechs.map((t) => (
                  <span key={t.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-accent/15 text-accent">
                    <Icon name="Cpu" size={11} /> {t.name}
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
              {techOpen && techSuggestions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-52 overflow-y-auto">
                  {techSuggestions.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); addTech(t); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                    >
                      <Icon name="Cpu" size={14} className="text-muted-foreground shrink-0" />
                      <span className="flex-1">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground">{t.statusLabel}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Decisions */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Icon name="Workflow" size={18} className="text-accent" /> Применённые решения
            </h2>
            <p className="text-xs text-muted-foreground">
              Технические и организационные решения, реализованные в продукте.
            </p>
            <div ref={decRef} className="relative">
              <div className="flex flex-wrap gap-2 p-2 min-h-10 rounded-md border border-border bg-background focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-colors">
                {selectedDecisions.map((d) => (
                  <span key={d.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-accent/15 text-accent">
                    <Icon name="Workflow" size={11} /> {d.name}
                    <button type="button" onClick={() => removeDecision(d.id)} className="ml-0.5 hover:text-destructive transition-colors">
                      <Icon name="X" size={11} />
                    </button>
                  </span>
                ))}
                <input
                  value={decQuery}
                  onChange={(e) => { setDecQuery(e.target.value); setDecOpen(true); }}
                  onFocus={() => setDecOpen(true)}
                  placeholder={selectedDecisions.length ? '' : 'Найти решение…'}
                  className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground py-0.5 px-1"
                />
              </div>
              {decOpen && decSuggestions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-52 overflow-y-auto">
                  {decSuggestions.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); addDecision(d); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                    >
                      <Icon name="Workflow" size={14} className="text-muted-foreground shrink-0" />
                      <span className="flex-1">{d.name}</span>
                      <span className="text-[10px] text-muted-foreground">{d.typeLabel}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
              <Icon name="TriangleAlert" size={16} /> {error}
            </div>
          )}

          <div className="flex items-center gap-3 pb-8">
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-6 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving
                ? <><Icon name="Loader2" size={16} className="animate-spin" /> Сохранение…</>
                : <><Icon name="Save" size={16} /> {isEdit ? 'Сохранить изменения' : 'Создать продукт'}</>
              }
            </button>
            <Link
              to={isEdit && id ? `/product-analysis/${id}` : '/product-analysis'}
              className="h-10 px-5 rounded-md border border-border text-sm font-medium flex items-center gap-2 hover:border-accent hover:text-accent transition-colors"
            >
              Отмена
            </Link>
          </div>
        </div>
      </form>
    </>
  );
}
