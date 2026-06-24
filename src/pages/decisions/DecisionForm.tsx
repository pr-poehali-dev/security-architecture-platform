import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { useFormCache } from '@/hooks/useFormCache';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import {
  fetchDecision,
  createDecision,
  updateDecision,
  uploadFile,
  fetchDecisionsSuggest,
  fetchTechSuggest,
  DecisionStatus,
  DecisionFormData,
  MermaidDiagram,
  DecisionFile,
  DecisionRef,
  TechRef,
} from '@/api/decisions';
import DecisionFormMainTab from './DecisionFormMainTab';
import DecisionFormAttachmentsTab from './DecisionFormAttachmentsTab';
import DecisionFormLinksTab from './DecisionFormLinksTab';

const EMPTY: DecisionFormData = {
  name: '', owner: '', status: 'in_development' as DecisionStatus,
  decisionType: 'technical',
  description: '', tags: [], relatedDecisionIds: [], technologyIds: [], changeNote: '',
};

type Tab = 'main' | 'description' | 'attachments' | 'links';

export default function DecisionForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const cacheKey = `form:decision:${id ?? 'new'}`;
  const tabKey = `form:decision:${id ?? 'new'}:tab`;

  const [form, setForm] = useState<DecisionFormData>(EMPTY);
  const [entityId, setEntityId] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const [mermaidDiagrams, setMermaidDiagrams] = useState<MermaidDiagram[]>([]);
  const [files, setFiles] = useState<DecisionFile[]>([]);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(false);
  const [mdPreview, setMdPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>(() => {
    try { return (sessionStorage.getItem(tabKey) as Tab) || 'main'; } catch { return 'main'; }
  });

  const switchTab = (t: Tab) => {
    setTab(t);
    try { sessionStorage.setItem(tabKey, t); } catch { /* */ }
  };

  // Related decisions search
  const [selectedDecisions, setSelectedDecisions] = useState<DecisionRef[]>([]);
  const [decQuery, setDecQuery] = useState('');
  const [decSuggestions, setDecSuggestions] = useState<DecisionRef[]>([]);
  const [decOpen, setDecOpen] = useState(false);
  const decDebounce = useRef<ReturnType<typeof setTimeout>>();
  const decRef = useRef<HTMLDivElement>(null);

  // Technologies search
  const [selectedTechs, setSelectedTechs] = useState<TechRef[]>([]);
  const [techQuery, setTechQuery] = useState('');
  const [techSuggestions, setTechSuggestions] = useState<TechRef[]>([]);
  const [techOpen, setTechOpen] = useState(false);
  const techDebounce = useRef<ReturnType<typeof setTimeout>>();
  const techRef = useRef<HTMLDivElement>(null);

  const { clear } = useFormCache(cacheKey, form, (cached) => {
    setForm(cached); setRestored(true);
  });

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchDecision(id)
      .then((d) => {
        setForm((prev) => {
          const hasCache = prev.name !== '';
          return hasCache ? prev : {
            name: d.name, owner: d.owner, status: d.status,
            decisionType: d.decisionType, description: d.description,
            tags: d.tags.map((t) => t.name),
            relatedDecisionIds: d.relatedDecisions.map((r) => r.id),
            technologyIds: d.technologies.map((t) => t.id),
            changeNote: '',
          };
        });
        setEntityId(d.id);
        setCurrentVersion(d.version);
        setMermaidDiagrams(d.mermaidDiagrams);
        setFiles(d.files);
        setSelectedDecisions(d.relatedDecisions);
        setSelectedTechs(d.technologies);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Decisions suggest
  useEffect(() => {
    clearTimeout(decDebounce.current);
    decDebounce.current = setTimeout(async () => {
      const res = await fetchDecisionsSuggest(decQuery);
      setDecSuggestions(res.filter((r) => r.id !== id && !selectedDecisions.find((s) => s.id === r.id)));
    }, 200);
  }, [decQuery, id, selectedDecisions]);

  // Tech suggest
  useEffect(() => {
    clearTimeout(techDebounce.current);
    techDebounce.current = setTimeout(async () => {
      const res = await fetchTechSuggest(techQuery);
      setTechSuggestions(res.filter((r) => !selectedTechs.find((s) => s.id === r.id)));
    }, 200);
  }, [techQuery, selectedTechs]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (decRef.current && !decRef.current.contains(e.target as Node)) setDecOpen(false);
      if (techRef.current && !techRef.current.contains(e.target as Node)) setTechOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const set = <K extends keyof DecisionFormData>(k: K, v: DecisionFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addDecision = (r: DecisionRef) => {
    const updated = [...selectedDecisions, r];
    setSelectedDecisions(updated);
    set('relatedDecisionIds', updated.map((d) => d.id));
    setDecQuery(''); setDecOpen(false);
  };

  const removeDecision = (rid: string) => {
    const updated = selectedDecisions.filter((d) => d.id !== rid);
    setSelectedDecisions(updated);
    set('relatedDecisionIds', updated.map((d) => d.id));
  };

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

  const onMermaidSaved = (d: MermaidDiagram) => {
    setMermaidDiagrams((prev) => {
      const idx = prev.findIndex((x) => x.id === d.id);
      return idx >= 0 ? prev.map((x, i) => (i === idx ? d : x)) : [...prev, d];
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setError('Максимальный размер файла — 20 МБ'); return; }
    const currentId = id || entityId;
    if (!currentId) { setError('Сначала сохраните карточку'); return; }
    setUploading(true); setError('');
    try {
      const uploaded = await uploadFile(currentId, file);
      setFiles((prev) => [...prev, uploaded]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Заполните поле «Название»'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit && id) {
        await updateDecision(id, form);
        clear();
        try { sessionStorage.removeItem(tabKey); } catch { /* */ }
        navigate(`/solutions/${id}`);
      } else {
        const created = await createDecision(form);
        clear();
        try { sessionStorage.removeItem(tabKey); } catch { /* */ }
        navigate(`/solutions/${created.id}`);
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

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'main',        label: 'Основные поля', icon: 'LayoutList' },
    { id: 'description', label: 'Описание',       icon: 'FileText'  },
    { id: 'attachments', label: 'Файлы и схемы', icon: 'Paperclip' },
    { id: 'links',       label: 'Связи',          icon: 'Link'      },
  ];

  const currentId = id || entityId;

  return (
    <>
      {/* Header */}
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-6 max-w-[1400px] mx-auto">
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-4 flex-wrap">
            <Link to="/solutions" className="hover:text-primary-foreground transition-colors">Решения</Link>
            <Icon name="ChevronRight" size={14} />
            {isEdit && id && (
              <>
                <Link to={`/solutions/${id}`} className="hover:text-primary-foreground transition-colors">{entityId}</Link>
                <Icon name="ChevronRight" size={14} />
              </>
            )}
            <span className="text-primary-foreground font-medium">{isEdit ? 'Редактирование' : 'Создание'}</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {isEdit ? 'Редактировать решение' : 'Новое решение'}
          </h1>
        </div>
      </div>

      {restored && (
        <div className="px-6 pt-4 max-w-[1000px] mx-auto">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-warning/30 bg-warning/8 text-warning text-sm">
            <Icon name="RotateCcw" size={15} />
            <span>Восстановлен несохранённый черновик</span>
            <button
              type="button"
              onClick={() => { clear(); setForm(EMPTY); setRestored(false); try { sessionStorage.removeItem(tabKey); } catch { /* */ } switchTab('main'); }}
              className="ml-auto text-xs underline underline-offset-2 hover:opacity-70"
            >
              Сбросить
            </button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-16 z-10">
        <div className="px-6 max-w-[1400px] mx-auto flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name={t.icon} size={16} /> {t.label}
              {t.id === 'attachments' && (mermaidDiagrams.length + files.length > 0) && (
                <span className="text-[10px] font-mono bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">
                  {mermaidDiagrams.length + files.length}
                </span>
              )}
              {t.id === 'links' && (selectedDecisions.length + selectedTechs.length > 0) && (
                <span className="text-[10px] font-mono bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">
                  {selectedDecisions.length + selectedTechs.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-6 py-8 max-w-[1000px] mx-auto space-y-6">

          {tab === 'main' && (
            <DecisionFormMainTab
              form={form}
              set={set}
              isEdit={isEdit}
              entityId={entityId}
              currentVersion={currentVersion}
            />
          )}

          {/* ── TAB: description ── */}
          {tab === 'description' && (
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Icon name="FileText" size={18} className="text-accent" /> Описание (Markdown)
                </h2>
                <button
                  type="button"
                  onClick={() => setMdPreview((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1.5 transition-colors"
                >
                  <Icon name={mdPreview ? 'Code' : 'Eye'} size={14} />
                  {mdPreview ? 'Редактор' : 'Превью'}
                </button>
              </div>
              {mdPreview ? (
                <div className="min-h-[300px] rounded-md border border-border bg-background/50 p-4">
                  {form.description
                    ? <MarkdownViewer>{form.description}</MarkdownViewer>
                    : <p className="text-sm text-muted-foreground italic">Пусто — введите текст в режиме редактора</p>
                  }
                </div>
              ) : (
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Подробное описание в формате Markdown…"
                  rows={18}
                  className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm font-mono outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-y"
                />
              )}
            </div>
          )}

          {tab === 'attachments' && (
            <DecisionFormAttachmentsTab
              currentId={currentId}
              mermaidDiagrams={mermaidDiagrams}
              onMermaidSaved={onMermaidSaved}
              files={files}
              uploading={uploading}
              fileInputRef={fileInputRef}
              handleUpload={handleUpload}
            />
          )}

          {tab === 'links' && (
            <DecisionFormLinksTab
              selectedDecisions={selectedDecisions}
              decQuery={decQuery}
              setDecQuery={setDecQuery}
              decOpen={decOpen}
              setDecOpen={setDecOpen}
              decSuggestions={decSuggestions}
              decRef={decRef}
              addDecision={addDecision}
              removeDecision={removeDecision}
              selectedTechs={selectedTechs}
              techQuery={techQuery}
              setTechQuery={setTechQuery}
              techOpen={techOpen}
              setTechOpen={setTechOpen}
              techSuggestions={techSuggestions}
              techRef={techRef}
              addTech={addTech}
              removeTech={removeTech}
            />
          )}

          {error && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
              <Icon name="TriangleAlert" size={16} /> {error}
            </div>
          )}

          {/* Save / Cancel */}
          <div className="flex items-center gap-3 pb-8">
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-6 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving
                ? <><Icon name="Loader2" size={16} className="animate-spin" /> Сохранение…</>
                : <><Icon name="Save" size={16} /> {isEdit ? 'Сохранить изменения' : 'Создать решение'}</>
              }
            </button>
            <Link
              to={isEdit && id ? `/solutions/${id}` : '/solutions'}
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