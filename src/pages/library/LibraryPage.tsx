import { useEffect, useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import MermaidPreview from '@/components/technologies/MermaidPreview';
import RequirementsSection from '@/pages/arch-templates/RequirementsSection';
import ArchTemplateExportModal from '@/pages/arch-templates/ArchTemplateExportModal';
import {
  fetchArchTemplates, fetchArchTemplate,
  ArchTemplate, ArchTemplateDetail,
  STATUS_OPTIONS, TYPE_OPTIONS,
} from '@/api/archTemplates';

// ── Модульный кеш (живёт вне компонента — не сбрасывается при ре-рендере) ──
let listCache: ArchTemplate[] | null = null;
const detailCache = new Map<string, ArchTemplateDetail>();

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success',
  on_review:      'bg-blue-500/10 text-blue-400',
  in_development: 'bg-warning/10 text-warning',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
};
const TYPE_STYLE: Record<string, string> = {
  technical:      'bg-blue-500/10 text-blue-400',
  organizational: 'bg-purple-500/10 text-purple-400',
};

type Tab = 'overview' | 'requirements' | 'mermaid' | 'files' | 'history';

function SectionLabel({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
      <Icon name={icon} size={11} /> {text}
    </div>
  );
}

// ── Панель деталей ────────────────────────────────────────────────────────────
function DetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<ArchTemplateDetail | null>(detailCache.get(id) ?? null);
  const [loading, setLoading] = useState(!detailCache.has(id));
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    setActiveTab('overview');
    if (detailCache.has(id)) { setData(detailCache.get(id)!); setLoading(false); return; }
    setLoading(true);
    fetchArchTemplate(id)
      .then(d => { detailCache.set(id, d); setData(d); })
      .finally(() => setLoading(false));
  }, [id]);

  const totalReqs = data?.requirementsByDomain.reduce((s, g) => s + g.requirements.length, 0) ?? 0;

  const TABS = [
    { id: 'overview',     label: 'Обзор',      icon: 'Info'       },
    { id: 'requirements', label: 'Требования',  icon: 'ListChecks', badge: totalReqs > 0 ? String(totalReqs) : undefined },
    { id: 'mermaid',      label: 'Схемы',       icon: 'GitBranch',  badge: data && data.mermaidDiagrams.length > 0 ? String(data.mermaidDiagrams.length) : undefined },
    { id: 'files',        label: 'Файлы',       icon: 'Paperclip',  badge: data && data.files.length > 0 ? String(data.files.length) : undefined },
    { id: 'history',      label: 'История',     icon: 'Clock',      badge: data && data.versions.length > 0 ? String(data.versions.length) : undefined },
  ] as const;

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      {/* Шапка */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0 bg-primary text-primary-foreground">
        <div className="flex-1 min-w-0">
          {loading || !data ? (
            <div className="h-5 w-40 bg-primary-foreground/10 rounded animate-pulse" />
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_STYLE[data.templateType] ?? 'bg-muted text-muted-foreground'}`}>
                  {data.typeLabel}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLE[data.status] ?? 'bg-muted text-muted-foreground'}`}>
                  {data.statusLabel}
                </span>
                <span className="text-[10px] font-mono text-primary-foreground/50">v{data.version}</span>
              </div>
              <div className="font-semibold text-sm truncate">{data.name}</div>
              <div className="text-[11px] font-mono text-primary-foreground/50">{data.id}</div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {data && (
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="p-1.5 rounded-md hover:bg-primary-foreground/10 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
              title="Экспорт"
            >
              <Icon name="FileDown" size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-primary-foreground/10 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <Icon name="X" size={15} />
          </button>
        </div>
      </div>

      {/* Теги */}
      {data && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 py-2 border-b border-border shrink-0 bg-primary/5">
          {data.tags.map(t => (
            <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
              #{t.name}
            </span>
          ))}
        </div>
      )}

      {/* Табы */}
      <div className="flex border-b border-border shrink-0 overflow-x-auto bg-card/40">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as Tab)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activeTab === t.id ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name={t.icon} size={12} />
            {t.label}
            {'badge' in t && t.badge && (
              <span className="text-[9px] font-mono px-1 py-0.5 rounded-full bg-accent/15 text-accent">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Контент */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Icon name="Loader2" size={18} className="animate-spin" /> Загрузка…
          </div>
        )}

        {!loading && data && (
          <div className="p-4">

            {/* ОБЗОР */}
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-4">
                {/* Мета */}
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs">
                  {[
                    { label: 'Владелец', val: data.owner || '—' },
                    { label: 'Версия',   val: data.version },
                    { label: 'Создан',   val: new Date(data.createdAt).toLocaleDateString('ru-RU') },
                    { label: 'Обновлён', val: new Date(data.updatedAt).toLocaleDateString('ru-RU') },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
                      <div className="font-medium mt-0.5">{val}</div>
                    </div>
                  ))}
                </div>

                {/* Описание */}
                {data.description && (
                  <div>
                    <SectionLabel icon="FileText" text="Описание" />
                    <div className="rounded-lg border border-border bg-card/50 p-3 text-sm">
                      <MarkdownViewer>{data.description}</MarkdownViewer>
                    </div>
                  </div>
                )}

                {/* Статистика */}
                <div className="rounded-lg border border-border bg-card/50 p-3 flex flex-col gap-2">
                  <SectionLabel icon="BarChart2" text="Состав" />
                  {[
                    { tid: 'requirements', icon: 'ListChecks', label: 'Требования', val: totalReqs },
                    { tid: 'mermaid',      icon: 'GitBranch',  label: 'Схемы',      val: data.mermaidDiagrams.length },
                    { tid: 'files',        icon: 'Paperclip',  label: 'Файлы',      val: data.files.length },
                    { tid: 'history',      icon: 'Clock',      label: 'Версий',     val: data.versions.length },
                  ].map(({ tid, icon, label, val }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setActiveTab(tid as Tab)}
                      className="flex items-center justify-between text-sm hover:text-accent transition-colors group"
                    >
                      <span className="flex items-center gap-2 text-muted-foreground group-hover:text-accent text-xs">
                        <Icon name={icon} size={12} /> {label}
                      </span>
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${val > 0 ? 'bg-accent/10 text-accent' : 'text-muted-foreground'}`}>
                        {val}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Технологии */}
                {data.technologies.length > 0 && (
                  <div>
                    <SectionLabel icon="Cpu" text="Технологии" />
                    <div className="flex flex-wrap gap-1.5">
                      {data.technologies.map(t => (
                        <span key={t.id} className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted/30 text-muted-foreground flex items-center gap-1">
                          <Icon name="Cpu" size={9} /> {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Решения */}
                {data.decisions.length > 0 && (
                  <div>
                    <SectionLabel icon="Workflow" text="Решения" />
                    <div className="flex flex-col gap-1.5">
                      {data.decisions.map(d => (
                        <div key={d.id} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card/50 text-xs">
                          <Icon name="Workflow" size={12} className="text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate">{d.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${d.decisionType === 'technical' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                            {d.typeLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Связанные шаблоны */}
                {data.relatedTemplates.length > 0 && (
                  <div>
                    <SectionLabel icon="Boxes" text="Связанные шаблоны" />
                    <div className="flex flex-col gap-1">
                      {data.relatedTemplates.map(t => (
                        <div key={t.id} className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground">
                          <Icon name="Boxes" size={11} className="shrink-0" />
                          <span className="flex-1 truncate">{t.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ТРЕБОВАНИЯ */}
            {activeTab === 'requirements' && (
              <RequirementsSection groups={data.requirementsByDomain} />
            )}

            {/* СХЕМЫ */}
            {activeTab === 'mermaid' && (
              <div className="flex flex-col gap-4">
                {data.mermaidDiagrams.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Icon name="GitBranch" size={22} className="opacity-40" />
                    <p className="text-sm">Нет схем</p>
                  </div>
                ) : data.mermaidDiagrams.map(d => (
                  <div key={d.id} className="rounded-lg border border-border bg-card/50 overflow-hidden">
                    {d.title && (
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 text-xs font-medium">
                        <Icon name="GitBranch" size={12} className="text-muted-foreground" /> {d.title}
                      </div>
                    )}
                    <div className="p-3">
                      <MermaidPreview code={d.code} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ФАЙЛЫ */}
            {activeTab === 'files' && (
              <div className="flex flex-col gap-2">
                {data.files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Icon name="Paperclip" size={22} className="opacity-40" />
                    <p className="text-sm">Нет файлов</p>
                  </div>
                ) : data.files.map(f => (
                  <a
                    key={f.id}
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card/50 hover:bg-muted/40 transition-colors"
                  >
                    <Icon name="FileText" size={16} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{f.filename}</div>
                      <div className="text-[10px] text-muted-foreground">{(f.sizeBytes / 1024).toFixed(1)} KB</div>
                    </div>
                    <Icon name="ExternalLink" size={13} className="text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}

            {/* ИСТОРИЯ */}
            {activeTab === 'history' && (
              <div>
                {data.versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">История пуста</p>
                ) : (
                  <div className="relative pl-4 border-l border-border flex flex-col gap-0">
                    {data.versions.slice(0, 20).map((v, i) => (
                      <div key={v.id} className="relative pb-4">
                        <div className={`absolute -left-[17px] size-2.5 rounded-full border-2 mt-1 ${i === 0 ? 'border-accent bg-accent/30' : 'border-border bg-background'}`} />
                        <div className="text-[10px] font-mono text-muted-foreground">{new Date(v.changedAt).toLocaleDateString('ru-RU')}</div>
                        <div className="font-medium text-xs">v{v.version}</div>
                        {v.changeNote && <p className="text-[11px] text-muted-foreground mt-0.5">{v.changeNote}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {exportOpen && data && (
        <ArchTemplateExportModal
          templateId={data.id}
          templateName={data.name}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}

// ── Основная страница ─────────────────────────────────────────────────────────
export default function LibraryPage() {
  const [items, setItems] = useState<ArchTemplate[]>(listCache ?? []);
  const [loading, setLoading] = useState(!listCache);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (listCache) return;
    fetchArchTemplates()
      .then(d => { listCache = d; setItems(d); })
      .finally(() => setLoading(false));
  }, []);

  const select = useCallback((id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  }, []);

  const filtered = items.filter(d => {
    const q = search.toLowerCase();
    return (!q || d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || d.owner.toLowerCase().includes(q) || d.tags.some(t => t.name.toLowerCase().includes(q)))
      && (!statusFilter || d.status === statusFilter)
      && (!typeFilter || d.templateType === typeFilter);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Hero */}
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden shrink-0">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-8 max-w-[1400px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-accent mb-3 bg-accent/15 px-2.5 py-1 rounded">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            Библиотека
          </div>
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-primary-foreground/10 border border-primary-foreground/15 flex items-center justify-center shrink-0">
              <Icon name="Library" size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Пользовательская библиотека</h1>
              <p className="mt-1.5 text-primary-foreground/65 leading-relaxed max-w-xl">
                Поиск и просмотр шаблонов архитектур. Нажмите на карточку для детального просмотра.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Тулбар */}
      <div className="px-6 py-3 border-b border-border shrink-0 flex flex-wrap gap-3 items-center bg-card/40">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background text-sm text-muted-foreground flex-1 min-w-[180px] max-w-sm">
          <Icon name="Search" size={15} />
          <input
            className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground text-sm"
            placeholder="Поиск по названию, ID, тегу…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="hover:text-foreground">
              <Icon name="X" size={13} />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground outline-none cursor-pointer"
        >
          <option value="">Все статусы</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground outline-none cursor-pointer"
        >
          <option value="">Все типы</option>
          {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <span className="text-xs font-mono text-muted-foreground ml-auto">{filtered.length} из {items.length}</span>
      </div>

      {/* Тело: список + панель */}
      <div className="flex flex-1 overflow-hidden">
        {/* Список */}
        <div className={`flex flex-col overflow-y-auto transition-all ${selectedId ? 'w-[380px] min-w-[320px] shrink-0' : 'flex-1'}`}>
          {loading && (
            <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
              <Icon name="Loader2" size={20} className="animate-spin" /> Загрузка…
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
              <Icon name="SearchX" size={28} className="opacity-40" />
              <p className="font-medium">{items.length === 0 ? 'Шаблонов пока нет' : 'Ничего не найдено'}</p>
            </div>
          )}

          {!loading && filtered.map(d => {
            const active = selectedId === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => select(d.id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 border-b border-border transition-colors ${
                  active ? 'bg-accent/10 border-l-2 border-l-accent' : 'hover:bg-muted/40'
                }`}
              >
                <div className={`size-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${active ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border bg-muted/30 text-muted-foreground'}`}>
                  <Icon name="Boxes" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{d.name}</div>
                  <div className="text-[11px] font-mono text-muted-foreground">{d.id}</div>
                  {d.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {d.tags.slice(0, 3).map(t => (
                        <span key={t.id} className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">#{t.name}</span>
                      ))}
                      {d.tags.length > 3 && <span className="text-[9px] text-muted-foreground">+{d.tags.length - 3}</span>}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLE[d.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {d.statusLabel}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_STYLE[d.templateType] ?? 'bg-muted text-muted-foreground'}`}>
                    {d.typeLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Панель детали */}
        {selectedId && (
          <div className="flex-1 overflow-hidden">
            <DetailPanel key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
