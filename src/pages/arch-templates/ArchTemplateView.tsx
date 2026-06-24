import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import MermaidPreview from '@/components/technologies/MermaidPreview';
import {
  fetchArchTemplate,
  ArchTemplateDetail,
  RequirementDomainGroup,
} from '@/api/archTemplates';

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

const REQ_STATUS_STYLE: Record<string, string> = {
  active:         'bg-emerald-500/15 text-emerald-400',
  in_development: 'bg-amber-500/15 text-amber-400',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
};

function SectionLabel({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
      <Icon name={icon} size={11} /> {text}
    </div>
  );
}

function RequirementsView({ groups }: { groups: RequirementDomainGroup[] }) {
  if (!groups.length) return (
    <p className="text-sm text-muted-foreground">Нет связанных требований</p>
  );
  return (
    <div className="flex flex-col gap-3">
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

export default function ArchTemplateView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ArchTemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'mermaid' | 'files' | 'history'>('overview');

  useEffect(() => {
    if (!id) return;
    fetchArchTemplate(id)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
      <Icon name="Loader2" size={22} className="animate-spin" /> Загрузка…
    </div>
  );

  if (error || !data) return (
    <div className="px-6 py-8">
      <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
        <Icon name="TriangleAlert" size={18} /> {error || 'Шаблон не найден'}
      </div>
    </div>
  );

  const totalReqs = data.requirementsByDomain.reduce((s, g) => s + g.requirements.length, 0);

  const TABS = [
    { id: 'overview',     label: 'Обзор',      icon: 'Info'       },
    { id: 'requirements', label: 'Требования', icon: 'ListChecks', badge: totalReqs > 0 ? String(totalReqs) : undefined },
    { id: 'mermaid',      label: 'Схемы',      icon: 'GitBranch',  badge: data.mermaidDiagrams.length > 0 ? String(data.mermaidDiagrams.length) : undefined },
    { id: 'files',        label: 'Файлы',      icon: 'Paperclip',  badge: data.files.length > 0 ? String(data.files.length) : undefined },
    { id: 'history',      label: 'История',    icon: 'Clock'      },
  ] as const;

  return (
    <>
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
              <div className="size-12 rounded-xl bg-primary-foreground/10 border border-primary-foreground/15 flex items-center justify-center shrink-0">
                <Icon name="Boxes" size={24} className="text-accent" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TYPE_STYLE[data.templateType] ?? 'bg-muted text-muted-foreground'}`}>
                    {data.typeLabel}
                  </span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[data.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {data.statusLabel}
                  </span>
                  <span className="text-[11px] font-mono text-primary-foreground/50">v{data.version}</span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
                <p className="text-primary-foreground/60 text-sm font-mono mt-0.5">{data.id}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/templates/${id}/edit`)}
              className="h-9 px-4 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0"
            >
              <Icon name="Pencil" size={15} /> Редактировать
            </button>
          </div>
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {data.tags.map((t) => (
                <span key={t.id} className="text-[11px] px-2 py-0.5 rounded-full bg-primary-foreground/10 text-primary-foreground/70 font-medium">
                  #{t.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-6 max-w-[1400px] mx-auto flex gap-0.5 -mb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-accent text-primary-foreground'
                  : 'border-transparent text-primary-foreground/60 hover:text-primary-foreground/80'
              }`}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
              {'badge' in t && t.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-accent/20 text-accent">{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-6 max-w-[1400px] mx-auto">

        {/* ── ОБЗОР ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Описание */}
              {data.description ? (
                <div>
                  <SectionLabel icon="FileText" text="Описание" />
                  <div className="rounded-lg border border-border bg-card/50 p-4">
                    <MarkdownViewer>{data.description}</MarkdownViewer>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-card/50 p-6 flex items-center justify-center text-muted-foreground text-sm gap-2">
                  <Icon name="FileText" size={16} /> Описание не заполнено
                </div>
              )}

              {/* Технологии */}
              {data.technologies.length > 0 && (
                <div>
                  <SectionLabel icon="Cpu" text="Связанные технологии" />
                  <div className="flex flex-col gap-2">
                    {data.technologies.map((t) => (
                      <Link
                        key={t.id}
                        to={`/technologies/${t.id}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-card/50 hover:bg-muted/40 transition-colors text-sm"
                      >
                        <Icon name="Cpu" size={15} className="text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{t.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLE[t.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {t.statusLabel}
                        </span>
                        <Icon name="ExternalLink" size={13} className="text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Решения */}
              {data.decisions.length > 0 && (
                <div>
                  <SectionLabel icon="Workflow" text="Связанные решения" />
                  <div className="flex flex-col gap-2">
                    {data.decisions.map((d) => (
                      <Link
                        key={d.id}
                        to={`/solutions/${d.id}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-card/50 hover:bg-muted/40 transition-colors text-sm"
                      >
                        <Icon name="Workflow" size={15} className="text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{d.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${d.decisionType === 'technical' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                          {d.typeLabel}
                        </span>
                        <Icon name="ExternalLink" size={13} className="text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-4">
              {/* Мета */}
              <div className="rounded-lg border border-border bg-card/50 p-4 flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Владелец</span>
                  <span className="text-sm">{data.owner || '—'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Версия</span>
                  <span className="text-sm font-mono">{data.version}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Обновлён</span>
                  <span className="text-sm">{new Date(data.updatedAt).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Создан</span>
                  <span className="text-sm">{new Date(data.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>

              {/* Связанные шаблоны */}
              {data.relatedTemplates.length > 0 && (
                <div className="rounded-lg border border-border bg-card/50 p-4 flex flex-col gap-2">
                  <SectionLabel icon="Boxes" text="Связанные шаблоны" />
                  {data.relatedTemplates.map((t) => (
                    <Link
                      key={t.id}
                      to={`/templates/${t.id}`}
                      className="flex items-center gap-2 py-1.5 text-sm hover:text-accent transition-colors"
                    >
                      <Icon name="Boxes" size={13} className="text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{t.name}</span>
                      <Icon name="ChevronRight" size={13} className="text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Статистика */}
              <div className="rounded-lg border border-border bg-card/50 p-4 flex flex-col gap-2">
                <SectionLabel icon="BarChart2" text="Статистика" />
                {[
                  { icon: 'Cpu',        label: 'Технологии',  val: data.technologies.length    },
                  { icon: 'Workflow',   label: 'Решения',     val: data.decisions.length        },
                  { icon: 'ListChecks', label: 'Требования',  val: totalReqs                    },
                  { icon: 'GitBranch',  label: 'Схемы',       val: data.mermaidDiagrams.length  },
                  { icon: 'Paperclip',  label: 'Файлы',       val: data.files.length            },
                ].map(({ icon, label, val }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Icon name={icon} size={13} /> {label}
                    </span>
                    <span className="font-mono text-xs">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ТРЕБОВАНИЯ ── */}
        {activeTab === 'requirements' && (
          <div className="max-w-3xl">
            <p className="text-sm text-muted-foreground mb-4">
              Требования из связанных технологий и решений, включая харденинг-конфигурации
            </p>
            <RequirementsView groups={data.requirementsByDomain} />
          </div>
        )}

        {/* ── СХЕМЫ ── */}
        {activeTab === 'mermaid' && (
          <div className="max-w-3xl flex flex-col gap-6">
            {data.mermaidDiagrams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <Icon name="GitBranch" size={24} className="opacity-40" />
                <p className="text-sm">Нет Mermaid-схем</p>
                <Link to={`/templates/${id}/edit`} className="text-sm text-accent hover:underline">
                  Добавить в редакторе
                </Link>
              </div>
            ) : (
              data.mermaidDiagrams.map((d) => (
                <div key={d.id} className="rounded-lg border border-border bg-card/50 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
                    <Icon name="GitBranch" size={14} className="text-muted-foreground" />
                    <span className="text-sm font-medium">{d.title || 'Без названия'}</span>
                  </div>
                  <div className="p-4">
                    <MermaidPreview code={d.code} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── ФАЙЛЫ ── */}
        {activeTab === 'files' && (
          <div className="max-w-xl flex flex-col gap-3">
            {data.files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <Icon name="Paperclip" size={24} className="opacity-40" />
                <p className="text-sm">Нет прикреплённых файлов</p>
                <Link to={`/templates/${id}/edit`} className="text-sm text-accent hover:underline">
                  Прикрепить в редакторе
                </Link>
              </div>
            ) : (
              data.files.map((f) => (
                <a
                  key={f.id}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card/50 hover:bg-muted/40 transition-colors"
                >
                  <Icon name="FileText" size={18} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{f.filename}</div>
                    <div className="text-xs text-muted-foreground">{(f.sizeBytes / 1024).toFixed(1)} KB</div>
                  </div>
                  <Icon name="ExternalLink" size={15} className="text-muted-foreground" />
                </a>
              ))
            )}
          </div>
        )}

        {/* ── ИСТОРИЯ ── */}
        {activeTab === 'history' && (
          <div className="max-w-xl">
            {data.versions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">История версий пуста</p>
            ) : (
              <div className="relative pl-5 border-l border-border flex flex-col gap-0">
                {data.versions.map((v, i) => (
                  <div key={v.id} className="relative pb-5 last:pb-0">
                    <div className={`absolute -left-[21px] size-3 rounded-full border-2 ${i === 0 ? 'border-accent bg-accent' : 'border-border bg-card'}`} />
                    <div className="rounded-lg border border-border bg-card/50 p-3 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold font-mono text-accent">v{v.version}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(v.changedAt).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      {v.changeNote && (
                        <p className="text-sm text-muted-foreground">{v.changeNote}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
