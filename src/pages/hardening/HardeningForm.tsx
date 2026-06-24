import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { useFormCache } from '@/hooks/useFormCache';
import TagInput from '@/components/technologies/TagInput';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import {
  fetchHardening,
  createHardening,
  updateHardening,
  fetchTagsSuggest,
  fetchSolutionsSuggest,
  HardeningStatus,
  HardeningFormData,
  SolutionRef,
  STATUS_OPTIONS,
} from '@/api/hardening';

const EMPTY: HardeningFormData = {
  name: '', owner: '', status: 'in_development' as HardeningStatus,
  description: '', tags: [], solutionIds: [], changeNote: '',
};

type Tab = 'main' | 'description' | 'links';

const INPUT = 'w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

export default function HardeningForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const cacheKey = `form:hardening:${id ?? 'new'}`;
  const tabKey = `form:hardening:${id ?? 'new'}:tab`;

  const [form, setForm] = useState<HardeningFormData>(EMPTY);
  const [entityId, setEntityId] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(false);
  const [mdPreview, setMdPreview] = useState(false);

  const [tab, setTab] = useState<Tab>(() => {
    try { return (sessionStorage.getItem(tabKey) as Tab) || 'main'; } catch { return 'main'; }
  });

  const switchTab = (t: Tab) => {
    setTab(t);
    try { sessionStorage.setItem(tabKey, t); } catch { /* */ }
  };

  // Solutions search
  const [selectedSolutions, setSelectedSolutions] = useState<SolutionRef[]>([]);
  const [solQuery, setSolQuery] = useState('');
  const [solSuggestions, setSolSuggestions] = useState<SolutionRef[]>([]);
  const [solOpen, setSolOpen] = useState(false);
  const solDebounce = useRef<ReturnType<typeof setTimeout>>();
  const solRef = useRef<HTMLDivElement>(null);

  const { clear } = useFormCache(cacheKey, form, (cached) => {
    setForm(cached); setRestored(true);
  });

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchHardening(id)
      .then((d) => {
        setForm((prev) => {
          const hasCache = prev.name !== '';
          return hasCache ? prev : {
            name: d.name, owner: d.owner, status: d.status,
            description: d.description,
            tags: d.tags.map((t) => t.name),
            solutionIds: d.solutions.map((s) => s.id),
            changeNote: '',
          };
        });
        setEntityId(d.id);
        setCurrentVersion(d.version);
        setSelectedSolutions(d.solutions);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Solutions suggest
  useEffect(() => {
    clearTimeout(solDebounce.current);
    solDebounce.current = setTimeout(async () => {
      const res = await fetchSolutionsSuggest(solQuery);
      setSolSuggestions(res.filter((r) => !selectedSolutions.find((s) => s.id === r.id)));
    }, 200);
  }, [solQuery, selectedSolutions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (solRef.current && !solRef.current.contains(e.target as Node)) setSolOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const set = <K extends keyof HardeningFormData>(k: K, v: HardeningFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addSolution = (s: SolutionRef) => {
    const updated = [...selectedSolutions, s];
    setSelectedSolutions(updated);
    set('solutionIds', updated.map((x) => x.id));
    setSolQuery(''); setSolOpen(false);
  };

  const removeSolution = (sid: string) => {
    const updated = selectedSolutions.filter((s) => s.id !== sid);
    setSelectedSolutions(updated);
    set('solutionIds', updated.map((s) => s.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Заполните поле «Название»'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit && id) {
        await updateHardening(id, form);
        clear();
        try { sessionStorage.removeItem(tabKey); } catch { /* */ }
        navigate(`/hardening/${id}`);
      } else {
        const created = await createHardening(form);
        clear();
        try { sessionStorage.removeItem(tabKey); } catch { /* */ }
        navigate(`/hardening/${created.id}`);
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

  const displayId = isEdit ? (entityId || id || '—') : 'hts-…';
  const displayVersion = isEdit ? (currentVersion || '—') : '1.0';

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-6 max-w-[1400px] mx-auto">
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-4 flex-wrap">
            <Link to="/hardening" className="hover:text-primary-foreground transition-colors">Харденинг</Link>
            <Icon name="ChevronRight" size={14} />
            <span className="text-primary-foreground font-medium">
              {isEdit ? 'Редактирование' : 'Новая карточка'}
            </span>
          </nav>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {isEdit ? form.name || 'Редактирование' : 'Новая карточка харденинга'}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-primary-foreground/60">
                <span className="font-mono">{displayId}</span>
                <span>·</span>
                <span>v{displayVersion}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={isEdit && id ? `/hardening/${id}` : '/hardening'}
                className="h-10 px-4 rounded-md border border-primary-foreground/20 text-primary-foreground/80 text-sm flex items-center gap-2 hover:bg-primary-foreground/10 transition-colors"
              >
                <Icon name="X" size={16} /> Отмена
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="h-10 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving
                  ? <><Icon name="Loader2" size={16} className="animate-spin" /> Сохранение…</>
                  : <><Icon name="Save" size={16} /> Сохранить</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-card/60">
        <div className="px-6 max-w-[1400px] mx-auto flex gap-1">
          {([
            { key: 'main',        label: 'Основное',                       icon: 'Settings2'   },
            { key: 'description', label: 'Описание',                       icon: 'FileText'    },
            { key: 'links',       label: 'Техническое решение и харденинг', icon: 'ShieldCheck' },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        {restored && (
          <div className="mb-6 flex items-center gap-3 p-3 rounded-lg border border-warning/30 bg-warning/5 text-warning text-sm">
            <Icon name="RotateCcw" size={16} /> Восстановлен несохранённый черновик
            <button type="button" onClick={() => { clear(); setForm(EMPTY); setRestored(false); }}
              className="ml-auto text-xs underline hover:no-underline">Сбросить</button>
          </div>
        )}
        {error && (
          <div className="mb-6 flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
            <Icon name="TriangleAlert" size={16} /> {error}
          </div>
        )}

        {/* Tab: Основное */}
        {tab === 'main' && (
          <div className="max-w-2xl space-y-5">
            {/* ID (readonly) */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">ID</label>
              <input readOnly value={displayId} className={`${INPUT} opacity-60 cursor-not-allowed font-mono`} />
            </div>
            {/* Версия (readonly) */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Версия</label>
              <input readOnly value={displayVersion} className={`${INPUT} opacity-60 cursor-not-allowed font-mono`} />
            </div>
            {/* Название */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Название *</label>
              <input
                className={INPUT}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Название карточки"
              />
            </div>
            {/* Владелец */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Владелец</label>
              <input
                className={INPUT}
                value={form.owner}
                onChange={(e) => set('owner', e.target.value)}
                placeholder="Ответственный"
              />
            </div>
            {/* Статус */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Статус</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as HardeningStatus)}
                className={INPUT + ' cursor-pointer'}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            {/* Теги */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Теги</label>
              <TagInput
                value={form.tags}
                onChange={(tags) => set('tags', tags)}
                fetchSuggest={fetchTagsSuggest}
              />
            </div>
            {/* Примечание к версии */}
            {isEdit && (
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Примечание к изменению</label>
                <input
                  className={INPUT}
                  value={form.changeNote ?? ''}
                  onChange={(e) => set('changeNote', e.target.value)}
                  placeholder="Что изменилось?"
                />
              </div>
            )}
          </div>
        )}

        {/* Tab: Описание */}
        {tab === 'description' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Описание (Markdown)</label>
              <button
                type="button"
                onClick={() => setMdPreview((p) => !p)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
              >
                <Icon name={mdPreview ? 'Code' : 'Eye'} size={14} />
                {mdPreview ? 'Редактор' : 'Превью'}
              </button>
            </div>
            {mdPreview ? (
              <div className="rounded-lg border border-border bg-card p-6 min-h-[400px]">
                {form.description ? <MarkdownViewer>{form.description}</MarkdownViewer>
                  : <p className="text-muted-foreground text-sm">Нет содержимого</p>}
              </div>
            ) : (
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={20}
                placeholder="Введите описание в формате Markdown…"
                className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm font-mono outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-y"
              />
            )}
          </div>
        )}

        {/* Tab: Техническое решение и харденинг */}
        {tab === 'links' && (
          <div className="max-w-2xl space-y-6">
            <section>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Icon name="Workflow" size={16} className="text-accent" /> Связанное техническое решение
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Выберите технические решения (тип «Техническое»). После привязки в карточке будут отображаться требования по доменам.
              </p>

              {/* Выбранные решения */}
              {selectedSolutions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedSolutions.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-accent/30 bg-accent/5 text-sm">
                      <Icon name="Workflow" size={13} className="text-accent" />
                      {s.name}
                      <span className="text-[10px] font-mono text-muted-foreground">{s.id}</span>
                      <button
                        type="button"
                        onClick={() => removeSolution(s.id)}
                        className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Icon name="X" size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Поиск */}
              <div ref={solRef} className="relative">
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-background text-sm text-muted-foreground">
                  <Icon name="Search" size={15} />
                  <input
                    className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
                    placeholder="Найти техническое решение…"
                    value={solQuery}
                    onChange={(e) => { setSolQuery(e.target.value); setSolOpen(true); }}
                    onFocus={() => setSolOpen(true)}
                  />
                </div>
                {solOpen && solSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg overflow-hidden">
                    {solSuggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => addSolution(s)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left"
                      >
                        <Icon name="Workflow" size={14} className="text-accent shrink-0" />
                        <span className="flex-1 truncate">{s.name}</span>
                        <span className="text-[11px] font-mono text-muted-foreground shrink-0">{s.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </form>
  );
}
