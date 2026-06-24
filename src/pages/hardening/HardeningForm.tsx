import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { useFormCache } from '@/hooks/useFormCache';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import {
  fetchHardening,
  createHardening,
  updateHardening,
  fetchSolutionsSuggest,
  HardeningStatus,
  HardeningFormData,
  SolutionRef,
  RequirementRef,
  RequirementDomainGroup,
} from '@/api/hardening';
import HardeningFormMainTab from './HardeningFormMainTab';
import HardeningFormLinksTab from './HardeningFormLinksTab';

const EMPTY: HardeningFormData = {
  name: '', owner: '', status: 'in_development' as HardeningStatus,
  description: '', tags: [], solutionIds: [], changeNote: '',
};

type Tab = 'main' | 'description' | 'links';

export default function HardeningForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const cacheKey = `form:hardening:${id ?? 'new'}`;
  const tabKey = `form:hardening:${id ?? 'new'}:tab`;

  const [form, setForm] = useState<HardeningFormData>(EMPTY);
  const [entityId, setEntityId] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const [requirementsByDomain, setRequirementsByDomain] = useState<RequirementDomainGroup[]>([]);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(false);
  const [mdPreview, setMdPreview] = useState(false);

  const [activeReqId, setActiveReqId] = useState<string | null>(null);
  const [reqSearch, setReqSearch] = useState('');

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
        setRequirementsByDomain(d.requirementsByDomain);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  useEffect(() => {
    clearTimeout(solDebounce.current);
    solDebounce.current = setTimeout(async () => {
      const res = await fetchSolutionsSuggest(solQuery);
      setSolSuggestions(res.filter((r) => !selectedSolutions.find((s) => s.id === r.id)));
    }, 200);
  }, [solQuery, selectedSolutions]);

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

  const allReqs: RequirementRef[] = requirementsByDomain.flatMap((g) => g.requirements);
  const filteredReqs = reqSearch.trim()
    ? allReqs.filter((r) =>
        r.shortDesc.toLowerCase().includes(reqSearch.toLowerCase()) ||
        r.id.toLowerCase().includes(reqSearch.toLowerCase()))
    : allReqs;

  const activeReq = allReqs.find((r) => r.id === activeReqId) ?? null;
  const currentHardeningId = isEdit ? (entityId || id || '') : entityId;

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
            { key: 'main',        label: 'Основное',                        icon: 'Settings2'  },
            { key: 'description', label: 'Описание',                        icon: 'FileText'   },
            { key: 'links',       label: 'Техническое решение и харденинг', icon: 'ShieldCheck',
              badge: allReqs.length || undefined },
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
              {'badge' in t && t.badge ? (
                <span className="ml-0.5 text-[10px] font-mono bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">
                  {t.badge}
                </span>
              ) : null}
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

        {tab === 'main' && (
          <HardeningFormMainTab
            form={form}
            set={set}
            isEdit={isEdit}
            displayId={displayId}
            displayVersion={displayVersion}
          />
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

        {tab === 'links' && (
          <HardeningFormLinksTab
            selectedSolutions={selectedSolutions}
            solQuery={solQuery}
            setSolQuery={setSolQuery}
            solOpen={solOpen}
            setSolOpen={setSolOpen}
            solSuggestions={solSuggestions}
            solRef={solRef}
            addSolution={addSolution}
            removeSolution={removeSolution}
            allReqs={allReqs}
            filteredReqs={filteredReqs}
            requirementsByDomain={requirementsByDomain}
            reqSearch={reqSearch}
            setReqSearch={setReqSearch}
            activeReqId={activeReqId}
            setActiveReqId={setActiveReqId}
            activeReq={activeReq}
            currentHardeningId={currentHardeningId}
          />
        )}
      </div>
    </form>
  );
}