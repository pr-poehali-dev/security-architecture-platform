import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import {
  fetchHardening,
  fetchReqContent,
  HardeningDetail,
  RequirementRef,
  RequirementDomainGroup,
  ReqContent,
  ReqImage,
  EnvName,
  EnvStatus,
  ENVS,
  DEFAULT_ENV_STATUS,
} from '@/api/hardening';

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success border-success/20',
  in_development: 'bg-warning/10 text-warning border-warning/20',
  inactive:       'bg-muted text-muted-foreground border-border',
  archived:       'bg-muted text-muted-foreground border-border',
};

const ENV_STATUS_STYLE: Record<EnvStatus, { cell: string; icon: string; label: string }> = {
  required:     { cell: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', icon: 'Check',         label: 'Обязательно'  },
  conditional:  { cell: 'bg-amber-500/15  text-amber-700  dark:text-amber-300',    icon: 'TriangleAlert', label: 'Условие'      },
  not_required: { cell: 'bg-muted/50 text-muted-foreground',                        icon: 'Minus',         label: 'Не требуется' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Кеш контента требований в памяти (живёт в рамках сессии)
const reqContentCache = new Map<string, ReqContent>();

function ReqViewer({ hardeningId, req }: { hardeningId: string; req: RequirementRef }) {
  const cacheKey = `${hardeningId}:${req.id}`;
  const [content, setContent] = useState<ReqContent | null>(
    reqContentCache.get(cacheKey) ?? null,
  );
  const [loading, setLoading] = useState(!reqContentCache.has(cacheKey));
  const [lightbox, setLightbox] = useState<ReqImage | null>(null);

  useEffect(() => {
    if (reqContentCache.has(cacheKey)) return;
    setLoading(true);
    fetchReqContent(hardeningId, req.id)
      .then((c) => {
        reqContentCache.set(cacheKey, c);
        setContent(c);
      })
      .finally(() => setLoading(false));
  }, [hardeningId, req.id, cacheKey]);

  if (loading) return (
    <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
      <Icon name="Loader2" size={16} className="animate-spin" /> Загрузка…
    </div>
  );

  if (!content) return null;

  const envStatus = content.envStatus ?? { ...DEFAULT_ENV_STATUS };

  return (
    <div className="space-y-5 pt-1">
      {/* Матрица сред */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
          <Icon name="Layers" size={11} /> Применимость по средам
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-5 border-b border-border bg-muted/30">
            {ENVS.map(({ key, label }) => (
              <div key={key} className="px-2 py-1.5 text-center text-[11px] font-semibold text-muted-foreground border-r last:border-r-0 border-border">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5">
            {ENVS.map(({ key }) => {
              const st = (envStatus[key] ?? 'not_required') as EnvStatus;
              const style = ENV_STATUS_STYLE[st];
              return (
                <div key={key} className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 border-r last:border-r-0 border-border ${style.cell}`}>
                  <Icon name={style.icon} size={13} />
                  <span className="text-[10px] font-semibold leading-tight text-center">{style.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Markdown */}
      {content.markdown ? (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <Icon name="FileText" size={11} /> Инструкция
          </div>
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <MarkdownViewer>{content.markdown}</MarkdownViewer>
          </div>
        </div>
      ) : (
        !hasContent && (
          <p className="text-sm text-muted-foreground text-center py-4">Инструкция не заполнена</p>
        )
      )}

      {/* Изображения */}
      {content.images.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <Icon name="Image" size={11} /> GUI-инструкции
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{content.images.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {content.images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightbox(img)}
                className="group relative rounded-md border border-border overflow-hidden bg-muted/30 hover:border-accent transition-colors text-left"
              >
                <img
                  src={img.url}
                  alt={img.filename}
                  className="w-full h-28 object-cover group-hover:opacity-90 transition-opacity"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white/80 px-2 py-1 truncate">
                  {img.filename}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <Icon name="ZoomIn" size={20} className="text-white drop-shadow" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-white/80">{lightbox.filename}</span>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <Icon name="X" size={16} />
              </button>
            </div>
            <img
              src={lightbox.url}
              alt={lightbox.filename}
              className="max-h-[80vh] max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function HardeningView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<HardeningDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'requirements'>('info');
  const [activeReqId, setActiveReqId] = useState<string | null>(null);
  const [reqSearch, setReqSearch] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchHardening(id)
      .then((d) => {
        setItem(d);
        // Авто-выбор первого требования
        const first = d.requirementsByDomain?.[0]?.requirements?.[0];
        if (first) setActiveReqId(first.id);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
      <Icon name="Loader2" size={22} className="animate-spin" /> Загрузка…
    </div>
  );

  if (error || !item) return (
    <div className="px-6 py-12 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
        <Icon name="TriangleAlert" size={18} /> {error || 'Карточка не найдена'}
      </div>
      <Link to="/hardening" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <Icon name="ArrowLeft" size={16} /> Вернуться к списку
      </Link>
    </div>
  );

  const allReqs: RequirementRef[] = item.requirementsByDomain.flatMap((g) => g.requirements);
  const filteredGroups: RequirementDomainGroup[] = reqSearch.trim()
    ? item.requirementsByDomain.map((g) => ({
        ...g,
        requirements: g.requirements.filter((r) =>
          r.shortDesc.toLowerCase().includes(reqSearch.toLowerCase()) ||
          r.id.toLowerCase().includes(reqSearch.toLowerCase())),
      })).filter((g) => g.requirements.length > 0)
    : item.requirementsByDomain;

  const activeReq = allReqs.find((r) => r.id === activeReqId) ?? null;

  return (
    <>
      {/* Header */}
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-6 max-w-[1400px] mx-auto">
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-4 flex-wrap">
            <Link to="/hardening" className="hover:text-primary-foreground transition-colors">Харденинг</Link>
            <Icon name="ChevronRight" size={14} />
            <span className="text-primary-foreground font-medium truncate">{item.name}</span>
          </nav>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{item.name}</h1>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLE[item.status] ?? 'bg-muted'}`}>
                  {item.statusLabel}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-primary-foreground/60 flex-wrap">
                <span className="font-mono">{item.id}</span>
                <span>·</span>
                <span>v{item.version}</span>
                {item.owner && <><span>·</span><span>{item.owner}</span></>}
              </div>
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {item.tags.map((t) => (
                    <span key={t.id} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-foreground/10 text-primary-foreground/80">
                      #{t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate(`/hardening/${item.id}/edit`)}
              className="h-10 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0"
            >
              <Icon name="Pencil" size={16} /> Редактировать
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-card/60">
        <div className="px-6 max-w-[1400px] mx-auto flex gap-1">
          {([
            { key: 'info',         label: 'Основное',                       icon: 'Info'        },
            { key: 'requirements', label: 'Техническое решение и харденинг', icon: 'ShieldCheck',
              badge: allReqs.length || undefined },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === t.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
              {'badge' in t && t.badge ? (
                <span className="text-[10px] font-mono bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-8 max-w-[1400px] mx-auto">

        {/* Вкладка: Основное */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <section className="rounded-lg border border-border bg-card p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Icon name="Info" size={18} className="text-accent" /> Основная информация
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    { label: 'ID',       value: item.id,          mono: true },
                    { label: 'Версия',   value: item.version,     mono: true },
                    { label: 'Владелец', value: item.owner || '—'            },
                    { label: 'Статус',   value: item.statusLabel             },
                    { label: 'Создано',  value: fmt(item.createdAt)          },
                    { label: 'Изменено', value: fmt(item.updatedAt)          },
                  ].map((f) => (
                    <div key={f.label}>
                      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{f.label}</div>
                      <div className={`text-sm font-medium ${f.mono ? 'font-mono' : ''}`}>{f.value}</div>
                    </div>
                  ))}
                </div>
              </section>

              {item.description && (
                <section className="rounded-lg border border-border bg-card p-6">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Icon name="FileText" size={18} className="text-accent" /> Описание
                  </h2>
                  <MarkdownViewer>{item.description}</MarkdownViewer>
                </section>
              )}
            </div>

            <div className="space-y-6">
              <section className="rounded-lg border border-border bg-card p-5">
                <button
                  type="button"
                  onClick={() => setShowVersions((v) => !v)}
                  className="w-full flex items-center justify-between text-sm font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <Icon name="History" size={16} className="text-accent" /> История версий
                    <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.versions.length}</span>
                  </span>
                  <Icon name={showVersions ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-muted-foreground" />
                </button>
                {showVersions && (
                  <div className="mt-4 space-y-3">
                    {item.versions.map((v) => (
                      <div key={v.id} className="flex items-start gap-3 text-sm">
                        <span className="font-mono text-accent shrink-0">v{v.version}</span>
                        <div className="min-w-0 flex-1">
                          {v.changeNote && <div className="text-foreground/80">{v.changeNote}</div>}
                          <div className="text-[11px] text-muted-foreground mt-0.5">{fmt(v.changedAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {item.solutions.length > 0 && (
                <section className="rounded-lg border border-border bg-card p-5">
                  <h2 className="font-semibold mb-3 text-sm flex items-center gap-2">
                    <Icon name="Workflow" size={15} className="text-accent" /> Технические решения
                  </h2>
                  <div className="space-y-1.5">
                    {item.solutions.map((s) => (
                      <Link key={s.id} to={`/solutions/${s.id}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors">
                        <Icon name="ExternalLink" size={13} />
                        <span className="truncate">{s.name}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {/* Вкладка: Техническое решение и харденинг */}
        {activeTab === 'requirements' && (
          <div className="flex gap-6 min-h-[500px]">

            {/* LEFT: список требований */}
            <div className="w-72 shrink-0 flex flex-col rounded-lg border border-border bg-card overflow-hidden">
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
                      placeholder="Поиск…"
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
                    <p className="text-xs">Нет связанных требований</p>
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">Ничего не найдено</div>
                ) : (
                  filteredGroups.map((group) => (
                    <div key={group.domainId ?? '__none__'}>
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60 bg-muted/20 border-b border-border/50 font-medium">
                        {group.domainName}
                      </div>
                      {group.requirements.map((req) => {
                        const isActive = activeReqId === req.id;
                        return (
                          <button
                            key={req.id}
                            type="button"
                            onClick={() => setActiveReqId(req.id)}
                            className={`w-full text-left px-3 py-2.5 border-b border-border/40 transition-colors ${
                              isActive
                                ? 'bg-accent/10 border-l-2 border-l-accent'
                                : 'hover:bg-muted/40'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`mt-1 size-1.5 rounded-full shrink-0 ${
                                req.status === 'active' ? 'bg-emerald-400' :
                                req.status === 'in_development' ? 'bg-amber-400' : 'bg-muted-foreground/40'
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
                  ))
                )}
              </div>
            </div>

            {/* RIGHT: просмотр контента требования */}
            <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
              {activeReq ? (
                <>
                  {/* Заголовок требования */}
                  <div className="px-5 py-4 border-b border-border bg-muted/20">
                    <div className="text-xs font-mono text-muted-foreground mb-1">{activeReq.id}</div>
                    <div className="font-semibold text-sm leading-snug">{activeReq.shortDesc}</div>
                    {activeReq.techName && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Icon name="Cpu" size={11} /> {activeReq.techName}
                      </div>
                    )}
                  </div>
                  {/* Контент */}
                  <div className="flex-1 overflow-y-auto px-5 py-5">
                    <ReqViewer key={activeReq.id} hardeningId={item.id} req={activeReq} />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                  <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Icon name="MousePointerClick" size={28} className="opacity-30" />
                  </div>
                  <p className="font-medium text-sm">Выберите требование</p>
                  <p className="text-xs mt-1 max-w-xs">Нажмите на требование слева для просмотра инструкции</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}