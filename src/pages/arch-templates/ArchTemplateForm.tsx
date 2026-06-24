import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { useFormCache } from '@/hooks/useFormCache';
import TagInput from '@/components/technologies/TagInput';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import MermaidEditor from '@/components/technologies/MermaidEditor';
import {
  fetchArchTemplate,
  createArchTemplate,
  updateArchTemplate,
  fetchTagsSuggest,
  fetchTemplatesSuggest,
  fetchTechSuggest,
  fetchDecisionsSuggest,
  addMermaid,
  updateMermaid,
  uploadFile,
  ArchTemplateFormData,
  TemplateStatus,
  TemplateType,
  TemplateRef,
  TechRef,
  DecisionRef,
  MermaidDiagram,
  TemplateFile,
  RequirementDomainGroup,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
} from '@/api/archTemplates';

const EMPTY: ArchTemplateFormData = {
  name: '', owner: '', status: 'in_development' as TemplateStatus,
  templateType: 'technical' as TemplateType,
  description: '', tags: [],
  relatedTemplateIds: [], technologyIds: [], decisionIds: [],
  changeNote: '',
};

type Tab = 'main' | 'description' | 'links' | 'requirements';

const INPUT = 'w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success',
  on_review:      'bg-blue-500/10 text-blue-400',
  in_development: 'bg-warning/10 text-warning',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
};

const REQ_STATUS_STYLE: Record<string, string> = {
  active:         'bg-emerald-500/15 text-emerald-400',
  in_development: 'bg-amber-500/15 text-amber-400',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
};

// ── Suggest-пикер ──────────────────────────────────────────────────────────────
type SuggestItem = { id: string; name: string };

function SuggestPicker({
  label, icon, selected, onRemove, onAdd, fetchFn, renderBadge,
}: {
  label: string; icon: string;
  selected: SuggestItem[];
  onRemove: (id: string) => void;
  onAdd: (item: SuggestItem) => void;
  fetchFn: (q: string) => Promise<SuggestItem[]>;
  renderBadge?: (item: SuggestItem) => React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFn(query).then((r) => setSuggestions(r.filter((x) => !selected.find((s) => s.id === x.id))));
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
        <Icon name={icon} size={12} /> {label}
      </label>
      <div ref={ref} className="relative">
        <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-background text-sm">
          <Icon name="Search" size={14} className="text-muted-foreground shrink-0" />
          <input
            className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
            placeholder={`Поиск ${label.toLowerCase()}…`}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
        </div>
        {open && suggestions.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                onClick={() => { onAdd(item); setQuery(''); setOpen(false); }}
              >
                <span className="truncate">{item.name}</span>
                {renderBadge?.(item)}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {selected.map((item) => (
            <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card/50 text-sm">
              <span className="flex-1 truncate">{item.name}</span>
              {renderBadge?.(item)}
              <button type="button" onClick={() => onRemove(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Icon name="X" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Секция требований ──────────────────────────────────────────────────────────
function RequirementsSection({ groups }: { groups: RequirementDomainGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
        <Icon name="ListChecks" size={24} className="text-muted-foreground/40" />
        <p className="text-sm">Добавьте технологии или решения, чтобы подтянуть связанные требования</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.domainId ?? '__none__'} className="rounded-lg border border-border bg-card/50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
            <Icon name="Layers" size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{group.domainName}</span>
            <span className="ml-auto text-[11px] font-mono text-muted-foreground">{group.requirements.length}</span>
          </div>
          <div className="divide-y divide-border">
            {group.requirements.map((req) => (
              <div key={req.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-snug">{req.shortDesc}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-mono text-muted-foreground">{req.id}</span>
                    {req.techName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent flex items-center gap-1">
                        <Icon name="Cpu" size={9} /> {req.techName}
                      </span>
                    )}
                    {req.source === 'hardening' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 flex items-center gap-1">
                        <Icon name="ShieldCheck" size={9} /> харденинг
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${REQ_STATUS_STYLE[req.status] ?? 'bg-muted text-muted-foreground'}`}>
                  {req.status === 'active' ? 'Активно' : req.status === 'in_development' ? 'В работе' : req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Основной компонент ─────────────────────────────────────────────────────────
export default function ArchTemplateForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<ArchTemplateFormData>(EMPTY);
  const [tab, setTab] = useState<Tab>('main');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [mdPreview, setMdPreview] = useState(false);
  const [restored, setRestored] = useState(false);

  // Связи
  const [selectedTemplates, setSelectedTemplates] = useState<TemplateRef[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<TechRef[]>([]);
  const [selectedDecisions, setSelectedDecisions] = useState<DecisionRef[]>([]);

  // Требования (подтягиваются с сервера при открытии карточки)
  const [requirementsByDomain, setRequirementsByDomain] = useState<RequirementDomainGroup[]>([]);

  // Mermaid и файлы
  const [mermaidDiagrams, setMermaidDiagrams] = useState<MermaidDiagram[]>([]);
  const [files, setFiles] = useState<TemplateFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cacheKey = `form:arch-template:${id ?? 'new'}`;
  const { clear } = useFormCache(cacheKey, form, (cached) => {
    setForm(cached);
    setRestored(true);
  });

  function set<K extends keyof ArchTemplateFormData>(key: K, val: ArchTemplateFormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // Загрузка существующей карточки
  useEffect(() => {
    if (!isEdit || !id) return;
    fetchArchTemplate(id)
      .then((d) => {
        setForm({
          name: d.name, owner: d.owner, status: d.status,
          templateType: d.templateType, description: d.description,
          tags: d.tags.map((t) => t.name),
          relatedTemplateIds: d.relatedTemplates.map((t) => t.id),
          technologyIds: d.technologies.map((t) => t.id),
          decisionIds: d.decisions.map((dc) => dc.id),
          changeNote: '',
        });
        setSelectedTemplates(d.relatedTemplates);
        setSelectedTechs(d.technologies);
        setSelectedDecisions(d.decisions);
        setMermaidDiagrams(d.mermaidDiagrams);
        setFiles(d.files);
        setRequirementsByDomain(d.requirementsByDomain);
        clear();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Получаем требования при изменении технологий/решений (только при редактировании)
  const fetchReqs = useCallback(() => {
    if (!isEdit || !id) return;
    fetchArchTemplate(id).then((d) => setRequirementsByDomain(d.requirementsByDomain)).catch(() => {});
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data: ArchTemplateFormData = {
        ...form,
        relatedTemplateIds: selectedTemplates.map((t) => t.id),
        technologyIds: selectedTechs.map((t) => t.id),
        decisionIds: selectedDecisions.map((d) => d.id),
      };
      if (isEdit && id) {
        await updateArchTemplate(id, data);
        clear();
        navigate(`/templates/${id}`);
      } else {
        const created = await createArchTemplate(data);
        clear();
        navigate(`/templates/${created.id}`);
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingFile(true);
    try {
      const uploaded = await uploadFile(id, file);
      setFiles((prev) => [...prev, uploaded]);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
      <Icon name="Loader2" size={22} className="animate-spin" /> Загрузка…
    </div>
  );

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'main',         label: 'Основное',    icon: 'Info'          },
    { id: 'description',  label: 'Описание',    icon: 'FileText'      },
    { id: 'links',        label: 'Связи',       icon: 'Link'          },
    { id: 'requirements', label: 'Требования',  icon: 'ListChecks'    },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-full">
      {/* Header */}
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-6 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-3">
            <Link to="/templates" className="hover:text-primary-foreground transition-colors flex items-center gap-1.5">
              <Icon name="ChevronLeft" size={16} /> Шаблоны архитектур
            </Link>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-lg bg-primary-foreground/10 border border-primary-foreground/15 flex items-center justify-center shrink-0">
                <Icon name={isEdit ? 'Pencil' : 'Plus'} size={20} className="text-accent" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {isEdit ? 'Редактирование шаблона' : 'Новый шаблон архитектуры'}
                </h1>
                {id && <p className="text-primary-foreground/60 text-sm font-mono mt-0.5">{id}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={isEdit && id ? `/templates/${id}` : '/templates'}
                className="h-9 px-4 rounded-md border border-primary-foreground/20 text-sm text-primary-foreground/80 hover:text-primary-foreground hover:border-primary-foreground/40 transition-colors flex items-center gap-2"
              >
                <Icon name="X" size={15} /> Отменить
              </Link>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="h-9 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Save" size={15} />}
                {isEdit ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Restore banner */}
      {restored && (
        <div className="px-6 py-2 bg-warning/10 border-b border-warning/20 text-sm text-warning flex items-center gap-2 max-w-[1400px] mx-auto w-full">
          <Icon name="RotateCcw" size={14} /> Восстановлен несохранённый черновик
          <button type="button" onClick={() => { setForm(EMPTY); setRestored(false); clear(); }} className="ml-auto text-xs underline">
            Сбросить
          </button>
        </div>
      )}

      {error && (
        <div className="px-6 pt-4 max-w-[1400px] mx-auto w-full">
          <div className="flex items-center gap-3 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-destructive text-sm">
            <Icon name="TriangleAlert" size={16} /> {error}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 max-w-[1400px] mx-auto w-full border-b border-border">
        <div className="flex gap-0.5 -mb-px pt-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
              {t.id === 'requirements' && requirementsByDomain.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">
                  {requirementsByDomain.reduce((s, g) => s + g.requirements.length, 0)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 max-w-[1400px] mx-auto w-full">

        {/* ── TAB: ОСНОВНОЕ ── */}
        {tab === 'main' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl">
            {/* ID */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">ID</label>
              <input
                readOnly
                value={id ?? `arch-sec-${isEdit ? '' : '(авто)'}` }
                className={`${INPUT} bg-muted/40 text-muted-foreground cursor-default`}
              />
            </div>

            {/* Версия */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Версия</label>
              <input
                readOnly
                value={isEdit ? '(автоматически)' : '1.0'}
                className={`${INPUT} bg-muted/40 text-muted-foreground cursor-default`}
              />
            </div>

            {/* Название */}
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Название <span className="text-destructive">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Название шаблона архитектуры"
                required
                className={INPUT}
              />
            </div>

            {/* Тип */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Тип шаблона</label>
              <select
                value={form.templateType}
                onChange={(e) => set('templateType', e.target.value as TemplateType)}
                className={INPUT}
              >
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Статус */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Статус</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as TemplateStatus)}
                className={INPUT}
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Владелец */}
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Владелец</label>
              <input
                value={form.owner}
                onChange={(e) => set('owner', e.target.value)}
                placeholder="Команда или ответственный"
                className={INPUT}
              />
            </div>

            {/* Теги */}
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Теги</label>
              <TagInput
                value={form.tags}
                onChange={(tags) => set('tags', tags)}
                fetchSuggestions={fetchTagsSuggest}
              />
            </div>

            {/* Заметка об изменении (только при редактировании) */}
            {isEdit && (
              <div className="flex flex-col gap-1.5 lg:col-span-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Заметка об изменении</label>
                <input
                  value={form.changeNote ?? ''}
                  onChange={(e) => set('changeNote', e.target.value)}
                  placeholder="Что изменилось в этой версии?"
                  className={INPUT}
                />
              </div>
            )}
          </div>
        )}

        {/* ── TAB: ОПИСАНИЕ ── */}
        {tab === 'description' && (
          <div className="max-w-3xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Icon name="FileText" size={12} /> Описание (Markdown)
              </label>
              <button
                type="button"
                onClick={() => setMdPreview((p) => !p)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Icon name={mdPreview ? 'Code' : 'Eye'} size={13} />
                {mdPreview ? 'Редактор' : 'Превью'}
              </button>
            </div>
            {mdPreview ? (
              <div className="rounded-md border border-border bg-card/50 p-4 min-h-[320px]">
                {form.description
                  ? <MarkdownViewer>{form.description}</MarkdownViewer>
                  : <p className="text-muted-foreground text-sm">Нет содержимого</p>}
              </div>
            ) : (
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={16}
                placeholder="Описание шаблона в формате Markdown…"
                className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors font-mono resize-none"
              />
            )}
          </div>
        )}

        {/* ── TAB: СВЯЗИ ── */}
        {tab === 'links' && (
          <div className="max-w-3xl flex flex-col gap-8">

            {/* Связанные шаблоны */}
            <SuggestPicker
              label="Связанные шаблоны"
              icon="Boxes"
              selected={selectedTemplates}
              onAdd={(item) => setSelectedTemplates((p) => [...p, item as TemplateRef])}
              onRemove={(rid) => setSelectedTemplates((p) => p.filter((x) => x.id !== rid))}
              fetchFn={fetchTemplatesSuggest as (q: string) => Promise<SuggestItem[]>}
              renderBadge={(item) => {
                const t = item as TemplateRef;
                return (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.templateType === 'technical' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                    {t.typeLabel}
                  </span>
                );
              }}
            />

            {/* Технологии */}
            <SuggestPicker
              label="Связанные технологии"
              icon="Cpu"
              selected={selectedTechs}
              onAdd={(item) => setSelectedTechs((p) => [...p, item as TechRef])}
              onRemove={(rid) => setSelectedTechs((p) => p.filter((x) => x.id !== rid))}
              fetchFn={fetchTechSuggest as (q: string) => Promise<SuggestItem[]>}
              renderBadge={(item) => {
                const t = item as TechRef;
                return (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLE[t.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {t.statusLabel}
                  </span>
                );
              }}
            />

            {/* Решения */}
            <SuggestPicker
              label="Связанные решения"
              icon="Workflow"
              selected={selectedDecisions}
              onAdd={(item) => setSelectedDecisions((p) => [...p, item as DecisionRef])}
              onRemove={(rid) => setSelectedDecisions((p) => p.filter((x) => x.id !== rid))}
              fetchFn={fetchDecisionsSuggest as (q: string) => Promise<SuggestItem[]>}
              renderBadge={(item) => {
                const d = item as DecisionRef;
                return (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${d.decisionType === 'technical' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                    {d.typeLabel}
                  </span>
                );
              }}
            />

            {/* Файлы и Mermaid — только при редактировании */}
            {isEdit && id ? (
              <>
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Icon name="Paperclip" size={12} /> Файлы
                  </label>
                  <div className="flex flex-col gap-2">
                    {files.map((f) => (
                      <a
                        key={f.id}
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-card/50 hover:bg-muted/40 transition-colors text-sm"
                      >
                        <Icon name="FileText" size={16} className="text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{f.filename}</span>
                        <span className="text-xs text-muted-foreground">{(f.sizeBytes / 1024).toFixed(1)} KB</span>
                        <Icon name="ExternalLink" size={13} className="text-muted-foreground" />
                      </a>
                    ))}
                    <label className={`flex items-center gap-2 h-10 px-3 rounded-md border border-dashed border-border cursor-pointer hover:bg-muted/30 transition-colors text-sm text-muted-foreground ${uploadingFile ? 'opacity-50 pointer-events-none' : ''}`}>
                      {uploadingFile
                        ? <><Icon name="Loader2" size={15} className="animate-spin" /> Загрузка…</>
                        : <><Icon name="Upload" size={15} /> Прикрепить файл</>}
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Icon name="GitBranch" size={12} /> Mermaid-схемы
                  </label>
                  <MermaidEditor
                    diagrams={mermaidDiagrams}
                    onAdd={async (title, code) => {
                      const d = await addMermaid(id, title, code);
                      setMermaidDiagrams((p) => [...p, d]);
                      return d;
                    }}
                    onUpdate={async (mid, title, code) => {
                      const d = await updateMermaid(mid, title, code);
                      setMermaidDiagrams((p) => p.map((x) => x.id === mid ? d : x));
                      return d;
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <Icon name="Info" size={15} /> Файлы и Mermaid-схемы доступны после сохранения карточки
              </div>
            )}
          </div>
        )}

        {/* ── TAB: ТРЕБОВАНИЯ ── */}
        {tab === 'requirements' && (
          <div className="max-w-3xl flex flex-col gap-4">
            {!isEdit && (
              <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <Icon name="Info" size={15} /> Требования подтягиваются после сохранения карточки — когда привязаны технологии и решения
              </div>
            )}
            {isEdit && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Требования из связанных технологий и решений (включая харденинг), сгруппированные по домену
                </p>
                <button
                  type="button"
                  onClick={fetchReqs}
                  className="h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                >
                  <Icon name="RefreshCw" size={12} /> Обновить
                </button>
              </div>
            )}
            <RequirementsSection groups={requirementsByDomain} />
          </div>
        )}
      </div>
    </form>
  );
}