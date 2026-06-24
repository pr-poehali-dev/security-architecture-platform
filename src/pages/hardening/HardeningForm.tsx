import { useEffect, useRef, useState, useCallback } from 'react';
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
  fetchReqContent,
  saveReqMarkdown,
  uploadReqImage,
  HardeningStatus,
  HardeningFormData,
  SolutionRef,
  RequirementRef,
  RequirementDomainGroup,
  ReqContent,
  ReqImage,
  STATUS_OPTIONS,
} from '@/api/hardening';

const EMPTY: HardeningFormData = {
  name: '', owner: '', status: 'in_development' as HardeningStatus,
  description: '', tags: [], solutionIds: [], changeNote: '',
};

type Tab = 'main' | 'description' | 'links';

const INPUT = 'w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

const REQ_STATUS_STYLE: Record<string, string> = {
  active:         'bg-emerald-500/15 text-emerald-400',
  in_development: 'bg-amber-500/15 text-amber-400',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
};

const PRIORITY_LABELS: Record<string, { label: string; cls: string }> = {
  critical: { label: 'CRITICAL', cls: 'bg-red-500/20 text-red-400' },
  high:     { label: 'HIGH',     cls: 'bg-orange-500/20 text-orange-400' },
  medium:   { label: 'MEDIUM',   cls: 'bg-yellow-500/20 text-yellow-400' },
  low:      { label: 'LOW',      cls: 'bg-blue-500/20 text-blue-400' },
};

// Панель редактирования контента одного требования
function ReqEditor({
  hardeningId,
  req,
}: {
  hardeningId: string;
  req: RequirementRef;
}) {
  const [content, setContent] = useState<ReqContent>({ markdown: '', updatedAt: null, images: [] });
  const [loadingContent, setLoadingContent] = useState(true);
  const [mdValue, setMdValue] = useState('');
  const [mdPreview, setMdPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!hardeningId) return;
    setLoadingContent(true);
    fetchReqContent(hardeningId, req.id)
      .then((c) => { setContent(c); setMdValue(c.markdown); })
      .finally(() => setLoadingContent(false));
  }, [hardeningId, req.id]);

  const handleSave = useCallback(async (md: string) => {
    if (!hardeningId) return;
    setSaving(true);
    try {
      const updated = await saveReqMarkdown(hardeningId, req.id, md);
      setContent(updated);
      setSaved(true);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [hardeningId, req.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !hardeningId) return;
    setUploading(true);
    try {
      const img = await uploadReqImage(hardeningId, req.id, file);
      setContent((prev) => ({ ...prev, images: [...prev.images, img] }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loadingContent) return (
    <div className="flex items-center justify-center h-full py-16 text-muted-foreground gap-2">
      <Icon name="Loader2" size={18} className="animate-spin" /> Загрузка…
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Req header */}
      <div className="pb-3 border-b border-border">
        <div className="text-xs font-mono text-muted-foreground mb-1">{req.id}</div>
        <div className="font-semibold text-sm leading-snug">{req.shortDesc}</div>
        {req.techName && (
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Icon name="Cpu" size={12} /> {req.techName}
          </div>
        )}
      </div>

      {/* Markdown editor */}
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Icon name="FileText" size={12} /> Инструкция (Markdown)
          </span>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-[11px] text-success flex items-center gap-1">
                <Icon name="Check" size={12} /> Сохранено
              </span>
            )}
            <button
              type="button"
              onClick={() => setMdPreview((p) => !p)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Icon name={mdPreview ? 'Code' : 'Eye'} size={13} />
              {mdPreview ? 'Редактор' : 'Превью'}
            </button>
          </div>
        </div>

        {mdPreview ? (
          <div className="flex-1 overflow-y-auto rounded-md border border-border bg-card/50 p-4 min-h-[200px]">
            {mdValue
              ? <MarkdownViewer>{mdValue}</MarkdownViewer>
              : <p className="text-muted-foreground text-sm">Нет содержимого</p>}
          </div>
        ) : (
          <textarea
            value={mdValue}
            onChange={(e) => setMdValue(e.target.value)}
            rows={10}
            placeholder="Опишите инструкцию по настройке в формате Markdown…"
            className="flex-1 w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm font-mono outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-none min-h-[200px]"
          />
        )}

        <button
          type="button"
          onClick={() => handleSave(mdValue)}
          disabled={saving}
          className="self-end h-8 px-4 rounded-md bg-accent text-accent-foreground text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving
            ? <><Icon name="Loader2" size={13} className="animate-spin" /> Сохранение…</>
            : <><Icon name="Save" size={13} /> Сохранить</>}
        </button>
      </div>

      {/* Images */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Icon name="Image" size={12} /> GUI-инструкции
            {content.images.length > 0 && (
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{content.images.length}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !hardeningId}
            className="h-7 px-3 rounded-md border border-border text-xs text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {uploading
              ? <><Icon name="Loader2" size={12} className="animate-spin" /> Загрузка…</>
              : <><Icon name="Upload" size={12} /> Загрузить</>}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        {content.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {content.images.map((img: ReqImage) => (
              <a key={img.id} href={img.url} target="_blank" rel="noreferrer"
                className="group relative rounded-md border border-border overflow-hidden bg-muted/30 hover:border-accent transition-colors">
                <img src={img.url} alt={img.filename}
                  className="w-full h-24 object-cover group-hover:opacity-90 transition-opacity" />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white/80 px-2 py-1 truncate">
                  {img.filename}
                </div>
              </a>
            ))}
          </div>
        )}

        {!hardeningId && (
          <p className="text-[11px] text-muted-foreground">Сохраните карточку, чтобы загружать изображения</p>
        )}
      </div>
    </div>
  );
}

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

  // Выбранное требование для редактирования
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

  // Solutions suggest
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

  // Все требования плоским списком
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
            { key: 'main',        label: 'Основное',                         icon: 'Settings2'   },
            { key: 'description', label: 'Описание',                         icon: 'FileText'    },
            { key: 'links',       label: 'Техническое решение и харденинг',   icon: 'ShieldCheck',
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

        {/* Tab: Основное */}
        {tab === 'main' && (
          <div className="max-w-2xl space-y-5">
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">ID</label>
              <input readOnly value={displayId} className={`${INPUT} opacity-60 cursor-not-allowed font-mono`} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Версия</label>
              <input readOnly value={displayVersion} className={`${INPUT} opacity-60 cursor-not-allowed font-mono`} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Название *</label>
              <input
                className={INPUT}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Название карточки"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Владелец</label>
              <input
                className={INPUT}
                value={form.owner}
                onChange={(e) => set('owner', e.target.value)}
                placeholder="Ответственный"
              />
            </div>
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
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Теги</label>
              <TagInput
                value={form.tags}
                onChange={(tags) => set('tags', tags)}
                fetchSuggest={fetchTagsSuggest}
              />
            </div>
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
          <div className="flex gap-6 h-[calc(100vh-280px)] min-h-[500px]">

            {/* LEFT: требования */}
            <div className="w-72 shrink-0 flex flex-col gap-3">
              {/* Привязка решений */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h3 className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                  <Icon name="Workflow" size={13} className="text-accent" /> Решение
                </h3>
                {selectedSolutions.length > 0 && (
                  <div className="space-y-1.5">
                    {selectedSolutions.map((s) => (
                      <div key={s.id} className="flex items-center gap-1.5 text-xs bg-accent/5 border border-accent/20 rounded px-2 py-1.5">
                        <Icon name="Workflow" size={11} className="text-accent shrink-0" />
                        <span className="flex-1 truncate">{s.name}</span>
                        <button type="button" onClick={() => removeSolution(s.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                          <Icon name="X" size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div ref={solRef} className="relative">
                  <div className="flex items-center gap-1.5 h-8 px-2 rounded border border-border bg-background text-xs text-muted-foreground">
                    <Icon name="Search" size={12} />
                    <input
                      className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
                      placeholder="Найти решение…"
                      value={solQuery}
                      onChange={(e) => { setSolQuery(e.target.value); setSolOpen(true); }}
                      onFocus={() => setSolOpen(true)}
                    />
                  </div>
                  {solOpen && solSuggestions.length > 0 && (
                    <div className="absolute z-20 top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg overflow-hidden">
                      {solSuggestions.map((s) => (
                        <button key={s.id} type="button" onClick={() => addSolution(s)}
                          className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-muted/60 transition-colors text-left">
                          <Icon name="Workflow" size={12} className="text-accent shrink-0" />
                          <span className="flex-1 truncate">{s.name}</span>
                          <span className="font-mono text-muted-foreground shrink-0">{s.id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Список требований */}
              <div className="flex-1 flex flex-col rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-3 py-2.5 border-b border-border bg-muted/30">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                    <Icon name="ListChecks" size={11} className="text-accent" />
                    Требования ИБ
                    {allReqs.length > 0 && (
                      <span className="ml-auto font-mono bg-accent/15 text-accent px-1.5 py-0.5 rounded-full text-[10px]">
                        {allReqs.length}
                      </span>
                    )}
                  </div>
                  {allReqs.length > 0 && (
                    <div className="flex items-center gap-1.5 h-7 px-2 rounded border border-border bg-background text-xs text-muted-foreground">
                      <Icon name="Search" size={11} />
                      <input
                        className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground text-xs"
                        placeholder="Поиск требований…"
                        value={reqSearch}
                        onChange={(e) => setReqSearch(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {allReqs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground px-4">
                      <Icon name="ListChecks" size={24} className="mb-2 opacity-30" />
                      <p className="text-xs">Привяжите технические решения выше</p>
                    </div>
                  ) : filteredReqs.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">Ничего не найдено</div>
                  ) : (
                    requirementsByDomain.map((group) => {
                      const groupReqs = group.requirements.filter((r) =>
                        !reqSearch.trim() || filteredReqs.find((fr) => fr.id === r.id));
                      if (groupReqs.length === 0) return null;
                      return (
                        <div key={group.domainId ?? '__none__'}>
                          <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60 bg-muted/20 border-b border-border/50 font-medium">
                            {group.domainName}
                          </div>
                          {groupReqs.map((req) => {
                            const isActive = activeReqId === req.id;
                            const statusKey = req.status as string;
                            return (
                              <button
                                key={req.id}
                                type="button"
                                onClick={() => setActiveReqId(isActive ? null : req.id)}
                                className={`w-full text-left px-3 py-2.5 border-b border-border/40 transition-colors ${
                                  isActive
                                    ? 'bg-accent/10 border-l-2 border-l-accent'
                                    : 'hover:bg-muted/40'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <div className={`mt-0.5 size-2 rounded-full shrink-0 ${
                                    statusKey === 'active' ? 'bg-emerald-400' :
                                    statusKey === 'in_development' ? 'bg-amber-400' : 'bg-muted-foreground/40'
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium leading-snug line-clamp-2">{req.shortDesc}</div>
                                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{req.id}</div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: редактор контента */}
            <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
              {activeReq ? (
                <div className="flex-1 overflow-y-auto p-5">
                  <ReqEditor hardeningId={currentHardeningId} req={activeReq} />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                  <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Icon name="MousePointerClick" size={28} className="opacity-30" />
                  </div>
                  <p className="font-medium text-sm">Выберите требование</p>
                  <p className="text-xs mt-1 max-w-xs">
                    Нажмите на требование слева, чтобы добавить инструкцию по настройке и скриншоты
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
