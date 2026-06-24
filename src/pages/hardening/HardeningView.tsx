import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import { fetchHardening, HardeningDetail } from '@/api/hardening';

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success border-success/20',
  in_development: 'bg-warning/10 text-warning border-warning/20',
  inactive:       'bg-muted text-muted-foreground border-border',
  archived:       'bg-muted text-muted-foreground border-border',
};

const REQ_STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success',
  in_development: 'bg-warning/10 text-warning',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HardeningView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<HardeningDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'requirements'>('info');

  useEffect(() => {
    if (!id) return;
    fetchHardening(id)
      .then(setItem)
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
            { key: 'info',         label: 'Основное',                     icon: 'Info'        },
            { key: 'requirements', label: 'Техническое решение и харденинг', icon: 'ShieldCheck' },
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
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-8 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {activeTab === 'info' && (
          <>
            {/* Left */}
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

            {/* Right */}
            <div className="space-y-6">
              {/* История версий */}
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
            </div>
          </>
        )}

        {activeTab === 'requirements' && (
          <div className="lg:col-span-3 space-y-6">
            {/* Связанные технические решения */}
            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Icon name="Workflow" size={18} className="text-accent" /> Связанные технические решения
                <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.solutions.length}</span>
              </h2>
              {item.solutions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Технические решения не привязаны</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {item.solutions.map((s) => (
                    <Link
                      key={s.id}
                      to={`/solutions/${s.id}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/40 text-sm hover:border-accent hover:text-accent transition-colors"
                    >
                      <Icon name="Workflow" size={14} className="text-muted-foreground" />
                      <span>{s.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{s.id}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Требования по доменам */}
            {item.requirementsByDomain.length > 0 ? (
              item.requirementsByDomain.map((group) => (
                <section key={group.domainId ?? '__none__'} className="rounded-lg border border-border bg-card p-6">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Icon name="Server" size={18} className="text-accent" />
                    {group.domainName}
                    <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{group.requirements.length}</span>
                  </h2>
                  <div className="space-y-2">
                    {group.requirements.map((req) => (
                      <div key={req.id} className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                        <Icon name="ListChecks" size={14} className="text-accent shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Link to={`/requirements/${req.id}`} className="text-sm hover:text-accent transition-colors truncate block">
                            {req.shortDesc}
                          </Link>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            <span className="font-mono">{req.id}</span>
                            {req.techName && <> · {req.techName}</>}
                          </div>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${REQ_STATUS_STYLE[req.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {req.status === 'active' ? 'Активен' : req.status === 'in_development' ? 'В разработке' : req.status === 'inactive' ? 'Не активен' : 'Архив'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
                <Icon name="ListChecks" size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Требования не найдены.</p>
                <p className="text-xs mt-1">Привяжите технические решения, чтобы увидеть связанные требования.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
